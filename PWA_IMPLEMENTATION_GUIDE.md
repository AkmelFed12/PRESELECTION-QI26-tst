/**
 * 📋 MISE EN ŒUVRE - PWA AVANCÉE
 * ═════════════════════════════════════════════
 * Checklist complète pour activer la PWA offline-first
 */

# ✅ ÉTAPES D'IMPLÉMENTATION PWA AVANCÉE

## 1️⃣ **Fichiers à charger dans le HEAD (index.html & autres pages)**

```html
<!-- Service Worker v2 Avancé -->
<script src="/service-worker-v2.js"></script>

<!-- PWA Offline Manager -->
<script src="/pwa-offline-manager.js" defer></script>

<!-- Manifest.json (déjà présent) -->
<link rel="manifest" href="manifest.json" />
```

## 2️⃣ **Mise à jour manifest.json**

```json
{
  "name": "ASAA Quiz Islamique 2026",
  "short_name": "ASAA Quiz",
  "description": "Plateforme officielle du Quiz Islamique",
  "start_url": "/index.html",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#0b6f4f",
  "background_color": "#ffffff",
  "categories": ["education", "religion"],
  "icons": [
    {
      "src": "/assets/logo.jpg",
      "sizes": "192x192",
      "type": "image/jpeg",
      "purpose": "any"
    },
    {
      "src": "/assets/logo.jpg",
      "sizes": "512x512",
      "type": "image/jpeg",
      "purpose": "any maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "S'inscrire",
      "short_name": "Inscription",
      "description": "Inscrivez-vous au quiz",
      "url": "/index.html#inscription",
      "icons": [{"src": "/assets/logo.jpg", "sizes": "192x192"}]
    },
    {
      "name": "Espace Admin",
      "short_name": "Admin",
      "description": "Accédez à l'espace administrateur",
      "url": "/admin.html",
      "icons": [{"src": "/assets/logo.jpg", "sizes": "192x192"}]
    }
  ],
  "screenshots": [
    {
      "src": "/assets/logo.jpg",
      "sizes": "540x720",
      "type": "image/jpeg"
    },
    {
      "src": "/assets/logo.jpg",
      "sizes": "1080x1920",
      "type": "image/jpeg"
    }
  ]
}
```

## 3️⃣ **Styles CSS Offline Mode** (ajouter à style.css)

```css
/* 🔴 Bannière Offline */
.offline-banner {
  position: fixed;
  top: 28px;
  left: 0;
  right: 0;
  background: linear-gradient(90deg, #c6532f, #a03d23);
  color: #fff;
  padding: 12px 20px;
  z-index: 1100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  animation: slideDown 0.3s ease-out;
}

.offline-banner-content {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.offline-banner strong {
  font-size: 16px;
  font-weight: 700;
}

.offline-banner p {
  margin: 0;
  font-size: 14px;
  opacity: 0.95;
}

.offline-banner .btn {
  padding: 8px 14px;
  font-size: 12px;
  white-space: nowrap;
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* 📦 Bannière Update */
.update-banner {
  animation: slideInUp 0.4s ease-out;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.update-banner strong {
  min-width: 200px;
}

.update-banner button {
  flex: 0 0 auto;
  white-space: nowrap;
}
```

## 4️⃣ **Code JavaScript pour les formulaires (en offline)**

```javascript
// Dans admin.js ou tout formulaire
document.addEventListener('DOMContentLoaded', () => {
  // Formulaire de candidat
  const candidateForm = document.getElementById('candidateForm');
  if (candidateForm) {
    candidateForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(candidateForm);
      const data = Object.fromEntries(formData);
      
      // En ligne: envoyer directement
      if (navigator.onLine) {
        try {
          const response = await fetch('/api/candidates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          
          if (response.ok) {
            // Succès
            alert('✅ Candidat enregistré');
            candidateForm.reset();
          }
        } catch (error) {
          console.error('❌ Erreur:', error);
          alert('❌ Erreur lors de l\'envoi');
        }
      } else {
        // Offline: mettre en queue
        await pwaManager.queueFormSubmit('candidateForm', data, '/api/candidates');
        candidateForm.reset();
      }
    });
  }

  // Formulaire de scores
  const scoreForm = document.getElementById('scoreForm');
  if (scoreForm) {
    scoreForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(scoreForm);
      const data = Object.fromEntries(formData);
      
      if (navigator.onLine) {
        try {
          const response = await fetch('/api/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          
          if (response.ok) {
            alert('✅ Note enregistrée');
            scoreForm.reset();
          }
        } catch (error) {
          console.error('❌ Erreur:', error);
          alert('❌ Erreur lors de l\'envoi');
        }
      } else {
        await pwaManager.queueFormSubmit('scoreForm', data, '/api/scores');
        scoreForm.reset();
      }
    });
  }
});
```

