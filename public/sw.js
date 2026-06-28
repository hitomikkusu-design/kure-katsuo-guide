const CACHE_NAME = 'kure-katsuo-guide-v12';
// Keep v10 so PWA clients replace older v6 caches after the PR #3 conflict resolution.
const APP_SHELL = ['./', 'index.html', 'tower-warrior.html', 'src/main.js', 'src/styles/global.css', 'manifest.webmanifest', 'icons/icon.svg', 'qr-kure-katsuo-guide.svg'];

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
    event.respondWith(fetch(event.request).catch(() => caches.match('./')));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match('./'));
    }),
  );
});
