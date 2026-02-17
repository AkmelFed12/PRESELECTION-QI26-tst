@echo off
REM Script de déploiement Vercel pour Windows

echo.
echo ====================================
echo   DÉPLOIEMENT VERCEL
echo ====================================
echo.

REM Vérifier que nous sommes dans le bon dossier
if not exist "server.js" (
    echo Erreur: server.js introuvable!
    echo Assurez-vous d'être dans le dossier PRESELECTION-QI26-tst
    pause
    exit /b 1
)

REM Vérifier que Vercel CLI est installé
where vercel >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Vercel CLI non trouvé. Installation...
    call npm install -g vercel
)

echo.
echo ✅ Préparation terminée
echo.
echo Étapes suivantes:
echo 1. vercel login        (se connecter à Vercel si ce n'est pas fait)
echo 2. vercel --prod       (déployer en production)
echo.
echo Appuyez sur Enter pour continuer...
pause

REM Demander la connexion
echo.
echo [1/2] Connexion à Vercel...
call vercel login

REM Déployer
echo.
echo [2/2] Déploiement en production...
call vercel --prod

echo.
echo ====================================
echo   DÉPLOIEMENT TERMINÉ!
echo ====================================
echo.
pause
