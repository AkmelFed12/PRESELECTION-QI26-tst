# Plateforme de présélection — Quiz Islamique 2026

Application web professionnelle pour l'Association des Serviteurs d'Allah Azawajal.  
**Version 2.5** — Node.js/Express, PostgreSQL, Vercel Deployed ✓

---

## 🎯 Fonctionnalités Principales

### Pour les Candidats & Public
- ✅ Inscription publique simple (nom, WhatsApp, email, niveau Islam)
- ✅ Galerie interactive des candidats avec filtres avancés
- ✅ Système de vote public en direct
- ✅ Résultats publics en temps réel avec classement
- ✅ Tableau de bord de statistiques avec graphiques Chart.js
- ✅ Formulaire de contact avec suivi admin
- ✅ **NEW** 📰 Publications/Feed avec approbation modérateur
- ✅ **NEW** 📱 Stories 24h avec auto-expiration
- ✅ **NEW** 💝 Système de donations avec 4 méthodes de paiement
- ✅ Quiz 2025 en images avec galerie
- ✅ Responsive design (mobile, tablet, desktop)

### Pour les Administrateurs
- ✅ Espace admin sécurisé (authentification Basic Auth)
- ✅ Gestion complète des candidats (CRUD)
- ✅ Système de notation par thème (choisi + imposé)
- ✅ Classement automatique et qualification des finalistes
- ✅ Paramétrage du tournoi (formats, seuils, groupes)
- ✅ Gestion des messages de contact avec archivage
- ✅ Journal d'audit complet des actions
- ✅ Exports CSV/PDF des données
- ✅ **NEW** ✏️ Modération des publications (approuver/rejeter)
- ✅ **NEW** 📖 Gestion des stories (approbation + suivi expiration)
- ✅ **NEW** 💰 Gestion des donations (confirmation de paiement)
- ✅ **NEW** 📸 Gestion galerie Quiz 2025

### **NEW** Engagement Features (v2.0) 🎉
- ✅ **📤 Photo Upload** - Users can upload images/videos for posts and stories
- ✅ **❤️ Like System** - Like/unlike posts and stories with duplicate prevention
- ✅ **💬 Comments** - Add, view, and moderate comments on posts
- ✅ **📱 Share Tracking** - Track shares by method (Facebook, Twitter, WhatsApp, Email)
- ✅ **🔢 Engagement Counters** - Real-time like, comment, and share counts
- ✅ **📊 Analytics Dashboard** - Track engagement metrics and donation statistics
- ✅ **📱 QR Codes** - Generate payment QR codes for donations
- ✅ **📧 Email Notifications** - Auto-notifications for comments and interactions

### Sécurité & Qualité
- ✅ CORS configuré + Security headers (HSTS, CSP, X-Frame-Options)
- ✅ Sanitization XSS complète (HTML removal)
- ✅ Validation inputs (email, phone, longueurs)
- ✅ Rate limiting par action
- ✅ Authentification Basic Auth sécurisée
- ✅ Parameterized SQL queries (injection prevention)
- ✅ Connection pooling PostgreSQL
- ✅ Sentry error monitoring (optionnel)
- ✅ Gestion d'erreurs robuste
- ✅ Accessibilité WCAG AA

---

## 🚀 Installation & Déploiement

### Prérequis
- Node.js 24.x (LTS)
- PostgreSQL 12+
- npm ou yarn
- Compte Vercel (pour déploiement production)

### Lancer Localement

```bash
# 1. Cloner le projet
git clone https://github.com/AkmelFed12/PRESELECTION-QI26-tst.git
cd PRESELECTION-QI26-tst

# 2. Installer dépendances
npm install

# 3. Variables d'environnement
# Créer fichier .env avec:
# PORT=3000
# DATABASE_URL=postgresql://user:pass@localhost:5432/qi26
# ADMIN_PASSWORD_HASH=... (hash bcryptjs)
# SENTRY_DSN=... (optionnel)

# 4. Lancer serveur
npm start
# → http://localhost:3000

# 5. Accès admin
# → http://localhost:3000/admin.html
# Identifiant: admin
# Mot de passe: (défini en var env)
pip install -r requirements.txt

# 3. Configurer variables d'environnement
export DATABASE_URL="postgresql://user:password@localhost/db"
export ADMIN_PASSWORD="votre_mot_de_passe"

# 4. Lancer le serveur
python3 app.py

# 5. Ouvrir dans le navigateur
# http://localhost:3000
```

