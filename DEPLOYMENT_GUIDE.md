# 🚀 Guide de Déploiement Vercel

## Prérequis

- Node.js 18.x installé localement
- Compte Vercel (gratuit sur https://vercel.com)
- Repository GitHub: https://github.com/AkmelFed12/PRESELECTION-QI26-tst
- Base de données PostgreSQL (Render, AWS, ou autre)

## Installation Locale

```bash
# Cloner le repository
git clone https://github.com/AkmelFed12/PRESELECTION-QI26-tst.git
cd PRESELECTION-QI26-tst

# Installer les dépendances
npm install

# Créer .env local
cp .env.example .env

# Remplir les variables d'environnement
nano .env  # ou ouvrir avec votre éditeur

# Lancer le serveur local
npm start
```

## Variables d'Environnement Requises

```env
# Database (obligatoire)
DATABASE_URL=postgresql://user:password@host:5432/quiz26

# Admin credentials
ADMIN_USERNAME=asaa2026
ADMIN_PASSWORD=ASAALMO2026
ADMIN_WHATSAPP=2250150070083

# Email (optionnel mais recommandé)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=xxxx
SMTP_FROM=noreply@asaa.com
SMTP_TO=admin@asaa.com

# Cloudinary (optionnel pour uploads photos)
CLOUDINARY_CLOUD_NAME=xxxx
CLOUDINARY_API_KEY=xxxx
CLOUDINARY_API_SECRET=xxxx

# Server
PORT=10000
NODE_ENV=production
CORS_ORIGIN=https://your-vercel-domain.vercel.app
```

## Déploiement sur Vercel

### Option 1: Vercel CLI (Recommandé)

```bash
# Installer Vercel CLI
npm install -g vercel

# Se connecter à Vercel
vercel login

# Déployer
vercel --prod
```

### Option 2: Dashboard Vercel

1. Allez sur https://vercel.com/dashboard
2. Cliquez "New Project"
3. Connectez votre repository GitHub
4. Sélectionnez `PRESELECTION-QI26-tst`
5. Configurez les variables d'environnement dans "Environment Variables"
6. Cliquez "Deploy"

### Option 3: Depuis GitHub

1. Push votre code vers GitHub
2. Vercel détecte le changement automatiquement (si configuré avec Git Integration)
3. Un aperçu de déploiement est généré
4. Confirmez pour déployer en production

## Configuration Vercel Avancée

### Domaine personnalisé

1. Dans Vercel Dashboard → Settings → Domains
2. Ajoutez votre domaine personnalisé
3. Configurez les DNS records selon les instructions Vercel

### Automations & Webhooks

```bash
# Les déploiements automatiques sont activés par défaut
# Chaque push vers main redéploie automatiquement
```

## Monitoring & Logs

```bash
# Voir les logs en temps réel
vercel logs

# Voir les variables d'environnement
vercel env list

# Accéder au tableau de bord
vercel dashboard
```

## Troubleshooting

### Erreur: Database connection failed

```
- Vérifier DATABASE_URL
- S'assurer que la DB est accessible depuis Vercel
- Ajouter l'IP Vercel à la whitelist (si applicable)
```

### Erreur: Module not found

```bash
# Réinstaller les dépendances
npm ci
vercel deploy --prod
```

### Erreur: CORS issues

```
- Mettre à jour CORS_ORIGIN avec votre URL Vercel
- Réconfigurer la variable d'environnement
```

## URLs Utiles

- **Dashboard Vercel:** https://vercel.com/dashboard
- **Logs Vercel:** https://vercel.com/docs/monitoring/logs
- **Documentation Vercel:** https://vercel.com/docs

## Support

Pour toute question:
- Documentations Vercel: https://vercel.com/docs
- Support Vercel: https://vercel.com/support
- Repository GitHub: https://github.com/AkmelFed12/PRESELECTION-QI26-tst
