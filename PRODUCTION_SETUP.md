# 🚀 PRODUCTION SETUP GUIDE

**Last Updated:** 2026-04-29  
**Status:** Ready for Deployment

---

## ✅ Pre-Deployment Checklist

### 1. Environment Configuration

```bash
# Copy the template and configure
cp .env.example .env.local

# Edit .env.local with production values:
# - DATABASE_URL (external PostgreSQL connection)
# - ADMIN_USERNAME & ADMIN_PASSWORD (strong credentials)
# - SMTP settings (email notifications)
# - JWT_SECRET (random 32+ character string)
# - CLOUDINARY credentials (optional, for image uploads)
```

### 2. Secure Git History

```bash
# Remove sensitive files from Git history
./scripts/cleanup-git-secrets.ps1    # Windows
# OR
bash scripts/cleanup-git-secrets.sh  # Linux/Mac
```

### 3. Database Initialization

```bash
# Ensure all tables exist (via migration scripts)
node sql-migrations/run-migrations.js

# Verify database connection
npm run test:db
```

### 4. Dependencies Installation

```bash
# Install Node.js dependencies
npm install

# Python backend (if used)
pip install -r requirements.txt
```

### 5. Security Verification

```bash
# Check for secrets in staged files
npm run check:secrets

# Verify no .env files in Git
git ls-files | grep -E "\.env|\.key|\.pem"
# Should return nothing

# Check Git history for secrets (optional but recommended)
npm run audit:git-history
```

---

## 🔐 Sensitive Information Checklist

### Must NOT be in Git
- ❌ `.env` files (all variations)
- ❌ Private keys (`.pem`, `.key`, `.crt`)
- ❌ Credentials files
- ❌ API tokens and secrets
- ❌ Database passwords
- ❌ JWT secrets

### Must be in Git
- ✅ `.env.example` (safe template)
- ✅ `.gitignore` (security rules)
- ✅ Source code (`.js`, `.py`)
- ✅ Configuration files (without secrets)
- ✅ Documentation

### Use Environment Variables For
```
DATABASE_URL=postgres://...
ADMIN_PASSWORD=STRONG_RANDOM_PASSWORD
JWT_SECRET=RANDOM_32_CHAR_SECRET
CLOUDINARY_URL=cloudinary://...
SMTP_PASSWORD=...
API_KEY_THIRD_PARTY=...
```

---

## 🚀 Deployment Steps

### Option 1: Render (Recommended)

```bash
# 1. Push code to GitHub
git push origin main

# 2. Connect GitHub repo to Render
# - Create new Web Service
# - Link to GitHub repository

# 3. Add environment variables in Render dashboard
# Settings > Environment > Add from file or manually

# 4. Set build command
npm install

# 5. Set start command
npm start

# 6. Deploy
# Render will automatically deploy on push
```

### Option 2: Vercel

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy
vercel

# 4. Add environment variables
vercel env add DATABASE_URL
vercel env add ADMIN_PASSWORD
# ... (repeat for all variables)

# 5. Redeploy with env vars
vercel --prod
```

### Option 3: Traditional VPS

```bash
# 1. SSH into server
ssh user@your-server.com

# 2. Clone repository
git clone https://github.com/your-repo.git
cd your-repo

# 3. Install dependencies
npm install

# 4. Create .env file (NOT .env.local)
nano .env
# Paste production values

# 5. Start service with PM2
npm install -g pm2
pm2 start server.js --name "asaa-api"
pm2 save
pm2 startup

# 6. Setup reverse proxy (nginx)
# Create /etc/nginx/sites-available/asaa-api
# Point to localhost:3000 (or your port)

# 7. Enable HTTPS with Let's Encrypt
sudo certbot certonly --standalone -d your-domain.com
```

---

## 🧪 Post-Deployment Testing

### 1. Basic Health Checks

```bash
# Test API is running
curl https://your-domain.com/api/health

# Should return: { status: "OK", timestamp: "..." }
```

### 2. Authentication Tests

```bash
# Test admin login
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "YOUR_ADMIN_PASSWORD"
  }'

# Should return: { token: "...", user: {...} }
```

### 3. Social Features Tests

```bash
# Get user profile
curl https://your-domain.com/api/social/profile/QI2600001 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should return user profile data
```

### 4. WebSocket Test

```bash
# Test real-time chat connection
wscat -c wss://your-domain.com/ws/chat

