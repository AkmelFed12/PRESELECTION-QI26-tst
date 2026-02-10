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

## Base de donnees et photos

- Base: PostgreSQL Render (variable `DATABASE_URL`)
- Photos: Cloudinary

Variables d'environnement a configurer:
- `DATABASE_URL`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_FOLDER` (optionnel, defaut: `quiz-islamique`)
