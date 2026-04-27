# 🚀 4 Nouvelles Features Principales

## 📋 Sommaire
1. **Notifications en Temps Réel** - Pour les mises à jour instantanées
2. **Système de Badges/Achievements** - Pour la gamification
3. **Export de Rapports** - Pour l'analyse et reporting
4. **Modération du Contenu** - Pour la sécurité et conformité

---

## 1️⃣ Notifications en Temps Réel

### Description
Système de notifications instantanées avec support WebSocket et persistance en base de données.

### API Endpoints

#### Récupérer les notifications
```bash
GET /api/notifications?userId=123
```

Retourne les 50 dernières notifications de l'utilisateur.

#### Marquer comme lue
```bash
POST /api/notifications/:id/read
```

#### Supprimer une notification
```bash
DELETE /api/notifications/:id
```

### Usage en Frontend
```javascript
// Se connecter aux notifications WebSocket
const ws = new WebSocket('ws://localhost:10000/api/notifications?userId=123');

ws.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  console.log('Nouvelle notification:', notification);
  // {
  //   type: 'notification',
  //   id: 1,
  //   title: 'Nouveau Quiz',
  //   message: 'Un nouveau quiz est disponible',
  //   type: 'info',
  //   timestamp: '2026-04-27T10:30:00Z'
  // }
};
```

### Types de Notifications
- `info` - Information générale
- `warning` - Avertissement
- `error` - Erreur
- `success` - Succès
- `achievement` - Achievement débloqué

---

## 2️⃣ Système de Badges/Achievements

### Description
Système complet de badges permettant de récompenser l'engagement utilisateur.

### Achievements Disponibles

| Badge | ID | Points | Condition |
|-------|-----|--------|-----------|
| 🎓 Premier Quiz | `first_quiz` | 10 | Complétez votre 1er quiz |
| 👑 Maître du Quiz | `quiz_master` | 100 | Complétez 50+ quiz |
| ⭐ Score Parfait | `perfect_score` | 50 | Obtenez 100% |
| 🦋 Papillon Social | `social_butterfly` | 30 | 50+ contributions sociales |
| 💬 Maître du Chat | `chat_master` | 40 | 100+ messages |
| 🏅 Top 10 | `top_10` | 75 | Classement Top 10 |
| 🥇 Top 5 | `top_5` | 150 | Classement Top 5 |
| 🏆 Champion | `champion` | 200 | Classement #1 |
| 🔥 Semaine Active | `week_active` | 25 | Actif 7 jours |
| 💪 Mois Actif | `month_active` | 60 | Actif 30 jours |
| 🤝 Membre Utile | `helpful_member` | 45 | 100+ votes positifs |
| ✅ Utilisateur Confiance | `trusted_user` | 80 | 500+ interactions |

### API Endpoints

#### Récupérer les achievements d'un utilisateur
```bash
GET /api/achievements/user/:userId
```

Response:
```json
{
  "achievements": [
    {
      "id": "first_quiz",
      "name": "Premier Quiz",
      "icon": "🎓",
      "points": 10,
      "unlockedAt": "2026-04-27T10:30:00Z"
    }
  ],
  "stats": {
    "totalUnlocked": 5,
    "totalPoints": 245,
    "availableCount": 12
  },
  "availableAchievements": [...]
}
```

#### Leaderboard des Achievements
```bash
GET /api/achievements/leaderboard?limit=50
```

---

## 3️⃣ Export de Rapports

### Description
Génération de rapports personnalisés en PDF, CSV ou JSON.

### API Endpoints

#### Rapport Utilisateur
```bash
GET /api/reports/user/:userId?format=pdf|csv|json
```

**Formats disponibles:**
- `pdf` - Document PDF formaté (téléchargement)
- `csv` - Fichier Excel (téléchargement)
- `json` - Format JSON (API)

**Contenu du rapport:**
- Informations personnelles
- Statistiques (quizzes, scores moyens)
- Historique des quiz
- Achievements débloqués

#### Rapport d'Administration
```bash
GET /api/reports/admin?startDate=2026-01-01&endDate=2026-12-31
```

Response:
```json
{
  "globalStatistics": {
    "total_users": 1500,
    "total_quiz_attempts": 5230,
    "avg_score": 72.5,
    "max_score": 100
  },
  "topActiveUsers": [...],
  "successMetrics": {
    "total": 5230,
    "passed": 3890,
    "pass_rate": 74.43
  }
}
```

