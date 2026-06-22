/* Service Worker — works on root domains AND GitHub Pages /repo-name/ subpaths */
const CACHE_NAME = 'mango-poster-v3';

/* Derive the base path from the SW's own location so it works at any subpath */
const SW_BASE = self.location.pathname.replace(/\/sw\.js$/, '/');

const APP_SHELL = [
  SW_BASE,
  SW_BASE + 'index.html',
  SW_BASE + 'css/base.css',
  SW_BASE + 'js/shared.js',
  SW_BASE + 'js/navbar.js',
  SW_BASE + 'assets/logo.png',
  SW_BASE + 'manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(APP_SHELL))
      .catch(() => { /* don't block install if a file is missing */ })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok && e.request.url.startsWith(self.location.origin + SW_BASE)) {
          caches.open(CACHE_NAME).then(c => c.put(e.request, res.clone()));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
