# 🚀 VERCEL DEPLOYMENT GUIDE

## Vue d'ensemble

Votre application **Quiz Islamique 2026** est maintenant prête pour le déploiement sur **Vercel** - une plateforme serverless ultra-rapide et scalable.

**Stack:**
- **Frontend:** HTML5, CSS3, JavaScript Vanilla (inchangé)
- **Backend:** Node.js 18.x + Express.js
- **Database:** PostgreSQL (Render, AWS, ou autre)
- **Hosting:** Vercel (serverless)

---

## 📋 Pré-déploiement - Checklist

Avant de déployer, assurez-vous d'avoir:

- [ ] **Compte Vercel gratuit** → https://vercel.com/signup
- [ ] **PostgreSQL Database prête** (URL de connexion)
- [ ] **Variables d'environnement documentées**
- [ ] **Code poussé sur GitHub** ✅ (déjà fait)
- [ ] **Vercel CLI installé** ✅ (déjà fait)

---

## 🔧 Variables d'Environnement Requises

Avant le déploiement, préparez ces variables:

### Obligatoires:
```env
DATABASE_URL=postgresql://user:password@host:5432/quiz26
ADMIN_USERNAME=asaa2026
ADMIN_PASSWORD=ASAALMO2026
```

### Recommandés:
```env
ADMIN_WHATSAPP=2250150070083
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASSWORD=votre-mot-de-passe
SMTP_FROM=noreply@asaa.com
SMTP_TO=admin@asaa.com
CORS_ORIGIN=https://preselection-qi26-tst.vercel.app
NODE_ENV=production
```

### Optionnels:
```env
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
```

---

## 🚀 Déploiement Rapide (3 étapes)

### Étape 1: Se connecter à Vercel

```bash
cd "e:\PRESELECTION-QI26 tst"
vercel login
```

Cela ouvrira votre navigateur pour autoriser l'accès.

### Étape 2: Configurer le projet

Vercel détectera automatiquement:
- ✅ Framework: Express.js
- ✅ Node version: 18.x
- ✅ Install command: npm ci
- ✅ Build command: npm run build

**Ne changez rien, cliquez "Deploy"**

### Étape 3: Ajouter les variables d'environnement

Dans Vercel Dashboard:

1. Allez sur votre projet
2. **Settings** → **Environment Variables**
3. Ajoutez **DATABASE_URL** et autres variables
4. Sauvegardez

---

## 💻 Déploiement avec CLI (Recommandé)

### Option 1: Déploiement automatique avec script

#### Sur Windows (PowerShell):
```bash
cd "e:\PRESELECTION-QI26 tst"
.\deploy.ps1
```

#### Sur Windows (CMD):
```bash
cd "e:\PRESELECTION-QI26 tst"
deploy.bat
```

#### Sur Mac/Linux:
```bash
cd ~/PRESELECTION-QI26-tst
npm install -g vercel
vercel login
vercel --prod
```

### Option 2: Déploiement manuel étape par étape

```bash
# Étape 1: Se connecter
vercel login

# Étape 2: Déployer
vercel --prod

# (Vous serez guidé étape par étape pour les variables)
```

---

## 🌐 Déploiement via Dashboard Vercel (Alternative)

Si vous préférez l'interface web:

1. Allez sur https://vercel.com/dashboard
2. Cliquez **"New Project"**
3. Sélectionnez votre repository GitHub `PRESELECTION-QI26-tst`
4. Cliquez **"Import"**
5. Dans **Environment Variables**, remplissez:
   - `DATABASE_URL`
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - (autres variables)
6. Cliquez **"Deploy"**

---

## ✅ Vérification Post-Déploiement

Après le déploiement (2-3 minutes):

### 1. Tester l'URL publique

Vercel vous donnera une URL comme:
```
https://preselection-qi26-tst.vercel.app
```

Visitez-la et vérifiez que:
- ✅ Page d'accueil charge
- ✅ Candidats se chargent
- ✅ Formulaire de contact fonctionne

### 2. Tester l'API

```bash
# Vérifier la santé
curl https://preselection-qi26-tst.vercel.app/api/health

# Récupérer les candidats
curl https://preselection-qi26-tst.vercel.app/api/public-candidates

# Vérifier l'admin
curl -H "Authorization: Basic YXNhYTIwMjY6QVNBQUxNTzIwMjY=" \
  https://preselection-qi26-tst.vercel.app/api/admin/dashboard
```

### 3. Vérifier les logs

```bash
vercel logs preselection-qi26-tst --prod
```

---

## 🎯 Configuration Domaine Personnalisé (Optionnel)

Si vous avez un domaine personnalisé:

1. **Dans Vercel Dashboard:**
   - Settings → Domains
   - Entrez votre domaine (ex: `preselection.com`)

2. **Configurez les DNS records** selon les instructions Vercel

3. **Vérifiez après 5-10 minutes**

---

## 🔄 Redéployement Automatique

**C'est automatique!** À chaque push vers `main`:

```bash
git add .
git commit -m "Your message"
git push origin main
```

Vercel détecte le changement et redéploie automatiquement en ~1 minute.

---

## 🐛 Troubleshooting

### ❌ "Database connection failed"

**Solution:**
```
1. Vérifiez DATABASE_URL est correcte
2. Assurez-vous que la DB accepte les connexions externes
3. Vérifiez les credentials
4. Redéployez: vercel --prod
```

### ❌ "Module not found"

**Solution:**
```bash
npm install
npm ci
vercel --prod
```

### ❌ "Timeout"

**Solution:**
```
1. Vérifiez que la DB repond
2. Augmentez le timeout (vercel settings)
3. Redéployez
```

### ❌ "CORS issues"

**Solution:**
```
Mettez à jour CORS_ORIGIN dans les variables d'environnement
Et redéployez: vercel --prod
```

---

## 📊 Monitoring & Analytics

```bash
# Logs en temps réel
vercel logs preselection-qi26-tst --prod

# Voir les deployments
vercel list

# Analytica du projet
vercel analytics
```

---

## 🔒 Sécurité en Production

✅ **Déjà implémenté:**
- HTTPS obligatoire
- Security headers (HSTS, CSP, X-Frame-Options)
- Rate limiting
- CORS configuré
- Password hashing bcrypt
- Input validation

✅ **À vérifier:**
- DATABASE_URL n'est PAS exposée publiquement
- Secrets sont dans les variables d'environnement
- Pas de credentials en dur dans le code
- CORS_ORIGIN limité à votre domaine

---

## 📞 Support & Ressources

- **Vercel Docs:** https://vercel.com/docs
- **GitHub Repo:** https://github.com/AkmelFed12/PRESELECTION-QI26-tst
- **Vercel Support:** https://vercel.com/support
- **Status Page:** https://www.vercelstatus.com

---

## ✨ Résumé

Votre application **Quiz Islamique 2026** est prête pour la production!

**Pour déployer maintenant:**

```bash
cd "e:\PRESELECTION-QI26 tst"
vercel login
vercel --prod
```

**Cela prendra 2-3 minutes et votre app sera en LIVE!** 🎉

---

**Besoin d'aide?** Consultez `DEPLOYMENT_GUIDE.md` pour plus de détails.