### Variables d'Environnement Essentielles

```bash
# Base de données (OBLIGATOIRE)
DATABASE_URL=postgresql://user:password@host/dbname

# Admin (par défaut: asaa2026 / ASAALMO2026)
ADMIN_USERNAME=asaa2026
ADMIN_PASSWORD=ASAALMO2026
ADMIN_WHATSAPP=2250150070083  # optionnel

# Stockage photos (optionnel, sinon upload désactivé)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=quiz-islamique  # optionnel

# Email notifications (optionnel)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=noreply@quizislamique.com
SMTP_TO=admin@quizislamique.com
```

## 📡 API Endpoints

### Endpoints Publics

```
GET  /api/health                 - Santé serveur + statut base de données
GET  /api/public-candidates      - Lister tous les candidats
GET  /api/public-settings        - Paramètres publics (voting, registration status)
GET  /api/public-results         - Résultats avec stats
GET  /api/public-results/qualified - Top 10 qualifiés

POST /api/candidates             - Inscrire candidat
POST /api/votes                  - Voter pour candidat
POST /api/contact-messages       - Envoyer message contact
```

### Endpoints Admin (Auth Required)

```
GET  /api/admin/dashboard        - Données admin complètes (1 requête)
GET  /api/candidates             - Lister tous candidats
POST /api/admin/candidates       - Créer/modifier candidat
DELETE /api/admin/candidates/:id - Supprimer candidat
POST /api/admin/upload-photo     - Upload photo candidat

POST /api/admin/change-password  - Changer mot de passe admin

GET  /api/votes/summary          - Résumé des votes
POST /api/scores                 - Enregistrer notation
GET  /api/scores/ranking         - Classement par score

GET  /api/tournament-settings    - Paramètres tournoi
PUT  /api/tournament-settings    - Mettre à jour paramètres

GET  /api/contact-messages       - Messages contact
PUT  /api/contact-messages/:id   - Archiver/dés-archiver
DELETE /api/contact-messages/:id - Supprimer message

GET  /api/admin-audit            - Historique audit
```

### **NEW** Endpoints Engagement Features (v2.0)

```
# Photo Upload
POST /api/upload/photo           - Upload photo/vidéo

# Post Engagement
POST /api/posts/:id/like         - Liker une publication
DELETE /api/posts/:id/like       - Retirer le like
POST /api/posts/:id/share        - Enregistrer un partage
GET /api/posts/:id/stats         - Stats d'engagement (likes, comments, shares)
POST /api/posts/:id/comments     - Ajouter commentaire
GET /api/posts/:id/comments      - Lister commentaires
DELETE /api/admin/comments/:id   - Supprimer commentaire (admin)

# Story Engagement
POST /api/stories/:id/like       - Liker une story
GET /api/stories/:id/likes       - Nombre de likes

# QR Codes
GET /api/qr-code                 - Générer code QR paiement

# Analytics
GET /api/analytics/posts         - Stats publications
GET /api/analytics/stories       - Stats stories
GET /api/analytics/donations     - Stats donations (admin)
GET /api/analytics/overview      - Vue d'ensemble plateforme
```

## 🔐 Authentification

### Admin Login
- URL: `/admin.html`
- Credentials: via variables d'environnement (`ADMIN_USERNAME`, `ADMIN_PASSWORD`)
- Méthode: Basic Auth (Base64 encoded)
- ⚠️ Le serveur refuse l'accès admin si aucun mot de passe n'est défini

