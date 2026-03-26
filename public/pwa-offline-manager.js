/**
 * 🚀 PWA OFFLINE MODE MANAGER
 * ═════════════════════════════════════════════
 * Gestion complète du mode offline avec sync en arrière-plan
 */

class PWAManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncQueue = [];
    this.offlineData = new Map();
    this.init();
  }

  /**
   * 🔧 Initialisation
   */
  async init() {
    console.log('🚀 PWA Manager: Initialisation...');

    // Enregistre le Service Worker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker-v2.js', {
          scope: '/',
        });
        console.log('✅ Service Worker registré:', registration);

        // Listeners pour les mises à jour
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.showUpdatePrompt();
            }
          });
        });
      } catch (error) {
        console.error('❌ Erreur Service Worker:', error);
      }
    }

    // Demande les permissions pour les notifications
    if ('Notification' in window && Notification.permission === 'default') {
      this.requestNotificationPermission();
    }

    // S'abonne aux changements de connectivité
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Initialise IndexedDB pour le cache local
    await this.initIndexedDB();

    // Affiche le statut offline si nécessaire
    if (!navigator.onLine) {
      this.showOfflineBanner();
    }
  }

  /**
   * 📊 Initialisation IndexedDB (stockage local persistant)
   */
  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ASAA-PWA-DB', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        console.log('✅ IndexedDB initialisé');
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Object stores pour différents types de données
        if (!db.objectStoreNames.contains('candidates')) {
          db.createObjectStore('candidates', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('scores')) {
          db.createObjectStore('scores', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('news')) {
          db.createObjectStore('news', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        }

        console.log('✅ IndexedDB stores créés');
      };
    });
  }

  /**
   * 🌐 Événement: Retour en ligne
   */
  handleOnline() {
    this.isOnline = true;
    console.log('🌐 Retour en ligne');
    this.hideOfflineBanner();

    // Affiche une notification
    this.showNotification({
      title: 'Retour en ligne ✅',
      body: 'Vos données vont être synchronisées automatiquement',
      tag: 'online-status',
    });

    // Tente de synchroniser les données en attente
    this.syncPendingData();
  }

  /**
   * 🔴 Événement: Retour offline
   */
  handleOffline() {
    this.isOnline = false;
    console.log('🔴 Passage en mode offline');
    this.showOfflineBanner();

    // Affiche une notification
    this.showNotification({
      title: 'Mode offline ⚠️',
      body: 'Vous êtes hors-ligne. Les données seront synchronisées à la reconnexion.',
      tag: 'offline-status',
    });
  }

  /**
   * 💾 Sauvegarde un formulaire pour sync ultérieur
   */
  async queueFormSubmit(formId, data, endpoint) {
    console.log(`📝 Mise en queue: ${endpoint}`, data);

    try {
      const db = await this.openDB();
      const transaction = db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');

      store.add({
        endpoint,
        data,
        timestamp: Date.now(),
        formId,
        status: 'pending',
      });

      console.log('✅ Données mises en queue');
      this.showNotification({
        title: 'Données sauvegardées',
        body: 'Vos modifications seront envoyées dès le retour en ligne',
        tag: 'queue-saved',
      });
    } catch (error) {
      console.error('❌ Erreur queueing:', error);
    }
  }

  /**
   * 🔄 Synchronise les données en attente
   */
  async syncPendingData() {
    console.log('🔄 Synchronisation des données en attente...');

    try {
      const db = await this.openDB();
      const transaction = db.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const pendingItems = await this.getAll(store);

      if (pendingItems.length === 0) {
        console.log('✅ Rien à synchroniser');
        return;
      }

      let syncedCount = 0;
      for (const item of pendingItems) {
        try {
          const response = await fetch(item.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.data),
          });

          if (response.ok) {
            // Supprime de la queue
            await this.deleteFromQueue(item.id);
            syncedCount++;
            console.log(`✅ Synced: ${item.endpoint}`);
          }
        } catch (error) {
          console.error(`❌ Sync failed for ${item.endpoint}:`, error);
        }
      }

      if (syncedCount > 0) {
        this.showNotification({
          title: 'Synchronisation complète ✅',
          body: `${syncedCount} éléments synchronisés`,
          tag: 'sync-complete',
        });
      }
    } catch (error) {
      console.error('❌ Erreur sync:', error);
    }
  }

  /**
   * 📲 Demande permission notifications
   */
  async requestNotificationPermission() {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('✅ Notifications permises');
        this.showNotification({
          title: 'Notifications activées ✅',
          body: 'Vous recevrez les mises à jour du quiz',
          tag: 'notification-enabled',
        });
      }
    } catch (error) {
      console.error('❌ Erreur permission notification:', error);
    }
  }

  /**
   * 📢 Affiche une notification
   */
  showNotification({ title, body, icon = '/assets/logo.jpg', tag = 'asaa' }) {
    if ('serviceWorker' in navigator && 'Notification' in window) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          body,
          icon,
          badge: icon,
          tag,
          requireInteraction: false,
        });
      });
    }
  }

  /**
   * 🔴 Affiche la bannière offline
   */
  showOfflineBanner() {
    let banner = document.getElementById('offlineBanner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'offlineBanner';
      banner.className = 'offline-banner';
      banner.innerHTML = `
        <div class="offline-banner-content">
          <strong>🔴 Mode Offline</strong>
          <p>Vous êtes hors-ligne. Vos données seront synchronisées dès le retour en ligne.</p>
          <button class="btn btn-small" onclick="location.reload()">Réessayer</button>
        </div>
      `;
      document.body.insertBefore(banner, document.body.firstChild);
    }
    banner.style.display = 'block';
  }

  /**
   * ✅ Cache la bannière offline
   */
  hideOfflineBanner() {
    const banner = document.getElementById('offlineBanner');
    if (banner) {
      banner.style.display = 'none';
    }
  }

  /**
   * 🔄 Affiche prompt de mise à jour
   */
  showUpdatePrompt() {
    const updateBanner = document.createElement('div');
    updateBanner.className = 'update-banner alert alert-info';
    updateBanner.innerHTML = `
      <strong>📦 Mise à jour disponible</strong>
      <p>Une nouvelle version de l'application est disponible.</p>
      <button class="btn btn-small" onclick="window.location.reload()">Mettre à jour maintenant</button>
      <button class="btn btn-small outline" onclick="this.parentElement.remove()">Plus tard</button>
    `;
    document.body.insertBefore(updateBanner, document.body.firstChild);
  }

  /**
   * 💾 Utilitaires IndexedDB
   */
  async openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ASAA-PWA-DB', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getAll(store) {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async deleteFromQueue(id) {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      store.delete(id);
      console.log(`✅ Removed from queue: ${id}`);
    } catch (error) {
      console.error('❌ Delete error:', error);
    }
  }

  /**
   * 📊 Obtient les statistiques du cache
   */
  async getCacheStats() {
    if (!('storage' in navigator)) return null;

    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage;
      const quota = estimate.quota;
      const percentage = ((usage / quota) * 100).toFixed(2);

      return {
        usage: (usage / 1024 / 1024).toFixed(2) + ' MB',
        quota: (quota / 1024 / 1024).toFixed(2) + ' MB',
        percentage: percentage + '%',
      };
    } catch (error) {
      console.error('❌ Storage API error:', error);
      return null;
    }
  }

  /**
   * 🗑️  Vide tous les caches
   */
  async clearAllCaches() {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      console.log('✅ Tous les caches effacés');
      this.showNotification({
        title: 'Cache effacé ✅',
        body: 'Espace disque libéré',
        tag: 'cache-cleared',
      });
    } catch (error) {
      console.error('❌ Clear cache error:', error);
    }
  }
}

// Initialisation globale
const pwaManager = new PWAManager();

// Export pour utilisation dans les scripts
window.PWAManager = PWAManager;
window.pwaManager = pwaManager;
