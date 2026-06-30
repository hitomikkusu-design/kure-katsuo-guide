/**
 * 久礼アプリ — Google Apps Script ウェブアプリ（全文・張り替え用）
 *
 * この1本で、アプリからの送信をすべて処理します:
 *   - 2階会議室の予約（formType:'reservation'）→ Googleカレンダー登録（ダブルブッキング防止）
 *   - 空き状況の取得（GET ?action=reservations&date=YYYY-MM-DD）
 *   - 車いす予約（formType:'rental'）→ スプレッドシートに記録
 *   - アンケート（formTypeなし）→ スプレッドシートに記録
 *
 * ■ 張り替え手順（既存スクリプトを丸ごと置き換える場合）
 *   1. Apps Scriptエディタで既存コードを全選択（Ctrl/Cmd+A）して削除し、これを丸ごと貼り付け。
 *   2. 下の CONFIG を必要に応じて編集（カレンダー／記録用スプレッドシートID）。
 *   3. プロジェクトの設定でタイムゾーンを「Asia/Tokyo」にする。
 *   4. 「デプロイを管理」→ 既存デプロイの鉛筆 → バージョン「新しいバージョン」→ デプロイ。
 *      URLは変わらないので、アプリ側（src/main.js の SURVEY_ENDPOINT）の変更は不要です。
 *
 * ※ アンケート・車いす予約は下記シートに JSON 形式で自動記録します（シートが無ければ自動作成）。
 *   既存の集計レイアウトをそのまま保ちたい場合は、この全文置き換えではなく
 *   apps-script/reservation.gs の「マージ方式」を使い、会議室予約の処理だけ追加してください。
 */

// ===== 設定 =====================================================
var CONFIG = {
  // 予約を書き込むカレンダー。'primary' はスクリプトを動かすアカウント本人のカレンダー。
  // 別アカウントのカレンダーに入れる場合は、そのカレンダーID（共有済みであること）に置き換える。
  // 例: 'kureomiyasan@gmail.com'
  calendarId: 'primary',

  // 予約イベントを見分けるためのタイトル接頭辞。
  // 既存の予約（くもん教室・硬筆教室など）と同じ「【ぜよぴあ予約】」に合わせること。
  // これで既存予約との二重予約も防げる。
  roomTitlePrefix: '【ぜよぴあ予約】',

  // 記録用スプレッドシートID。空欄なら、このスクリプトに紐づくシート（あれば）を使います。
  // 記録だけ不要なら空欄のままで構いません（予約のカレンダー登録には影響しません）。
  spreadsheetId: '',

  // 記録先シート名（無ければ自動作成）。
  surveySheet: 'アンケート',
  rentalSheet: '車いす予約',
  reservationSheet: '会議室予約',
};

// ===== エントリーポイント ========================================
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  if (action === 'reservations') {
    return jsonOutput(getReservations(e.parameter.date));
  }
  return jsonOutput({ ok: true, service: 'kure-app', time: new Date().toISOString() });
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (data.formType === 'reservation') {
      return jsonOutput(createReservation(data));
    }
    if (data.formType === 'rental') {
      logRow(CONFIG.rentalSheet, data, '');
      return jsonOutput({ ok: true });
    }
    // それ以外はアンケートとして記録
    logRow(CONFIG.surveySheet, data, '');
    return jsonOutput({ ok: true });
  } catch (err) {
    return jsonOutput({ ok: false, reason: 'bad_request', message: String(err) });
  }
}

// ===== 会議室予約（カレンダー連携・ダブルブッキング防止）==========
function getCalendar() {
  return CONFIG.calendarId === 'primary'
    ? CalendarApp.getDefaultCalendar()
    : CalendarApp.getCalendarById(CONFIG.calendarId);
}

/**
 * 予約登録。登録直前にカレンダーを再確認し、同時間帯に2階会議室の予定があれば
 * 登録せず conflict を返す（ダブルブッキング防止）。LockServiceで同時実行も排他。
 */
function createReservation(data) {
  var start = new Date(data.start);
  var end = new Date(data.end);
  if (!(start < end)) {
    return { ok: false, reason: 'invalid_time' };
  }

  var cal = getCalendar();
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { ok: false, reason: 'busy', message: 'しばらくしてから再度お試しください。' };
  }

  try {
    var overlapping = cal.getEvents(start, end).filter(function (ev) {
      return ev.getTitle().indexOf(CONFIG.roomTitlePrefix) === 0;
    });
    if (overlapping.length > 0) {
      return { ok: false, reason: 'conflict' };
    }

    var title = CONFIG.roomTitlePrefix + (data.name || '予約');
    var description = [
      '団体・部署: ' + (data.org || ''),
      '電話: ' + (data.phone || ''),
      '人数: ' + (data.headcount || ''),
      '用途: ' + (data.purpose || ''),
      '受付: 久礼アプリ（会議室予約）',
    ].join('\n');

    var event = cal.createEvent(title, start, end, { description: description });
    logReservationRow(data, event.getId());

    return { ok: true, eventId: event.getId(), start: data.start, end: data.end };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 指定日（YYYY-MM-DD）の2階会議室の予約済み区間を返す。
 */
function getReservations(dateStr) {
  var cal = getCalendar();
  var base = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  var dayStart = new Date(base);
  dayStart.setHours(0, 0, 0, 0);
  var dayEnd = new Date(base);
  dayEnd.setHours(23, 59, 59, 999);

  var events = cal.getEvents(dayStart, dayEnd).filter(function (ev) {
    return ev.getTitle().indexOf(CONFIG.roomTitlePrefix) === 0;
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

// ===== 記録（スプレッドシート）==================================
function getSpreadsheet() {
  if (CONFIG.spreadsheetId) {
    return SpreadsheetApp.openById(CONFIG.spreadsheetId);
  }
  return SpreadsheetApp.getActiveSpreadsheet(); // 紐づくシートが無ければ null
}

// 会議室予約を、列に分けて読みやすくスプレッドシートへ記録する。
// シートが無ければ見出し付きで自動作成する。
function logReservationRow(data, eventId) {
  try {
    var ss = getSpreadsheet();
    if (!ss) return; // 記録先が無ければスキップ（カレンダー登録は完了している）
    var sheet = ss.getSheetByName(CONFIG.reservationSheet);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.reservationSheet);
      sheet.appendRow([
        '受付日時', '利用日', '開始', '終了', 'お名前', '団体・部署', '電話番号', '人数', '利用目的', 'カレンダーイベントID',
      ]);
    }
    sheet.appendRow([
      new Date(),
      data.date || '',
      data.startTime || '',
      data.endTime || '',
      data.name || '',
      data.org || '',
      data.phone || '',
      data.headcount || '',
      data.purpose || '',
      eventId || '',
    ]);
  } catch (e) {
    // 記録失敗は予約本体（カレンダー登録）を妨げない。
  }
}

// アンケート・車いす予約など、その他のフォーム記録用（JSONをそのまま保存）。
function logRow(sheetName, data, extra) {
  try {
    var ss = getSpreadsheet();
    if (!ss) return; // 記録先が無ければスキップ（本処理は継続）
    var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    sheet.appendRow([new Date(), JSON.stringify(data), extra || '']);
  } catch (e) {
    // 記録失敗は予約・送信本体を妨げない。
  }
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
