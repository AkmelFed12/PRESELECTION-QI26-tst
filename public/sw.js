const CACHE_NAME = 'quiz-2026-v4';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/assets/logo.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const acceptsHtml = (request.headers.get('accept') || '').includes('text/html');
  const networkFirstExt = ['.html', '.js', '.css', '.json'];
  const isNetworkFirst = networkFirstExt.some((ext) => url.pathname.endsWith(ext));
  if (url.pathname.startsWith('/api/') || acceptsHtml || isNetworkFirst) {
    event.respondWith(fetch(request, { cache: 'no-store' }).catch(() => caches.match('/index.html')));
    return;
  }
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
