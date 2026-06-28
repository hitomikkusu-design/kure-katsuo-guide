// ぜよぴあアプリ — 待ち時間表示 / 2階会議室の予約（Googleカレンダー連携・ダブルブッキング防止）
// 久礼カツオ待ち時間ガイドと同じ静的PWA構成（ハッシュルーター + Service Worker + Apps Script連携）。

const routes = ['home', 'wait', 'reserve', 'info'];

const routeMeta = {
  home: { label: 'ホーム', icon: '🏠', subtitle: 'ぜよぴあの今と、2階会議室の予約をスマホから。' },
  wait: { label: '待ち時間', icon: '⏱️', subtitle: '今の窓口の混み具合をリアルタイムに表示します。' },
  reserve: { label: '会議室予約', icon: '📅', subtitle: '2階会議室の空きを見て、その場で予約できます。' },
  info: { label: '案内', icon: 'ℹ️', subtitle: 'ご利用方法と、システムのしくみについて。' },
};

// ===== 設定 =====================================================
// Apps Script ウェブアプリのURL。デプロイ後にここへ貼り付けてください。
// 空のままでもアプリは動作し、待ち時間はデモ表示、予約は端末内記録のみになります。
const API_ENDPOINT = '';

const ROOM_NAME = '2階会議室';
const OPEN_HOUR = 9; // 受付開始（時）
const CLOSE_HOUR = 21; // 受付終了（時）
const RESERVE_STORAGE_KEY = 'zeyopia-app-reservations';

const reserveDurations = [
  { label: '1時間', hours: 1 },
  { label: '2時間', hours: 2 },
  { label: '3時間', hours: 3 },
];

// 窓口のデモ待ち時間（API未接続時のフォールバック）
const demoWaits = [
  { name: '総合受付', minutes: 5 },
  { name: 'カフェ・売店', minutes: 15 },
  { name: '体験コーナー', minutes: 30 },
];

// ===== 共通ユーティリティ ========================================

function getRoute() {
  const route = window.location.hash.replace('#/', '') || 'home';
  return routes.includes(route) ? route : 'home';
}

function navigate(route) {
  window.location.hash = route === 'home' ? '#/' : `#/${route}`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  render();
}

function button(label, route, variant = 'primary') {
  return `<button class="button button--${variant}" data-route="${route}" type="button">${label}</button>`;
}

function sectionTitle(eyebrow, title, description) {
  return `
    <div class="section-title">
      <p class="section-title__eyebrow">${eyebrow}</p>
      <h2>${title}</h2>
      <p>${description}</p>
    </div>
  `;
}

