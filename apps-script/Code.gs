/**
 * 久礼アプリ — Google Apps Script ウェブアプリ（全文・張り替え用）
 *
 * この1本で、アプリからの送信をすべて処理します:
 *   - 2階会議室の予約（formType:'reservation'）→ Googleカレンダー登録（ダブルブッキング防止）
 *   - 空き状況の取得（GET ?action=reservations&date=YYYY-MM-DD）
 *   - 車いす予約（formType:'rental'）→ スプレッドシートに記録
 *   - 商品アンケート（formType:'beautySurvey'）→ 性別で「男性調査」「女性調査」に分けて記録
 *   - 商品アンケートのモニター登録（formType:'beautyMonitorSignup'）→ 専用シートに記録
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
  // 「久礼大正町予約アプリ」（https://docs.google.com/spreadsheets/d/1ORyg4tZsONqXBVCtDI2h2aEdjHZzzP2fu36ar_Tz1Ug/）を記録先に固定。
  spreadsheetId: '1ORyg4tZsONqXBVCtDI2h2aEdjHZzzP2fu36ar_Tz1Ug',

  // 記録先シート名（無ければ自動作成）。
  // 旧「アンケート」シートは、はるか昔にヘッダー行なしで作られており（1行目からJSON生データ）、
  // ヘッダー検証の対象にできないため、検証つきの新シート名で記録する。
  surveySheet: 'アンケート2',
  rentalSheet: '車いす予約',
  reservationSheet: '会議室予約',
  wheelchairSheet: '車いす事前予約',
  // 商品アンケートは回答者の性別で書き込み先シートを完全に分ける（列ズレの再発防止）。
  // 「男性」→ maleSurveySheet、それ以外（女性・回答しないなど）→ femaleSurveySheet。
  maleSurveySheet: '男性調査',
  femaleSurveySheet: '女性調査',
  // 発売前モニター・先行案内の希望メールアドレスを記録する専用シート（完了画面の単独ステップ用）。
  beautyMonitorSheet: 'モニター登録',
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
    var data = JSON.parse(decodePostContents(e.postData.contents));

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
    if (data.formType === 'beautySurvey') {
      return jsonOutput(logBeautySurveyRow(data));
    }
    if (data.formType === 'beautyMonitorSignup') {
      return jsonOutput(logBeautyMonitorRow(data));
    }
    // それ以外はアンケートとして記録（項目別に列分け）
    return jsonOutput(logSurveyRow(data));
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

// アンケートを、設問ごとに列分けして記録する（集計しやすいように）。
// 列: 受付日時 / 各設問（選択＋自由記入をまとめる） / 自由コメント / 活用可否 / submissionId
// 二重送信対策は商品アンケートと同じ仕組み（submissionId冪等化＋60秒以内の内容一致フォールバック）。
// ヘッダーが一致しない場合は書き込まずエラーを返す（列ズレを構造的に防止）。
function logSurveyRow(data) {
  try {
    var ss = getSpreadsheet();
    if (!ss) return { ok: false, reason: 'no_spreadsheet' };

    archiveLegacySheetsOnce(ss, ['アンケート'], [CONFIG.surveySheet]);

    var answers = data.answers || [];
    var header = ['受付日時'];
    for (var h = 0; h < answers.length; h++) {
      header.push(answers[h].label || ('設問' + (h + 1)));
    }
    header.push('自由コメント');
    header.push('活用可否');
    header.push('submissionId');
    var submissionIdCol = header.length;

    var sheet = ss.getSheetByName(CONFIG.surveySheet);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.surveySheet);
      sheet.appendRow(header);
    } else if (sheet.getLastRow() === 0) {
      sheet.appendRow(header);
    } else {
      var existingHeader = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      if (!headersMatch(existingHeader, header)) {
        return {
          ok: false,
          reason: 'header_mismatch',
          message: 'シート「' + CONFIG.surveySheet + '」の見出しと送信内容が一致しません。記録していません。',
        };
      }
    }

    if (isDuplicateSubmissionId(sheet, data.submissionId, submissionIdCol)) {
      return { ok: true, duplicate: true };
    }

    var row = [new Date()];
    for (var i = 0; i < answers.length; i++) {
      var a = answers[i] || {};
      var vals = (a.values || []).slice();
      if (a.text) vals.push(a.text);
      row.push(vals.join(' / '));
    }
    row.push(data.comment || '');
    row.push(data.shareable ? '可' : '');
    row.push(data.submissionId || '');

    if (isDuplicateRecentContent(sheet, row, submissionIdCol - 1)) {
      return { ok: true, duplicate: true };
    }

    sheet.appendRow(row);
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: 'error', message: String(e) };
  }
}

// 旧シート（列ズレ・重複データ・ヘッダー無しなど過去バージョンの問題を抱えたシート）を、
// 一度だけリネームして残す。上書き・削除はしない。現在の CONFIG のシート名と衝突しない
// 場合のみ動作する（すでにリネーム済みなら何もしない）。
function archiveLegacySheetsOnce(ss, legacyNames, currentNames) {
  for (var i = 0; i < legacyNames.length; i++) {
    try {
      var legacyName = legacyNames[i];
      if (currentNames.indexOf(legacyName) !== -1) continue;
      var legacy = ss.getSheetByName(legacyName);
      if (!legacy) continue;
      legacy.setName(legacyName + '（重複あり・旧データ）');
    } catch (e) {
      // リネームに失敗しても新規記録は継続する。
    }
  }
}

// answers配列（{label, value}の並び）から、指定ラベルの回答値を取得する。
function findAnswerValue(answers, label) {
  for (var i = 0; i < answers.length; i++) {
    if (answers[i] && answers[i].label === label) {
      return answers[i].value || '';
    }
  }
  return '';
}

// ヘッダー行（配列）同士が完全一致するか検証する。
function headersMatch(a, b) {
  if (a.length !== b.length) return false;
  for (var i = 0; i < a.length; i++) {
    if (String(a[i]) !== String(b[i])) return false;
  }
  return true;
}

// submissionId 列（最終列）を探索し、同じ submissionId がすでに記録済みか調べる。
// 冪等化の主手段：同じ回答が二重送信されても、2回目以降は書き込まない。
function isDuplicateSubmissionId(sheet, submissionId, submissionIdCol) {
  if (!submissionId) return false;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  var ids = sheet.getRange(2, submissionIdCol, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(submissionId)) return true;
  }
  return false;
}

// submissionId が無い/一致しない環境向けの保険：直前の行と内容が完全一致し、
// かつ60秒以内の書き込みであれば、二重送信とみなして弾く。
function isDuplicateRecentContent(sheet, newRow, contentColCount) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  var lastValues = sheet.getRange(lastRow, 1, 1, contentColCount).getValues()[0];
  var lastTime = lastValues[0] instanceof Date ? lastValues[0] : new Date(lastValues[0]);
  var elapsedMs = new Date().getTime() - lastTime.getTime();
  if (elapsedMs > 60 * 1000) return false;

  for (var i = 1; i < contentColCount; i++) {
    if (String(lastValues[i] || '') !== String(newRow[i] || '')) return false;
  }
  return true;
}

// 商品アンケートを、回答者の性別に応じたシートへ設問ごと列分けして記録する
// （1問1回答のみ）。「男性」→ maleSurveySheet、それ以外 → femaleSurveySheet。
// 列: 受付日時 / 各設問（単一回答） / submissionId
// ヘッダーが一致しない場合は書き込まずエラーを返す（列ズレを構造的に防止）。
function logBeautySurveyRow(data) {
  try {
    var ss = getSpreadsheet();
    if (!ss) return { ok: false, reason: 'no_spreadsheet' };

    archiveLegacySheetsOnce(
      ss,
      ['商品アンケート', '商品アンケート2', '商品アンケート3', '美容液アンケート'],
      [CONFIG.maleSurveySheet, CONFIG.femaleSurveySheet],
    );

    var answers = data.answers || [];
    var gender = findAnswerValue(answers, '性別');
    var targetSheetName = gender === '男性' ? CONFIG.maleSurveySheet : CONFIG.femaleSurveySheet;

    var header = ['受付日時'];
    for (var h = 0; h < answers.length; h++) {
      header.push(answers[h].label || ('設問' + (h + 1)));
    }
    header.push('submissionId');
    var submissionIdCol = header.length;

    var sheet = ss.getSheetByName(targetSheetName);
    if (!sheet) {
      sheet = ss.insertSheet(targetSheetName);
      sheet.appendRow(header);
    } else if (sheet.getLastRow() === 0) {
      sheet.appendRow(header);
    } else {
      var existingHeader = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      if (!headersMatch(existingHeader, header)) {
        return {
          ok: false,
          reason: 'header_mismatch',
          message: 'シート「' + targetSheetName + '」の見出しと送信内容が一致しません。記録していません。',
        };
      }
    }

    if (isDuplicateSubmissionId(sheet, data.submissionId, submissionIdCol)) {
      return { ok: true, duplicate: true };
    }

    var row = [new Date()];
    for (var i = 0; i < answers.length; i++) {
      row.push((answers[i] && answers[i].value) || '');
    }
    row.push(data.submissionId || '');

    if (isDuplicateRecentContent(sheet, row, submissionIdCol - 1)) {
      return { ok: true, duplicate: true };
    }

    sheet.appendRow(row);
    return { ok: true, sheet: targetSheetName };
  } catch (e) {
    return { ok: false, reason: 'error', message: String(e) };
  }
}

// 発売前モニター・先行案内の希望者を記録する（完了画面の単独ステップから送信）。
// 列: 受付日時 / お名前 / メールアドレス / 元回答submissionId / submissionId
function logBeautyMonitorRow(data) {
  try {
    var ss = getSpreadsheet();
    if (!ss) return { ok: false, reason: 'no_spreadsheet' };

    var header = ['受付日時', 'お名前', 'メールアドレス', '元回答submissionId', 'submissionId'];
    var submissionIdCol = header.length;

    var sheet = ss.getSheetByName(CONFIG.beautyMonitorSheet);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.beautyMonitorSheet);
      sheet.appendRow(header);
    } else if (sheet.getLastRow() === 0) {
      sheet.appendRow(header);
    }

    if (isDuplicateSubmissionId(sheet, data.submissionId, submissionIdCol)) {
      return { ok: true, duplicate: true };
    }

    sheet.appendRow([
      new Date(),
      data.name || '',
      data.email || '',
      data.relatedSubmissionId || '',
      data.submissionId || '',
    ]);
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: 'error', message: String(e) };
  }
}

// その他のフォーム記録用（JSONをそのまま保存・予備）。
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

// e.postData.contents は Content-Type:'text/plain' だと絵文字（サロゲートペア）が
// 文字化けすることがあるため、アプリ側は本文を percent-encode して送ってくる。
// ここで decodeURIComponent して元のJSON文字列に戻す（古いキャッシュ済みアプリからの
// 生JSON送信にも '%' を含まなければ影響なく対応できる）。
function decodePostContents(contents) {
  try {
    return decodeURIComponent(contents);
  } catch (e) {
    return contents;
  }
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
