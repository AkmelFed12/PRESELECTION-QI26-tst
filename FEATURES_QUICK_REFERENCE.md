# ⚡ Quick Reference - 4 Features

## 🔔 Notifications
**Récupérer:** `GET /api/notifications?userId=123`
**Marquer lue:** `POST /api/notifications/:id/read`
**Supprimer:** `DELETE /api/notifications/:id`

## 🏆 Achievements
**Utilisateur:** `GET /api/achievements/user/:userId`
**Leaderboard:** `GET /api/achievements/leaderboard?limit=50`
**12 badges** disponibles avec points

## 📄 Rapports
**Utilisateur PDF/CSV/JSON:** `GET /api/reports/user/:userId?format=pdf|csv|json`
**Admin:** `GET /api/reports/admin?startDate=2026-01-01&endDate=2026-12-31`

## 🛡️ Modération
**Analyser:** `POST /api/moderation/analyze` → Score 0-100
**Reporter:** `POST /api/moderation/report`
**Rapports:** `GET /api/moderation/reports?status=pending`
**Approuver:** `POST /api/moderation/reports/:id/approve`
**Rejeter:** `POST /api/moderation/reports/:id/reject`
**Bannir:** `POST /api/moderation/users/:userId/ban` (avec duration optionnelle)
**Débannir:** `POST /api/moderation/users/:userId/unban`

## 📊 Tables Créées
- ✅ `notifications`
- ✅ `achievements_unlocked`
- ✅ `moderation_reports`
- ✅ Colonnes `achievement_points`, `is_banned` ajoutées à `users`

## 🚀 Déploiement
✅ Push: `git push` → Vercel déploiera automatiquement
✅ Version: 2.0.0
✅ Production Ready