function infoCard(title, body, tone = 'sea') {
  return `
    <section class="info-card info-card--${tone}">
      <h3>${title}</h3>
      <p>${body}</p>
    </section>
  `;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatClock(date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function todayISODate() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// ===== 待ち時間表示 ==============================================

function waitStatus(minutes) {
  if (minutes <= 10) return { level: 'low', label: '空いています' };
  if (minutes <= 25) return { level: 'mid', label: 'やや混雑' };
  return { level: 'high', label: '混雑' };
}

function waitCard(item) {
  const status = waitStatus(item.minutes);
  return `
    <article class="wait-card ${status.level === 'high' ? 'wait-card--high' : ''}">
      <div>
        <p class="wait-card__name">${escapeHtml(item.name)}</p>
        <span class="wait-card__status wait-card__status--${status.level}">${status.label}</span>
      </div>
      <div class="wait-card__meter">
        <span class="wait-card__minutes">${item.minutes}</span>
        <span class="wait-card__unit">分待ち</span>
      </div>
    </article>
  `;
}

function waitPage() {
  return `
    <div class="stack">
      ${sectionTitle('WAIT TIME', '今の待ち時間', '各窓口の混み具合の目安です。1分ごとに自動更新します。')}
      <div class="wait-status-bar">
        <span>最終更新：<strong id="wait-updated">取得中…</strong></span>
        <button class="wait-refresh" id="wait-refresh" type="button">更新</button>
      </div>
      <div class="wait-grid" id="wait-grid">
        <p class="reserve-loading">待ち時間を読み込んでいます…</p>
      </div>
      ${infoCard('待ち時間について', '表示は目安です。実際の状況により前後することがあります。スタッフが更新した最新の待ち時間がここに反映されます。', 'sun')}
    </div>
  `;
}

let waitTimerId = null;

async function fetchWaits() {
  if (!API_ENDPOINT) {
    return { items: demoWaits, demo: true, updatedAt: new Date().toISOString() };
  }
  const res = await fetch(`${API_ENDPOINT}?action=waits`, { method: 'GET' });
  const data = await res.json();
  return {
    items: Array.isArray(data.items) ? data.items : demoWaits,
    demo: false,
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

async function renderWaits() {
  const grid = document.querySelector('#wait-grid');
  const updated = document.querySelector('#wait-updated');
  if (!grid) return;

  try {
    const result = await fetchWaits();
    grid.innerHTML = result.items.map(waitCard).join('');
    if (updated) {
      const time = formatClock(new Date(result.updatedAt));
      updated.textContent = result.demo ? `${time}（デモ表示）` : time;
    }
  } catch {
    grid.innerHTML = demoWaits.map(waitCard).join('');
    if (updated) updated.textContent = `${formatClock(new Date())}（オフライン）`;
  }
}

function setupWaitInteractions() {
  if (getRoute() !== 'wait') {
    if (waitTimerId) {
      clearInterval(waitTimerId);
      waitTimerId = null;
    }
    return;
  }

  renderWaits();
  const refresh = document.querySelector('#wait-refresh');
  if (refresh) refresh.addEventListener('click', renderWaits);

  if (waitTimerId) clearInterval(waitTimerId);
  waitTimerId = setInterval(() => {
    if (getRoute() === 'wait') {
      renderWaits();
    } else {
      clearInterval(waitTimerId);
      waitTimerId = null;
    }
  }, 60000);
}

// ===== 2階会議室の予約 ===========================================

function getStoredReservations() {
  try {
    return JSON.parse(window.localStorage.getItem(RESERVE_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveReservation(reservation) {
  const list = getStoredReservations();
  list.unshift(reservation);
  window.localStorage.setItem(RESERVE_STORAGE_KEY, JSON.stringify(list.slice(0, 30)));
}

function startTimeOptions() {
  const options = [];
  for (let h = OPEN_HOUR; h < CLOSE_HOUR; h += 1) {
    options.push(`<option value="${pad2(h)}:00">${pad2(h)}:00</option>`);
  }
  return options.join('');
}

function reservePage() {
  const durationButtons = reserveDurations
    .map(
      (d, i) => `
        <label class="reserve-duration">
          <input type="radio" name="duration" value="${d.hours}" ${i === 0 ? 'checked' : ''} />
          <span>${d.label}</span>
        </label>
      `,
    )
    .join('');

  return `
    <div class="stack">
      <section class="hero">
        <p class="hero__eyebrow">MEETING ROOM</p>
        <h2>${ROOM_NAME}の予約</h2>
        <p>ご希望の日付と時間を選ぶと、空き状況を確認して予約できます。Googleカレンダーと連携し、同じ時間帯の二重予約（ダブルブッキング）を防ぎます。</p>
        <p class="reserve-deadline">⏰ 受付時間：${OPEN_HOUR}:00〜${CLOSE_HOUR}:00</p>
      </section>

      <section class="reserve-availability" aria-labelledby="availability-title">
        <h3 id="availability-title" style="margin:0;color:var(--sea-dark)">空き状況</h3>
        <p class="slot-legend">
          <span><i class="is-free"></i>空き</span>
          <span><i class="is-busy"></i>予約済み</span>
        </p>
        <div class="slot-grid" id="slot-grid">
          <p class="reserve-loading">日付を選ぶと空き状況を表示します。</p>
        </div>
      </section>

      <form class="reserve-form" id="reserve-form">
        <label class="reserve-field">
          <span>利用日 <em>必須</em></span>
          <input name="date" type="date" required min="${todayISODate()}" value="${todayISODate()}" />
        </label>
        <div class="reserve-row">
          <label class="reserve-field">
            <span>開始時間 <em>必須</em></span>
            <select name="startTime" required>${startTimeOptions()}</select>
          </label>
          <fieldset class="reserve-field">
            <legend>利用時間</legend>
            <div class="reserve-duration-grid">${durationButtons}</div>
          </fieldset>
        </div>
        <label class="reserve-field">
          <span>お名前・ご担当者 <em>必須</em></span>
          <input name="name" type="text" maxlength="40" required placeholder="例：山田 太郎" />
        </label>
        <label class="reserve-field">
          <span>団体・部署名</span>
          <input name="org" type="text" maxlength="60" placeholder="例：〇〇サークル" />
        </label>
        <div class="reserve-row">
          <label class="reserve-field">
            <span>電話番号 <em>必須</em></span>
            <input name="phone" type="tel" maxlength="20" required placeholder="090-1234-5678" inputmode="tel" />
          </label>
          <label class="reserve-field">
            <span>人数</span>
            <input name="headcount" type="number" min="1" max="100" placeholder="例：6" inputmode="numeric" />
          </label>
        </div>
        <label class="reserve-field">
          <span>利用目的</span>
          <textarea name="purpose" maxlength="120" placeholder="例：定例ミーティング"></textarea>
        </label>
        <button class="button button--primary" id="reserve-submit" type="submit">空きを確認して予約する</button>
      </form>

      <section id="reserve-result" aria-live="polite"></section>

      ${infoCard('ダブルブッキングの防止について', '予約時に、サーバー側でもう一度Googleカレンダーの予定を確認します。同じ時間帯にすでに予約がある場合は登録されず、画面でお知らせします。これにより二重予約を防ぎます。', 'sea')}
    </div>
  `;
}

// "HH:MM" -> 分
function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// その日の予約済み区間（分）の配列を取得
async function fetchBusySlots(dateStr) {
  if (!API_ENDPOINT) {
    // ローカル保存分のみを擬似的に反映（デモ）
    return getStoredReservations()
      .filter((r) => r.date === dateStr)
      .map((r) => ({ start: timeToMinutes(r.startTime), end: timeToMinutes(r.endTime) }));
  }
  const res = await fetch(`${API_ENDPOINT}?action=reservations&date=${encodeURIComponent(dateStr)}`, { method: 'GET' });
  const data = await res.json();
  return (data.busy || []).map((ev) => {
    const start = new Date(ev.start);
    const end = new Date(ev.end);
    return { start: start.getHours() * 60 + start.getMinutes(), end: end.getHours() * 60 + end.getMinutes() };
  });
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

async function renderAvailability(dateStr) {
  const grid = document.querySelector('#slot-grid');
  if (!grid) return;
  grid.innerHTML = '<p class="reserve-loading">空き状況を確認しています…</p>';

  let busy = [];
  try {
    busy = await fetchBusySlots(dateStr);
  } catch {
    grid.innerHTML = '<p class="reserve-loading">空き状況を取得できませんでした。予約時にもう一度確認します。</p>';
    return;
  }

  const cells = [];
  for (let h = OPEN_HOUR; h < CLOSE_HOUR; h += 1) {
    const slotStart = h * 60;
    const slotEnd = (h + 1) * 60;
    const isBusy = busy.some((b) => overlaps(slotStart, slotEnd, b.start, b.end));
    cells.push(`
      <div class="slot slot--${isBusy ? 'busy' : 'free'}">
        <span>${pad2(h)}:00–${pad2(h + 1)}:00</span>
        <span class="slot__tag">${isBusy ? '予約済' : '空き'}</span>
      </div>
    `);
  }
  grid.innerHTML = cells.join('');
  grid.dataset.busy = JSON.stringify(busy);
}

function reserveResultCard(ok, title, message, detail = '') {
  return `
    <div class="reserve-result reserve-result--${ok ? 'ok' : 'ng'}">
      <p class="reserve-result__eyebrow">${ok ? '✅ 予約を受け付けました' : '⚠️ ご予約できませんでした'}</p>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
      ${detail ? `<p class="reserve-result__detail">${escapeHtml(detail)}</p>` : ''}
    </div>
  `;
}

function buildDateTime(dateStr, hhmm) {
  // ローカルタイムのDateを生成（ブラウザのタイムゾーン）
  return new Date(`${dateStr}T${hhmm}:00`);
}

async function submitReservation(form) {
  const date = form.elements.date.value;
  const startTime = form.elements.startTime.value;
  const hours = Number(form.elements.duration.value);
  const name = form.elements.name.value.trim();
  const org = form.elements.org.value.trim();
  const phone = form.elements.phone.value.trim();
  const headcount = form.elements.headcount.value.trim();
  const purpose = form.elements.purpose.value.trim();

  if (!date || !startTime || !name || !phone) {
    window.alert('利用日・開始時間・お名前・電話番号を入力してください。');
    return null;
  }

  const startMin = timeToMinutes(startTime);
  const endMin = startMin + hours * 60;
  if (endMin > CLOSE_HOUR * 60) {
    window.alert(`利用時間が受付終了（${CLOSE_HOUR}:00）を超えています。開始時間か利用時間を調整してください。`);
    return null;
  }

  const startDate = buildDateTime(date, startTime);
  const endTime = `${pad2(Math.floor(endMin / 60))}:${pad2(endMin % 60)}`;
  const endDate = buildDateTime(date, endTime);

  if (startDate.getTime() < Date.now()) {
    window.alert('過去の時間は予約できません。日付と時間をご確認ください。');
    return null;
  }

  // クライアント側の事前チェック（取得済みの空き状況と照合）
  const grid = document.querySelector('#slot-grid');
  if (grid && grid.dataset.busy) {
    try {
      const busy = JSON.parse(grid.dataset.busy);
      if (busy.some((b) => overlaps(startMin, endMin, b.start, b.end))) {
        return {
          ok: false,
          card: reserveResultCard(false, 'この時間はすでに予約があります', '別の時間帯を選んでください。', `${date} ${startTime}〜${endTime}`),
        };
      }
    } catch {
      /* 無視して送信時チェックに任せる */
    }
  }

  const reservation = {
    id: `reserve-${Date.now()}`,
    formType: 'reservation',
    room: ROOM_NAME,
    date,
    startTime,
    endTime,
    hours,
    name,
    org,
    phone,
    headcount,
    purpose,
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    createdAt: new Date().toISOString(),
  };

  // API未接続時：端末内に記録するのみ（カレンダー連携はApps Script接続後に有効）
  if (!API_ENDPOINT) {
    saveReservation(reservation);
    return {
      ok: true,
      card: reserveResultCard(
        true,
        `${date} ${startTime}〜${endTime}`,
        `${ROOM_NAME}を仮予約として端末に記録しました。`,
        'Apps Scriptを接続すると、Googleカレンダーへ自動登録され二重予約も防止されます。',
      ),
    };
  }

  // サーバー側でカレンダーを確認し、空いていれば登録（ダブルブッキング防止の本番判定）
  const res = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(reservation),
  });
  const data = await res.json();

  if (data.ok) {
    saveReservation({ ...reservation, eventId: data.eventId });
    return {
      ok: true,
      card: reserveResultCard(
        true,
        `${date} ${startTime}〜${endTime}`,
        `${ROOM_NAME}を予約し、Googleカレンダーに登録しました。`,
        org ? `${name}（${org}）さま` : `${name} さま`,
      ),
    };
  }

  if (data.reason === 'conflict') {
    return {
      ok: false,
      card: reserveResultCard(false, 'この時間はすでに予約があります', '空き状況を更新しました。別の時間帯を選んでください。', `${date} ${startTime}〜${endTime}`),
    };
  }

  return {
    ok: false,
    card: reserveResultCard(false, '予約処理でエラーが発生しました', 'お手数ですが、時間をおいて再度お試しください。', data.message || ''),
  };
}

function setupReserveInteractions() {
  const form = document.querySelector('#reserve-form');
  if (!form) return;

  const dateInput = form.elements.date;
  renderAvailability(dateInput.value);
  dateInput.addEventListener('change', () => renderAvailability(dateInput.value));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = document.querySelector('#reserve-submit');
    const resultBox = document.querySelector('#reserve-result');
    if (submit) {
      submit.setAttribute('aria-disabled', 'true');
      submit.textContent = '確認中…';
    }

    let outcome = null;
    try {
      outcome = await submitReservation(form);
    } catch {
      outcome = {
        ok: false,
        card: reserveResultCard(false, '通信エラー', 'ネットワークの状態をご確認のうえ、再度お試しください。'),
      };
    }

    if (submit) {
      submit.removeAttribute('aria-disabled');
      submit.textContent = '空きを確認して予約する';
    }

    if (outcome && resultBox) {
      resultBox.innerHTML = outcome.card;
      resultBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (outcome.ok) {
        // 入力欄をクリア（日付は当日に戻る）
        form.reset();
        if (!dateInput.value) dateInput.value = todayISODate();
      }
      // 予約後・競合後は、現在表示している日付で空き状況を更新
      renderAvailability(dateInput.value);
    }
  });
}

// ===== ページ ====================================================

function homePage() {
  return `
    <div class="stack">
      <section class="hero">
        <p class="hero__eyebrow">ぜよぴあ PWA</p>
        <h2>ぜよぴあの「今」がわかるアプリ。</h2>
        <p>窓口の待ち時間をリアルタイムで確認し、2階会議室の空きを見てそのまま予約できます。</p>
        <div class="hero__actions">
          ${button('待ち時間を見る', 'wait')}
          ${button('会議室を予約する', 'reserve', 'secondary')}
        </div>
      </section>

      ${sectionTitle('MENU', 'メニュー', '使いたい機能を選んでください。')}
      <div class="quick-menu" aria-label="メニュー">
        <button data-route="wait" type="button"><span>⏱️</span>今の待ち時間</button>
        <button data-route="reserve" type="button"><span>📅</span>2階会議室の予約</button>
        <button data-route="info" type="button"><span>ℹ️</span>ご利用案内</button>
      </div>

      ${infoCard('オフラインでも開ける準備', '一度読み込むと、基本画面は通信が不安定な場所でも開けるPWAとして動作します。ホーム画面に追加すると、アプリのように使えます。', 'sun')}
    </div>
  `;
}

function infoPage() {
  return `
    <div class="stack">
      ${sectionTitle('GUIDE', 'ご利用案内', 'このアプリの使い方と、システムのしくみです。')}
      ${infoCard('待ち時間表示', '各窓口の待ち時間の目安を表示します。スタッフが更新した値が反映され、画面は1分ごとに自動更新します。「更新」ボタンですぐに最新化もできます。')}
      ${infoCard('2階会議室の予約', '利用日を選ぶと、その日の空き状況が時間帯ごとに表示されます。フォームを送信すると、Googleカレンダー上の予定と照合し、空いていれば自動で予約が登録されます。', 'sea')}
      ${infoCard('ダブルブッキング防止', '予約の確定時に、サーバー側（Google Apps Script）でもう一度カレンダーを確認します。同じ時間帯に予約が入っていれば登録せず、画面でお知らせします。複数の人が同時に予約しても、二重予約になりません。', 'sun')}
      ${infoCard('オフライン対応', 'PWAとして、一度開いた画面は通信が不安定でも表示できます。ただし待ち時間の更新と予約の確定には通信が必要です。')}
    </div>
  `;
}

function pageFor(route) {
  if (route === 'wait') return waitPage();
  if (route === 'reserve') return reservePage();
  if (route === 'info') return infoPage();
  return homePage();
}

function appHeader(route) {
  return `
    <header class="app-header">
      <div class="app-header__mark" aria-hidden="true">ぜ</div>
      <div>
        <p>ぜよぴあ</p>
        <h1>ぜよぴあアプリ</h1>
        <span>${routeMeta[route].subtitle}</span>
      </div>
    </header>
  `;
}

function bottomNav(currentRoute) {
  return `
    <nav class="bottom-nav" aria-label="主要メニュー">
      ${routes
        .map(
          (route) => `
            <button class="bottom-nav__item" data-route="${route}" type="button" ${currentRoute === route ? 'aria-current="page"' : ''}>
              <span aria-hidden="true">${routeMeta[route].icon}</span>
              <strong>${routeMeta[route].label}</strong>
            </button>
          `,
        )
        .join('')}
    </nav>
  `;
}

function render() {
  const route = getRoute();
  document.querySelector('#root').innerHTML = `
    <div class="app-shell">
      <div class="phone-frame">
        ${appHeader(route)}
        <main class="page-container">${pageFor(route)}</main>
        ${bottomNav(route)}
      </div>
    </div>
  `;

  document.querySelectorAll('[data-route]').forEach((element) => {
    element.addEventListener('click', () => navigate(element.dataset.route));
  });

  setupWaitInteractions();
  setupReserveInteractions();
}

window.addEventListener('hashchange', render);
render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' });
  });
}
