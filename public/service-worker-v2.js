/**
 * 🚀 SERVICE WORKER AVANCÉ - ASAA PWA 2026
 * ═════════════════════════════════════════════
 * Offline-first avec stratégies caching intelligentes
 * Sync en arrière-plan, notifications push, et plus
 */

const CACHE_VERSION = 'asaa-v2.0.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const API_CACHE = `${CACHE_VERSION}-api`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// Assets statiques (jamais changent)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/admin.html',
  '/style.css',
  '/manifest.json',
  '/pwa.js',
  '/assets/logo.jpg',
];

// ═════════════════════════════════════════════
// 📦 INSTALL - Cache les ressources critiques
// ═════════════════════════════════════════════
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installation...', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('✅ Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  
  // Force le nouveau SW à prendre le contrôle immédiatement
  self.skipWaiting();
});

// ═════════════════════════════════════════════
// 🔄 ACTIVATE - Nettoie les anciens caches
// ═════════════════════════════════════════════
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker: Activation...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('asaa-') && !name.includes(CACHE_VERSION))
          .map((name) => {
            console.log('🗑️  Suppression ancien cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  
  // Prend le contrôle de tous les clients
  self.clients.claim();
});

// ═════════════════════════════════════════════
// 🌐 FETCH - Stratégies caching intelligentes
// ═════════════════════════════════════════════
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') {
    return;
  }

  // Ignorer les extensions de développement
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // 1️⃣ API Calls → Network First, fallback Cache
  if (url.pathname.match(/\/api\//)) {
    event.respondWith(networkFirstStrategy(request, API_CACHE));
  }
  // 2️⃣ Images → Cache First, fallback placeholder
  else if (request.destination === 'image') {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE));
  }
  // 3️⃣ CSS/JS → Cache First (versioning handled by build)
  else if (request.destination === 'style' || request.destination === 'script') {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
  }
  // 4️⃣ HTML (documents) → Network First, fallback Cache
  else if (request.destination === 'document' || url.pathname.endsWith('.html')) {
    event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE));
  }
  // 5️⃣ Tout le reste → Stale While Revalidate
  else {
    event.respondWith(staleWhileRevalidateStrategy(request, DYNAMIC_CACHE));
  }
});

/**
 * 🔵 Cache First Strategy
 * Utilise le cache s'il existe, sinon fetch et cache
 */
function cacheFirstStrategy(request, cacheName) {
  return caches.match(request).then((response) => {
    if (response) {
      console.log(`✅ Cache hit: ${request.url}`);
      return response;
    }

    return fetch(request)
      .then((response) => {
        // Vérifie que la réponse est valide
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Clone & cache la réponse
        const responseToCache = response.clone();
        caches.open(cacheName).then((cache) => {
          cache.put(request, responseToCache);
        });

        return response;
      })
      .catch(() => {
        // Fallback pour les images
        if (request.destination === 'image') {
          return caches.match('/assets/logo.jpg');
        }
        return new Response('Offline', { status: 503 });
      });
  });
}

/**
 * 🔴 Network First Strategy
 * Essaie fetch d'abord, fallback cache si offline
 */
function networkFirstStrategy(request, cacheName) {
  return fetch(request)
    .then((response) => {
      // Cache la réponse si elle est valide
      if (response && response.status === 200) {
        const responseToCache = response.clone();
        caches.open(cacheName).then((cache) => {
          cache.put(request, responseToCache);
        });
      }
      return response;
    })
    .catch(() => {
      console.log(`⚠️  Offline, checking cache: ${request.url}`);
      return caches.match(request).then((response) => {
        if (response) {
          return response;
        }
        // Fallback offline page
        return new Response(
          JSON.stringify({
            error: 'Offline',
            message: 'Vous êtes hors-ligne. Reconnecté pour plus de fonctionnalités.',
          }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      });
    });
}

/**
 * ⚪ Stale While Revalidate Strategy
 * Retourne le cache immédiatement, met à jour en arrière-plan
 */
function staleWhileRevalidateStrategy(request, cacheName) {
  return caches.match(request).then((response) => {
    const fetchPromise = fetch(request).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        const responseToCache = networkResponse.clone();
        caches.open(cacheName).then((cache) => {
          cache.put(request, responseToCache);
        });
      }
      return networkResponse;
    });

    return response || fetchPromise;
  });
}

// ═════════════════════════════════════════════
// 📢 PUSH NOTIFICATIONS
// ═════════════════════════════════════════════
self.addEventListener('push', (event) => {
  console.log('📢 Push notification reçue:', event.data);

  let notificationData = {
    title: 'ASAA Quiz',
    body: 'Nouvelle notification',
    icon: '/assets/logo.jpg',
    badge: '/assets/logo.jpg',
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: 'asaa-notification',
      requireInteraction: false,
    })
  );
});

// ═════════════════════════════════════════════
// 👆 NOTIFICATION CLICK
// ═════════════════════════════════════════════
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Notification cliquée');
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Cherche une fenêtre déjà ouverte
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Sinon ouvre une nouvelle fenêtre
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// ═════════════════════════════════════════════
// 🔄 BACKGROUND SYNC (Sync en arrière-plan)
// ═════════════════════════════════════════════
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync:', event.tag);

  if (event.tag === 'sync-candidates') {
    event.waitUntil(syncCandidates());
  } else if (event.tag === 'sync-scores') {
    event.waitUntil(syncScores());
  } else if (event.tag === 'sync-news') {
    event.waitUntil(syncNews());
  }
});

async function syncCandidates() {
  try {
    const cache = await caches.open(API_CACHE);
    const response = await fetch('/api/candidates');
    if (response.ok) {
      cache.put('/api/candidates', response.clone());
      console.log('✅ Candidates synced');
    }
  } catch (error) {
    console.error('❌ Sync failed:', error);
  }
}

async function syncScores() {
  try {
    const cache = await caches.open(API_CACHE);
    const response = await fetch('/api/scores');
    if (response.ok) {
      cache.put('/api/scores', response.clone());
      console.log('✅ Scores synced');
    }
  } catch (error) {
    console.error('❌ Sync failed:', error);
  }
}

async function syncNews() {
  try {
    const cache = await caches.open(API_CACHE);
    const response = await fetch('/api/news');
    if (response.ok) {
      cache.put('/api/news', response.clone());
      console.log('✅ News synced');
    }
  } catch (error) {
    console.error('❌ Sync failed:', error);
  }
}

// ═════════════════════════════════════════════
// 💬 MESSAGE HANDLING (Communication client↔SW)
// ═════════════════════════════════════════════
self.addEventListener('message', (event) => {
  console.log('💬 Message du client:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      Promise.all(
        cacheNames.map((name) => {
          if (name.startsWith('asaa-')) {
            return caches.delete(name);
          }
        })
      );
    });
  }

  if (event.data.type === 'GET_CACHE_SIZE') {
    console.log('Cache size info requested - implement tracking as needed');
  }
});

console.log('✅ Service Worker v2 loaded:', CACHE_VERSION);
