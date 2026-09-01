/*
 * NetDraw service worker: cache-first offline support.
 *
 * VERSION is stamped with the commit SHA at deploy time (see the GitHub
 * Actions workflow), so each deploy installs a fresh cache and old ones
 * are cleaned up on activate. Everything the app needs is precached —
 * after one visit, the app works with no network at all.
 */

const VERSION = '__BUILD__';
const CACHE = 'netdraw-' + VERSION;

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './styles.css?v=__BUILD__',
  './js/icons.js?v=__BUILD__',
  './js/app.js?v=__BUILD__',
  './js/export.js?v=__BUILD__',
  './js/generate.js?v=__BUILD__',
  './js/vendor/jszip.min.js?v=__BUILD__',
  './js/vendor/jspdf.umd.min.js?v=__BUILD__'
];

self.addEventListener('install', ev => {
  ev.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', ev => {
  if (ev.request.method !== 'GET') return;
  ev.respondWith(
    caches.match(ev.request, { ignoreSearch: false }).then(hit =>
      hit ||
      fetch(ev.request).then(resp => {
        // Cache same-origin responses opportunistically.
        if (resp.ok && new URL(ev.request.url).origin === location.origin) {
          const copy = resp.clone();
          caches.open(CACHE).then(cache => cache.put(ev.request, copy));
        }
        return resp;
      }).catch(() =>
        // Offline navigation falls back to the cached app shell.
        ev.request.mode === 'navigate' ? caches.match('./index.html') : undefined
      )
    )
  );
});
