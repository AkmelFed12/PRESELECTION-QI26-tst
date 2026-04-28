# ==================== GIT SECURITY CLEANUP (WINDOWS) ====================
# Remove sensitive files from Git history
# Use this ONLY if .env.local or other secrets were accidentally committed
# Run in PowerShell

Write-Host "🔐 Starting Git security cleanup..." -ForegroundColor Cyan
Write-Host ""

# Check if BFG Repo-Cleaner is available (recommended for Windows)
$bfgPath = "bfg.jar"
$hasBfg = Test-Path $bfgPath

if ($hasBfg) {
    Write-Host "Using BFG Repo-Cleaner (recommended for security)..." -ForegroundColor Yellow
    java -jar bfg.jar --delete-files ".env*" .
    java -jar bfg.jar --delete-files "*.pem" .
    java -jar bfg.jar --delete-files "*.key" .
    java -jar bfg.jar --delete-files "auth.json" .
    java -jar bfg.jar -r -D ".vercel" .
    git reflog expire --expire=now --all
    git gc --prune=now --aggressive
} else {
    Write-Host "Using git filter-branch (slower, but works)..." -ForegroundColor Yellow
    
    # Remove .env.local
    Write-Host "1️⃣  Removing .env.local from Git history..." -ForegroundColor Green
    git filter-branch --tree-filter 'Remove-Item -Path ".env.local" -ErrorAction SilentlyContinue' --prune-empty -f
    
    # Remove .env
    Write-Host "2️⃣  Removing .env from Git history..." -ForegroundColor Green
    git filter-branch --tree-filter 'Remove-Item -Path ".env" -ErrorAction SilentlyContinue' --prune-empty -f
    
    # Remove vercel auth
    Write-Host "3️⃣  Removing .vercel secrets..." -ForegroundColor Green
    git filter-branch --tree-filter 'Remove-Item -Path ".vercel/auth.json" -ErrorAction SilentlyContinue' --prune-empty -f
    
    # Cleanup
    Write-Host "4️⃣  Cleaning up refs..." -ForegroundColor Green
    Remove-Item -Path ".git/refs/original/" -Recurse -Force -ErrorAction SilentlyContinue
    git reflog expire --expire=now --all
    git gc --prune=now --aggressive
}

# Verify
Write-Host ""
Write-Host "5️⃣  Verification..." -ForegroundColor Green
$sensitiveFiles = git ls-files | Select-String -Pattern '\.(env|key|pem|crt|json)$'
if ($sensitiveFiles) {
    Write-Host "⚠️  WARNING: Found potentially sensitive files:" -ForegroundColor Red
    Write-Host $sensitiveFiles
} else {
    Write-Host "✅ No sensitive files found in git index" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ Git history cleaned!" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  IMPORTANT NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. Force push to remote: git push origin --force --all" -ForegroundColor Yellow
Write-Host "2. Force push tags: git push origin --force --tags" -ForegroundColor Yellow
Write-Host "3. Alert your team about the history rewrite" -ForegroundColor Yellow
Write-Host "4. Everyone should re-clone the repository" -ForegroundColor Yellow
Write-Host ""
Write-Host "For GitHub/GitLab:" -ForegroundColor Cyan
Write-Host "- Check secret scanning settings (GitHub will flag exposed secrets)" -ForegroundColor Gray
Write-Host "- Rotate all compromised credentials immediately" -ForegroundColor Gray
