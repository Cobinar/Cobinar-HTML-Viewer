/* ═══════════════════════════════════════════════════════
   sw.js  ·  Service Worker
   HTML Editor  ·  Marc-Arthur Samuel Dalus
   ═══════════════════════════════════════════════════════ */

const CACHE_NAME = 'html-editor-v1';

const APP_SHELL = [
  './',
  './html.html',
  './cursors.css',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Unbounded:wght@400;700;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap',
];

/* ── Install: cache the app shell ───────────────────── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

/* ── Activate: purge old caches ─────────────────────── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/* ── Fetch: network-first for navigation,
           cache-first for assets ────────────────────── */
self.addEventListener('fetch', event => {
  const { request } = event;

  // Skip non-GET and cross-origin (except fonts)
  if (request.method !== 'GET') return;
  if (
    !request.url.startsWith(self.location.origin) &&
    !request.url.startsWith('https://fonts.googleapis.com') &&
    !request.url.startsWith('https://fonts.gstatic.com')
  ) return;

  if (request.mode === 'navigate') {
    // Network-first for HTML navigation
    event.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
    );
  } else {
    // Cache-first for everything else
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          if (!res || res.status !== 200 || res.type === 'opaque') return res;
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return res;
        });
      })
    );
  }
});
