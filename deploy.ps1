#!/usr/bin/env pwsh

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "   DEPLOIEMENT VERCEL" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier que nous sommes dans le bon dossier
if (-not (Test-Path "server.js")) {
    Write-Host "Erreur: server.js introuvable!" -ForegroundColor Red
    Write-Host "Assurez-vous d'être dans le dossier PRESELECTION-QI26-tst" -ForegroundColor Red
    Read-Host "Pressed Enter to exit"
    exit 1
}

# Vérifier que Vercel CLI est installé
$vercel = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercel) {
    Write-Host "Vercel CLI non trouvé. Installation..." -ForegroundColor Yellow
    npm install -g vercel
}

Write-Host ""
Write-Host "✅ Préparation terminée" -ForegroundColor Green
Write-Host ""
Write-Host "Étapes suivantes:" -ForegroundColor Cyan
Write-Host "1. vercel login        (se connecter à Vercel si ce n'est pas fait)"
Write-Host "2. vercel --prod       (déployer en production)"
Write-Host ""
Read-Host "Appuyez sur Enter pour continuer"

# Demander la connexion
Write-Host ""
Write-Host "[1/2] Connexion à Vercel..." -ForegroundColor Cyan
vercel login

# Déployer
Write-Host ""
Write-Host "[2/2] Déploiement en production..." -ForegroundColor Cyan
vercel --prod

Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "   DÉPLOIEMENT TERMINÉ!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
