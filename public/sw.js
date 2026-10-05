const CACHE_NAME = 'kure-katsuo-guide-v17';
// v13: アプリ本体をネットワーク優先に変更（古いキャッシュで壊れて見える問題の対策）。
// v14: ホーム画面追加用にPNGアイコン（apple-touch-icon等）を追加。
// v15: アイコンを大正町市場の看板写真に差し替え。
// v16: 画像等オフラインフォールバックの不具合を修正（失敗時にHTMLを誤って返していた）。
// v17: fetch()にcache:'no-store'を明示し、ブラウザのHTTPキャッシュ経由で
//      古い応答が返り続ける問題に対処。
const APP_SHELL = ['./', 'index.html', 'tower-warrior.html', 'src/main.js', 'src/styles/global.css', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', 'qr-kure-katsuo-guide.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // 会議室予約の空き状況などApps Scriptへの問い合わせは、常に最新を取りたいので
  // キャッシュせずネットワーク優先にする。
  const url = new URL(event.request.url);
  if (url.hostname.endsWith('script.google.com') || url.hostname.endsWith('script.googleusercontent.com')) {
    event.respondWith(fetch(new Request(event.request, { cache: 'no-store' })).catch(() => caches.match('./')));
    return;
  }

  // アプリ本体（HTML/JS/CSS等）はネットワーク優先。オンライン時は必ず最新コードを取得し、
  // 取得できたものをキャッシュ更新。オフライン時はキャッシュを返す。
  // ページ本体（ナビゲーション）だけは、キャッシュにも無ければトップで代用してよいが、
  // 画像等の個別アセットでそれをやるとHTMLが画像として返り、アイコンが壊れて見える
  // 原因になるため、ナビゲーション以外はキャッシュが無ければ素直に失敗させる。
  //
  // 「ネットワーク優先」のつもりでも、fetch()は既定でブラウザのHTTPキャッシュを
  // 経由してしまい、再デプロイ後も古い応答がそのまま返ることがある（Service Worker
  // 自体は更新されても、中のfetch()が古いmain.js等を返し続け、結果アプリの画面が
  // 何世代も前のまま変わらないように見える）。cache:'no-store'を明示し、
  // 必ずオリジンへ実際に問い合わせさせる。
  const isNavigation = event.request.mode === 'navigate' || event.request.destination === 'document';
  const networkRequest = new Request(event.request, { cache: 'no-store' });
  event.respondWith(
    fetch(networkRequest)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || (isNavigation ? caches.match('./') : undefined)),
      ),
  );
});
