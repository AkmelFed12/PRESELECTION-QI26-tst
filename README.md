# Plateforme de présélection — Quiz Islamique 2026

Application web professionnelle pour l'Association des Serviteurs d'Allah Azawajal.

## Fonctionnalités

- Inscription publique des candidats (WhatsApp obligatoire).
- Enregistrement en base SQLite.
- Redirection automatique vers le WhatsApp admin après inscription.
- Espace admin protégé (identifiant `ASAAQI`, mot de passe `2026ASAA`).
- Vue admin des candidatures.
- Vote public pour les candidats.
- Notation admin après chaque passage et classement automatique.
- Paramétrage complet du format de compétition (64 candidats max, barrages, groupes, finale) avec modification manuelle.

## Lancer le projet

```bash
python3 app.py
```

Puis ouvrir: http://localhost:3000

## Deployer sur Render

- Type: Web Service
- Build: `pip install -r requirements.txt`
- Start: `python app.py`

Pour un usage production, placez le service derriere un proxy HTTPS (Caddy/Nginx/Render).

## Base de donnees et photos

- Base: PostgreSQL Render (variable `DATABASE_URL`)
- Photos: Cloudinary

Variables d'environnement a configurer:
- `DATABASE_URL`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_WHATSAPP` (optionnel)
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_FOLDER` (optionnel, defaut: `quiz-islamique`)

Notifications email (optionnel):
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM`
- `SMTP_TO`

## Sauvegarde automatique (Google Drive)

Un cron job Render peut exporter la base et envoyer un dump quotidien sur Google Drive.
Variables d'environnement pour le cron:
- `DATABASE_URL`
- `RCLONE_CONFIG` (contenu du fichier rclone.conf)
- `GDRIVE_FOLDER` (optionnel, defaut: `QI26-Backups`)
