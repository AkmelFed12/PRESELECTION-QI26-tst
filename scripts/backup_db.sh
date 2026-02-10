#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set."
  exit 1
fi

if [[ -z "${RCLONE_CONFIG:-}" ]]; then
  echo "RCLONE_CONFIG is not set."
  exit 1
fi

GDRIVE_FOLDER="${GDRIVE_FOLDER:-QI26-Backups}"
BACKUP_DIR="${BACKUP_DIR:-/tmp/db-backups}"
DATE_TAG="$(date +%Y-%m-%d_%H-%M-%S)"
FILENAME="preselection_qi26_${DATE_TAG}.sql.gz"

mkdir -p "$BACKUP_DIR"

mkdir -p "$HOME/.config/rclone"
printf '%s\n' "$RCLONE_CONFIG" > "$HOME/.config/rclone/rclone.conf"

echo "Creating database dump..."
pg_dump "$DATABASE_URL" | gzip > "${BACKUP_DIR}/${FILENAME}"

echo "Uploading to Google Drive..."
rclone copy "${BACKUP_DIR}/${FILENAME}" "gdrive:${GDRIVE_FOLDER}"

echo "Backup completed: ${FILENAME}"