### Exemple d'Usage Frontend
```javascript
// Télécharger un rapport PDF
fetch('/api/reports/user/123?format=pdf')
  .then(res => res.blob())
  .then(blob => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rapport-user-123.pdf';
    a.click();
  });

// Obtenir rapport JSON
fetch('/api/reports/user/123?format=json')
  .then(res => res.json())
  .then(data => console.log(data));
```

---

## 4️⃣ Modération du Contenu

### Description
Système complet de modération pour gérer le contenu utilisateur et les rapports.

### API Endpoints

#### Analyser le contenu
```bash
POST /api/moderation/analyze
Content-Type: application/json

{
  "content": "Votre texte à analyser"
}
```

Response:
```json
{
  "isSpam": false,
  "hasProfanity": false,
  "hasExcessiveUrls": false,
  "issues": ["Trop de majuscules"],
  "score": 85
}
```

#### Créer un rapport
```bash
POST /api/moderation/report
Content-Type: application/json

{
  "contentId": 123,
  "contentType": "chat_message",
  "reason": "Langage inapproprié",
  "reportedBy": 456
}
```

Types de contenu: `chat_message`, `comment`, `post`

#### Récupérer les rapports
```bash
GET /api/moderation/reports?status=pending
```

Status: `pending`, `approved`, `rejected`

#### Approuver un contenu
```bash
POST /api/moderation/reports/:id/approve
Content-Type: application/json

{
  "moderatorId": 789
}
```

#### Rejeter un contenu
```bash
POST /api/moderation/reports/:id/reject
Content-Type: application/json

{
  "moderatorId": 789,
  "reason": "Contenu violant les règles de la communauté"
}
```

### Gestion des Utilisateurs

#### Bannir un utilisateur
```bash
POST /api/moderation/users/:userId/ban
Content-Type: application/json

{
  "reason": "Violation des conditions d'utilisation",
  "duration": 2592000000  // 30 jours en millisecondes (optionnel)
}
```

#### Débannir un utilisateur
```bash
POST /api/moderation/users/:userId/unban
```

#### Lister les utilisateurs bannis
```bash
GET /api/moderation/users/banned
```

### Règles de Modération Automatiques

Le système analyse automatiquement:
- ✅ Longueur minimale/maximale du contenu
- ✅ Profanités (patterns configurables)
- ✅ Spam (URLs excessives, répétitions)
- ✅ MAJUSCULES excessives
- ✅ Score de conformité (0-100)

---

## 📊 Intégration Base de Données

Les 4 features utilisent les tables suivantes:

### Notifications
```sql
notifications (
  id, user_id, title, message, type, metadata, 
  created_at, read_at
)
```

### Achievements
```sql
achievements_unlocked (
  id, user_id, achievement_id, unlocked_at
)
-- Colonne ajoutée à 'users':
-- achievement_points (INTEGER)
```

### Reports
```sql
-- Aucune nouvelle table, utilise les données existantes
-- Génère des rapports à partir de:
-- quiz_scores, achievements_unlocked, users
```

### Moderation
```sql
moderation_reports (
  id, content_id, content_type, reason, 
  reported_by, status, moderated_by, 
  moderated_at, created_at
)
-- Colonnes ajoutées à 'users':
-- is_banned, ban_reason, ban_until, banned_at
```

---

## 🔧 Configuration & Déploiement

### Étape 1: Migration Base de Données
Les tables sont créées automatiquement au démarrage du serveur.

### Étape 2: Tester les Endpoints
```bash
# Test notifications
curl http://localhost:10000/api/notifications?userId=1

# Test achievements
curl http://localhost:10000/api/achievements/user/1

# Test rapports
curl http://localhost:10000/api/reports/user/1?format=json

# Test modération
curl -X POST http://localhost:10000/api/moderation/analyze \
  -H "Content-Type: application/json" \
  -d '{"content":"Contenu à analyser"}'
```

### Étape 3: Déploiement Vercel
```bash
git push
# Vercel sera déclenché automatiquement
```

---

## 🎯 Cas d'Usage

### Notifications
- Alertes quiz disponibles
- Nouveaux messages
- Achievements débloqués
- Notifications admin

### Achievements
- Motiver les utilisateurs
- Gamification
- Leaderboard basé sur points
- Badges sociaux

### Rapports
- Progression personnelle
- Analytics administrateur
- Export statistiques
- Conformité/Audit

### Modération
- Contenu inapproprié
- Spam
- Utilisateurs toxiques
- Conformité communautaire

---

## 📞 Support

Pour des questions ou problèmes:
1. Vérifier les logs du serveur
2. Consulter les endpoints de debug
3. Contacter l'équipe dev

---

**Déployé:** 27 Avril 2026
**Version:** 2.0.0
**Status:** ✅ Production Ready
