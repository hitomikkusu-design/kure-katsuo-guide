/**
 * ぜよぴあアプリ — Google Apps Script ウェブアプリ
 *
 * 機能:
 *   1. 待ち時間の配信（GET ?action=waits）
 *   2. 2階会議室の予約状況の配信（GET ?action=reservations&date=YYYY-MM-DD）
 *   3. 2階会議室の予約登録 + ダブルブッキング防止（POST {formType:'reservation', ...}）
 *
 * セットアップ:
 *   1. このスクリプトをGoogleアカウントの Apps Script プロジェクトに貼り付けます。
 *   2. プロジェクトのタイムゾーンを「Asia/Tokyo」に設定します
 *      （プロジェクトの設定 → タイムゾーン）。
 *   3. 必要に応じて CALENDAR_ID を専用カレンダーのIDに変更します。
 *   4. 待ち時間をスプレッドシートで管理する場合は WAIT_SHEET_ID を設定します。
 *   5. 「デプロイ」→「新しいデプロイ」→ 種類「ウェブアプリ」。
 *        - 実行ユーザー: 自分
 *        - アクセスできるユーザー: 全員
 *   6. 発行されたウェブアプリURLを、フロント側 src/main.js の API_ENDPOINT に貼り付けます。
 */

// 予約を書き込むカレンダー。'primary' はログインユーザーのメインカレンダー。
// 専用カレンダーを使う場合は、そのカレンダーIDに置き換えてください。
var CALENDAR_ID = 'primary';

// 2階会議室の予約イベントを見分けるためのタイトル接頭辞。
var ROOM_TITLE_PREFIX = '【2階会議室】';

// 待ち時間管理用スプレッドシートID（任意）。
// シート「待ち時間」の A列:窓口名 / B列:待ち分。1行目は見出し。
var WAIT_SHEET_ID = '';
var WAIT_SHEET_NAME = '待ち時間';

// 予約ログ用スプレッドシートID（任意）。空ならログは残しません。
var LOG_SHEET_ID = '';
var LOG_SHEET_NAME = '予約ログ';

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'waits';
  if (action === 'reservations') {
    return jsonOutput(getReservations(e.parameter.date));
  }
  return jsonOutput(getWaits());
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.formType === 'reservation') {
      return jsonOutput(createReservation(data));
    }
    return jsonOutput({ ok: false, reason: 'unknown_formType' });
  } catch (err) {
    return jsonOutput({ ok: false, reason: 'bad_request', message: String(err) });
  }
}

function getCalendar() {
  return CALENDAR_ID === 'primary'
    ? CalendarApp.getDefaultCalendar()
    : CalendarApp.getCalendarById(CALENDAR_ID);
}

/**
 * 予約登録。ダブルブッキング防止のため、登録直前に同時間帯の
 * 2階会議室イベントが無いかカレンダーで確認します。
 */
function createReservation(data) {
  var start = new Date(data.start);
  var end = new Date(data.end);
  if (!(start < end)) {
    return { ok: false, reason: 'invalid_time' };
  }

  var cal = getCalendar();

  // ロックで同時アクセスによる二重登録も防ぐ。
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { ok: false, reason: 'busy', message: 'しばらくしてから再度お試しください。' };
  }

  try {
    var overlapping = cal.getEvents(start, end).filter(function (ev) {
      return ev.getTitle().indexOf(ROOM_TITLE_PREFIX) === 0;
    });
    if (overlapping.length > 0) {
      return { ok: false, reason: 'conflict' };
    }

    var title = ROOM_TITLE_PREFIX + (data.name || '予約');
    var description = [
      '団体・部署: ' + (data.org || ''),
      '電話: ' + (data.phone || ''),
      '人数: ' + (data.headcount || ''),
      '用途: ' + (data.purpose || ''),
      '受付: ぜよぴあアプリ',
    ].join('\n');

    var event = cal.createEvent(title, start, end, { description: description });
    logReservation(data, event.getId());

    return { ok: true, eventId: event.getId(), start: data.start, end: data.end };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 指定日の2階会議室の予約済み区間を返します。
 */
function getReservations(dateStr) {
  var cal = getCalendar();
  var base = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  var dayStart = new Date(base);
  dayStart.setHours(0, 0, 0, 0);
  var dayEnd = new Date(base);
  dayEnd.setHours(23, 59, 59, 999);

  var events = cal.getEvents(dayStart, dayEnd).filter(function (ev) {
    return ev.getTitle().indexOf(ROOM_TITLE_PREFIX) === 0;
  });

  return {
    ok: true,
    date: dateStr || null,
    busy: events.map(function (ev) {
      return {
        start: ev.getStartTime().toISOString(),
        end: ev.getEndTime().toISOString(),
        title: ev.getTitle(),
      };
    }),
  };
}

/**
 * 待ち時間を返します。スプレッドシートがあればそこから、無ければデモ値を返します。
 */
function getWaits() {
  var items = [];
  if (WAIT_SHEET_ID) {
    try {
      var sheet = SpreadsheetApp.openById(WAIT_SHEET_ID).getSheetByName(WAIT_SHEET_NAME);
      var values = sheet.getDataRange().getValues();
      for (var i = 1; i < values.length; i++) {
        var name = values[i][0];
        if (!name) continue;
        items.push({ name: String(name), minutes: Number(values[i][1]) || 0 });
      }
    } catch (e) {
      items = [];
    }
  }

  if (items.length === 0) {
    items = [
      { name: '総合受付', minutes: 5 },
      { name: 'カフェ・売店', minutes: 15 },
      { name: '体験コーナー', minutes: 30 },
    ];
  }

  return { ok: true, items: items, updatedAt: new Date().toISOString() };
}

function logReservation(data, eventId) {
  if (!LOG_SHEET_ID) return;
  try {
    var sheet = SpreadsheetApp.openById(LOG_SHEET_ID).getSheetByName(LOG_SHEET_NAME);
    sheet.appendRow([
      new Date(),
      data.date,
      data.startTime,
      data.endTime,
      data.name,
      data.org,
      data.phone,
      data.headcount,
      data.purpose,
      eventId,
    ]);
  } catch (e) {
    // ログ失敗は予約自体を妨げない。
  }
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