### Gestion Mot de Passe
- Panel "Sécurité" → "Changer mot de passe"
- Minimum 8 caractères
- PBKDF2-HMAC-SHA256 avec sel côté serveur

## 📊 Pages Publiques

| URL | Description |
|-----|-------------|
| `/` | Page d'accueil avec inscription |
| `/admin.html` | Espace administrateur |
| `/candidats.html` | Galerie interactif des candidats |
| `/resultats.html` | Résultats et classement |
| `/dashboard.html` | Statistiques en direct |
| `/contact.html` | Formulaire de contact |
| `/mentions-legales.html` | Mentions légales |
| `/confidentialite.html` | Politique confidentialité |
| `/reglement.html` | Règlement de la compétition |
| `/faq.html` | Questions fréquentes |

## 📁 Structure du Projet

```
.
├── app.py                    # Serveur HTTP + API
├── requirements.txt          # Dépendances Python
├── README.md                 # Ce fichier
├── IMPROVEMENTS.md           # Détails améliorations v2.0
├── public/
│   ├── index.html           # Page d'accueil
│   ├── admin.html           # Admin panel
│   ├── candidats.html       # Galerie candidats
│   ├── resultats.html       # Résultats
│   ├── dashboard.html       # Dashboard statistiques
│   ├── contact.html         # Formulaire contact
│   ├── *.html               # Pages légales
│   ├── style.css            # Styles globaux
│   ├── utils.js             # Fonctions réutilisables
│   ├── app.js               # Logique page accueil
│   ├── admin.js             # Logique admin panel
│   ├── candidats.js         # Logique galerie candidats
│   ├── resultats.js         # Logique résultats
│   ├── dashboard.js         # Logique dashboard
│   ├── contact.js           # Logique formulaire contact
│   └── assets/              # Images, logos
└── scripts/
    └── backup_db.sh         # Sauvegarde automatique
```

## 🎨 Technologies Utilisées

### Backend
- **Python 3.9+** avec `http.server` (pas de framework tiers)
- **PostgreSQL** pour la persistance
- **psycopg3** pour driver DB
- **Requests** pour webhooks/API externes

### Frontend
- **HTML5** avec sémantique
- **CSS3** modernes (Grid, Flexbox, variables CSS)
- **Vanilla JavaScript** (pas de framework)
- **Chart.js** pour graphiques
- **Base64** pour authentification

### Sécurité
- **CORS headers** pour prévention d'abus
- **Security headers** (CSP, HSTS, X-Frame-Options)
- **XSS sanitization** (escape HTML)
- **Rate limiting** par IP et action
- **HTTPS forced** en production
- **SHA256** password hashing

## 🌍 Déploiement

### Sur Render.com

1. **Fork/Push du repo GitHub**
```bash
git remote add origin <your-github-repo>
git push -u origin main
```

2. **Créer Web Service Render**
   - Repository: Votre repo GitHub
   - Build: `pip install -r requirements.txt`
   - Start: `python app.py`
   - Port: 3000

3. **Configurer Variables d'Environnement**
   - Dashboard Render → Environment
   - Ajouter toutes les vars du section "Variables d'Environnement"

4. **Configurer PostgreSQL**
   - Créer PostgreSQL Database sur Render
   - Copier DATABASE_URL → Web Service env

5. **Optionnel: Cloudinary**
   - S'inscrire sur cloudinary.com
   - Copier credentials → Web Service env

### Avec Docker

```dockerfile
FROM python:3.11
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "app.py"]
```

```bash
docker build -t quiz-islamique .
docker run -p 3000:3000 -e DATABASE_URL=... quiz-islamique
```

## 🧪 Test

### Test Local
```bash
# 1. Ouvrir http://localhost:3000
# 2. Admin: http://localhost:3000/admin.html
# 3. Login: identifiants définis via ADMIN_USERNAME / ADMIN_PASSWORD
# 4. Tester inscription, vote, notation
```