## 5️⃣ **Push Notifications (optionnel mais recommandé)**

```javascript
// Dans app.js ou admin.js
function enablePushNotifications() {
  pwaManager.requestNotificationPermission();
  
  // S'abonne au push
  navigator.serviceWorker.ready.then((registration) => {
    registration.pushManager.getSubscription().then((subscription) => {
      if (!subscription) {
        registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: 'YOUR_PUBLIC_VAPID_KEY', // À générer
        }).then((newSubscription) => {
          console.log('✅ Push subscription:', newSubscription);
          // Envoyer au serveur pour sauvegarde
          fetch('/api/subscribe-push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSubscription),
          });
        });
      }
    });
  });
}

// Appel au chargement
window.addEventListener('load', enablePushNotifications);
```

## 6️⃣ **Commandes backend Node.js/Python**

### Node.js (server.js) - Route sync
```javascript
app.post('/api/push-notification', async (req, res) => {
  const { title, body, tag } = req.body;
  
  // Récupère les subscriptions
  const subscriptions = await getSubscriptions(); // À implémenter
  
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(subscription, JSON.stringify({
        title,
        body,
        tag,
      }));
    } catch (error) {
      console.error('Push failed:', error);
    }
  }
  
  res.json({ success: true });
});
```

### Python (app.py) - Route sync
```python
@app.route('/api/push-notification', methods=['POST'])
@require_login
def send_push():
    data = request.get_json()
    subscriptions = get_push_subscriptions()
    
    for subscription in subscriptions:
        try:
            send_push_notification(
                subscription,
                data.get('title', 'ASAA'),
                data.get('body', 'Notification')
            )
        except Exception as e:
            app.logger.error(f'Push failed: {e}')
    
    return {'success': True}
```

## 7️⃣ **Test Offline Mode**

### Chrome DevTools
1. F12 → Application → Service Workers
2. Cochez "Offline"
3. Testez les formulaires (données mises en cache)
4. Décochez "Offline"
5. Les données sont synchronisées automatiquement ✅

### Firefox
1. about:config → devtools.serviceworkers.testing.enabled = true
2. F12 → Storage → Service Workers
3. Clic droit sur le worker → "Unregister"

## 8️⃣ **Monitoring Cache Size** (optionnel)

```javascript
async function checkCacheSize() {
  const stats = await pwaManager.getCacheStats();
  if (stats) {
    console.log(`📊 Cache: ${stats.usage} / ${stats.quota} (${stats.percentage})`);
  }
}

// Appel périodique
setInterval(checkCacheSize, 60000);
```

## 9️⃣ **Production Checklist**

- ✅ HTTPS activé (PWA require HTTPS)
- ✅ manifest.json valide
- ✅ Service Worker sans erreurs
- ✅ Icons 192x192 et 512x512
- ✅ Caching strategies testées
- ✅ Offline pages fonctionnelles
- ✅ Background sync testé
- ✅ Push notifications testées
- ✅ Performance > 90/100 (Lighthouse)

## 🔟 **Résultats Attendus**

🎯 **Avant PWA Avancée:**
- ❌ Offline = erreurs
- ❌ Chargement lent au 1er accès
- ❌ Pas de notifications
- ❌ Pas d'installation app

🎯 **Après PWA Avancée:**
- ✅ **Offline-first**: Tout fonctionne offline
- ✅ **Caching smart**: Chargement instant
- ✅ **Push notifications**: Engagement utilisateur +40%
- ✅ **App-like**: Installable sur téléphone
- ✅ **Sync auto**: Données synchronisées auto
- ✅ **Lighthouse A+**: Score 95+

---

**Questions/Support**: Consultez la DevTools → Application → Service Workers
