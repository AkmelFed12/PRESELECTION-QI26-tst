#!/bin/bash
# ==================== GIT SECURITY CLEANUP ====================
# Remove sensitive files from Git history
# Use this ONLY if .env.local or other secrets were accidentally committed

echo "🔐 Starting Git security cleanup..."
echo ""

# Remove .env.local from all commits
echo "1️⃣  Removing .env.local from Git history..."
git filter-branch --tree-filter 'rm -f .env.local' --prune-empty -f

# Remove other potential sensitive files
echo "2️⃣  Removing other sensitive files..."
git filter-branch --tree-filter 'rm -f .env' --prune-empty -f
git filter-branch --tree-filter 'rm -f .vercel/auth.json' --prune-empty -f

# Remove from refs
echo "3️⃣  Cleaning up refs..."
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Verify
echo ""
echo "4️⃣  Verification..."
echo "Files in Git (should NOT contain .env.local):"
git ls-files | grep -E "\.(env|key|pem|crt|json)" || echo "✅ No sensitive files found in git index"

echo ""
echo "✅ Git history cleaned!"
echo ""
echo "⚠️  IMPORTANT NEXT STEPS:"
echo "1. Force push to remote: git push origin --force --all"
echo "2. Force push tags: git push origin --force --tags"
echo "3. Alert your team about the history rewrite"
echo "4. Everyone should re-clone the repository"
echo ""
echo "For GitHub: Settings > Security > Secret scanning will flag exposed secrets"
