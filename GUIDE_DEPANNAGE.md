# 🚀 Guide de Dépannage - Quiz Islamique 2026

## ✅ Vérifications Préalables

### 1. Base de Données PostgreSQL sur Render

**Étapes pour vérifier/créer votre base de données:**

1. Connectez-vous à [Render Dashboard](https://dashboard.render.com)
2. Vérifiez que vous avez une base PostgreSQL nommée `preselection-qi26-db`
3. Si elle n'existe pas:
   - Cliquez sur "New +" → "PostgreSQL"
   - Nom: `preselection-qi26-db`
   - Plan: **Free**
   - Région: Choisissez la plus proche (ex: Frankfurt, Oregon)

### 2. Variables d'Environnement sur Render

**Sur votre service web Render:**

1. Allez dans votre service web "preselection-qi26"
2. Onglet "Environment"
3. Vérifiez ces variables:

```bash
# OBLIGATOIRE - URL de connexion à la base
DATABASE_URL=<auto-rempli par Render depuis votre DB>

# OU si problème, utilisez External URL
DATABASE_EXTERNAL_URL=postgresql://user:password@dpg-xxx.oregon-postgres.render.com/db_name

# Identifiants admin (définis dans render.yaml)
ADMIN_USERNAME=asaa2026
ADMIN_PASSWORD=ASAALMO2026

# Optionnel - WhatsApp admin
ADMIN_WHATSAPP=2250150070083

# Optionnel - Pool de connexions (désactivé par défaut sur Free tier)
USE_DB_POOL=0
```

### 3. Obtenir l'External URL de votre base

**Important pour Free tier Render:**

1. Allez dans votre base PostgreSQL sur Render Dashboard
2. Section "Connections"
3. Copiez **"External Database URL"** (pas Internal)
4. Format: `postgresql://user:password@dpg-xxx.oregon-postgres.render.com:5432/db_name`
5. Ajoutez cette variable: `DATABASE_EXTERNAL_URL=<URL copiée>`

## 🔧 Problèmes Courants et Solutions

### Erreur: "Connection refused" ou "Database not found"

**Solution:**
```bash
# Sur Render, ajoutez cette variable d'environnement:
DATABASE_EXTERNAL_URL=<votre External URL PostgreSQL>

# Le code utilisera automatiquement DATABASE_EXTERNAL_URL en priorité
```

### Erreur: "SSL required"

**Solution:** Déjà géré dans app.py (lignes 100-103). Le code force SSL automatiquement.

### Erreur: "Connection timeout"

**Solution:**
- Le code inclut déjà un timeout de 60s (ligne 103)
- Sur Free tier, la base dort après 15 min d'inactivité
- Premier chargement peut prendre 30-60 secondes

### Page blanche ou erreur 500

**Diagnostic:**
1. Vérifiez les logs Render: Dashboard → Service → Logs
2. Cherchez les erreurs de connexion DB
3. Vérifiez que `DATABASE_URL` ou `DATABASE_EXTERNAL_URL` est défini

**Solution:**
```bash
# Relancez le déploiement après avoir vérifié les variables
# Render Dashboard → Service → Manual Deploy → Clear build cache & deploy
```

## 📋 Checklist de Mise en Production

- [ ] Base PostgreSQL créée sur Render (Free tier)
- [ ] Service Web créé et déployé depuis GitHub
- [ ] Variable `DATABASE_URL` ou `DATABASE_EXTERNAL_URL` définie
- [ ] Variables `ADMIN_USERNAME` et `ADMIN_PASSWORD` définies
- [ ] Premier démarrage réussi (voir logs: "Base de données initialisée")
- [ ] Page d'accueil accessible: https://preselection-qi26.onrender.com
- [ ] Connexion admin fonctionne: https://preselection-qi26.onrender.com/admin.html
- [ ] Inscription de test réussie

## 🔍 Commandes de Diagnostic Local

Si vous voulez tester en local avant de déployer:

```bash
# 1. Créer une base PostgreSQL locale
# Installer PostgreSQL puis:
psql -U postgres
CREATE DATABASE quiz26;
\q

# 2. Créer fichier .env
cp .env.example .env

# 3. Éditer .env avec vos identifiants
# DATABASE_URL=postgresql://postgres:votreMotDePasse@localhost:5432/quiz26

# 4. Installer les dépendances
pip install -r requirements.txt

# 5. Lancer le serveur
python app.py

# 6. Ouvrir le navigateur
# http://localhost:3000
```

## 🆘 Dépannage Avancé

### Réinitialiser la Base de Données

Si votre base est corrompue:

1. Render Dashboard → PostgreSQL → Settings
2. Danger Zone → "Delete Database" (⚠️ supprime toutes les données)
3. Recréez une nouvelle base
4. Redéployez le service web (les tables seront recréées automatiquement)

### Vérifier la Connexion à la Base

Depuis Render Shell (Dashboard → Service → Shell):

```bash
python3 << 'EOF'
import os
import psycopg

url = os.environ.get('DATABASE_EXTERNAL_URL') or os.environ.get('DATABASE_URL')
print(f"URL: {url[:50]}...")

try:
    conn = psycopg.connect(url)
    print("✅ Connexion réussie!")
    conn.close()
except Exception as e:
    print(f"❌ Erreur: {e}")
EOF
```

### Logs Render en Temps Réel

Pour suivre les erreurs:
1. Render Dashboard → Service → Logs
2. Activez "Live Logs"
3. Observez pendant que vous testez votre site

## 📞 Support

En cas de problème persistant:

1. **Vérifiez les logs Render** (indicatifs de l'erreur)
2. **Consultez la documentation Render**: https://render.com/docs/databases
3. **Contactez moi via WhatsApp**: +225 01 50 07 00 83

## 🎯 URLs Importantes

- **Site public**: https://preselection-qi26.onrender.com
- **Admin**: https://preselection-qi26.onrender.com/admin.html
- **Dashboard**: https://preselection-qi26.onrender.com/dashboard.html
- **Résultats**: https://preselection-qi26.onrender.com/resultats.html
- **Quiz 2025**: https://preselection-qi26.onrender.com/quiz-2025.html

## ✨ Identifiants Admin par Défaut

```
Identifiant: asaa2026
Mot de passe: ASAALMO2026
```

⚠️ **Changez le mot de passe après première connexion** via le panneau admin → Sécurité
