# Guide Sentry - Monitoring & Error Tracking

**Status:** ✅ Implémenté dans le código  
**Dernière MAJ:** Février 17, 2026  
**Coût:** Gratuit (tier gratuit de Sentry)

---

## 🚀 Configuration Rapide (15 minutes)

### Étape 1: Créer Compte Sentry Gratuit

1. Aller à https://sentry.io/
2. Créer compte avec email
3. Sélectionner "Create Project"
4. Choisir: **Node.js** → **Express**
5. Copier le `SENTRY_DSN` (ressemble à: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`)

### Étape 2: Ajouter SENTRY_DSN à Vercel

```bash
# Via CLI Vercel
vercel env add SENTRY_DSN

# Ou dans Vercel Dashboard:
# 1. Settings → Environment Variables
# 2. Ajouter: SENTRY_DSN = <votre_dsn>
# 3. Sauvegarder
```

### Étape 3: Re-déployer sur Vercel

```bash
vercel --prod --confirm
```

**C'est tout!** Sentry capture maintenant tous les erreurs 🎉

---

## 📊 Qu'est-ce qui est Suivi?

### ✅ Automatiquement Tracké

1. **Erreurs Non Capturées** (uncaught exceptions)
   - Problèmes de base de données
   - Erreurs validation
   - Crashes serveur

2. **Erreurs Requête HTTP**
   - 5xx server errors
   - Timeouts
   - Connection issues

3. **Performance Tracing**
   - Temps réponse requêtes
   - Latence base de données
   - Goulots d'étranglement

4. **Context Détaillé**
   - HTTP method & URL
   - Query parameters
   - User ID (si disponible)
   - IP client
   - Timestamp exact

### ❌ Pas de Données Sensibles

Par sécurité:
- ❌ Pas de mots de passe
- ❌ Pas de tokens d'auth
- ❌ Pas de données personnelles complètes

---

## 🔍 Accès Dashboard Sentry

**URL:** https://sentry.io/organizations/your-org/

### Sections Principales

#### **Issues (Problèmes)**
- Liste tous les erreurs détectés
- Grouped par type/location
- Nombre d'occurrences

#### **Performance**
- Trace chaque requête (HTTP requests)
- Timeline détaillée
- Identifie requêtes lentes

#### **Releases**
- Track deployments
- Voir erreurs par version

#### **Alerts (Alertes)**
- Configurer notifications
- Slack, email, etc.

---

## 🔔 Configurer Notifications Slack (Recommandé)

### Étape 1: Créer Slack Bot

1. Aller à https://api.slack.com/apps
2. "Create New App" → "From scratch"
3. Nom: "Sentry Alerts"
4. Sélectionner workspace
5. Dans "Incoming Webhooks": Enable
6. "Add New Webhook to Workspace"
7. Sélectionner channel: #alerts (ou créer)
8. Copier Webhook URL

### Étape 2: Ajouter à Sentry

1. Sentry Dashboard → Settings → Integrations
2. Chercher "Slack"
3. "Install" (ou "Configure" si déjà)
4. Sélectionner channel: #alerts
5. Sauvegarder

### Étape 3: Tester

Faire error volontaire dans Sentry pour voir notification Slack

---

## 📈 Interprétation Dashboard

### Exemple 1: Erreur Database
```
Error: connect ECONNREFUSED 127.0.0.1:5432

Timeline:
12:34:56 - POST /api/register
12:34:57 - Database query timeout
12:34:58 - Error captured

Impact: 42 users affected
Solution: Vérifier database connection
```

### Exemple 2: Requête Lente
```
Transaction: GET /api/public-candidates
Duration: 3.2s (threshold: 1s)
  - Parse JSON: 100ms
  - Database: 2.8s ← LENT!
  - Render: 200ms

Solution: Ajouter Redis cache
```

---

## 🛡️ Erreurs Filtrées (Non Trackées)

Pour réduire noise, quelques erreurs sont filtrées:
- `GET /api/health` → Health checks (normal)
- Erreurs 404 legitimes (pages inexistantes)

**À ajouter au besoin:**

```javascript
beforeSend(event, hint) {
  // Ignorer les erreurs qu'on ne veut pas tracker
  if (event.message?.includes('test')) {
    return null; // Ne pas envoyer à Sentry
  }
  return event;
}
```

---

## 📱 Mobile/Frontend Errors

**Actuellement:** Seuls erreurs **serveur** sont trackées  
**À ajouter futur:** @sentry/tracing pour JavaScript frontend

Pour ajouter monitoring frontend en futurnez:

```javascript
// public/app.js
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: window.SENTRY_DSN,
  tracesSampleRate: 1.0,
});

// Capture errors au frontend
```

---

## 🔧 Dépannage

### Problème: Notifications Slack ne marchent pas

**Solution:**
1. Slack webhook URL correcte? (copier exact)
2. Sentry a-t-il permissions? (vérifier integration)
3. Test: envoyer error volontaire

### Problème: Trop d'alertes (spam)

**Solution:**
- Dashboard → Alerts → modifier règles
- Augmenter threshold (ex: error rate > 5%)
- Ignorer certains types d'erreurs

### Problème: SENTRY_DSN vide dans Vercel

**Solution:**
1. Vérifier copié exact correctement
2. `vercel env pull` pour vérifier local
3. Redéployer: `vercel --prod --confirm`

---

## 💡 Bonnes Pratiques

### 1. Monitorer Mais Pas Spam
```javascript
// ✅ BON: Capture erreurs importantes
Sentry.captureException(dbError);

// ❌ MAUVAIS: Capture tout
Sentry.captureMessage("User logged in");
```

### 2. Ajouter Context Utile
```javascript
// ✅ BON: Context clair
Sentry.captureException(error, {
  contexts: {
    http: { method: 'POST', url: '/api/register' },
    user: { candidateId: 123 }
  }
});
```

### 3. Release Tracking
```bash
# Lors du déploiment:
SENTRY_RELEASE=v2.1.0 vercel --prod --confirm
```

---

## 📊 Recommandations d'Alertes

### Alert 1: Error Rate Élevé (CRITIQUE)
```
Condition: error.rate > 1% sur 5 minutes
Action: Slack notification → #alerts
Urgence: Résoudre immédiatement
```

### Alert 2: Requête Lente (AVERTISSEMENT)
```
Condition: HTTP request duration > 1s
Action: Email notification
Urgence: Investiguer
```

### Alert 3: Downtime Détecté (CRITIQUE)
```
Condition: Response code = 5xx
Action: Slack + SMS
Urgence: Résoudre ASAP
```

---

## 🚀 Étapes Prochaines

### Immédiat
- [ ] Créer compte Sentry
- [ ] Copier SENTRY_DSN
- [ ] Ajouter à Vercel env vars
- [ ] Redéployer
- [ ] Tester avec health check

### Court Terme
- [ ] Configurer Slack alerts
- [ ] Monitorer pendant 24h
- [ ] Ajuster filtres si too noisy
- [ ] Documenter issues découverts

### Future
- [ ] Ajouter Sentry au frontend (JavaScript)
- [ ] Performance monitoring avancé
- [ ] Intégration GitHub (track by commits)
- [ ] Alertes PagerDuty (si escalade nécessaire)

---

## 🎯 KPIs à Suivre

Chaque jour:
- ✅ Error count (cible: 0-5/jour)
- ✅ Error rate (cible: < 0.1%)
- ✅ Response time P95 (cible: < 200ms)
- ✅ Uptime (cible: > 99.9%)

---

**Sentry est maintenant actif et prêt à vous alerter de tout problème!** 🎉

Questions? Consultez https://docs.sentry.io/
