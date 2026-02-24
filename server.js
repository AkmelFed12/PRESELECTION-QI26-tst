import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdir, stat, access } from 'fs/promises';
import { createReadStream, readFileSync } from 'fs';
import { createHash } from 'crypto';
import rateLimit from 'express-rate-limit';
import pkg from 'pg';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import axios from 'axios';
import nodemailer from 'nodemailer';

dotenv.config();

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ==================== CONFIGURATION ====================
const app = express();
const PORT = process.env.PORT || 10000;

// Database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/quiz26',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (error) => {
  console.error('Unexpected error on idle client', error);
  process.exit(-1);
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static(join(__dirname, 'public')));
// CORS config: credentials only with explicit origin
if (process.env.CORS_ORIGIN) {
  app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
} else {
  app.use(cors({ origin: '*', credentials: false }));
}

// Rate limiters
const registerLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 requêtes par window
  message: 'Trop de tentatives, réessayez plus tard.'
});

const voteLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: 'Trop de votes, réessayez plus tard.'
});

const contactLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 8,
  message: 'Trop de tentatives de contact, réessayez plus tard.'
});

// Constants
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'asaa2026';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ASAALMO2026';
const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP || '2250150070083';
const CODE_PREFIX = 'QI26';
const DEFAULT_COUNTRY = process.env.DEFAULT_COUNTRY || "COTE D'IVOIRE";

// Email config
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  } : undefined
});

// ==================== HELPERS ====================
function sanitizeString(value, maxLength = null) {
  if (typeof value !== 'string') return '';
  let str = value.trim();
  if (maxLength) str = str.substring(0, maxLength);
  return str;
}

async function hashPassword(password) {
  if (!password) return '';
  return await bcrypt.hash(password, 12);
}

async function checkPassword(password, hash) {
  if (!password || !hash) return false;
  try {
    return await bcrypt.compare(password, hash);
  } catch (e) {
    return false;
  }
}

function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return email.length <= 120 && pattern.test(email);
}

function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const digits = phone.replace(/\\D/g, '');
  return digits.length >= 8 && digits.length <= 20;
}

function normalizeWhatsapp(value) {
  if (!value) return '';
  let raw = value.toString().trim().replace(/[^\d+]/g, '');
  if (raw.startsWith('00')) {
    raw = '+' + raw.substring(2);
  }
  if (!/^\+?[1-9]\d{6,14}$/.test(raw)) return '';
  if (!raw.startsWith('+')) raw = '+' + raw;
  return raw;
}

function normalizeCommune(value) {
  const cleaned = sanitizeString(value, 100);
  return cleaned ? cleaned.toUpperCase() : '';
}

function loadManualCandidates() {
  try {
    const path = join(__dirname, 'data', 'manual_candidates.json');
    const raw = readFileSync(path, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch (error) {
    console.warn('⚠️ Impossible de charger data/manual_candidates.json:', error.message);
  }
  return [];
}

function hashManualCandidates(list) {
  try {
    const payload = JSON.stringify(list || []);
    return createHash('sha256').update(payload).digest('hex');
  } catch {
    return '';
  }
}

async function replaceCandidatesFromManualList(manualCandidates) {
  if (!Array.isArray(manualCandidates) || manualCandidates.length === 0) return 0;
  await pool.query('BEGIN');
  await pool.query('DELETE FROM candidates');
  let inserted = 0;
  for (const entry of manualCandidates) {
    const normalizedWhatsapp = normalizeWhatsapp(entry.whatsapp);
    if (!normalizedWhatsapp) continue;
    const name = sanitizeString(entry.name, 255) || 'Inconnu';
    const commune = normalizeCommune(entry.city);
    const candidateId = Number(entry.id) || null;
    const candidateCode = candidateId
      ? `${CODE_PREFIX}-${String(candidateId).padStart(3, '0')}`
      : null;
    await pool.query(
      `INSERT INTO candidates (id, candidateCode, fullName, city, country, whatsapp, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'approved')`,
      [candidateId, candidateCode, name, commune, DEFAULT_COUNTRY, normalizedWhatsapp]
    );
    inserted += 1;
  }
  await pool.query(
    `SELECT setval(pg_get_serial_sequence('candidates','id'), (SELECT COALESCE(MAX(id), 1) FROM candidates))`
  );
  await pool.query(
    "INSERT INTO admin_config (key, value) VALUES ('manual_candidates_imported_2026', $1)\n     ON CONFLICT (key) DO UPDATE SET value = $1",
    [new Date().toISOString()]
  );
  await pool.query('COMMIT');
  return inserted;
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.ip || req.connection.remoteAddress || 'unknown';
}

function getFrontendUrl(req) {
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.get('host') || '';
  return `${proto}://${host}`;
}

function normalizeSettingsRow(row) {
  if (!row) return {
    votingEnabled: 0,
    registrationLocked: 0,
    competitionClosed: 0,
    announcementText: '',
    scheduleJson: '[]'
  };
  return {
    votingEnabled: row.votingenabled ?? row.votingEnabled ?? 0,
    registrationLocked: row.registrationlocked ?? row.registrationLocked ?? 0,
    competitionClosed: row.competitionclosed ?? row.competitionClosed ?? 0,
    announcementText: row.announcementtext ?? row.announcementText ?? '',
    scheduleJson: row.schedulejson ?? row.scheduleJson ?? '[]'
  };
}

// ==================== SECURITY HEADERS ====================
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  );
  
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
});

// ==================== AUTHENTICATION ====================
async function verifyAdmin(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = req.headers['x-admin-token'] || '';

  // Allow token-based auth (simpler for clients)
  if (auth.startsWith('Bearer ')) {
    const bearer = auth.slice(7).trim();
    if (bearer && (bearer === ADMIN_PASSWORD || bearer === ADMIN_USERNAME)) {
      req.adminUser = ADMIN_USERNAME;
      return next();
    }
  }

  if (token && (token === ADMIN_PASSWORD || token === ADMIN_USERNAME)) {
    req.adminUser = ADMIN_USERNAME;
    return next();
  }

  if (!auth.startsWith('Basic ')) {
    return res.status(401).json({ message: 'Accès non autorisé' });
  }

  try {
    const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf-8');
    const [username, password] = decoded.split(':');

    if (username !== ADMIN_USERNAME) {
      return res.status(401).json({ message: 'Accès non autorisé' });
    }

    // Obtenir le hash du mot de passe depuis DB
    const result = await pool.query(
      "SELECT value FROM admin_config WHERE key = 'admin_password_hash' LIMIT 1"
    );
    
    const adminHash = result.rows[0]?.value || await hashPassword(ADMIN_PASSWORD);
    let valid = await checkPassword(password, adminHash);

    // Fallback: allow current ADMIN_PASSWORD and update stored hash
    if (!valid && password === ADMIN_PASSWORD) {
      valid = true;
      const newHash = await hashPassword(ADMIN_PASSWORD);
      await pool.query(
        "INSERT INTO admin_config (key, value) VALUES ('admin_password_hash', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
        [newHash]
      );
    }

    if (!valid) {
      return res.status(401).json({ message: 'Accès non autorisé' });
    }

    req.adminUser = username;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Accès non autorisé' });
  }
}

