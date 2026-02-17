import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
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
    const valid = await checkPassword(password, adminHash);

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

      INSERT INTO tournament_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

      CREATE INDEX IF NOT EXISTS idx_votes_candidate ON votes(candidateId);
      CREATE INDEX IF NOT EXISTS idx_scores_candidate ON scores(candidateId);
      CREATE INDEX IF NOT EXISTS idx_votes_candidate_ip ON votes(candidateId, ip);
      CREATE INDEX IF NOT EXISTS idx_contact_archived ON contact_messages(archived);
    `);

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
    const sanitizedCity = sanitizeString(city, 100);
    const sanitizedCountry = sanitizeString(country, 100);
    const sanitizedEmail = sanitizeString(email, 120);
    const sanitizedPhone = sanitizeString(phone, 30);
    const sanitizedQuranLevel = sanitizeString(quranLevel, 100);
    const sanitizedMotivation = sanitizeString(motivation, 1000);
    const sanitizedPhotoUrl = sanitizeString(photoUrl, 500);

    if (!sanitizedName || sanitizedName.length < 2) {
      return res.status(400).json({ message: 'Nom invalide.' });
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
      [sanitizedName, age || null, sanitizedCity, sanitizedCountry, sanitizedEmail, sanitizedPhone, normalized, sanitizedPhotoUrl, sanitizedQuranLevel, sanitizedMotivation, 'pending']
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
    const [candidates, votes, ranking, settings, contacts] = await Promise.all([
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
      pool.query('SELECT * FROM contact_messages ORDER BY id DESC LIMIT 500')
    ]);

    res.json({
      candidates: candidates.rows,
      votes: votes.rows,
      ranking: ranking.rows,
      settings: settings.rows[0] || {},
      contacts: contacts.rows
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
    const { fullName, whatsapp, email, phone, city, country, age, quranLevel, motivation } = req.body;

    const normalized = normalizeWhatsapp(whatsapp);
    if (!normalized) {
      return res.status(400).json({ message: 'Numéro WhatsApp invalide.' });
    }

    if (email && !validateEmail(email)) {
      return res.status(400).json({ message: 'Email invalide.' });
    }

    const result = await pool.query(
      `INSERT INTO candidates (fullName, age, city, country, email, phone, whatsapp, quranLevel, motivation, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [fullName, age || null, city, country, email, phone, normalized, quranLevel, motivation, 'pending']
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

// Update candidate
app.put('/api/admin/candidates/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, whatsapp, email, phone, city, country, age, quranLevel, motivation, status } = req.body;

    const normalized = normalizeWhatsapp(whatsapp);
    if (!normalized) {
      return res.status(400).json({ message: 'Numéro WhatsApp invalide.' });
    }

    if (email && !validateEmail(email)) {
      return res.status(400).json({ message: 'Email invalide.' });
    }

    await pool.query(
      `UPDATE candidates 
       SET fullName = $1, age = $2, city = $3, country = $4, email = $5, phone = $6, 
           whatsapp = $7, quranLevel = $8, motivation = $9, status = $10
       WHERE id = $11`,
      [fullName, age || null, city, country, email, phone, normalized, quranLevel, motivation, status || 'pending', id]
    );

    res.json({ message: 'Candidat mis à jour.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete candidate
app.delete('/api/admin/candidates/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM candidates WHERE id = $1', [id]);
    res.json({ message: 'Candidat supprimé.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add score for candidate
app.post('/api/scores', verifyAdmin, async (req, res) => {
  try {
    const { candidateId, judgeName, themeChosenScore, themeImposedScore, notes } = req.body;

    if (!candidateId || !judgeName) {
      return res.status(400).json({ message: 'Candidat et juge obligatoires.' });
    }

    await pool.query(
      `INSERT INTO scores (candidateId, judgeName, themeChosenScore, themeImposedScore, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [candidateId, sanitizeString(judgeName, 100), themeChosenScore || 0, themeImposedScore || 0, sanitizeString(notes, 500)]
    );

    res.status(201).json({ message: 'Score enregistré.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete contact message
app.delete('/api/contact-messages/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM contact_messages WHERE id = $1', [id]);
    res.json({ message: 'Message supprimé.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Archive contact message
app.put('/api/contact-messages/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { archived } = req.body;
    await pool.query('UPDATE contact_messages SET archived = $1 WHERE id = $2', [archived ? 1 : 0, id]);
    res.json({ message: 'Message archivé.' });
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

// Get admin media list (placeholder)
app.get('/api/admin/media', verifyAdmin, async (req, res) => {
  try {
    res.json([]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete media
app.delete('/api/admin/media/:name', verifyAdmin, async (req, res) => {
  try {
    res.json({ message: 'Média supprimé.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get public media stats (placeholder)
app.get('/api/public-media/stats', async (req, res) => {
  try {
    res.json({ total: 0 });
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