### Test Endpoints
```bash
# Santé serveur
curl http://localhost:3000/api/health

# Candidats publics
curl http://localhost:3000/api/public-candidates

# Admin (avec auth)
curl -H "Authorization: Basic $(echo -n \"$ADMIN_USERNAME:$ADMIN_PASSWORD\" | base64)" \
  http://localhost:3000/api/candidates
```

## 📝 Logs et Monitoring

### Consulter les logs
```bash
# Local
tail -f /tmp/app.log

# Render
Render Dashboard → Logs
```

### Erreurs Courantes

| Erreur | Cause | Solution |
|--------|-------|----------|
| `DATABASE_URL not configured` | Pas de variable env | Ajouter DATABASE_URL |
| `401 Unauthorized` | Mauvais credentials | Vérifier admin/password |
| `413 Payload Too Large` | Upload trop gros | Max 3MB |
| `CORS error` | Domaine non autorisé | Ajouter à CORS headers |

## 🔧 Dépannage : Erreur base de données sur Render

Si vous voyez « Erreur base de données. Vérifiez DATABASE_URL... » :

1. **Utiliser l’URL externe**  
   Render Dashboard → base PostgreSQL → **Connect** → **External**  
   Copier l’URL complète (du type `postgresql://user:pass@dpg-xxx-a.oregon-postgres.render.com/dbname`)

2. **Définir `DATABASE_EXTERNAL_URL`**  
   Dashboard → service web → **Environment** → ajouter :  
   `DATABASE_EXTERNAL_URL` = l’URL externe copiée

3. **Sauvegarder** et redéployer (ou attendre le redéploiement automatique).

## 🚨 Sécurité en Production

- ✅ **Activer HTTPS**: Render le force automatiquement
- ✅ **Changer mot de passe admin**: Via formulaire sécurité
- ✅ **Utiliser variables d'environnement**: Jamais en dur dans le code
- ✅ **Enable rate limiting**: Déjà implémenté
- ✅ **Backup BD réguliers**: Via cron Render
- ✅ **Monitoring**: Configurer alertes Render
- ⚠️ **NEVER**: Partager DATABASE_URL, commiter secrets

## 📄 Licence & Crédits

**Association des Serviteurs d'Allah Azawajal**
- Contactez: admin@quizislamique.com
- WhatsApp: +225 01 50 07 00 83

---

## 📚 Documentation v2.0 - Nouvelles Fonctionnalités

### Guides Disponibles

| Document | Contenu | Audience |
|----------|---------|----------|
| [NEW_FEATURES_API_DOCUMENTATION.md](NEW_FEATURES_API_DOCUMENTATION.md) | Référence complète des 27 endpoints | Développeurs backend |
| [FRONTEND_INTEGRATION_GUIDE.md](FRONTEND_INTEGRATION_GUIDE.md) | Exemples d'intégration HTML/CSS/JS | Développeurs frontend |
| [DEPLOYMENT_&_TESTING_GUIDE.md](DEPLOYMENT_&_TESTING_GUIDE.md) | Procédures test + déploiement | DevOps / QA |
| [FEATURES_IMPLEMENTATION_SUMMARY.md](FEATURES_IMPLEMENTATION_SUMMARY.md) | Résumé technique complet | Chefs de projet |
| [QUICK_REFERENCE_v2.md](QUICK_REFERENCE_v2.md) | Guide rapide API | Tous |

### Début Rapide - v2.0

**1. Tester un endpoint (After npm install):**
```bash
curl http://localhost:3000/api/analytics/overview
```

**2. Intégrer frontend** (voir [FRONTEND_INTEGRATION_GUIDE.md](FRONTEND_INTEGRATION_GUIDE.md)):
- Ajouter boutons like/comment/share
- Formulaire upload photo
- Affichage code QR donations
- Dashboard analytics

---

**Version**: 2.0.0  
**Dernière mise à jour**: Février 2026  
**Statut**: Production ✓  
**Support**: GitHub Issues ou Email  
