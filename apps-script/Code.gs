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

  // 2階研修室の予約を見分けるタイトル接頭辞。
  // 既存の予約（くもん教室・硬筆教室など）と同じ「【ぜよぴあ予約】」に合わせること。
  roomTitlePrefix: '【ぜよぴあ予約】',

  // 車いすの事前予約を見分けるタイトル接頭辞（研修室と独立して空き判定するため別タグ）。
  wheelchairTitlePrefix: '【車いす予約】',

  // 記録用スプレッドシートID。空欄なら、このスクリプトに紐づくシート（あれば）を使います。
  // 記録だけ不要なら空欄のままで構いません（予約のカレンダー登録には影響しません）。
  spreadsheetId: '',

  // 記録先シート名（無ければ自動作成）。
  surveySheet: 'アンケート',
  rentalSheet: '車いす予約',
  reservationSheet: '会議室予約',
  wheelchairSheet: '車いす事前予約',
};

// ===== エントリーポイント ========================================
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  if (action === 'reservations') {
    return jsonOutput(getReservations(e.parameter.date, e.parameter.resource));
  }
  if (action === 'lookup') {
    return jsonOutput(lookupReservations(e.parameter.phone));
  }
  return jsonOutput({ ok: true, service: 'kure-app', time: new Date().toISOString() });
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (data.formType === 'reservation') {
      return jsonOutput(createReservation(data));
    }
    if (data.formType === 'cancel') {
      return jsonOutput(cancelReservation(data));
    }
    if (data.formType === 'rental') {
      logRentalRow(data);
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

  // 研修室と車いすは別タグで判定（resource で切り替え）。
  var prefix = data.resource === 'wheelchair' ? CONFIG.wheelchairTitlePrefix : CONFIG.roomTitlePrefix;

  try {
    var overlapping = cal.getEvents(start, end).filter(function (ev) {
      return ev.getTitle().indexOf(prefix) === 0;
    });
    if (overlapping.length > 0) {
      return { ok: false, reason: 'conflict' };
    }

    var title = prefix + (data.name || '予約');
    var description = [
      '団体・部署: ' + (data.org || ''),
      '電話: ' + (data.phone || ''),
      '人数: ' + (data.headcount || ''),
      '用途: ' + (data.purpose || ''),
      '金額: ' + (data.amount || ''),
      '受付: 久礼アプリ（' + (data.resource === 'wheelchair' ? '車いす事前予約' : '会議室予約') + '）',
    ].join('\n');

    var event = cal.createEvent(title, start, end, { description: description });
    if (data.resource === 'wheelchair') {
      logWheelchairRow(data, event.getId());
    } else {
      logReservationRow(data, event.getId());
    }

    return { ok: true, eventId: event.getId(), start: data.start, end: data.end };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 指定日（YYYY-MM-DD）の予約済み区間を返す。resource で研修室／車いすを切り替え。
 */
function getReservations(dateStr, resource) {
  var prefix = resource === 'wheelchair' ? CONFIG.wheelchairTitlePrefix : CONFIG.roomTitlePrefix;
  var cal = getCalendar();
  var base = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  var dayStart = new Date(base);
  dayStart.setHours(0, 0, 0, 0);
  var dayEnd = new Date(base);
  dayEnd.setHours(23, 59, 59, 999);

  var events = cal.getEvents(dayStart, dayEnd).filter(function (ev) {
    return ev.getTitle().indexOf(prefix) === 0;
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

// ===== 予約の確認（電話番号で検索）==============================
// カレンダーの予約イベント（研修室・車いす）から、説明欄の電話番号が
// 一致する今日以降の予約を返す（どの端末からでも確認できる）。
function lookupReservations(phone) {
  var q = String(phone || '').replace(/[^0-9]/g, '');
  if (q.length < 6) {
    return { ok: true, reservations: [] };
  }

  var cal = getCalendar();
  var now = new Date();
  var start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  var end = new Date(start.getTime() + 1000 * 60 * 60 * 24 * 180); // 180日先まで
  var events = cal.getEvents(start, end);

  var out = [];
  for (var i = 0; i < events.length; i++) {
    var ev = events[i];
    var t = ev.getTitle();
    var resource = null;
    if (t.indexOf(CONFIG.roomTitlePrefix) === 0) {
      resource = 'room';
    } else if (t.indexOf(CONFIG.wheelchairTitlePrefix) === 0) {
      resource = 'wheelchair';
    }
    if (!resource) continue;

    var desc = ev.getDescription() || '';
    var lines = desc.split('\n');
    var phoneLine = '';
    for (var j = 0; j < lines.length; j++) {
      if (lines[j].indexOf('電話:') === 0) phoneLine = lines[j];
    }
    var evPhone = phoneLine.replace(/[^0-9]/g, '');
    if (!evPhone || evPhone.indexOf(q) === -1) continue;

    out.push({
      resource: resource,
      title: t,
      start: ev.getStartTime().toISOString(),
      end: ev.getEndTime().toISOString(),
      eventId: ev.getId(),
    });
  }
  return { ok: true, reservations: out };
}

// ===== 予約の取消 ================================================
// カレンダーの予定を削除して空きを戻し、「キャンセル」シートに履歴を残す。
function cancelReservation(data) {
  try {
    var cal = getCalendar();
    var ev = data.eventId ? cal.getEventById(data.eventId) : null;
    if (ev) {
      ev.deleteEvent();
    }
    markRowCancelled(data);
    logCancel(data);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}

// 元の予約行に取り消し線を引き、会議室予約は入金状況を「キャンセル」にする。
function markRowCancelled(data) {
  try {
    var ss = getSpreadsheet();
    if (!ss || !data.eventId) return;
    var sheetName = data.resource === 'wheelchair' ? CONFIG.wheelchairSheet : CONFIG.reservationSheet;
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;
    var values = sheet.getDataRange().getValues();
    var lastCol = values.length ? values[0].length : 0;
    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      if (String(row[row.length - 1]) === String(data.eventId)) {
        sheet.getRange(i + 1, 1, 1, lastCol).setFontLine('line-through');
        if (sheetName === CONFIG.reservationSheet && lastCol >= 11) {
          sheet.getRange(i + 1, 11).setValue('キャンセル');
        }
        break;
      }
    }
  } catch (e) {
    // 印付けに失敗しても取消本体は成功扱い。
  }
}

function logCancel(data) {
  try {
    var ss = getSpreadsheet();
    if (!ss) return;
    var sheet = ss.getSheetByName('キャンセル');
    if (!sheet) {
      sheet = ss.insertSheet('キャンセル');
      sheet.appendRow([
        '取消日時', '種別', '利用日', '開始', '終了', 'お名前', '電話番号', 'カレンダーイベントID',
      ]);
    }
    sheet.appendRow([
      new Date(),
      data.resource === 'wheelchair' ? '車いす事前予約' : '2階研修室',
      data.date || '',
      data.startTime || '',
      data.endTime || '',
      data.name || '',
      data.phone || '',
      data.eventId || '',
    ]);
  } catch (e) {
    // 記録失敗は取消本体を妨げない。
  }
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
        '受付日時', '利用日', '開始', '終了', 'お名前', '団体・部署', '電話番号', '人数', '利用目的', '金額', '入金状況', 'カレンダーイベントID',
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
      data.amount || '',
      data.paymentStatus || '未入金',
      eventId || '',
    ]);
  } catch (e) {
    // 記録失敗は予約本体（カレンダー登録）を妨げない。
  }
}

// 車いす予約を、列に分けて読みやすくスプレッドシートへ記録する。
function logRentalRow(data) {
  try {
    var ss = getSpreadsheet();
    if (!ss) return;
    var sheet = ss.getSheetByName(CONFIG.rentalSheet);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.rentalSheet);
      sheet.appendRow([
        '受付日時', 'お名前', '電話番号', 'ご住所', '利用時間(分)', '開始', '返却予定', '返却予定時刻',
      ]);
    }
    sheet.appendRow([
      new Date(),
      data.name || '',
      data.phone || '',
      data.address || '',
      data.minutes || '',
      data.startAt ? new Date(data.startAt) : '',
      data.endAt ? new Date(data.endAt) : '',
      data.endClock || '',
    ]);
  } catch (e) {
    // 記録失敗は本処理を妨げない。
  }
}

// 車いすの事前予約を、列に分けてスプレッドシートへ記録する。
function logWheelchairRow(data, eventId) {
  try {
    var ss = getSpreadsheet();
    if (!ss) return;
    var sheet = ss.getSheetByName(CONFIG.wheelchairSheet);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.wheelchairSheet);
      sheet.appendRow([
        '受付日時', '利用日', '開始', '終了', 'お名前', '電話番号', 'ご住所', 'カレンダーイベントID',
      ]);
    }
    sheet.appendRow([
      new Date(),
      data.date || '',
      data.startTime || '',
      data.endTime || '',
      data.name || '',
      data.phone || '',
      data.address || '',
      eventId || '',
    ]);
  } catch (e) {
    // 記録失敗は予約本体（カレンダー登録）を妨げない。
  }
}

// アンケートなど、その他のフォーム記録用（JSONをそのまま保存）。
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
