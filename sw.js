/* Minimal service worker — caches the app shell so the editor opens instantly
   and works offline once installed. Adjust the CACHE_NAME version number
   whenever you deploy changes to force-refresh cached files. */

const CACHE_NAME = 'poster-studio-v1';
const APP_SHELL = [
  './index.html',
  './posters/custom.html',
  './css/base.css',
  './js/shared.js',
  './js/navbar.js',
  './assets/logo.png',
  './assets/logo2.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {
      /* If a listed file is missing/renamed, don't block install — cache what succeeds */
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        /* Cache new same-origin requests as the user browses, so repeat visits work offline too */
        if (response.ok && event.request.url.startsWith(self.location.origin)) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
