# 🚀 DÉPLOIEMENT RAPIDE SUR VERCEL

## ✅ Prérequis complétés:
- ✅ Code Node.js validé
- ✅ package.json configuré
- ✅ vercel.json créé
- ✅ GitHub repository connecté
- ✅ Vercel CLI installé

## 🎯 Instructions de déploiement:

### Étape 1: Créer/Connecter compte Vercel (si non fait)
```bash
vercel login
# → Ouvrir le navigateur et autoriser Vercel
```

### Étape 2: Déployer en production
```bash
cd "e:\PRESELECTION-QI26 tst"
vercel --prod
```

### Étape 3: Configurer les variables d'environnement

Lors du déploiement, Vercel vous demandera les variables. Entrez:

```
DATABASE_URL=postgresql://user:password@host:5432/quiz26
ADMIN_USERNAME=asaa2026
ADMIN_PASSWORD=ASAALMO2026
ADMIN_WHATSAPP=2250150070083
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=email@gmail.com
SMTP_PASSWORD=password
SMTP_FROM=noreply@asaa.com
SMTP_TO=admin@asaa.com
NODE_ENV=production
CORS_ORIGIN=*
```

### Étape 4: Confirmez le déploiement

Vercel va:
1. Installer les dépendances (npm install)
2. Builder l'application
3. Déployer sur les serveurs mondiaux
4. Vous donner une URL publique

Le déploiement prend environ 2-3 minutes.

---

## 📋 Checklist avant production:

- [ ] Base de données PostgreSQL prête
- [ ] Variables d'environnement (DATABASE_URL, etc.)
- [ ] Email configuré (optionnel mais recommandé)
- [ ] Domaine personnalisé (optionnel)

---

## 🌐 Après le déploiement:

Votre application sera accessible à:
```
https://preselection-qi26-tst.vercel.app
```

Ou avec domaine personnalisé:
```
https://votre-domaine.com
```

---

## 📊 Monitoring en production:

```bash
# Voir les logs en temps réel
vercel logs

# Voir le dashboard
vercel dashboard preselection-qi26-tst
```

---

**Êtes-vous prêt? Lancez `vercel --prod` pour déployer!**