# Expected: Connection successful
# Then send: {"type":"join","token":"...","groupId":"..."}
```

### 5. Database Tests

```bash
# Verify database connection
node -e "
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool();
pool.query('SELECT 1', (err, res) => {
  if (err) console.error('DB Error:', err);
  else console.log('✅ DB Connected');
  process.exit(0);
});
"
```

---

## 📊 Monitoring & Logging

### Production Monitoring

```javascript
// Add to server.js or monitoring module
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Usage
logger.info('Application started');
logger.error('Database connection failed', error);
```

### Metrics to Monitor
- API response times (target: <200ms)
- Error rate (target: <1%)
- Database query performance
- WebSocket connection stability
- Memory usage
- CPU usage
- Disk space

### Alerting
Setup alerts for:
- Server down (5xx errors)
- Database connection issues
- High error rates (>5%)
- Resource exhaustion (>90%)

---

## 🔄 Maintenance & Updates

### Regular Tasks
- [ ] Review error logs weekly
- [ ] Backup database daily
- [ ] Update dependencies monthly
- [ ] Rotate admin passwords quarterly
- [ ] Review security patches

### Dependency Updates
```bash
# Check for outdated packages
npm outdated

# Update all to latest
npm update

# Or use npm-check-updates for more control
npx npm-check-updates -u
npm install
```

### Database Backups
```bash
# PostgreSQL backup
pg_dump -h your-host.com -U username -d database_name > backup.sql

# Restore from backup
psql -h your-host.com -U username -d database_name < backup.sql
```

---

## 🆘 Troubleshooting

### "Cannot connect to database"
```
1. Verify DATABASE_URL is correct
2. Check firewall rules allow connection
3. Verify PostgreSQL server is running
4. Check credentials in .env
```

### "WebSocket connections failing"
```
1. Verify proxy supports WebSocket (Upgrade header)
2. Check socket.io/ws port configuration
3. Review browser console for errors
4. Check server logs: logs/*.log
```

### "Admin login not working"
```
1. Verify ADMIN_PASSWORD in .env
2. Check admin_sessions table exists
3. Review admin authentication logs
4. Clear browser cache and try again
```

### "High database latency"
```
1. Check query logs for slow queries
2. Verify indexes exist on frequently queried columns
3. Monitor database server resources
4. Consider connection pooling optimization
5. Review query execution plans
```

### "Memory leak detected"
```
1. Check for unclosed database connections
2. Verify WebSocket connections are cleaned up on disconnect
3. Review EventEmitter listeners
4. Use: node --inspect server.js (then chrome://inspect)
```

---

## 📋 Security Hardening Checklist

- [ ] All `.env` files removed from Git
- [ ] `.gitignore` includes all sensitive files
- [ ] Admin password is 12+ characters with mixed case/numbers/symbols
- [ ] Database passwords are strong and unique
- [ ] HTTPS/SSL enabled on all endpoints
- [ ] Rate limiting configured (25 req/15min per IP)
- [ ] CORS properly configured (not `*`)
- [ ] Input validation on all endpoints
- [ ] SQL injection protection (parameterized queries)
- [ ] XSS protection (HTML sanitization)
- [ ] CSRF tokens on state-changing operations
- [ ] Logging configured for audit trail
- [ ] Database backups automated
- [ ] Security headers configured (CSP, X-Frame-Options, etc.)
- [ ] Regular security audits scheduled

---

## 📞 Support Resources

- **Issues:** Check logs in `logs/` directory
- **Documentation:** See `SECURITY_FIXES.md`, `CODE_AUDIT_SUMMARY.md`
- **Source Code:** All modules have JSDoc comments
- **Database Schema:** See `sql-migrations/` directory
- **API Docs:** Endpoints listed in `CODE_AUDIT_SUMMARY.md`

---

**Next Steps:**
1. Review this checklist
2. Configure `.env` file
3. Run pre-deployment tests
4. Deploy to staging environment first
5. Run full test suite
6. Deploy to production
7. Monitor logs closely for first 24 hours

**Questions?** Review individual module files for detailed implementation info.
