/**
 * 2階会議室の予約 — Google Apps Script 追加分（Googleカレンダー連携・ダブルブッキング防止）
 *
 * このアプリの予約フォームは、アンケート／車いす予約と同じ Apps Script ウェブアプリ
 * （src/main.js の SURVEY_ENDPOINT）へ送信されます。カレンダー連携を有効にするには、
 * 既存のウェブアプリのスクリプトに、このファイルの内容をマージしてください。
 *
 * ■ セットアップ
 *   1. プロジェクトのタイムゾーンを「Asia/Tokyo」にします（プロジェクトの設定）。
 *   2. 予約を書き込むカレンダーを決めます（既定はメインカレンダー）。
 *   3. 下記の関数を既存スクリプトに貼り付けます。
 *   4. 既存の doPost / doGet に「dispatch例」の数行を追加します。
 *   5. 「デプロイを管理」→ 既存デプロイを編集して「新しいバージョン」で再デプロイします
 *      （URLは変わらないので、フロント側の設定変更は不要です）。
 */

// 予約を書き込むカレンダー。'primary' はログインユーザーのメインカレンダー。
// 専用カレンダーを使う場合は、そのカレンダーIDに置き換えてください。
var RESERVE_CALENDAR_ID = 'primary';

// 予約イベントを見分けるためのタイトル接頭辞。
// 既存の予約（くもん教室・硬筆教室など）と同じ「【ぜよぴあ予約】」に合わせること。
var RESERVE_TITLE_PREFIX = '【ぜよぴあ予約】';

/* ─────────────────────────────────────────────
 * dispatch例（既存の doPost / doGet に追記）
 *
 * function doPost(e) {
 *   var data = JSON.parse(e.postData.contents);
 *   if (data.formType === 'reservation') {
 *     return jsonOutput(createReservation(data));   // ← 追加
 *   }
 *   // …既存のアンケート／車いす予約の処理…
 * }
 *
 * function doGet(e) {
 *   var action = e && e.parameter && e.parameter.action;
 *   if (action === 'reservations') {
 *     return jsonOutput(getReservations(e.parameter.date));  // ← 追加
 *   }
 *   // …既存の処理…
 * }
 * ───────────────────────────────────────────── */

function getReserveCalendar() {
  return RESERVE_CALENDAR_ID === 'primary'
    ? CalendarApp.getDefaultCalendar()
    : CalendarApp.getCalendarById(RESERVE_CALENDAR_ID);
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

  var cal = getReserveCalendar();
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { ok: false, reason: 'busy', message: 'しばらくしてから再度お試しください。' };
  }

  try {
    var overlapping = cal.getEvents(start, end).filter(function (ev) {
      return ev.getTitle().indexOf(RESERVE_TITLE_PREFIX) === 0;
    });
    if (overlapping.length > 0) {
      return { ok: false, reason: 'conflict' };
    }

    var title = RESERVE_TITLE_PREFIX + (data.name || '予約');
    var description = [
      '団体・部署: ' + (data.org || ''),
      '電話: ' + (data.phone || ''),
      '人数: ' + (data.headcount || ''),
      '用途: ' + (data.purpose || ''),
      '受付: 久礼アプリ（会議室予約）',
    ].join('\n');

    var event = cal.createEvent(title, start, end, { description: description });
    return { ok: true, eventId: event.getId(), start: data.start, end: data.end };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 指定日（YYYY-MM-DD）の2階会議室の予約済み区間を返す。
 */
function getReservations(dateStr) {
  var cal = getReserveCalendar();
  var base = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  var dayStart = new Date(base);
  dayStart.setHours(0, 0, 0, 0);
  var dayEnd = new Date(base);
  dayEnd.setHours(23, 59, 59, 999);

  var events = cal.getEvents(dayStart, dayEnd).filter(function (ev) {
    return ev.getTitle().indexOf(RESERVE_TITLE_PREFIX) === 0;
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
 * 既存スクリプトに jsonOutput が無い場合は、これを使ってください。
 */
function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
