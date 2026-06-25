const CACHE_NAME = 'asaa-officiel-20260625-v1';
const CORE_ASSETS = [
  '/manifest.json',
  '/assets/logo.jpg',
  '/assets/asaa-hero.jpg',
  '/asaa-officiel.css',
  '/asaa-officiel.js'
];

async function clearOldCaches() {
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
}

async function cacheCoreAssets() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(CORE_ASSETS);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    clearOldCaches()
      .then(cacheCoreAssets)
      .catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    clearOldCaches()
      .then(cacheCoreAssets)
      .then(() => self.clients.claim())
  );
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
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  const acceptsHtml = (request.headers.get('accept') || '').includes('text/html');
  const isNavigation = request.mode === 'navigate' || acceptsHtml;
  const isFreshAsset = /\.(html|js|css|json)$/i.test(url.pathname);

  if (isNavigation || isFreshAsset) {
    event.respondWith(
      fetch(request, { cache: 'reload' })
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request))
    );
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