// ==================== DATABASE ====================
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS candidates (
        id BIGSERIAL PRIMARY KEY,
        candidateCode TEXT UNIQUE,
        fullName TEXT NOT NULL,
        age INTEGER,
        city TEXT,
        country TEXT,
        email TEXT,
        phone TEXT,
        whatsapp TEXT NOT NULL UNIQUE,
        photoUrl TEXT,
        quranLevel TEXT,
        motivation TEXT,
        status TEXT DEFAULT 'pending',
        createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS votes (
        id BIGSERIAL PRIMARY KEY,
        candidateId BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
        voterName TEXT,
        voterContact TEXT,
        ip TEXT,
        createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS scores (
        id BIGSERIAL PRIMARY KEY,
        candidateId BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
        judgeName TEXT NOT NULL,
        themeChosenScore REAL DEFAULT 0,
        themeImposedScore REAL DEFAULT 0,
        notes TEXT,
        createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tournament_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        maxCandidates INTEGER DEFAULT 64,
        directQualified INTEGER DEFAULT 16,
        playoffParticipants INTEGER DEFAULT 32,
        playoffWinners INTEGER DEFAULT 16,
        groupsCount INTEGER DEFAULT 8,
        candidatesPerGroup INTEGER DEFAULT 4,
        finalistsFromWinners INTEGER DEFAULT 8,
        finalistsFromBestSecond INTEGER DEFAULT 2,
        totalFinalists INTEGER DEFAULT 10,
        votingEnabled INTEGER DEFAULT 0,
        registrationLocked INTEGER DEFAULT 0,
        competitionClosed INTEGER DEFAULT 0,
        announcementText TEXT DEFAULT '',
        scheduleJson TEXT DEFAULT '[]',
        updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS admin_audit (
        id BIGSERIAL PRIMARY KEY,
        action TEXT NOT NULL,
        payload TEXT,
        ip TEXT,
        createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS contact_messages (
        id BIGSERIAL PRIMARY KEY,
        fullName TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        ip TEXT,
        archived INTEGER DEFAULT 0,
        createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS admin_config (
        key TEXT PRIMARY KEY,
        value TEXT,
        updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS posts (
        id BIGSERIAL PRIMARY KEY,
        authorName TEXT NOT NULL,
        authorEmail TEXT,
        content TEXT NOT NULL,
        imageUrl TEXT,
        status TEXT DEFAULT 'pending',
        createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        approvedAt TIMESTAMP WITH TIME ZONE,
        approvedBy TEXT
      );

      CREATE TABLE IF NOT EXISTS stories (
        id BIGSERIAL PRIMARY KEY,
        authorName TEXT NOT NULL,
        authorEmail TEXT,
        content TEXT NOT NULL,
        mediaUrl TEXT,
        status TEXT DEFAULT 'pending',
        expiresAt TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours',
        createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        approvedAt TIMESTAMP WITH TIME ZONE,
        approvedBy TEXT
      );

      CREATE TABLE IF NOT EXISTS admin_media (
        id BIGSERIAL PRIMARY KEY,
        filename TEXT NOT NULL,
        filepath TEXT,
        category TEXT DEFAULT 'quiz-2025',
        caption TEXT,
        displayOrder INTEGER DEFAULT 0,
        hidden INTEGER DEFAULT 0,
        uploadedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS media_events (
        name TEXT PRIMARY KEY,
        views BIGINT DEFAULT 0,
        downloads BIGINT DEFAULT 0,
        favorites BIGINT DEFAULT 0,
        updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS post_reactions (
        id BIGSERIAL PRIMARY KEY,
        postId BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        reaction TEXT NOT NULL,
        ip TEXT,
        createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS poll (
        id BIGSERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        optionsJson TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS poll_votes (
        id BIGSERIAL PRIMARY KEY,
        pollId BIGINT NOT NULL REFERENCES poll(id) ON DELETE CASCADE,
        optionKey TEXT NOT NULL,
        ip TEXT,
        createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(pollId, ip)
      );

      CREATE TABLE IF NOT EXISTS donations (
        id BIGSERIAL PRIMARY KEY,
        donorName TEXT NOT NULL,
        donorEmail TEXT,
        amount DECIMAL(10, 2),
        currency TEXT DEFAULT 'XOF',
        paymentMethod TEXT,
        message TEXT,
        status TEXT DEFAULT 'pending',
        createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS post_likes (
        id BIGSERIAL PRIMARY KEY,
        postId BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        likerEmail TEXT NOT NULL,
        createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(postId, likerEmail)
      );

      CREATE TABLE IF NOT EXISTS post_comments (
        id BIGSERIAL PRIMARY KEY,
        postId BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        authorName TEXT NOT NULL,
        authorEmail TEXT NOT NULL,
        content TEXT NOT NULL,
        status TEXT DEFAULT 'approved',
        createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS post_shares (
        id BIGSERIAL PRIMARY KEY,
        postId BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        shareMethod TEXT,
        sharerId TEXT,
        createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS engagement_stats (
        id BIGSERIAL PRIMARY KEY,
        contentType TEXT NOT NULL,
        contentId BIGINT NOT NULL,
        likesCount INTEGER DEFAULT 0,
        sharesCount INTEGER DEFAULT 0,
        commentsCount INTEGER DEFAULT 0,
        viewsCount INTEGER DEFAULT 0,
        lastUpdated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS story_likes (
        id BIGSERIAL PRIMARY KEY,
        storyId BIGINT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
        likerEmail TEXT NOT NULL,
        createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(storyId, likerEmail)
      );

      INSERT INTO tournament_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

      CREATE INDEX IF NOT EXISTS idx_votes_candidate ON votes(candidateId);
      CREATE INDEX IF NOT EXISTS idx_scores_candidate ON scores(candidateId);
      CREATE INDEX IF NOT EXISTS idx_votes_candidate_ip ON votes(candidateId, ip);
      CREATE INDEX IF NOT EXISTS idx_contact_archived ON contact_messages(archived);
      CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
      CREATE INDEX IF NOT EXISTS idx_stories_status ON stories(status);
      CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expiresAt);
      CREATE INDEX IF NOT EXISTS idx_post_likes ON post_likes(postId);
      CREATE INDEX IF NOT EXISTS idx_post_comments ON post_comments(postId);
      CREATE INDEX IF NOT EXISTS idx_post_shares ON post_shares(postId);
      CREATE INDEX IF NOT EXISTS idx_story_likes ON story_likes(storyId);
      CREATE INDEX IF NOT EXISTS idx_engagement_content ON engagement_stats(contentType, contentId);
      CREATE INDEX IF NOT EXISTS idx_admin_media_category ON admin_media(category);
      CREATE INDEX IF NOT EXISTS idx_admin_media_hidden ON admin_media(hidden);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_media_filename ON admin_media(filename);
      CREATE INDEX IF NOT EXISTS idx_media_events_updated ON media_events(updatedAt);
      CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON post_reactions(postId);
      CREATE INDEX IF NOT EXISTS idx_post_reactions_ip ON post_reactions(ip);
      CREATE INDEX IF NOT EXISTS idx_poll_active ON poll(active);
    `);

    await pool.query(`ALTER TABLE media_events ADD COLUMN IF NOT EXISTS favorites BIGINT DEFAULT 0;`);

    await pool.query(`
      INSERT INTO poll (question, optionsJson, active)
      SELECT 'Sondage du jour : Quel contenu préférez-vous ?', '["Quiz","Stories","Actualités","Galerie"]', 1
      WHERE NOT EXISTS (SELECT 1 FROM poll);
    `);

    // Auto-approve existing registrations + normalize country + candidate codes
    await pool.query(`UPDATE candidates SET status = 'approved' WHERE status IS NULL OR status != 'approved'`);
    await pool.query(`UPDATE candidates SET country = $1 WHERE country IS NULL OR TRIM(country) = ''`, [DEFAULT_COUNTRY]);
    await pool.query(`UPDATE candidates SET city = UPPER(city) WHERE city IS NOT NULL`);
    await pool.query(
      `UPDATE candidates
       SET candidateCode = $1 || '-' || LPAD(id::text, 3, '0')
       WHERE candidateCode IS NULL OR candidateCode = ''`,
      [CODE_PREFIX]
    );

    // Replace candidates with manual list if data mismatch detected
    const manualCandidates = loadManualCandidates();
    if (manualCandidates.length > 0) {
      const currentHash = hashManualCandidates(manualCandidates);
      const storedHash = await pool.query(
        "SELECT value FROM admin_config WHERE key = 'manual_candidates_hash' LIMIT 1"
      );
      const previousHash = storedHash.rows[0]?.value || '';

      let shouldReplace = currentHash && currentHash !== previousHash;

      if (!shouldReplace) {
        const existingCount = await pool.query('SELECT COUNT(*)::int as count FROM candidates');
        if ((existingCount.rows[0]?.count || 0) < manualCandidates.length) {
          shouldReplace = true;
        }
      }

      if (shouldReplace) {
        await replaceCandidatesFromManualList(manualCandidates);
        if (currentHash) {
          await pool.query(
            "INSERT INTO admin_config (key, value) VALUES ('manual_candidates_hash', $1)\n             ON CONFLICT (key) DO UPDATE SET value = $1",
            [currentHash]
          );
        }
      }
    }

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
  }
}

// ==================== API ROUTES ====================

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'ok' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'error', error: error.message });
  }
});

// Public candidates
app.get('/api/public-candidates', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.candidateCode, c.fullName, c.city, c.country, c.photoUrl,
             c.quranLevel, c.motivation, c.createdAt,
             COALESCE(COUNT(v.id), 0) as totalVotes
      FROM candidates c
      LEFT JOIN votes v ON c.id = v.candidateId
      GROUP BY c.id
      ORDER BY c.id ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Public settings
app.get('/api/public-settings', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT votingEnabled, registrationLocked, competitionClosed, announcementText, scheduleJson FROM tournament_settings WHERE id = 1'
    );
    const normalized = normalizeSettingsRow(result.rows[0]);
    res.json(normalized);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Public results
app.get('/api/public-results', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.fullName, c.city, c.country, c.photoUrl,
             COALESCE(v.totalVotes, 0) as totalVotes,
             COALESCE(s.averageScore, 0) as averageScore
      FROM candidates c
      LEFT JOIN (
        SELECT candidateId, COUNT(*) as totalVotes FROM votes GROUP BY candidateId
      ) v ON c.id = v.candidateId
      LEFT JOIN (
        SELECT candidateId,
               CAST(AVG(COALESCE(themeChosenScore, 0) + COALESCE(themeImposedScore, 0)) AS NUMERIC(10,2)) as averageScore
        FROM scores GROUP BY candidateId
      ) s ON c.id = s.candidateId
      ORDER BY COALESCE(v.totalVotes, 0) DESC, c.fullName ASC
    `);
    
    const candidates = result.rows;
    const countries = new Set(candidates.map(r => r.country).filter(Boolean));
    const cities = new Set(candidates.map(r => r.city).filter(Boolean));
    const totalVotes = candidates.reduce((sum, r) => sum + (r.totalVotes || 0), 0);
    
    res.json({
      candidates,
      stats: {
        totalCandidates: candidates.length,
        totalVotes,
        countries: countries.size,
        cities: cities.size
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Registration endpoint
app.post('/api/register', registerLimiter, async (req, res) => {
  try {
    const { fullName, whatsapp, email, phone, city, country, age, quranLevel, motivation, photoUrl } = req.body;

    // Validate mandatory fields
    if (!fullName || !whatsapp) {
      return res.status(400).json({ message: 'Nom complet et WhatsApp obligatoires.' });
    }

    // Sanitize and validate lengths
    const sanitizedName = sanitizeString(fullName, 255);
    const sanitizedCity = normalizeCommune(city);
    const sanitizedCountry = sanitizeString(country, 100) || DEFAULT_COUNTRY;
    const sanitizedEmail = sanitizeString(email, 120);
    const sanitizedPhone = sanitizeString(phone, 30);
    const sanitizedQuranLevel = sanitizeString(quranLevel, 100);
    const sanitizedMotivation = sanitizeString(motivation, 1000);
    const sanitizedPhotoUrl = sanitizeString(photoUrl, 500);

    if (!sanitizedName || sanitizedName.length < 2) {
      return res.status(400).json({ message: 'Nom invalide.' });
    }
    if (!sanitizedCity) {
      return res.status(400).json({ message: 'Commune obligatoire.' });
    }

    const normalized = normalizeWhatsapp(whatsapp);
    if (!normalized) {
      return res.status(400).json({ message: 'Numéro WhatsApp invalide.' });
    }

    if (sanitizedEmail && !validateEmail(sanitizedEmail)) {
      return res.status(400).json({ message: 'Email invalide.' });
    }

    if (sanitizedPhone && !validatePhone(sanitizedPhone)) {
      return res.status(400).json({ message: 'Téléphone invalide.' });
    }

    // Check registration lock
    const settingsResult = await pool.query(
      'SELECT registrationLocked, competitionClosed FROM tournament_settings WHERE id = 1'
    );
    const settings = normalizeSettingsRow(settingsResult.rows[0]);
    if (settings.registrationLocked === 1 || settings.competitionClosed === 1) {
      return res.status(403).json({ message: 'Inscriptions fermées.' });
    }

    // Check duplicate
    const existResult = await pool.query(
      'SELECT id FROM candidates WHERE LOWER(fullName) = LOWER($1) AND whatsapp = $2',
      [sanitizedName, normalized]
    );
    if (existResult.rows.length > 0) {
      return res.status(409).json({ message: 'Utilisateur déjà enregistré.' });
    }

    const whatsappResult = await pool.query(
      'SELECT id FROM candidates WHERE whatsapp = $1',
      [normalized]
    );
    if (whatsappResult.rows.length > 0) {
      return res.status(409).json({ message: 'WhatsApp déjà utilisé.' });
    }

    // Insert candidate
    const insertResult = await pool.query(
      `INSERT INTO candidates (fullName, age, city, country, email, phone, whatsapp, photoUrl, quranLevel, motivation, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [sanitizedName, age || null, sanitizedCity, sanitizedCountry, sanitizedEmail, sanitizedPhone, normalized, sanitizedPhotoUrl, sanitizedQuranLevel, sanitizedMotivation, 'approved']
    );

    const candidateId = insertResult.rows[0].id;
    const candidateCode = `${CODE_PREFIX}-${String(candidateId).padStart(3, '0')}`;

    await pool.query(
      'UPDATE candidates SET candidateCode = $1 WHERE id = $2',
      [candidateCode, candidateId]
    );

    // Send emails
    if (email && process.env.SMTP_HOST) {
      try {
        const frontendUrl = getFrontendUrl(req);
        await transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: email,
          subject: `✅ Confirmation d'inscription - Quiz Islamique 2026 (${candidateCode})`,
          text: `Assalamou alaykoum ${fullName},\n\nVotre inscription a été enregistrée avec succès!\nCode candidat: ${candidateCode}\n\nConsultez: ${frontendUrl}`
        });
      } catch (emailError) {
        console.error('Email error:', emailError.message);
      }
    }

    const msg = `Assalamou alaykoum, je confirme mon inscription au Quiz Islamique 2026. Mon ID candidat est ${candidateId}.`;
    const whatsappRedirect = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(msg)}`;

    if (process.env.ADMIN_EMAIL) {
      await sendEmail(
        process.env.ADMIN_EMAIL,
        `🆕 Nouvelle inscription — ${sanitizedName}`,
        `<p>Nouvelle inscription reçue.</p>
         <ul>
           <li>Nom: ${sanitizeString(sanitizedName, 255)}</li>
           <li>WhatsApp: ${normalized}</li>
           <li>Pays/Ville: ${sanitizeString(sanitizedCountry, 100)} ${sanitizeString(sanitizedCity, 100)}</li>
           <li>Email: ${sanitizeString(sanitizedEmail, 120)}</li>
           <li>Code: ${candidateCode}</li>
         </ul>`
      );
    }

    res.status(201).json({
      message: 'Inscription enregistrée. Un email de confirmation vous a été envoyé.',
      candidateId,
      candidateCode,
      whatsappRedirect
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Vote endpoint
app.post('/api/votes', voteLimiter, async (req, res) => {
  try {
    const { candidateId, voterName, voterContact } = req.body;

    if (!candidateId) {
      return res.status(400).json({ message: 'Candidate ID requis.' });
    }

    const settingsResult = await pool.query(
      'SELECT votingEnabled, competitionClosed FROM tournament_settings WHERE id = 1'
    );
    const settings = normalizeSettingsRow(settingsResult.rows[0]);

    if (settings.votingEnabled !== 1 || settings.competitionClosed === 1) {
      return res.status(403).json({ message: 'Votes fermés.' });
    }

    const candidateResult = await pool.query(
      'SELECT id FROM candidates WHERE id = $1',
      [candidateId]
    );
    if (candidateResult.rows.length === 0) {
      return res.status(404).json({ message: 'Candidat introuvable.' });
    }

    const ip = getClientIp(req);
    const voteResult = await pool.query(
      `SELECT id FROM votes 
       WHERE candidateId = $1 AND ip = $2 AND createdAt > NOW() - INTERVAL '24 hours'`,
      [candidateId, ip]
    );
    if (voteResult.rows.length > 0) {
      return res.status(429).json({ message: 'Vote déjà enregistré pour ce candidat.' });
    }

    await pool.query(
      'INSERT INTO votes (candidateId, voterName, voterContact, ip) VALUES ($1, $2, $3, $4)',
      [candidateId, voterName, voterContact, ip]
    );

    res.status(201).json({ message: 'Vote enregistré.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Contact endpoint
app.post('/api/contact', contactLimiter, async (req, res) => {
  try {
    const { fullName, email, subject, message } = req.body;

    if (!fullName || !email || !subject || !message) {
      return res.status(400).json({ message: 'Tous les champs sont obligatoires.' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Email invalide.' });
    }

    const ip = getClientIp(req);

    await pool.query(
      'INSERT INTO contact_messages (fullName, email, subject, message, ip) VALUES ($1, $2, $3, $4, $5)',
      [fullName, email, subject, message, ip]
    );

    res.status(201).json({ message: 'Message envoyé. Nous vous répondrons rapidement.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin dashboard
app.get('/api/admin/dashboard', verifyAdmin, async (req, res) => {
  try {
    const [candidates, votes, ranking, settings, contacts, donationsPending] = await Promise.all([
      pool.query('SELECT * FROM candidates ORDER BY id DESC'),
      pool.query(`
        SELECT c.id, c.fullName, COUNT(v.id) as totalVotes
        FROM candidates c
        LEFT JOIN votes v ON c.id = v.candidateId
        GROUP BY c.id, c.fullName
        ORDER BY totalVotes DESC
      `),
      pool.query(`
        SELECT c.id, c.fullName,
               CAST(AVG(COALESCE(s.themeChosenScore, 0) + COALESCE(s.themeImposedScore, 0)) AS NUMERIC(10,2)) as averageScore,
               COUNT(s.id) as passages
        FROM candidates c
        LEFT JOIN scores s ON c.id = s.candidateId
        GROUP BY c.id, c.fullName
        ORDER BY averageScore DESC NULLS LAST
      `),
      pool.query('SELECT * FROM tournament_settings WHERE id = 1'),
      pool.query('SELECT * FROM contact_messages ORDER BY id DESC LIMIT 500'),
      pool.query(`SELECT COUNT(*)::int as count FROM donations WHERE status = 'pending'`)
    ]);

    res.json({
      candidates: candidates.rows,
      votes: votes.rows,
      ranking: ranking.rows,
      settings: settings.rows[0] || {},
      contacts: contacts.rows,
      stats: {
        candidates: candidates.rows.length,
        contacts: contacts.rows.length,
        donationsPending: parseInt(donationsPending.rows[0]?.count || 0, 10)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Change password
app.post('/api/admin/change-password', verifyAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'Mot de passe invalide.' });
    }

    const result = await pool.query(
      "SELECT value FROM admin_config WHERE key = 'admin_password_hash'"
    );
    const currentHash = result.rows[0]?.value || await hashPassword(ADMIN_PASSWORD);
    const valid = await checkPassword(currentPassword, currentHash);

    if (!valid) {
      return res.status(401).json({ message: 'Mot de passe actuel incorrect.' });
    }

    const newHash = await hashPassword(newPassword);
    await pool.query(
      "INSERT INTO admin_config (key, value) VALUES ('admin_password_hash', $1) ON CONFLICT (key) DO UPDATE SET value = $2",
      [newHash, newHash]
    );

    res.json({ message: 'Mot de passe changé avec succès.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin candidates management
app.post('/api/admin/candidates', verifyAdmin, async (req, res) => {
  try {
    const { fullName, whatsapp, email, phone, city, country, age, quranLevel, motivation, status, candidateId: candidateIdRaw } = req.body;
    const sanitizedName = sanitizeString(fullName, 255);
    const sanitizedCity = normalizeCommune(city);
    const sanitizedCountry = sanitizeString(country, 100) || DEFAULT_COUNTRY;
    const sanitizedEmail = sanitizeString(email, 120);
    const sanitizedPhone = sanitizeString(phone, 30);
    const sanitizedLevel = sanitizeString(quranLevel, 100);
    const sanitizedMotivation = sanitizeString(motivation, 1000);

    if (!sanitizedName || sanitizedName.length < 2) {
      return res.status(400).json({ message: 'Nom complet invalide.' });
    }

    const normalized = normalizeWhatsapp(whatsapp);
    if (!normalized) {
      return res.status(400).json({ message: 'Numéro WhatsApp invalide.' });
    }

    if (sanitizedEmail && !validateEmail(sanitizedEmail)) {
      return res.status(400).json({ message: 'Email invalide.' });
    }

    const safeStatus = ['approved', 'pending', 'eliminated'].includes(status) ? status : 'approved';
    const parsedId = Number(candidateIdRaw || 0);
    if (parsedId) {
      const conflict = await pool.query(
        'SELECT id FROM candidates WHERE whatsapp = $1 AND id <> $2',
        [normalized, parsedId]
      );
      if (conflict.rows.length > 0) {
        return res.status(409).json({ message: 'WhatsApp déjà utilisé par un autre candidat.' });
      }

      await pool.query(
        `UPDATE candidates
         SET fullName = $1,
             age = $2,
             city = $3,
             country = $4,
             email = $5,
             phone = $6,
             whatsapp = $7,
             quranLevel = $8,
             motivation = $9,
             status = $10
         WHERE id = $11`,
        [
          sanitizedName,
          age || null,
          sanitizedCity,
          sanitizedCountry,
          sanitizedEmail,
          sanitizedPhone,
          normalized,
          sanitizedLevel,
          sanitizedMotivation,
          safeStatus,
          parsedId
        ]
      );

      if (!sanitizedName) {
        await pool.query('UPDATE candidates SET fullName = $1 WHERE id = $2', ['Inconnu', parsedId]);
      }

      return res.json({ message: 'Candidat mis à jour.', candidateId: parsedId });
    }

    const result = await pool.query(
      `INSERT INTO candidates (fullName, age, city, country, email, phone, whatsapp, quranLevel, motivation, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        sanitizedName,
        age || null,
        sanitizedCity,
        sanitizedCountry,
        sanitizedEmail,
        sanitizedPhone,
        normalized,
        sanitizedLevel,
        sanitizedMotivation,
        safeStatus
      ]
    );

    const candidateId = result.rows[0].id;
    const candidateCode = `${CODE_PREFIX}-${String(candidateId).padStart(3, '0')}`;

    await pool.query(
      'UPDATE candidates SET candidateCode = $1 WHERE id = $2',
      [candidateCode, candidateId]
    );

    res.status(201).json({ message: 'Candidat ajouté.', candidateId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update tournament settings
app.put('/api/tournament-settings', verifyAdmin, async (req, res) => {
  try {
    const { votingEnabled, registrationLocked, competitionClosed, announcementText } = req.body;

    await pool.query(
      `UPDATE tournament_settings 
       SET votingEnabled = $1, registrationLocked = $2, competitionClosed = $3, announcementText = $4, updatedAt = NOW()
       WHERE id = 1`,
      [votingEnabled || 0, registrationLocked || 0, competitionClosed || 0, announcementText || '']
    );

    res.json({ message: 'Paramètres mis à jour.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== POSTS / FEED ENDPOINTS ====================

// POST - Submit a new post
app.post('/api/posts', async (req, res) => {
  try {
    const { authorName, authorEmail, content, imageUrl } = req.body;

    if (!authorName || !authorEmail || !content) {
      return res.status(400).json({ error: 'authorName, authorEmail, and content required' });
    }

    const sanitizedContent = content.replace(/[<>]/g, '').slice(0, 1000);
    
    const result = await pool.query(
      `INSERT INTO posts (authorName, authorEmail, content, imageUrl, status, createdAt)
       VALUES ($1, $2, $3, $4, 'pending', NOW())
       RETURNING id, createdAt`,
      [authorName.slice(0, 100), authorEmail.slice(0, 100), sanitizedContent, imageUrl?.slice(0, 500) || null]
    );

    res.status(201).json({ message: 'Post soumis pour approbation.', postId: result.rows[0].id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET - List approved posts (public feed)
app.get('/api/posts', async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const result = await pool.query(
      `SELECT p.id, p.authorName, p.content, p.imageUrl, p.createdAt, p.approvedAt,
              (SELECT COUNT(*) FROM post_likes WHERE postId = p.id) as likes,
              (SELECT COUNT(*) FROM post_comments WHERE postId = p.id AND status = 'approved') as comments,
              (SELECT COUNT(*) FROM post_shares WHERE postId = p.id) as shares,
              (SELECT COUNT(*) FROM post_reactions WHERE postId = p.id AND reaction = 'heart') as reactions_heart,
              (SELECT COUNT(*) FROM post_reactions WHERE postId = p.id AND reaction = 'thumb') as reactions_thumb,
              (SELECT COUNT(*) FROM post_reactions WHERE postId = p.id AND reaction = 'laugh') as reactions_laugh
       FROM posts p
       WHERE p.status = 'approved'
       ORDER BY p.approvedAt DESC
       LIMIT $1`,
      [limit]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET - Admin list all posts
app.get('/api/admin/posts', verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, authorName, authorEmail, content, imageUrl, status, createdAt, approvedAt, approvedBy 
       FROM posts 
       ORDER BY createdAt DESC 
       LIMIT 100`
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT - Admin approve/reject post
app.put('/api/admin/posts/:id', verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const postId = parseInt(req.params.id);

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'status must be approved or rejected' });
    }

    await pool.query(
      `UPDATE posts SET status = $1, approvedAt = NOW(), approvedBy = $2 WHERE id = $3`,
      [status, req.adminUser, postId]
    );

    res.json({ message: `Post ${status}.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE - Admin delete post
app.delete('/api/admin/posts/:id', verifyAdmin, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    await pool.query('DELETE FROM posts WHERE id = $1', [postId]);
    res.json({ message: 'Post supprimé.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== STORIES ENDPOINTS ====================

// POST - Submit a new story (24h expiration)
app.post('/api/stories', async (req, res) => {
  try {
    const { authorName, authorEmail, content, mediaUrl } = req.body;

    if (!authorName || !authorEmail || !content) {
      return res.status(400).json({ error: 'authorName, authorEmail, and content required' });
    }

    const sanitizedContent = content.replace(/[<>]/g, '').slice(0, 500);
    
    const result = await pool.query(
      `INSERT INTO stories (authorName, authorEmail, content, mediaUrl, status, expiresAt, createdAt)
       VALUES ($1, $2, $3, $4, 'pending', NOW() + INTERVAL '24 hours', NOW())
       RETURNING id, expiresAt`,
      [authorName.slice(0, 100), authorEmail.slice(0, 100), sanitizedContent, mediaUrl?.slice(0, 500) || null]
    );

    res.status(201).json({ message: 'Story soumise pour approbation.', storyId: result.rows[0].id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET - List active stories (within 24h)
app.get('/api/stories/active', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, authorName, content, mediaUrl, createdAt, expiresAt 
       FROM stories 
       WHERE status = 'approved' AND expiresAt > NOW() 
       ORDER BY createdAt DESC 
       LIMIT 20`
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET - Admin list all stories
app.get('/api/admin/stories', verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, authorName, authorEmail, content, mediaUrl, status, createdAt, expiresAt, approvedAt, approvedBy 
       FROM stories 
       ORDER BY createdAt DESC 
       LIMIT 100`
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT - Admin approve/reject story
app.put('/api/admin/stories/:id', verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const storyId = parseInt(req.params.id);

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'status must be approved or rejected' });
    }

    await pool.query(
      `UPDATE stories SET status = $1, approvedAt = NOW(), approvedBy = $2 WHERE id = $3`,
      [status, req.adminUser, storyId]
    );

    res.json({ message: `Story ${status}.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE - Admin delete story
app.delete('/api/admin/stories/:id', verifyAdmin, async (req, res) => {
  try {
    const storyId = parseInt(req.params.id);
    await pool.query('DELETE FROM stories WHERE id = $1', [storyId]);
    res.json({ message: 'Story supprimée.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Cron job - Delete expired stories (runs every 30 minutes)
setInterval(async () => {
  try {
    await pool.query('DELETE FROM stories WHERE expiresAt < NOW()');
  } catch (error) {
    console.error('Error deleting expired stories:', error);
  }
}, 30 * 60 * 1000);

// ==================== DONATIONS ENDPOINTS ====================

// POST - Record a donation
app.post('/api/donations', async (req, res) => {
  try {
    const { donorName, donorEmail, amount, currency, paymentMethod, message } = req.body;

    if (!donorName || !donorEmail || !amount || !paymentMethod) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const validMethods = ['MTN MONEY', 'OM', 'MOOV MONEY', 'Wave'];
    if (!validMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0 || numAmount > 1000000) {
      return res.status(400).json({ error: 'Invalid amount (must be 0-1000000)' });
    }

    const sanitizedMessage = message ? message.replace(/[<>]/g, '').slice(0, 500) : '';

    const result = await pool.query(
      `INSERT INTO donations (donorName, donorEmail, amount, currency, paymentMethod, message, status, createdAt)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
       RETURNING id, createdAt`,
      [donorName.slice(0, 100), donorEmail.slice(0, 100), numAmount, currency || 'FCA', paymentMethod, sanitizedMessage]
    );

    res.status(201).json({ message: 'Donation enregistrée. Merci!', donationId: result.rows[0].id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/admin/candidates/:id', verifyAdmin, async (req, res) => {
  try {
    const candidateId = Number(req.params.id);
    if (!candidateId) return res.status(400).json({ message: 'ID candidat invalide.' });
    const { fullName, whatsapp, email, phone, city, country, age, quranLevel, motivation, status } = req.body;
    const sanitizedName = sanitizeString(fullName, 255);
    const sanitizedCity = normalizeCommune(city);
    const sanitizedCountry = sanitizeString(country, 100) || DEFAULT_COUNTRY;
    const sanitizedEmail = sanitizeString(email, 120);
    const sanitizedPhone = sanitizeString(phone, 30);
    const sanitizedLevel = sanitizeString(quranLevel, 100);
    const sanitizedMotivation = sanitizeString(motivation, 1000);
    if (!sanitizedName || sanitizedName.length < 2) {
      return res.status(400).json({ message: 'Nom complet invalide.' });
    }
    const normalized = normalizeWhatsapp(whatsapp);
    if (!normalized) {
      return res.status(400).json({ message: 'Numéro WhatsApp invalide.' });
    }
    if (sanitizedEmail && !validateEmail(sanitizedEmail)) {
      return res.status(400).json({ message: 'Email invalide.' });
    }
    const safeStatus = ['approved', 'pending', 'eliminated'].includes(status) ? status : 'approved';
    const conflict = await pool.query(
      'SELECT id FROM candidates WHERE whatsapp = $1 AND id <> $2',
      [normalized, candidateId]
    );
    if (conflict.rows.length > 0) {
      return res.status(409).json({ message: 'WhatsApp déjà utilisé par un autre candidat.' });
    }
    await pool.query(
      `UPDATE candidates
       SET fullName = $1,
           age = $2,
           city = $3,
           country = $4,
           email = $5,
           phone = $6,
           whatsapp = $7,
           quranLevel = $8,
           motivation = $9,
           status = $10
       WHERE id = $11`,
      [
        sanitizedName,
        age || null,
        sanitizedCity,
        sanitizedCountry,
        sanitizedEmail,
        sanitizedPhone,
        normalized,
        sanitizedLevel,
        sanitizedMotivation,
        safeStatus,
        candidateId
      ]
    );
    res.json({ message: 'Candidat mis à jour.', candidateId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/replace-candidates', verifyAdmin, async (req, res) => {
  try {
    const manualCandidates = loadManualCandidates();
    if (!manualCandidates.length) {
      return res.status(400).json({ message: 'Liste officielle introuvable.' });
    }
    const inserted = await replaceCandidatesFromManualList(manualCandidates);
    res.json({ message: 'Liste remplacée.', inserted });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST - React to a post (heart/thumb/laugh)
app.post('/api/posts/:id/reaction', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const reaction = String(req.body?.reaction || '').toLowerCase();
    if (!['heart', 'thumb', 'laugh'].includes(reaction)) {
      return res.status(400).json({ error: 'Invalid reaction' });
    }
    const ip = getClientIp(req);

    const exists = await pool.query(
      `SELECT 1 FROM post_reactions
       WHERE postId = $1 AND reaction = $2 AND ip = $3
         AND createdAt > NOW() - INTERVAL '24 hours'
       LIMIT 1`,
      [postId, reaction, ip]
    );
    if (exists.rows.length) {
      return res.status(429).json({ error: 'Reaction already recorded' });
    }

    await pool.query(
      `INSERT INTO post_reactions (postId, reaction, ip) VALUES ($1, $2, $3)`,
      [postId, reaction, ip]
    );

    const counts = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE reaction = 'heart') as heart,
        COUNT(*) FILTER (WHERE reaction = 'thumb') as thumb,
        COUNT(*) FILTER (WHERE reaction = 'laugh') as laugh
       FROM post_reactions
       WHERE postId = $1`,
      [postId]
    );

    res.json({
      heart: parseInt(counts.rows[0]?.heart || 0),
      thumb: parseInt(counts.rows[0]?.thumb || 0),
      laugh: parseInt(counts.rows[0]?.laugh || 0)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET - Post reactions counts
app.get('/api/posts/:id/reactions', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const counts = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE reaction = 'heart') as heart,
        COUNT(*) FILTER (WHERE reaction = 'thumb') as thumb,
        COUNT(*) FILTER (WHERE reaction = 'laugh') as laugh
       FROM post_reactions
       WHERE postId = $1`,
      [postId]
    );
    res.json({
      heart: parseInt(counts.rows[0]?.heart || 0),
      thumb: parseInt(counts.rows[0]?.thumb || 0),
      laugh: parseInt(counts.rows[0]?.laugh || 0)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET - Public confirmed donations
app.get('/api/donations', async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const [rows, summary] = await Promise.all([
      pool.query(
        `SELECT donorName, amount, currency, paymentMethod, message, createdAt
         FROM donations
         WHERE status = 'confirmed'
         ORDER BY createdAt DESC
         LIMIT $1`,
        [limit]
      ),
      pool.query(
        `SELECT COUNT(*)::int as count, COALESCE(SUM(amount), 0) as total
         FROM donations
         WHERE status = 'confirmed'`
      )
    ]);

    res.json({
      items: rows.rows,
      summary: {
        totalDonations: parseInt(summary.rows[0]?.count || 0, 10),
        totalAmount: parseFloat(summary.rows[0]?.total || 0)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET - Admin list all donations
app.get('/api/admin/donations', verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, donorName, donorEmail, amount, currency, paymentMethod, message, status, createdAt 
       FROM donations 
       ORDER BY createdAt DESC 
       LIMIT 500`
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT - Admin verify/confirm donation
app.put('/api/admin/donations/:id', verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const donationId = parseInt(req.params.id);

    if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await pool.query(
      'UPDATE donations SET status = $1 WHERE id = $2',
      [status, donationId]
    );

    res.json({ message: `Donation marked ${status}.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== MULTER FILE UPLOAD CONFIGURATION ====================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, join(__dirname, 'public/uploads'));
  },
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, PNG, WebP) and videos (MP4, WebM) allowed'));
    }
  }
});

// ==================== HELPER FUNCTIONS ====================
async function sendEmail(to, subject, html) {
  if (!transporter.verify) return; // Skip if email not configured
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@quiz-islamique.org',
      to,
      subject,
      html
    });
  } catch (error) {
    console.error('Email send error:', error.message);
  }
}

function generateQRCode(text) {
  return require('qrcode').toDataURL(text);
}

async function updateEngagementStats(contentType, contentId) {
  try {
    const likes = await pool.query(
      `SELECT COUNT(*) as count FROM post_likes WHERE postId = $1`,
      [contentId]
    );
    const comments = await pool.query(
      `SELECT COUNT(*) as count FROM post_comments WHERE postId = $1`,
      [contentId]
    );
    const shares = await pool.query(
      `SELECT COUNT(*) as count FROM post_shares WHERE postId = $1`,
      [contentId]
    );

    const likesCount = parseInt(likes.rows[0]?.count || 0);
    const commentsCount = parseInt(comments.rows[0]?.count || 0);
    const sharesCount = parseInt(shares.rows[0]?.count || 0);

    await pool.query(
      `INSERT INTO engagement_stats (contentType, contentId, likesCount, commentsCount, sharesCount, lastUpdated)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (contentType, contentId) DO UPDATE SET 
       likesCount = $3, commentsCount = $4, sharesCount = $5, lastUpdated = NOW()`,
      [contentType, contentId, likesCount, commentsCount, sharesCount]
    );
  } catch (error) {
    console.error('Error updating engagement stats:', error);
  }
}

// ==================== PHOTO UPLOAD ENDPOINTS ====================

// POST - Upload photo for post/story
app.post('/api/upload/photo', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ 
      success: true, 
      filename: req.file.filename,
      url: fileUrl,
      size: req.file.size
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Upload failed' });
  }
});

// ==================== POST ENGAGEMENT ENDPOINTS ====================

// POST - Like a post
app.post('/api/posts/:id/like', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { email } = req.body;

    if (!email || !validateEmail(email)) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    await pool.query(
      `INSERT INTO post_likes (postId, likerEmail, createdAt) VALUES ($1, $2, NOW())
       ON CONFLICT (postId, likerEmail) DO NOTHING`,
      [postId, email.slice(0, 100)]
    );

    await updateEngagementStats('post', postId);
    
    // Get updated counts
    const counts = await pool.query(
      `SELECT 
        (SELECT COUNT(*) FROM post_likes WHERE postId = $1) as likes,
        (SELECT COUNT(*) FROM post_comments WHERE postId = $1) as comments,
        (SELECT COUNT(*) FROM post_shares WHERE postId = $1) as shares`,
      [postId]
    );

    res.json({ 
      success: true, 
      message: 'Post liked',
      counts: counts.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE - Unlike a post
app.delete('/api/posts/:id/like', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    await pool.query(
      'DELETE FROM post_likes WHERE postId = $1 AND likerEmail = $2',
      [postId, email]
    );

    await updateEngagementStats('post', postId);
    
    res.json({ success: true, message: 'Like removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST - Share a post
app.post('/api/posts/:id/share', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { method } = req.body;

    const validMethods = ['facebook', 'twitter', 'whatsapp', 'email', 'copy'];
    if (!validMethods.includes(method)) {
      return res.status(400).json({ error: 'Invalid share method' });
    }

    await pool.query(
      `INSERT INTO post_shares (postId, shareMethod, createdAt) VALUES ($1, $2, NOW())`,
      [postId, method]
    );

    await updateEngagementStats('post', postId);
    
    res.json({ success: true, message: 'Share recorded' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET - Post engagement stats
app.get('/api/posts/:id/stats', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);

    const result = await pool.query(
      `SELECT 
        (SELECT COUNT(*) FROM post_likes WHERE postId = $1) as likes,
        (SELECT COUNT(*) FROM post_comments WHERE postId = $1) as comments,
        (SELECT COUNT(*) FROM post_shares WHERE postId = $1) as shares`,
      [postId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== POST COMMENT ENDPOINTS ====================

// POST - Add comment to post
app.post('/api/posts/:id/comments', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { authorName, authorEmail, content } = req.body;

    if (!authorName || !authorEmail || !content) {
      return res.status(400).json({ error: 'Name, email, and content required' });
    }

    if (!validateEmail(authorEmail)) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    const sanitizedContent = content.replace(/[<>]/g, '').slice(0, 500);

    const result = await pool.query(
      `INSERT INTO post_comments (postId, authorName, authorEmail, content, status, createdAt)
       VALUES ($1, $2, $3, $4, 'approved', NOW())
       RETURNING id, createdAt`,
      [postId, authorName.slice(0, 100), authorEmail.slice(0, 100), sanitizedContent]
    );

    await updateEngagementStats('post', postId);

    // Send notification email to post author
    await sendEmail(
      authorEmail,
      'New comment on your post',
      `<p>Hi ${authorName},</p><p>Someone commented on your post! Check it out.</p>`
    );

    res.status(201).json({ 
      message: 'Comment added',
      commentId: result.rows[0].id 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET - Get post comments
app.get('/api/posts/:id/comments', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);

    const result = await pool.query(
      `SELECT id, authorName, content, createdAt 
       FROM post_comments 
       WHERE postId = $1 AND status = 'approved'
       ORDER BY createdAt DESC
       LIMIT 50`,
      [postId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE - Admin delete comment
app.delete('/api/admin/comments/:id', verifyAdmin, async (req, res) => {
  try {
    const commentId = parseInt(req.params.id);

    await pool.query(
      'DELETE FROM post_comments WHERE id = $1',
      [commentId]
    );

    res.json({ message: 'Comment deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== STORY ENGAGEMENT ENDPOINTS ====================

// POST - Like a story
app.post('/api/stories/:id/like', async (req, res) => {
  try {
    const storyId = parseInt(req.params.id);
    const { email } = req.body;

    if (!email || !validateEmail(email)) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    await pool.query(
      `INSERT INTO story_likes (storyId, likerEmail, createdAt) VALUES ($1, $2, NOW())
       ON CONFLICT (storyId, likerEmail) DO NOTHING`,
      [storyId, email.slice(0, 100)]
    );

    const result = await pool.query(
      `SELECT COUNT(*) as count FROM story_likes WHERE storyId = $1`,
      [storyId]
    );

    res.json({ 
      success: true,
      message: 'Story liked',
      likes: parseInt(result.rows[0]?.count || 0)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET - Story likes count
app.get('/api/stories/:id/likes', async (req, res) => {
  try {
    const storyId = parseInt(req.params.id);

    const result = await pool.query(
      `SELECT COUNT(*) as count FROM story_likes WHERE storyId = $1`,
      [storyId]
    );

    res.json({ likes: parseInt(result.rows[0]?.count || 0) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== POLL ENDPOINTS ====================

// GET - Current active poll
app.get('/api/poll', async (req, res) => {
  try {
    const pollRes = await pool.query(
      `SELECT id, question, optionsJson FROM poll WHERE active = 1 ORDER BY id DESC LIMIT 1`
    );
    const poll = pollRes.rows[0];
    if (!poll) return res.json({ poll: null });

    const options = JSON.parse(poll.optionsjson || poll.optionsJson || '[]');
    const votesRes = await pool.query(
      `SELECT optionKey, COUNT(*)::int as count FROM poll_votes WHERE pollId = $1 GROUP BY optionKey`,
      [poll.id]
    );
    const counts = {};
    votesRes.rows.forEach((row) => {
      counts[row.optionkey || row.optionKey] = parseInt(row.count || 0);
    });

    res.json({
      poll: {
        id: poll.id,
        question: poll.question,
        options
      },
      counts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST - Vote on poll
app.post('/api/poll/vote', async (req, res) => {
  try {
    const pollId = parseInt(req.body?.pollId);
    const optionKey = String(req.body?.option || '').trim();
    if (!pollId || !optionKey) {
      return res.status(400).json({ error: 'Invalid vote' });
    }
    const pollRes = await pool.query(
      `SELECT optionsJson FROM poll WHERE id = $1 AND active = 1`,
      [pollId]
    );
    if (!pollRes.rows.length) {
      return res.status(404).json({ error: 'Poll not found' });
    }
    const options = JSON.parse(pollRes.rows[0].optionsjson || '[]');
    if (!options.includes(optionKey)) {
      return res.status(400).json({ error: 'Invalid option' });
    }

    const ip = getClientIp(req);
    try {
      await pool.query(
        `INSERT INTO poll_votes (pollId, optionKey, ip) VALUES ($1, $2, $3)`,
        [pollId, optionKey, ip]
      );
    } catch (e) {
      return res.status(429).json({ error: 'Vote already recorded' });
    }

    const votesRes = await pool.query(
      `SELECT optionKey, COUNT(*)::int as count FROM poll_votes WHERE pollId = $1 GROUP BY optionKey`,
      [pollId]
    );
    const counts = {};
    votesRes.rows.forEach((row) => {
      counts[row.optionkey || row.optionKey] = parseInt(row.count || 0);
    });

    res.json({ ok: true, counts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== QR CODE ENDPOINTS ====================

// GET - Generate QR code for payment method
app.get('/api/qr-code', async (req, res) => {
  try {
    const { paymentMethod, amount, donorName } = req.query;

    const validMethods = ['MTN MONEY', 'OM', 'MOOV MONEY', 'Wave'];
    if (!validMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    const numbers = {
      'MTN MONEY': '0574724233',
      'OM': '0705583082',
      'MOOV MONEY': '0150070083',
      'Wave': '0574724233'
    };

    const text = `${paymentMethod}: ${numbers[paymentMethod]}\nAmount: ${amount || 'Variable'}\nFrom: ${donorName || 'Supporter'}`;
    const qrUrl = await generateQRCode(text);

    res.json({ 
      success: true,
      qrCode: qrUrl,
      paymentMethod,
      number: numbers[paymentMethod]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== ANALYTICS ENDPOINTS ====================

// GET - Engagement analytics for posts
app.get('/api/analytics/posts', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        COUNT(DISTINCT p.id) as totalPosts,
        COALESCE(SUM(pl.likeCount), 0) as totalLikes,
        COALESCE(SUM(pc.commentCount), 0) as totalComments,
        COALESCE(SUM(ps.shareCount), 0) as totalShares
       FROM posts p
       LEFT JOIN (SELECT postId, COUNT(*) as likeCount FROM post_likes GROUP BY postId) pl ON p.id = pl.postId
       LEFT JOIN (SELECT postId, COUNT(*) as commentCount FROM post_comments GROUP BY postId) pc ON p.id = pc.postId
       LEFT JOIN (SELECT postId, COUNT(*) as shareCount FROM post_shares GROUP BY postId) ps ON p.id = ps.postId
       WHERE p.status = 'approved'`
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET - Engagement analytics for stories
app.get('/api/analytics/stories', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        COUNT(DISTINCT s.id) as totalStories,
        COALESCE(SUM(sl.likeCount), 0) as totalLikes,
        COUNT(CASE WHEN s.expiresAt > NOW() THEN 1 END) as activeStories
       FROM stories s
       LEFT JOIN (SELECT storyId, COUNT(*) as likeCount FROM story_likes GROUP BY storyId) sl ON s.id = sl.storyId
       WHERE s.status = 'approved'`
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET - Donations analytics
app.get('/api/analytics/donations', verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as totalDonations,
        COALESCE(SUM(CASE WHEN status = 'confirmed' THEN amount ELSE 0 END), 0) as confirmedTotal,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pendingTotal,
        COUNT(DISTINCT paymentMethod) as uniqueMethods,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmedCount
       FROM donations`
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET - Platform engagement overview
app.get('/api/analytics/overview', async (req, res) => {
  try {
    const posts = await pool.query(
      `SELECT COUNT(*) as count FROM posts WHERE status = 'approved'`
    );
    const stories = await pool.query(
      `SELECT COUNT(*) as count FROM stories WHERE status = 'approved' AND expiresAt > NOW()`
    );
    const donations = await pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM donations WHERE status = 'confirmed'`
    );
    const comments = await pool.query(
      `SELECT COUNT(*) as count FROM post_comments WHERE status = 'approved'`
    );

    res.json({
      posts: parseInt(posts.rows[0]?.count || 0),
      stories: parseInt(stories.rows[0]?.count || 0),
      donations: {
        count: parseInt(donations.rows[0]?.count || 0),
        total: parseFloat(donations.rows[0]?.total || 0)
      },
      comments: parseInt(comments.rows[0]?.count || 0)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== PUBLIC MEDIA ENDPOINTS ====================

async function listMediaFilesFromDisk() {
  const mediaDir = join(__dirname, 'public', 'quiz-2025-media');
  try {
    const entries = await readdir(mediaDir, { withFileTypes: true });
    const files = entries.filter((e) => e.isFile()).map((e) => e.name);
    const withMeta = await Promise.all(
      files.map(async (name) => {
        try {
          const info = await stat(join(mediaDir, name));
          return { name, mtimeMs: info.mtimeMs };
        } catch {
          return { name, mtimeMs: 0 };
        }
      })
    );
    return withMeta;
  } catch {
    return [];
  }
}

// Admin login (returns token for subsequent calls)
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ message: 'Identifiant et mot de passe requis.' });
    }
    if (username !== ADMIN_USERNAME) {
      return res.status(401).json({ message: 'Accès non autorisé' });
    }

    const result = await pool.query(
      "SELECT value FROM admin_config WHERE key = 'admin_password_hash' LIMIT 1"
    );
    const adminHash = result.rows[0]?.value || await hashPassword(ADMIN_PASSWORD);
    let valid = await checkPassword(password, adminHash);

    if (!valid && password === ADMIN_PASSWORD) {
      valid = true;
      const newHash = await hashPassword(ADMIN_PASSWORD);
      await pool.query(
        "INSERT INTO admin_config (key, value) VALUES ('admin_password_hash', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
        [newHash]
      );
    }

    if (!valid) {
      return res.status(401).json({ message: 'Identifiants incorrects.' });
    }

    return res.json({ token: ADMIN_PASSWORD });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

function classifyMediaType(filename = '') {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  const isVideo = ['mp4', 'webm', 'mov', 'mkv'].includes(ext);
  return isVideo ? 'video' : 'image';
}

function matchesTypeFilter(filename, typeFilter) {
  if (typeFilter === 'image') return /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
  if (typeFilter === 'video') return /\.(mp4|webm|mov|mkv)$/i.test(filename);
  return true;
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function loadMediaFromFilesystem({ page, pageSize, typeFilter, sort, search }) {
  const files = await listMediaFilesFromDisk();
  const filtered = files
    .filter((f) => matchesTypeFilter(f.name, typeFilter))
    .filter((f) => (search ? f.name.toLowerCase().includes(search.toLowerCase()) : true));

  if (sort === 'name') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    filtered.sort((a, b) => (sort === 'ASC' ? a.mtimeMs - b.mtimeMs : b.mtimeMs - a.mtimeMs));
  }

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const offset = (page - 1) * pageSize;
  const slice = filtered.slice(offset, offset + pageSize);

  const items = slice.map((f) => ({
    id: null,
    name: f.name,
    filename: f.name,
    filepath: `/quiz-2025-media/${f.name}`,
    category: 'quiz-2025',
    uploadedAt: null,
    url: `/quiz-2025-media/${encodeURIComponent(f.name)}`,
    type: classifyMediaType(f.name),
  }));

  return { items, pagination: { page, pageSize, totalPages, total } };
}

async function buildAdminMediaList() {
  const [files, dbRows, eventRows] = await Promise.all([
    listMediaFilesFromDisk(),
    pool.query(`SELECT filename, caption, displayOrder, hidden, category, uploadedAt FROM admin_media`),
    pool.query(`SELECT name, views, downloads, favorites FROM media_events`)
  ]);

  const rowMap = new Map(dbRows.rows.map((r) => [r.filename, r]));
  const eventMap = new Map(eventRows.rows.map((r) => [r.name, r]));

  return files.map((f) => {
    const row = rowMap.get(f.name) || {};
    const ev = eventMap.get(f.name) || {};
    return {
      name: f.name,
      type: classifyMediaType(f.name),
      caption: row.caption || '',
      order: Number(row.displayorder || row.displayOrder || 0),
      hidden: Boolean(row.hidden),
      category: row.category || 'quiz-2025',
      uploadedAt: row.uploadedat || row.uploadedAt || null,
      views: Number(ev.views || 0),
      downloads: Number(ev.downloads || 0),
      favorites: Number(ev.favorites || 0),
      mtimeMs: f.mtimeMs
    };
  });
}

// HEAD/GET - Download all media as a ZIP (if provided)
app.head('/api/public-media/download-all', async (req, res) => {
  const zipPath = join(__dirname, 'public', 'quiz-2025-media.zip');
  if (await fileExists(zipPath)) return res.status(200).end();
  return res.status(404).end();
});

app.get('/api/public-media/download-all', async (req, res) => {
  const zipPath = join(__dirname, 'public', 'quiz-2025-media.zip');
  if (!await fileExists(zipPath)) {
    return res.status(404).json({ error: 'Archive indisponible pour le moment.' });
  }
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="quiz-2025-media.zip"');
  createReadStream(zipPath).pipe(res);
});

// GET - All public media
app.get('/api/public-media', async (req, res) => {
  try {
    // Support pagination and basic filters used by the frontend
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || '30', 10)));
    const typeFilter = (req.query.type || 'all').toLowerCase();
    const sortValue = (req.query.sort || 'newest').toLowerCase();
    const sortField = sortValue === 'name' ? 'filename' : 'uploadedAt';
    const sortDir = sortValue === 'oldest' || sortValue === 'name' ? 'ASC' : 'DESC';
    const search = (req.query.search || '').trim();

    // Build WHERE clauses
    const where = [];
    const params = [];
    if (typeFilter === 'image') {
      where.push("(filename ~* '\\.(jpg|jpeg|png|gif|webp)$')");
    } else if (typeFilter === 'video') {
      where.push("(filename ~* '\\.(mp4|webm|mov)$')");
    }
    if (search) {
      params.push(`%${search}%`);
      where.push(`filename ILIKE $${params.length}`);
    }
    where.push('hidden = 0');

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    try {
      // Total count for pagination
      const countSql = `SELECT COUNT(*)::int as total FROM admin_media ${whereSql}`;
      const countResult = await pool.query(countSql, params);
      const total = parseInt(countResult.rows[0]?.total || 0, 10);
      const totalPages = Math.max(1, Math.ceil(total / pageSize));

      // Fetch paginated rows
      const offset = (page - 1) * pageSize;
      const fetchSql = `SELECT id, filename, filepath, category, caption, displayOrder, hidden, uploadedAt
        FROM admin_media
        ${whereSql}
        ORDER BY ${sortField} ${sortDir}
        LIMIT ${pageSize} OFFSET ${offset}`;
      const result = await pool.query(fetchSql, params);

      if (!result.rows.length) {
        const fallback = await loadMediaFromFilesystem({ page, pageSize, typeFilter, sort: sortValue === 'name' ? 'name' : sortDir, search });
        return res.json(fallback);
      }

      // Map rows to the structure expected by the frontend
      const names = result.rows.map((r) => r.filename || '').filter(Boolean);
      let favoritesMap = new Map();
      if (names.length) {
        const placeholders = names.map((_, idx) => `$${idx + 1}`).join(',');
        const favRes = await pool.query(
          `SELECT name, favorites FROM media_events WHERE name IN (${placeholders})`,
          names
        );
        favoritesMap = new Map(favRes.rows.map((row) => [row.name, Number(row.favorites || 0)]));
      }

      const items = result.rows.map((r) => {
        const fname = r.filename || '';
        return {
          id: r.id,
          name: fname,
          filename: fname,
          filepath: r.filepath || `/quiz-2025-media/${fname}`,
          category: r.category,
          caption: r.caption || '',
          uploadedAt: r.uploadedat || r.uploadedAt,
          url: `/quiz-2025-media/${encodeURIComponent(fname)}`,
          type: classifyMediaType(fname),
          hidden: Boolean(r.hidden),
          order: r.displayorder || r.displayOrder || 0,
          favorites: favoritesMap.get(fname) || 0
        };
      });

      res.json({ items, pagination: { page, pageSize, totalPages, total } });
    } catch (dbError) {
      if (dbError?.code === '42P01') {
        const fallback = await loadMediaFromFilesystem({ page, pageSize, typeFilter, sort: sortValue === 'name' ? 'name' : sortDir, search });
        return res.json(fallback);
      }
      throw dbError;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE - Admin delete donation
app.delete('/api/admin/donations/:id', verifyAdmin, async (req, res) => {
  try {
    const donationId = parseInt(req.params.id);
    if (!Number.isFinite(donationId)) {
      return res.status(400).json({ error: 'Invalid donation id' });
    }

    const result = await pool.query('DELETE FROM donations WHERE id = $1', [donationId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    res.json({ message: 'Donation supprimée.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET - Admin media management list
app.get('/api/admin/media', verifyAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize || '60', 10)));
    const typeFilter = (req.query.type || 'all').toLowerCase();
    const sortValue = (req.query.sort || 'newest').toLowerCase();
    const search = (req.query.search || '').trim().toLowerCase();

    let items = await buildAdminMediaList();

    if (typeFilter !== 'all') {
      items = items.filter((i) => i.type === typeFilter);
    }
    if (search) {
      items = items.filter((i) => i.name.toLowerCase().includes(search) || i.caption.toLowerCase().includes(search));
    }

    if (sortValue === 'name') {
      items.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      items.sort((a, b) => {
        const aTime = a.uploadedAt ? new Date(a.uploadedAt).getTime() : a.mtimeMs;
        const bTime = b.uploadedAt ? new Date(b.uploadedAt).getTime() : b.mtimeMs;
        return sortValue === 'oldest' ? aTime - bTime : bTime - aTime;
      });
    }

    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const offset = (page - 1) * pageSize;
    const slice = items.slice(offset, offset + pageSize);

    res.json({ items: slice, pagination: { page, pageSize, totalPages, total } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT - Update media metadata
app.put('/api/admin/media/:name', verifyAdmin, async (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.name || '').trim();
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    const caption = String(req.body?.caption || '').slice(0, 240);
    const hidden = req.body?.hidden ? 1 : 0;
    const order = Number.isFinite(Number(req.body?.order)) ? Number(req.body.order) : 0;
    const category = String(req.body?.category || 'quiz-2025').slice(0, 60);
    const filepath = `/quiz-2025-media/${filename}`;

    await pool.query(
      `INSERT INTO admin_media (filename, filepath, category, caption, displayOrder, hidden, uploadedAt)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (filename)
       DO UPDATE SET filepath = $2, category = $3, caption = $4, displayOrder = $5, hidden = $6`,
      [filename, filepath, category, caption, order, hidden]
    );

    res.json({ message: 'Média mis à jour.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE - Soft-hide media (serverless-safe)
app.delete('/api/admin/media/:name', verifyAdmin, async (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.name || '').trim();
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    const filepath = `/quiz-2025-media/${filename}`;
    await pool.query(
      `INSERT INTO admin_media (filename, filepath, category, caption, displayOrder, hidden, uploadedAt)
       VALUES ($1, $2, 'quiz-2025', '', 0, 1, NOW())
       ON CONFLICT (filename)
       DO UPDATE SET hidden = 1, filepath = $2`,
      [filename, filepath]
    );
    res.json({ message: 'Média masqué.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET - Quiz 2025 media specifically
app.get('/api/quiz-2025-media', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, filename, filepath, category, uploadedAt 
       FROM admin_media 
       WHERE category = 'quiz-2025' 
       ORDER BY uploadedAt DESC 
       LIMIT 50`
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST - Public media events (view/download)
app.post('/api/public-media/events', async (req, res) => {
  try {
    const name = (req.body?.name || '').trim();
    const event = (req.body?.event || '').trim().toLowerCase();
    if (!name || !['view', 'download'].includes(event)) {
      return res.status(400).json({ error: 'Invalid event payload' });
    }
    const viewsInc = event === 'view' ? 1 : 0;
    const downloadsInc = event === 'download' ? 1 : 0;

    await pool.query(
      `INSERT INTO media_events (name, views, downloads, updatedAt)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (name)
       DO UPDATE SET views = media_events.views + $2,
                    downloads = media_events.downloads + $3,
                    updatedAt = NOW()`,
      [name, viewsInc, downloadsInc]
    );

    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST - Favorite a media item
app.post('/api/public-media/favorite', async (req, res) => {
  try {
    const name = (req.body?.name || '').trim();
    if (!name) {
      return res.status(400).json({ error: 'Invalid media name' });
    }

    await pool.query(
      `INSERT INTO media_events (name, views, downloads, favorites, updatedAt)
       VALUES ($1, 0, 0, 1, NOW())
       ON CONFLICT (name)
       DO UPDATE SET favorites = media_events.favorites + 1,
                    updatedAt = NOW()`,
      [name]
    );

    const result = await pool.query(
      `SELECT favorites FROM media_events WHERE name = $1`,
      [name]
    );

    res.json({ favorites: Number(result.rows[0]?.favorites || 0) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET - Public media statistics
app.get('/api/public-media/stats', async (req, res) => {
  try {
    let totalMedia = 0;
    try {
      const count = await pool.query(`SELECT COUNT(*)::int as total FROM admin_media`);
      totalMedia = parseInt(count.rows[0]?.total || 0, 10);
      if (!totalMedia) {
        const fallback = await listMediaFilesFromDisk();
        totalMedia = fallback.length;
      }
    } catch (dbError) {
      if (dbError?.code === '42P01') {
        const fallback = await listMediaFilesFromDisk();
        totalMedia = fallback.length;
      } else {
        throw dbError;
      }
    }

    const events = await pool.query(
      `SELECT COALESCE(SUM(views), 0)::bigint as views,
              COALESCE(SUM(downloads), 0)::bigint as downloads
       FROM media_events`
    );

    res.json({
      totalMedia,
      totalViews: Number(events.rows[0]?.views || 0),
      totalDownloads: Number(events.rows[0]?.downloads || 0)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

// ==================== SERVER START ====================
initDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
