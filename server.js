import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdir, stat, access } from 'fs/promises';
import { createReadStream, readFileSync } from 'fs';
import { createHash, randomBytes } from 'crypto';
import rateLimit from 'express-rate-limit';
import pkg from 'pg';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import axios from 'axios';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { validateEnvironment } from './server-modules/env-validation.js';
import { createAuthThrottle } from './server-modules/auth-throttle.js';
import { registerAdminSecurityThrottleRoutes } from './server-modules/admin-security-throttle-routes.js';
import { registerAuthRoutes } from './server-modules/auth-routes.js';
import { registerMemberRoutes } from './server-modules/member-routes.js';
import { registerAdminContentRoutes } from './server-modules/admin-content-routes.js';
import { registerCandidateScoreRoutes } from './server-modules/candidate-score-routes.js';
import { registerNotificationRoutes, NotificationService } from './server-modules/notifications-service.js';
import { registerAchievementRoutes, AchievementService } from './server-modules/achievements-service.js';
import { registerReportRoutes } from './server-modules/reports-service.js';
import { registerModerationRoutes, ModerationService } from './server-modules/moderation-service.js';
import { registerSocialFeaturesRoutes } from './server-modules/social-features-routes.js';
import { registerEnhancedSocialRoutes } from './server-modules/enhanced-social-routes.js';
import { registerChatGroupsRoutes } from './server-modules/chat-groups-routes.js';
import { registerCollaborativeQuizzesRoutes } from './server-modules/collaborative-quizzes-routes.js';
import { sanitizeString, validateCandidateId } from './services/string-utils.js';

dotenv.config();

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envValidation = validateEnvironment(process.env);
if (envValidation.errors.length > 0) {
  for (const error of envValidation.errors) {
    console.error(`[ENV] ${error}`);
  }
  process.exit(1);
}
for (const warning of envValidation.warnings) {
  console.warn(`[ENV] ${warning}`);
}

// ==================== CONFIGURATION ====================
const app = express();
const parsedPort = Number.parseInt(process.env.PORT || '10000', 10);
const PORT = Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535 ? parsedPort : 10000;
const SCORE_PHASE_FINAL_2026 = 'phase_finale_2026';
const SCORE_PHASE_PREVIOUS = 'phase_precedente';
const SITE_URL = (process.env.SITE_URL || '').trim().replace(/\/+$/, '');
const GOOGLE_SITE_VERIFICATION_FILE = 'googleca617fc6537967d0.html';
const GOOGLE_SITE_VERIFICATION_CONTENT = `google-site-verification: ${GOOGLE_SITE_VERIFICATION_FILE}`;
const SITEMAP_EXCLUDED_PAGES = new Set([
  'admin.html',
  'member-login.html',
  'member-portal.html',
  'verify-certificate.html',
  'programme-print.html'
]);

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
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static(join(__dirname, 'public')));
app.use('/galerie-2025', express.static(join(__dirname, 'public', 'galerie-2025')));

function getPublicBaseUrl(req) {
  if (SITE_URL) return SITE_URL;
  const protoHeader = (req.headers['x-forwarded-proto'] || '').toString().split(',')[0].trim();
  const protocol = protoHeader || req.protocol || 'https';
  const host = req.headers.host || 'localhost';
  return `${protocol}://${host}`;
}

async function buildSitemapEntries(baseUrl) {
  const publicDir = join(__dirname, 'public');
  const files = await readdir(publicDir);
  const htmlFiles = files.filter((name) => name.endsWith('.html') && !SITEMAP_EXCLUDED_PAGES.has(name));
  const entries = [];

  for (const file of htmlFiles) {
    const pagePath = file === 'index.html' ? '/' : `/${file}`;
    const filePath = join(publicDir, file);
    const stats = await stat(filePath);
    const lastmod = stats.mtime.toISOString().slice(0, 10);
    const priority = file === 'index.html' ? '1.0' : '0.7';
    entries.push({
      loc: `${baseUrl}${pagePath}`,
      lastmod,
      changefreq: 'weekly',
      priority
    });
  }

  entries.sort((a, b) => (a.loc > b.loc ? 1 : -1));
  return entries;
}

app.get('/robots.txt', (req, res) => {
  const baseUrl = getPublicBaseUrl(req);
  const content = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin.html',
    'Disallow: /member-login.html',
    'Disallow: /member-portal.html',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    ''
  ].join('\n');
  res.type('text/plain; charset=utf-8').send(content);
});

app.get(`/${GOOGLE_SITE_VERIFICATION_FILE}`, (req, res) => {
  res.type('text/plain; charset=utf-8').send(GOOGLE_SITE_VERIFICATION_CONTENT);
});

app.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = getPublicBaseUrl(req);
    const entries = await buildSitemapEntries(baseUrl);
    const body = entries
      .map(
        (entry) =>
          `  <url>\n    <loc>${entry.loc}</loc>\n    <lastmod>${entry.lastmod}</lastmod>\n    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>`
      )
      .join('\n');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
    res.type('application/xml; charset=utf-8').send(xml);
  } catch (error) {
    console.error('Failed to generate sitemap:', error);
    res.status(500).type('application/xml; charset=utf-8').send('<error>Unable to generate sitemap</error>');
  }
});

app.get('/api/gallery/2025/:file', (req, res) => {
  const { file } = req.params;
  const filePath = join(__dirname, 'public', 'galerie-2025', file);
  return res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).json({ message: 'Not found' });
    }
  });
});
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

const waitlistLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: 'Trop de tentatives, réessayez plus tard.'
});

const { authIpLimiter, authProgressiveBlock, markAuthAttempt } = createAuthThrottle(pool);

// Constants
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'asaa';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ASAA';
const ADMIN_USERNAME_ALT = process.env.ADMIN_USERNAME_ALT || 'asaa2026';
const ADMIN_PASSWORD_ALT = process.env.ADMIN_PASSWORD_ALT || 'ASAALMO2026';
const LEGACY_ADMIN_PASSWORD = 'ASAALMO2026';
const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP || '2250150070083';
const CODE_PREFIX = 'QI26';
const DEFAULT_COUNTRY = process.env.DEFAULT_COUNTRY || "COTE D'IVOIRE";
let memberDefaultPassword = process.env.MEMBER_DEFAULT_PASSWORD || 'ASAA2026!';

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

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
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

let lastManualSync = 0;
const MANUAL_SYNC_INTERVAL_MS = 5 * 60 * 1000;

async function maybeSyncManualCandidates() {
  const now = Date.now();
  if (now - lastManualSync < MANUAL_SYNC_INTERVAL_MS) return;
  const manualCandidates = loadManualCandidates();
  if (!manualCandidates.length) return;
  try {
    await upsertManualCandidates(manualCandidates);
    lastManualSync = now;
  } catch (error) {
    console.warn('⚠️ Sync manuel candidats échoué:', error.message);
  }
}

async function replaceCandidatesFromManualList(manualCandidates) {
  if (!Array.isArray(manualCandidates) || manualCandidates.length === 0) return 0;
  await pool.query('BEGIN');
  await pool.query('TRUNCATE TABLE candidates RESTART IDENTITY CASCADE');
  let inserted = 0;
  for (const entry of manualCandidates) {
    const normalizedWhatsapp = normalizeWhatsapp(entry.whatsapp);
    if (!normalizedWhatsapp) continue;
    const name = sanitizeString(entry.name, 255) || 'Inconnu';
    const commune = normalizeCommune(entry.city);
    await pool.query(
      `INSERT INTO candidates (fullName, city, country, whatsapp, status)
       VALUES ($1, $2, $3, $4, 'approved')`,
      [name, commune, DEFAULT_COUNTRY, normalizedWhatsapp]
    );
    inserted += 1;
  }
  await pool.query(
    `UPDATE candidates
     SET candidateCode = $1 || '-' || LPAD(id::text, 3, '0')
     WHERE candidateCode IS NULL OR candidateCode = ''`,
    [CODE_PREFIX]
  );
  await pool.query(
    "INSERT INTO admin_config (key, value) VALUES ('manual_candidates_imported_2026', $1)\n     ON CONFLICT (key) DO UPDATE SET value = $1",
    [new Date().toISOString()]
  );
  await pool.query('COMMIT');
  return inserted;
}

async function upsertManualCandidates(manualCandidates) {
  if (!Array.isArray(manualCandidates) || manualCandidates.length === 0) return 0;
  let updated = 0;
  for (const entry of manualCandidates) {
    const normalizedWhatsapp = normalizeWhatsapp(entry.whatsapp);
    if (!normalizedWhatsapp) continue;
    const name = sanitizeString(entry.name, 255) || 'Inconnu';
    const commune = normalizeCommune(entry.city);
    const digits = normalizedWhatsapp.replace(/\D/g, '');

    let updateResult = await pool.query(
      `UPDATE candidates
       SET fullName = $1,
           city = $2,
           country = $3,
           whatsapp = $4,
           status = CASE
             WHEN status IS NULL OR TRIM(status) = '' THEN 'approved'
             ELSE status
           END
       WHERE regexp_replace(whatsapp, '\\D', '', 'g') = $5`,
      [name, commune, DEFAULT_COUNTRY, normalizedWhatsapp, digits]
    );

    // Fallback: match by last 8 digits (some numbers were stored without country/format)
    if (updateResult.rowCount === 0) {
      const last8 = digits.slice(-8);
      if (last8) {
        updateResult = await pool.query(
          `UPDATE candidates
           SET fullName = $1,
               city = $2,
               country = $3,
               whatsapp = $4,
               status = CASE
                 WHEN status IS NULL OR TRIM(status) = '' THEN 'approved'
                 ELSE status
               END
           WHERE regexp_replace(whatsapp, '\\D', '', 'g') LIKE $5`,
          [name, commune, DEFAULT_COUNTRY, normalizedWhatsapp, `%${last8}`]
        );
      }
    }

    if (updateResult.rowCount === 0) {
      const nameUpdate = await pool.query(
        `UPDATE candidates
         SET fullName = $1,
             city = $2,
             country = $3,
             whatsapp = $4,
             status = CASE
               WHEN status IS NULL OR TRIM(status) = '' THEN 'approved'
               ELSE status
             END
         WHERE LOWER(fullName) = LOWER($1)
           AND (whatsapp IS NULL OR TRIM(whatsapp) = '')`,
        [name, commune, DEFAULT_COUNTRY, normalizedWhatsapp]
      );
      if (nameUpdate.rowCount > 0) {
        updated += 1;
        continue;
      }
      await pool.query(
        `INSERT INTO candidates (fullName, city, country, whatsapp, status)
         VALUES ($1, $2, $3, $4, 'approved')
         ON CONFLICT (whatsapp)
         DO UPDATE SET fullName = EXCLUDED.fullName,
                       city = EXCLUDED.city,
                       country = EXCLUDED.country,
                       status = CASE
                         WHEN candidates.status IS NULL OR TRIM(candidates.status) = '' THEN 'approved'
                         ELSE candidates.status
                       END`,
        [name, commune, DEFAULT_COUNTRY, normalizedWhatsapp]
      );
    }
    updated += 1;
  }
  await pool.query(
    `UPDATE candidates
     SET candidateCode = $1 || '-' || LPAD(id::text, 3, '0')
     WHERE candidateCode IS NULL OR candidateCode = ''`,
    [CODE_PREFIX]
  );
  return updated;
}

async function forceSyncManualCandidates() {
  const manualCandidates = loadManualCandidates();
  if (manualCandidates.length === 0) return 0;
  return await upsertManualCandidates(manualCandidates);
}

async function applyManualNamesToCandidates(rows) {
  const manualCandidates = loadManualCandidates();
  if (!manualCandidates.length || !Array.isArray(rows)) return rows;

  const mapByDigits = new Map();
  manualCandidates.forEach((entry) => {
    const d = digitsOnly(entry.whatsapp);
    if (d) mapByDigits.set(d, entry.name);
  });

  for (const row of rows) {
    if (!row) continue;
    const currentName = row.fullname || row.fullName || '';
    if (currentName && currentName !== 'Inconnu') continue;

    const d = digitsOnly(row.whatsapp);
    let name = mapByDigits.get(d);
    if (!name && d.length >= 8) {
      const last8 = d.slice(-8);
      for (const [key, val] of mapByDigits.entries()) {
        if (key.endsWith(last8)) {
          name = val;
          break;
        }
      }
    }

    if (name) {
      row.fullName = name;
      row.fullname = name;
      try {
        await pool.query('UPDATE candidates SET fullName = $1 WHERE id = $2', [name, row.id]);
      } catch {
        // ignore db update failures
      }
    }
  }
  return rows;
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

async function getAdminConfigValue(key) {
  try {
    const res = await pool.query('SELECT value FROM admin_config WHERE key = $1 LIMIT 1', [key]);
    return res.rows[0]?.value || '';
  } catch {
    return '';
  }
}

async function setAdminConfigValue(key, value) {
  await pool.query(
    'INSERT INTO admin_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updatedAt = NOW()',
    [key, value]
  );
}

async function isSeasonArchived() {
  const val = await getAdminConfigValue('season_archived');
  return String(val || '') === '1';
}

async function ensureNotArchived(res) {
  const archived = await isSeasonArchived();
  if (!archived) return true;
  res.status(403).json({ message: 'Saison archivée. Modifications bloquées.' });
  return false;
}

async function isFinalPhaseLocked() {
  const val = await getAdminConfigValue('final_phase_locked');
  return String(val || '') === '1';
}

async function ensureFinalPhaseUnlocked(res) {
  const locked = await isFinalPhaseLocked();
  if (!locked) return true;
  res.status(403).json({ message: 'Phase finale verrouillée. Modifications bloquées.' });
  return false;
}

async function logScoreAudit(action, payload, req) {
  try {
    await pool.query(
      `INSERT INTO admin_audit (action, payload, ip)
       VALUES ($1, $2, $3)`,
      [action, JSON.stringify(payload || {}), getClientIp(req)],
    );
  } catch {}
}

function normalizeSettingsRow(row) {
  if (!row) return {
    votingEnabled: 0,
    registrationLocked: 0,
    competitionClosed: 0,
    certificatesEnabled: 1,
    announcementText: '',
    scheduleJson: '[]',
    convocationDate: '',
    convocationTime: '',
    convocationPlace: ''
  };
  return {
    votingEnabled: row.votingenabled ?? row.votingEnabled ?? 0,
    registrationLocked: row.registrationlocked ?? row.registrationLocked ?? 0,
    competitionClosed: row.competitionclosed ?? row.competitionClosed ?? 0,
    certificatesEnabled: row.certificatesenabled ?? row.certificatesEnabled ?? 1,
    announcementText: row.announcementtext ?? row.announcementText ?? '',
    scheduleJson: row.schedulejson ?? row.scheduleJson ?? '[]',
    convocationDate: row.convocationdate ?? row.convocationDate ?? '',
    convocationTime: row.convocationtime ?? row.convocationTime ?? '',
    convocationPlace: row.convocationplace ?? row.convocationPlace ?? ''
  };
}

function formatDateFr(date = new Date()) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function stripContacts(value) {
  return String(value || '').replace(/\s*\(?\+?\d[\d\s.-]*\)?/g, '').trim();
}

function normalizeUsername(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_-]+/g, '.')
    .replace(/[^a-z0-9.]/g, '')
    .replace(/\.+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

function buildMemberUsername(fullName) {
  const tokens = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!tokens.length) return '';
  if (tokens.length === 1) return normalizeUsername(tokens[0]);
  const lastName = tokens[0];
  const firstInitial = tokens[1][0] || '';
  return normalizeUsername(`${lastName}.${firstInitial}`);
}

function defaultMemberPassword() {
  return memberDefaultPassword || 'ASAA2026!';
}

async function loadMemberDefaultPassword() {
  try {
    const res = await pool.query(
      "SELECT value FROM admin_config WHERE key = 'member_default_password' LIMIT 1"
    );
    const value = res.rows[0]?.value;
    if (value && typeof value === 'string') {
      memberDefaultPassword = value;
    }
  } catch (error) {
    console.warn('⚠️ Impossible de charger le mot de passe par défaut des membres:', error.message);
  }
}

function isQuizOpenNow(date = new Date()) {
  const hour = date.getHours();
  return hour >= 22 && hour <= 23;
}

function quizDateKey(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function generateToken() {
  return randomBytes(24).toString('hex');
}

const DEFAULT_DAILY_QUIZ = {
  title: 'Quiz Islamique — Jour',
  questions: [
    {
      id: 'q1',
      question: 'Combien de piliers compte l’Islam ?',
      options: ['3', '4', '5', '6'],
      answerIndex: 2
    },
    {
      id: 'q2',
      question: 'Quelle sourate est appelée “La mère du Livre” ?',
      options: ['Al-Ikhlas', 'Al-Fatiha', 'Al-Baqara', 'An-Nas'],
      answerIndex: 1
    },
    {
      id: 'q3',
      question: 'En quel mois les musulmans jeûnent-ils ?',
      options: ['Muharram', 'Safar', 'Ramadan', 'Dhul Hijjah'],
      answerIndex: 2
    },
    {
      id: 'q4',
      question: 'Quelle est la direction de la Qibla ?',
      options: ['Kaaba à La Mecque', 'Jérusalem', 'Médine', 'La mer Rouge'],
      answerIndex: 0
    },
    {
      id: 'q5',
      question: 'Combien de prières obligatoires par jour ?',
      options: ['2', '3', '5', '6'],
      answerIndex: 2
    }
  ]
};

const DEFAULT_PROGRAM_SCHEDULE = [
  { date: '2026-03-16', time: '', title: 'Phase 1 en ligne (16–31 mars)' },
  { date: '2026-04-06', time: '', title: 'Phase 1 en présentiel (06–26 avril, dimanches)' },
  { date: '2026-05-04', time: '', title: 'Phase 2 en ligne (04–29 mai)' },
  { date: '2026-06-07', time: '', title: 'Face à face (présentiel) Treichville + Adjamé' },
  { date: '2026-06-22', time: '', title: 'Dernière phase en ligne (22–28 juin)' },
  { date: '2026-07-05', time: '', title: 'Dernière phase en présentiel — Treichville' },
  { date: '', time: '', title: 'Grande finale (août — date à préciser)' }
];

const DEFAULT_SITE_CONTENT = {
  about: {
    title: "Association des Serviteurs d'Allah Azawajal",
    subtitle: "Site officiel — Présentation de l'association",
    body: "L'ASAA œuvre pour la formation, l'éducation et le renforcement des valeurs islamiques à travers des actions sociales, culturelles et éducatives."
  },
  committee: {
    members: [
      { role: 'Président', name: 'DIARRA SIDI' },
      { role: 'Vice Président', name: 'BAH ALI MOHAMED' },
      { role: 'Secrétaire Général', name: 'OUATTARA LADJI MOUSSA' },
      { role: 'Secrétaire Adjointe 1', name: 'DIALLO MARIAMA' },
      { role: 'Secrétaire Adjointe 2', name: 'FOFANA NAWA' },
      { role: 'Secrétaire Adjointe 3', name: 'SANKARA RAMATA' },
      { role: 'Délégué Culturel', name: 'ADIANGO OUMAR' },
      { role: 'Délégué Culturel Adjoint 1', name: 'OUEDRAOGO ABDOUL RAHIM' },
      { role: 'Délégué Culturel Adjointe 2', name: 'BAH ZAYNAB' },
      { role: 'Délégué Social', name: 'GBANE KARAMOKO' },
      { role: 'Délégué Social Adjoint 1', name: 'ADIANGO OUMAR' },
      { role: 'Délégué Social Adjoint 2', name: 'TRAORE TALBI' },
      { role: 'Délégué Social Adjointe 3', name: 'MARIAMA BOUBACAR' },
      { role: 'Délégué Social Adjointe 4', name: 'DIARRASOUBA BINTA' },
      { role: 'Délégué de Mobilisation', name: 'KONATE NOURA' },
      { role: 'Délégué de Mobilisation Adjointe 1', name: 'SOW MARIAMA' },
      { role: 'Délégué de Mobilisation Adjointe 2', name: 'COULIBALY MADOUSSOU' },
      { role: 'Délégué de Mobilisation Adjoint 3', name: 'SANA ABDOUL JALIL' },
      { role: 'Délégué de Mobilisation Adjointe 4', name: 'FATIM DIALLO' },
      { role: 'Trésorière', name: 'BELLO AMINATA' },
      { role: 'Trésorière Adjoint', name: 'DIARRA FOUNE' },
      { role: 'Trésorière Adjointe 2', name: 'GBANE SAFFORA' }
    ]
  },
  programs: {
    items: [
      { title: 'Formations', description: 'Sessions de formation religieuse et éducative.' },
      { title: 'Événements', description: 'Organisation du Quiz Islamique et autres activités.' }
    ]
  },
  values: {
    title: 'Valeurs & Missions',
    body: "Nos actions s'appuient sur la foi, la bienveillance, la solidarité et l'excellence.",
    bullets: [
      'Foi et éthique islamique',
      'Formation et éducation',
      'Solidarité et entraide',
      'Excellence et discipline'
    ]
  },
  leaders: {
    items: [
      {
        role: 'Président',
        name: 'DIARRA SIDI',
        message: "Nous servons la communauté avec foi, discipline et engagement pour une jeunesse exemplaire."
      },
      {
        role: 'Secrétaire Général',
        name: 'LADJI MOUSSA OUATTARA',
        message: "L’ASAA reste disponible pour accompagner chaque candidat dans un cadre organisé et bienveillant."
      }
    ]
  },
  communiques: {
    items: []
  },
  documents: {
    summary: "Retrouvez ici les documents officiels, règlements et informations essentielles de l'ASAA.",
    items: [
      { title: 'Règlement (PDF)', url: 'assets/reglement.pdf' },
      { title: 'Programme officiel', url: 'programme.html' }
    ]
  },
  transparency: {
    body: "Nous publions régulièrement les informations clés pour garantir la transparence de nos actions.",
    stats: [],
    reports: []
  },
  membership: {
    open: false,
    info: "Le formulaire d’adhésion est fermé pour le moment."
  },
  phase: {
    enabled: true,
    title: 'Phase de notation',
    body:
      'La phase précédente est terminée. La notation se fait désormais sur trois épreuves techniques : Questions‑Réponses /30, Pont As Sirat /25, Reconnaissance de Verset /10.',
    northDate: 'DIMANCHE 19 AVRIL 2026',
    southDate: 'DIMANCHE 12 AVRIL 2026'
  },
  footer: {
    address: '',
    phone: '',
    email: '',
    hours: ''
  }
};

function safeText(value, maxLength = 800) {
  return sanitizeString(value, maxLength);
}

function sanitizeList(list, mapper, maxItems = 50) {
  const arr = Array.isArray(list) ? list.slice(0, maxItems) : [];
  return arr.map(mapper).filter(Boolean);
}

function normalizeMemberKey(member) {
  const role = String(member?.role || '').toUpperCase().trim();
  const name = String(member?.name || '').toUpperCase().trim();
  return `${role}|${name}`;
}

function normalizeRoleValue(role) {
  return String(role || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function applyCommitteeFixes(list = []) {
  return list.map((member) => {
    const name = String(member?.name || '').toUpperCase().trim();
    if (name === 'FONANA NAWA') {
      return { ...member, name: 'FOFANA NAWA' };
    }
    return member;
  });
}

const BLOCKED_COMMITTEE_KEYS = new Set([
  'DELEGUE SOCIAL ADJOINTE 5|ZEYNABOU SIDIBE'
]);

function filterBlockedMembers(list = []) {
  return list.filter((m) => !BLOCKED_COMMITTEE_KEYS.has(normalizeMemberKey(m)));
}

const UNIQUE_COMMITTEE_ROLES = new Set([
  'PRESIDENT',
  'VICE PRESIDENT',
  'SECRETAIRE GENERAL'
]);

function dedupeCommitteeByRole(list = []) {
  const seen = new Set();
  return list.filter((m) => {
    const role = normalizeRoleValue(m?.role);
    if (!UNIQUE_COMMITTEE_ROLES.has(role)) return true;
    if (seen.has(role)) return false;
    seen.add(role);
    return true;
  });
}

function mergeMembers(current = [], defaults = []) {
  const seen = new Set(current.map(normalizeMemberKey));
  const merged = current.slice();
  defaults.forEach((m) => {
    const key = normalizeMemberKey(m);
    if (!seen.has(key)) {
      merged.push(m);
      seen.add(key);
    }
  });
  return merged;
}

function sanitizeSiteContent(payload = {}) {
  const about = payload.about || {};
  const committee = payload.committee || {};
  const programs = payload.programs || {};
  const values = payload.values || {};
  const leaders = payload.leaders || {};
  const communiques = payload.communiques || {};
  const documents = payload.documents || {};
  const transparency = payload.transparency || {};
  const membership = payload.membership || {};
  const footer = payload.footer || {};

  return {
    about: {
      title: safeText(about.title, 120),
      subtitle: safeText(about.subtitle, 180),
      body: safeText(about.body, 2000)
    },
    committee: {
      members: sanitizeList(committee.members, (m) => ({
        role: safeText(m?.role, 120),
        name: safeText(m?.name, 200)
      }))
    },
    programs: {
      items: sanitizeList(programs.items, (p) => ({
        title: safeText(p?.title, 160),
        description: safeText(p?.description, 500)
      }))
    },
    values: {
      title: safeText(values.title, 160),
      body: safeText(values.body, 2000),
      bullets: sanitizeList(values.bullets, (b) => safeText(b, 200))
    },
    leaders: {
      items: sanitizeList(leaders.items, (l) => ({
        role: safeText(l?.role, 120),
        name: safeText(l?.name, 200),
        message: safeText(l?.message, 2000)
      }))
    },
    communiques: {
      items: sanitizeList(communiques.items, (c) => ({
        date: safeText(c?.date, 40),
        title: safeText(c?.title, 160),
        body: safeText(c?.body, 2000),
        signedBy: safeText(c?.signedBy, 160)
      }))
    },
    documents: {
      summary: safeText(documents.summary, 800),
      items: sanitizeList(documents.items, (d) => ({
        title: safeText(d?.title, 160),
        url: safeText(d?.url, 300)
      }))
    },
    transparency: {
      body: safeText(transparency.body, 2000),
      stats: sanitizeList(transparency.stats, (s) => ({
        label: safeText(s?.label, 120),
        value: safeText(s?.value, 120)
      })),
      reports: sanitizeList(transparency.reports, (r) => ({
        title: safeText(r?.title, 160),
        url: safeText(r?.url, 300)
      }))
    },
    membership: {
      open: Boolean(membership.open),
      info: safeText(membership.info, 500)
    },
    phase: {
      enabled: typeof payload.phase?.enabled === 'boolean' ? payload.phase.enabled : true,
      title: safeText(payload.phase?.title, 120),
      body: safeText(payload.phase?.body, 1200),
      northDate: safeText(payload.phase?.northDate, 80),
      southDate: safeText(payload.phase?.southDate, 80)
    },
    footer: {
      address: safeText(footer.address, 200),
      phone: safeText(footer.phone, 60),
      email: safeText(footer.email, 120),
      hours: safeText(footer.hours, 120)
    }
  };
}

async function getSiteContent() {
  const result = await pool.query(
    "SELECT value FROM admin_config WHERE key = 'site_content' LIMIT 1"
  );
  const raw = result.rows[0]?.value;
  if (!raw) return DEFAULT_SITE_CONTENT;
  try {
    const parsed = JSON.parse(raw);
    return {
      about: { ...DEFAULT_SITE_CONTENT.about, ...(parsed.about || {}) },
      committee: {
        members: applyCommitteeFixes(
          Array.isArray(parsed.committee?.members) && parsed.committee.members.length
            ? dedupeCommitteeByRole(
                filterBlockedMembers(
                  mergeMembers(parsed.committee.members, DEFAULT_SITE_CONTENT.committee.members)
                )
              )
            : dedupeCommitteeByRole(filterBlockedMembers(DEFAULT_SITE_CONTENT.committee.members))
        )
      },
      programs: {
        items:
          Array.isArray(parsed.programs?.items) && parsed.programs.items.length
            ? parsed.programs.items
            : DEFAULT_SITE_CONTENT.programs.items
      },
      values: {
        title: parsed.values?.title || DEFAULT_SITE_CONTENT.values.title,
        body: parsed.values?.body || DEFAULT_SITE_CONTENT.values.body,
        bullets:
          Array.isArray(parsed.values?.bullets) && parsed.values.bullets.length
            ? parsed.values.bullets
            : DEFAULT_SITE_CONTENT.values.bullets
      },
      leaders: {
        items:
          Array.isArray(parsed.leaders?.items) && parsed.leaders.items.length
            ? parsed.leaders.items
            : DEFAULT_SITE_CONTENT.leaders.items
      },
      communiques: {
        items:
          Array.isArray(parsed.communiques?.items) && parsed.communiques.items.length
            ? parsed.communiques.items
            : DEFAULT_SITE_CONTENT.communiques.items
      },
      documents: {
        summary: parsed.documents?.summary || DEFAULT_SITE_CONTENT.documents.summary,
        items:
          Array.isArray(parsed.documents?.items) && parsed.documents.items.length
            ? parsed.documents.items
            : DEFAULT_SITE_CONTENT.documents.items
      },
      transparency: {
        body: parsed.transparency?.body || DEFAULT_SITE_CONTENT.transparency.body,
        stats:
          Array.isArray(parsed.transparency?.stats) && parsed.transparency.stats.length
            ? parsed.transparency.stats
            : DEFAULT_SITE_CONTENT.transparency.stats,
        reports:
          Array.isArray(parsed.transparency?.reports) && parsed.transparency.reports.length
            ? parsed.transparency.reports
            : DEFAULT_SITE_CONTENT.transparency.reports
      },
      membership: {
        open:
          typeof parsed.membership?.open === 'boolean'
            ? parsed.membership.open
            : DEFAULT_SITE_CONTENT.membership.open,
        info: parsed.membership?.info || DEFAULT_SITE_CONTENT.membership.info
      },
      phase: {
        enabled:
          typeof parsed.phase?.enabled === 'boolean'
            ? parsed.phase.enabled
            : DEFAULT_SITE_CONTENT.phase.enabled,
        title: parsed.phase?.title || DEFAULT_SITE_CONTENT.phase.title,
        body: parsed.phase?.body || DEFAULT_SITE_CONTENT.phase.body,
        northDate: parsed.phase?.northDate || DEFAULT_SITE_CONTENT.phase.northDate,
        southDate: parsed.phase?.southDate || DEFAULT_SITE_CONTENT.phase.southDate
      },
      footer: { ...DEFAULT_SITE_CONTENT.footer, ...(parsed.footer || {}) }
    };
  } catch {
    return DEFAULT_SITE_CONTENT;
  }
}

async function getMemberToolsConfig() {
  const result = await pool.query(
    "SELECT value FROM admin_config WHERE key = 'member_tools' LIMIT 1"
  );
  const raw = result.rows[0]?.value;
  if (!raw) {
    return { messages: [], tasks: [], documents: [], whatsappRecipients: [], whatsappTemplate: '', whatsappLogs: [] };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      documents: Array.isArray(parsed.documents) ? parsed.documents : [],
      whatsappRecipients: Array.isArray(parsed.whatsappRecipients) ? parsed.whatsappRecipients : [],
      whatsappTemplate: typeof parsed.whatsappTemplate === 'string' ? parsed.whatsappTemplate : '',
      whatsappLogs: Array.isArray(parsed.whatsappLogs) ? parsed.whatsappLogs : []
    };
  } catch {
    return { messages: [], tasks: [], documents: [], whatsappRecipients: [], whatsappTemplate: '', whatsappLogs: [] };
  }
}

function sanitizeMemberTools(payload = {}) {
  const messages = Array.isArray(payload.messages)
    ? payload.messages
        .map((m) => ({
          scope: sanitizeString(m.scope || 'all', 80) || 'all',
          title: sanitizeString(m.title, 140),
          body: sanitizeString(m.body, 800),
          createdAt: sanitizeString(m.createdAt, 40) || new Date().toISOString()
        }))
        .filter((m) => m.title && m.body)
    : [];

  const tasks = Array.isArray(payload.tasks)
    ? payload.tasks
        .map((t) => ({
          assignee: sanitizeString(t.assignee || 'all', 80) || 'all',
          title: sanitizeString(t.title, 160),
          dueDate: sanitizeString(t.dueDate, 40),
          status: sanitizeString(t.status, 40) || 'En cours'
        }))
        .filter((t) => t.title)
    : [];

  const documents = Array.isArray(payload.documents)
    ? payload.documents
        .map((d) => ({
          title: sanitizeString(d.title, 160),
          url: sanitizeString(d.url, 400)
        }))
        .filter((d) => d.title && d.url)
    : [];

  const whatsappRecipients = Array.isArray(payload.whatsappRecipients)
    ? payload.whatsappRecipients
        .map((r) => ({
          name: sanitizeString(r.name, 160),
          role: sanitizeString(r.role, 160),
          phone: sanitizeString(r.phone, 40)
        }))
        .filter((r) => r.name && r.phone)
    : [];

  const whatsappTemplate = sanitizeString(payload.whatsappTemplate, 800);

  const whatsappLogs = Array.isArray(payload.whatsappLogs)
    ? payload.whatsappLogs
        .map((l) => ({
          sentAt: sanitizeString(l.sentAt, 60),
          template: sanitizeString(l.template, 800),
          count: Number(l.count || 0)
        }))
        .filter((l) => l.sentAt)
    : [];

  return { messages, tasks, documents, whatsappRecipients, whatsappTemplate, whatsappLogs };
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
    "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' https: data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
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
        compositionScore REAL DEFAULT 0,
        questionScore REAL DEFAULT 0,
        themeScore REAL DEFAULT 0,
        pontAsSiratScore REAL DEFAULT 0,
        recognitionScore REAL DEFAULT 0,
        notes TEXT,
        createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      ALTER TABLE scores ADD COLUMN IF NOT EXISTS compositionScore REAL DEFAULT 0;
      ALTER TABLE scores ADD COLUMN IF NOT EXISTS questionScore REAL DEFAULT 0;
      ALTER TABLE scores ADD COLUMN IF NOT EXISTS themeScore REAL DEFAULT 0;
      ALTER TABLE scores ADD COLUMN IF NOT EXISTS pontAsSiratScore REAL DEFAULT 0;
      ALTER TABLE scores ADD COLUMN IF NOT EXISTS recognitionScore REAL DEFAULT 0;
      ALTER TABLE scores ADD COLUMN IF NOT EXISTS scorePhase TEXT DEFAULT '${SCORE_PHASE_PREVIOUS}';
      UPDATE scores
      SET scorePhase = '${SCORE_PHASE_PREVIOUS}'
      WHERE scorePhase IS NULL OR TRIM(scorePhase) = '';

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
        certificatesEnabled INTEGER DEFAULT 1,
        announcementText TEXT DEFAULT '',
        scheduleJson TEXT DEFAULT '[]',
        convocationDate TEXT DEFAULT '',
        convocationTime TEXT DEFAULT '',
        convocationPlace TEXT DEFAULT '',
        updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS admin_audit (
        id BIGSERIAL PRIMARY KEY,
        action TEXT NOT NULL,
        payload TEXT,
        ip TEXT,
        createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS candidate_status_history (
        id BIGSERIAL PRIMARY KEY,
        candidateId BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
        oldStatus TEXT,
        newStatus TEXT,
        ip TEXT,
        changedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_candidate_status_history_candidate ON candidate_status_history(candidateId);

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

      CREATE TABLE IF NOT EXISTS score_corrections (
        id BIGSERIAL PRIMARY KEY,
        scoreId BIGINT NOT NULL,
        candidateId BIGINT NOT NULL,
        judgeName TEXT NOT NULL,
        oldPayload TEXT NOT NULL,
        newPayload TEXT NOT NULL,
        reason TEXT NOT NULL,
        editedBy TEXT,
        createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_score_corrections_score ON score_corrections(scoreId);

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

      CREATE TABLE IF NOT EXISTS news_posts (
        id BIGSERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        status TEXT DEFAULT 'published',
        featured BOOLEAN DEFAULT FALSE,
        category TEXT,
        imageUrl TEXT,
        imagesJson TEXT,
        publishAt TIMESTAMP WITH TIME ZONE,
        createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sponsors (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        contactName TEXT,
        email TEXT,
        phone TEXT,
        amount DECIMAL(10, 2),
        logoUrl TEXT,
        filesJson TEXT,
        website TEXT,
        status TEXT DEFAULT 'pending',
        createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

      CREATE TABLE IF NOT EXISTS waitlist (
        id BIGSERIAL PRIMARY KEY,
        fullName TEXT NOT NULL,
        whatsapp TEXT NOT NULL,
        city TEXT,
        createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS eliminated_candidates (
        id BIGSERIAL PRIMARY KEY,
        candidateId BIGINT UNIQUE,
        fullName TEXT,
        whatsapp TEXT,
        city TEXT,
        status TEXT,
        archivedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS member_accounts (
        id BIGSERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        fullName TEXT NOT NULL,
        role TEXT,
        email TEXT,
        phone TEXT,
        passwordHash TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS member_sessions (
        id BIGSERIAL PRIMARY KEY,
        memberId BIGINT NOT NULL REFERENCES member_accounts(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expiresAt TIMESTAMP WITH TIME ZONE
      );

      CREATE TABLE IF NOT EXISTS auth_login_throttle (
        key TEXT PRIMARY KEY,
        namespace TEXT NOT NULL,
        ip TEXT NOT NULL,
        username TEXT NOT NULL,
        failures INTEGER DEFAULT 0,
        window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        blocked_until TIMESTAMP WITH TIME ZONE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS member_audit (
        id BIGSERIAL PRIMARY KEY,
        memberId BIGINT REFERENCES member_accounts(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        payload TEXT,
        ip TEXT,
        createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS daily_quiz_attempts (
        id BIGSERIAL PRIMARY KEY,
        memberId BIGINT REFERENCES member_accounts(id) ON DELETE SET NULL,
        quizDate TEXT NOT NULL,
        score INTEGER DEFAULT 0,
        total INTEGER DEFAULT 0,
        answersJson TEXT,
        createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(memberId, quizDate)
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
      CREATE INDEX IF NOT EXISTS idx_news_status ON news_posts(status);
      CREATE INDEX IF NOT EXISTS idx_sponsors_status ON sponsors(status);
      CREATE INDEX IF NOT EXISTS idx_member_sessions_token ON member_sessions(token);
      CREATE INDEX IF NOT EXISTS idx_auth_login_throttle_namespace ON auth_login_throttle(namespace);
      CREATE INDEX IF NOT EXISTS idx_auth_login_throttle_updated_at ON auth_login_throttle(updated_at);
      CREATE INDEX IF NOT EXISTS idx_auth_login_throttle_blocked_until ON auth_login_throttle(blocked_until);
      CREATE INDEX IF NOT EXISTS idx_member_audit_member ON member_audit(memberId);
      CREATE INDEX IF NOT EXISTS idx_daily_quiz_date ON daily_quiz_attempts(quizDate);

      -- SOCIAL FEATURES TABLES
      CREATE TABLE IF NOT EXISTS user_profiles (
        id BIGSERIAL PRIMARY KEY,
        candidate_id BIGINT NOT NULL UNIQUE,
        bio TEXT,
        avatar_url TEXT,
        website TEXT,
        location TEXT,
        followers_count INTEGER DEFAULT 0,
        following_count INTEGER DEFAULT 0,
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_followers (
        id BIGSERIAL PRIMARY KEY,
        follower_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        following_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(follower_id, following_id)
      );

      CREATE TABLE IF NOT EXISTS direct_messages (
        id BIGSERIAL PRIMARY KEY,
        sender_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        recipient_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        read_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS leaderboard_entries (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES user_profiles(id) ON DELETE CASCADE,
        candidate_id BIGINT,
        score INTEGER DEFAULT 0,
        votes_count INTEGER DEFAULT 0,
        profile_views INTEGER DEFAULT 0,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id)
      );

      CREATE TABLE IF NOT EXISTS achievements (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon_emoji TEXT,
        category TEXT,
        criteria_type TEXT,
        criteria_value INTEGER
      );

      CREATE TABLE IF NOT EXISTS user_achievements (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        achievement_id BIGINT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
        unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, achievement_id)
      );

      -- Create indexes for social features
      CREATE INDEX IF NOT EXISTS idx_user_profiles_candidate ON user_profiles(candidate_id);
      CREATE INDEX IF NOT EXISTS idx_user_followers_follower ON user_followers(follower_id);
      CREATE INDEX IF NOT EXISTS idx_user_followers_following ON user_followers(following_id);
      CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON direct_messages(sender_id);
      CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient ON direct_messages(recipient_id);
      CREATE INDEX IF NOT EXISTS idx_direct_messages_read ON direct_messages(read_at);
      CREATE INDEX IF NOT EXISTS idx_leaderboard_candidate ON leaderboard_entries(candidate_id);
      CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard_entries(score DESC);
      CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement ON user_achievements(achievement_id);

      -- ENHANCED SOCIAL FEATURES TABLES (Phase 2)
      CREATE TABLE IF NOT EXISTS notifications (
        id BIGSERIAL PRIMARY KEY,
        recipient_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        sender_id BIGINT REFERENCES user_profiles(id) ON DELETE SET NULL,
        type TEXT NOT NULL DEFAULT 'follow',
        title TEXT NOT NULL,
        message TEXT,
        related_id BIGINT,
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_stories (
        id BIGSERIAL PRIMARY KEY,
        author_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        image_url TEXT,
        visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'followers', 'private')),
        likes_count INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        shares_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS story_likes (
        id BIGSERIAL PRIMARY KEY,
        story_id BIGINT NOT NULL REFERENCES user_stories(id) ON DELETE CASCADE,
        user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(story_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS story_comments (
        id BIGSERIAL PRIMARY KEY,
        story_id BIGINT NOT NULL REFERENCES user_stories(id) ON DELETE CASCADE,
        author_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        content TEXT NOT NULL CHECK (char_length(content) <= 500),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS profile_views (
        id BIGSERIAL PRIMARY KEY,
        profile_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        visitor_id BIGINT REFERENCES user_profiles(id) ON DELETE SET NULL,
        ip_address TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_preferences (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
        interests TEXT[] DEFAULT '{}',
        notification_settings JSONB DEFAULT '{"email": true, "push": true, "sms": false}',
        privacy_level TEXT DEFAULT 'public',
        online_status TEXT DEFAULT 'offline',
        message_permissions TEXT DEFAULT 'all',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS search_history (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        query TEXT NOT NULL,
        query_type TEXT DEFAULT 'user',
        result_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_recommendations (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        recommended_user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        reason TEXT DEFAULT 'mutual_followers',
        score INTEGER DEFAULT 0,
        viewed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS message_reactions (
        id BIGSERIAL PRIMARY KEY,
        message_id BIGINT NOT NULL REFERENCES direct_messages(id) ON DELETE CASCADE,
        user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        emoji TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(message_id, user_id, emoji)
      );

      CREATE TABLE IF NOT EXISTS user_roles (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        role_name TEXT NOT NULL,
        badge_emoji TEXT,
        assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Enhanced indexes for new tables
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_sender ON notifications(sender_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
      CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
      
      CREATE INDEX IF NOT EXISTS idx_user_stories_author ON user_stories(author_id);
      CREATE INDEX IF NOT EXISTS idx_user_stories_visibility ON user_stories(visibility);
      CREATE INDEX IF NOT EXISTS idx_user_stories_created ON user_stories(created_at DESC);
      
      CREATE INDEX IF NOT EXISTS idx_story_likes_story ON story_likes(story_id);
      CREATE INDEX IF NOT EXISTS idx_story_likes_user ON story_likes(user_id);
      
      CREATE INDEX IF NOT EXISTS idx_story_comments_story ON story_comments(story_id);
      CREATE INDEX IF NOT EXISTS idx_story_comments_author ON story_comments(author_id);
      
      CREATE INDEX IF NOT EXISTS idx_profile_views_profile ON profile_views(profile_id);
      CREATE INDEX IF NOT EXISTS idx_profile_views_visitor ON profile_views(visitor_id);
      CREATE INDEX IF NOT EXISTS idx_profile_views_created ON profile_views(created_at DESC);
      
      CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_search_history_created ON search_history(created_at DESC);
      
      CREATE INDEX IF NOT EXISTS idx_user_recommendations_user ON user_recommendations(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_recommendations_score ON user_recommendations(score DESC);
      CREATE INDEX IF NOT EXISTS idx_user_recommendations_viewed ON user_recommendations(viewed_at);
      
      CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);
      CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON message_reactions(user_id);
      
      CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);

      -- Alter existing tables to add new columns if they don't exist
      ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS profile_views_count INTEGER DEFAULT 0;
      ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS total_posts INTEGER DEFAULT 0;
      ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_online INTEGER DEFAULT 0;
      ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;
      ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS verified INTEGER DEFAULT 0;

      ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS is_liked INTEGER DEFAULT 0;
      ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS reactions_count INTEGER DEFAULT 0;

      -- Create activity feed aggregation view
      CREATE OR REPLACE VIEW activity_feed AS
      SELECT 
        'story' as activity_type,
        s.id as activity_id,
        s.author_id as user_id,
        s.content as content,
        s.image_url,
        s.created_at,
        up.fullName as author_name,
        s.likes_count,
        s.comments_count
      FROM user_stories s
      JOIN user_profiles up ON s.author_id = up.id
      WHERE s.visibility = 'public'
      UNION ALL
      SELECT 
        'achievement' as activity_type,
        a.id as activity_id,
        ua.user_id,
        a.description as content,
        NULL as image_url,
        ua.unlocked_at as created_at,
        up.fullName as author_name,
        0 as likes_count,
        0 as comments_count
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      JOIN user_profiles up ON ua.user_id = up.id
      ORDER BY created_at DESC;

      -- Pre-populate user preferences for existing users
      INSERT INTO user_preferences (user_id, interests, notification_settings, privacy_level)
      SELECT id, '{}', '{"email": true, "push": true, "sms": false}', 'public'
      FROM user_profiles
      WHERE id NOT IN (SELECT user_id FROM user_preferences)
      ON CONFLICT DO NOTHING;

      -- Insert pre-seeded achievements
      INSERT INTO achievements (name, description, icon_emoji, category, criteria_type, criteria_value)
      VALUES
        ('Nouvel Arrivant', 'Rejoignez le réseau social', '👋', 'milestone', 'joined', 1),
        ('Social Butterfly', 'Atteindrez 10 abonnés', '🦋', 'social', 'followers', 10),
        ('Communicateur', 'Envoyez 5 messages', '💬', 'engagement', 'messages', 5),
        ('Vedette', 'Atteindrez 50 abonnés', '⭐', 'social', 'followers', 50),
        ('Influenceur', 'Atteindrez 100 abonnés', '🔥', 'social', 'followers', 100),
        ('Bien Connecté', 'Suivrez 20 personnes', '🔗', 'engagement', 'following', 20),
        ('Animateur de Réseau', 'Recevrez 100 votes', '📊', 'engagement', 'votes', 100),
        ('Vedette du Quiz', 'Classement Top 10', '🏆', 'special', 'ranking', 10),
        ('Champion', 'Classement Top 5', '🥇', 'special', 'ranking', 5),
        ('Légende', 'Classement #1', '👑', 'special', 'ranking', 1),
        ('Maître Réseau', 'Atteindrez 500 abonnés', '🌟', 'social', 'followers', 500)
      ON CONFLICT DO NOTHING;
    `);

    await pool.query(`ALTER TABLE media_events ADD COLUMN IF NOT EXISTS favorites BIGINT DEFAULT 0;`);
    await pool.query(`ALTER TABLE news_posts ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE;`);
    await pool.query(`ALTER TABLE news_posts ADD COLUMN IF NOT EXISTS category TEXT;`);
    await pool.query(`ALTER TABLE news_posts ADD COLUMN IF NOT EXISTS imageUrl TEXT;`);
    await pool.query(`ALTER TABLE news_posts ADD COLUMN IF NOT EXISTS imagesJson TEXT;`);
    await pool.query(`ALTER TABLE news_posts ADD COLUMN IF NOT EXISTS publishAt TIMESTAMP WITH TIME ZONE;`);
    await pool.query(`ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS filesJson TEXT;`);
    await pool.query(`ALTER TABLE tournament_settings ADD COLUMN IF NOT EXISTS certificatesEnabled INTEGER DEFAULT 1;`);
    await pool.query(`ALTER TABLE tournament_settings ADD COLUMN IF NOT EXISTS convocationDate TEXT DEFAULT '';`);
    await pool.query(`ALTER TABLE tournament_settings ADD COLUMN IF NOT EXISTS convocationTime TEXT DEFAULT '';`);
    await pool.query(`ALTER TABLE tournament_settings ADD COLUMN IF NOT EXISTS convocationPlace TEXT DEFAULT '';`);

    // ========== PHASE 3: CHAT GROUPS & DYNAMIC BADGES TABLES ==========

    // Chat Groups Tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_groups (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL DEFAULT 'public' CHECK (type IN ('public', 'private', 'invite-only')),
        topic TEXT DEFAULT 'general',
        created_by BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        avatar_url TEXT,
        members_count INTEGER DEFAULT 1,
        is_archived INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_group_members (
        id BIGSERIAL PRIMARY KEY,
        group_id BIGINT NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
        user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        role TEXT DEFAULT 'member' CHECK (role IN ('creator', 'admin', 'moderator', 'member')),
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        muted INTEGER DEFAULT 0,
        notifications_enabled INTEGER DEFAULT 1,
        UNIQUE(group_id, user_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id BIGSERIAL PRIMARY KEY,
        group_id BIGINT NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
        author_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE SET NULL,
        content TEXT NOT NULL,
        media_url TEXT,
        media_type TEXT,
        is_pinned INTEGER DEFAULT 0,
        is_edited INTEGER DEFAULT 0,
        reactions_count INTEGER DEFAULT 0,
        reply_to_id BIGINT REFERENCES chat_messages(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS typing_indicators (
        id BIGSERIAL PRIMARY KEY,
        group_id BIGINT NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
        user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        is_typing INTEGER DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(group_id, user_id)
      )
    `);

    // Badges Tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS badge_templates (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        emoji TEXT NOT NULL,
        icon_url TEXT,
        category TEXT DEFAULT 'general' CHECK (category IN ('general', 'achievement', 'milestone', 'special', 'seasonal')),
        requirement_type TEXT NOT NULL,
        requirement_value INTEGER,
        rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'legendary')),
        points_reward INTEGER DEFAULT 0,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_badges (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        badge_id BIGINT NOT NULL REFERENCES badge_templates(id) ON DELETE CASCADE,
        unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        progress INTEGER DEFAULT 100,
        displayed_on_profile INTEGER DEFAULT 1,
        UNIQUE(user_id, badge_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS badge_progress (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        badge_id BIGINT NOT NULL REFERENCES badge_templates(id) ON DELETE CASCADE,
        current_progress INTEGER DEFAULT 0,
        target_value INTEGER NOT NULL,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, badge_id)
      )
    `);

    // Create Indexes for Performance
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_chat_groups_creator ON chat_groups(created_by)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_chat_groups_type ON chat_groups(type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_chat_group_members_group ON chat_group_members(group_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_chat_group_members_user ON chat_group_members(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_chat_messages_group ON chat_messages(group_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_badges_unlocked ON user_badges(unlocked_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_badge_progress_user ON badge_progress(user_id)`);

    // Add new columns to existing tables
    await pool.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS chat_groups_joined_count INTEGER DEFAULT 0`);
    await pool.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS chat_messages_count INTEGER DEFAULT 0`);
    await pool.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS badges_unlocked_count INTEGER DEFAULT 0`);
    await pool.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS badge_points_total INTEGER DEFAULT 0`);

    // Pre-populate badge templates
    await pool.query(`
      INSERT INTO badge_templates (name, description, emoji, category, requirement_type, requirement_value, rarity, points_reward, display_order)
      VALUES
        ('Quiz Starter', 'Take your first quiz', '🎯', 'milestone', 'quiz_count', 1, 'common', 10, 1),
        ('Quiz Enthusiast', 'Complete 10 quizzes', '📝', 'milestone', 'quiz_count', 10, 'uncommon', 50, 2),
        ('Quiz Master', 'Complete 100 quizzes', '🏆', 'achievement', 'quiz_count', 100, 'rare', 200, 3),
        ('Perfect Score', 'Score 100% on 5 quizzes', '⭐', 'achievement', 'score', 100, 'uncommon', 100, 4),
        ('Week Warrior', 'Take quizzes 7 days in a row', '🔥', 'streak', 'streak', 7, 'rare', 150, 5),
        ('Social Butterfly', 'Follow 50 users', '🦋', 'social', 'social', 50, 'uncommon', 75, 6),
        ('Community Helper', 'Get 100 message reactions', '💬', 'community', 'community', 100, 'uncommon', 80, 7),
        ('Knowledge Seeker', 'Join 5 study groups', '📚', 'community', 'community', 5, 'uncommon', 60, 8),
        ('Night Owl', 'Take 10 quizzes between 10pm-6am', '🌙', 'special', 'streak', 10, 'uncommon', 90, 10),
        ('Speed Runner', 'Complete 5 quizzes under 2 minutes', '⚡', 'achievement', 'score', 5, 'rare', 130, 11),
        ('Ranking Master', 'Reach top 10 in monthly leaderboard', '🏅', 'achievement', 'score', 10, 'rare', 180, 12),
        ('First Steps', 'Complete profile setup', '👣', 'milestone', 'quiz_count', 0, 'common', 5, 0),
        ('Team Player', 'Participate in a group quiz challenge', '🤝', 'community', 'community', 1, 'uncommon', 70, 13),
        ('Legend', 'Achieve Rank 1 on leaderboard', '👑', 'special', 'score', 1, 'legendary', 500, 99)
      ON CONFLICT DO NOTHING
    `);

    // Pre-populate badge progress for existing users
    await pool.query(`
      INSERT INTO badge_progress (user_id, badge_id, current_progress, target_value)
      SELECT up.id, bt.id, 0, COALESCE(bt.requirement_value, 1)
      FROM user_profiles up
      CROSS JOIN badge_templates bt
      ON CONFLICT DO NOTHING
    `);

    await pool.query(`
      INSERT INTO poll (question, optionsJson, active)
      SELECT 'Sondage rapide : Souhaitez-vous recevoir les résultats en direct ?', '["Oui","Non"]', 1
      WHERE NOT EXISTS (SELECT 1 FROM poll);
    `);

    // Auto-approve existing registrations + normalize country + candidate codes
    await pool.query(`UPDATE candidates SET status = 'approved' WHERE status IS NULL OR TRIM(status) = ''`);
    await pool.query(`UPDATE candidates SET country = $1 WHERE country IS NULL OR TRIM(country) = ''`, [DEFAULT_COUNTRY]);
    await pool.query(`UPDATE candidates SET city = UPPER(city) WHERE city IS NOT NULL`);
    await pool.query(
      `UPDATE candidates
       SET candidateCode = $1 || '-' || LPAD(id::text, 3, '0')
       WHERE candidateCode IS NULL OR candidateCode = ''`,
      [CODE_PREFIX]
    );

    // Defaults for 2026 format (modifiable in admin)
    await pool.query(
      `UPDATE tournament_settings
       SET maxCandidates = COALESCE(NULLIF(maxCandidates, 0), 59),
           directQualified = COALESCE(NULLIF(directQualified, 0), 24),
           playoffParticipants = COALESCE(NULLIF(playoffParticipants, 0), 16),
           playoffWinners = COALESCE(NULLIF(playoffWinners, 0), 8),
           groupsCount = COALESCE(NULLIF(groupsCount, 0), 8),
           candidatesPerGroup = COALESCE(NULLIF(candidatesPerGroup, 0), 4),
           finalistsFromWinners = COALESCE(NULLIF(finalistsFromWinners, 0), 8),
           finalistsFromBestSecond = COALESCE(NULLIF(finalistsFromBestSecond, 0), 2),
           totalFinalists = COALESCE(NULLIF(totalFinalists, 0), 10),
           certificatesEnabled = COALESCE(certificatesEnabled, 1)
       WHERE id = 1`
    );

    await pool.query(
      `UPDATE tournament_settings
       SET scheduleJson = $1
       WHERE id = 1
         AND (scheduleJson IS NULL OR TRIM(scheduleJson) = '' OR scheduleJson = '[]')`,
      [JSON.stringify(DEFAULT_PROGRAM_SCHEDULE)]
    );

    await pool.query(
      "INSERT INTO admin_config (key, value) VALUES ('site_content', $1) ON CONFLICT (key) DO NOTHING",
      [JSON.stringify(DEFAULT_SITE_CONTENT)]
    );
    await pool.query(
      "INSERT INTO admin_config (key, value) VALUES ('daily_quiz', $1) ON CONFLICT (key) DO NOTHING",
      [JSON.stringify(DEFAULT_DAILY_QUIZ)]
    );

    // Seed member accounts from committee list (first name as username)
    const defaultPass = await hashPassword(defaultMemberPassword());
    for (const member of DEFAULT_SITE_CONTENT.committee.members) {
      const rawName = String(member.name || '').trim();
      if (!rawName) continue;
      const username = buildMemberUsername(rawName);
      if (!username) continue;
      await pool.query(
        `INSERT INTO member_accounts (username, fullName, role, passwordHash)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (username) DO NOTHING`,
        [username, rawName, member.role || '', defaultPass]
      );

      await pool.query(
        `UPDATE member_accounts
         SET username = $1, fullName = $2, role = $3
         WHERE UPPER(fullName) = UPPER($2) AND username <> $1`,
        [username, rawName, member.role || '']
      );
    }
    await pool.query(
      "UPDATE member_accounts SET fullName = 'FOFANA NAWA' WHERE UPPER(fullName) = 'FONANA NAWA'"
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

    // Ensure names are synchronized even if records already exist
    await upsertManualCandidates(manualCandidates);

    // ========== NEW FEATURES: NOTIFICATIONS, ACHIEVEMENTS, REPORTS, MODERATION ==========
    
    // Notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        read_at TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
    `);

    // Achievements table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS achievements_unlocked (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        achievement_id VARCHAR(100) NOT NULL,
        unlocked_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, achievement_id)
      );
      CREATE INDEX IF NOT EXISTS idx_achievements_unlocked_user_id ON achievements_unlocked(user_id);
      CREATE INDEX IF NOT EXISTS idx_achievements_unlocked_achievement_id ON achievements_unlocked(achievement_id);
    `);

    // Add achievement_points column to users
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS achievement_points INTEGER DEFAULT 0`);

    // Moderation tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS moderation_reports (
        id SERIAL PRIMARY KEY,
        content_id INTEGER NOT NULL,
        content_type VARCHAR(50) NOT NULL,
        reason TEXT NOT NULL,
        reported_by INTEGER,
        status VARCHAR(50) DEFAULT 'pending',
        moderated_by INTEGER,
        moderated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_moderation_reports_status ON moderation_reports(status);
      CREATE INDEX IF NOT EXISTS idx_moderation_reports_created_at ON moderation_reports(created_at DESC);
    `);

    // Add moderation columns to users
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_until TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP;
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

app.get('/api/ready', async (req, res) => {
  const checks = {
    environment: envValidation.errors.length === 0 ? 'ok' : 'error',
    database: 'error'
  };

  try {
    await pool.query('SELECT 1');
    checks.database = 'ok';
  } catch (error) {
    checks.database = 'error';
  }

  const ready = checks.environment === 'ok' && checks.database === 'ok';
  const statusCode = ready ? 200 : 503;
  return res.status(statusCode).json({
    status: ready ? 'ready' : 'not_ready',
    checks,
    timestamp: new Date().toISOString()
  });
});

// Public candidates
app.get('/api/public-candidates', async (req, res) => {
  try {
    await maybeSyncManualCandidates();
    const result = await pool.query(`
      SELECT c.id, c.candidateCode, c.fullName, c.city, c.country, c.whatsapp, c.photoUrl,
             c.quranLevel, c.motivation, c.createdAt,
             COALESCE(COUNT(v.id), 0) as totalVotes
      FROM candidates c
      LEFT JOIN votes v ON c.id = v.candidateId
      GROUP BY c.id
      ORDER BY c.id ASC
    `);
    res.json(await applyManualNamesToCandidates(result.rows));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Public settings
app.get('/api/public-settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tournament_settings WHERE id = 1');
    const normalized = normalizeSettingsRow(result.rows[0]);
    res.json(normalized);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

registerAdminContentRoutes({ app, pool, verifyAdmin, sanitizeString, getSiteContent, sanitizeSiteContent });

// Public committee PDF
app.get('/api/public/committee-pdf', async (req, res) => {
  try {
    const content = await getSiteContent();
    const members = Array.isArray(content.committee?.members) ? content.committee.members : [];
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="comite-asaa.pdf"');
    doc.pipe(res);

    const logoPath = join(__dirname, 'public', 'assets', 'logo.jpg');
    try {
      doc.image(logoPath, 50, 40, { width: 70 });
    } catch {}

    doc.fontSize(20).text('ASAA Officiel', { align: 'center' });
    doc.fontSize(12).text("Liste des membres du bureau exécutif", { align: 'center' });
    doc.moveDown(1);

    const tableTop = 140;
    const startX = 50;
    const colRole = 220;
    const colName = 260;

    doc.fontSize(11).text('Poste', startX, tableTop);
    doc.text('Nom', startX + colRole, tableTop);
    doc.moveTo(startX, tableTop + 15).lineTo(560, tableTop + 15).stroke();

    let y = tableTop + 24;
    members.forEach((m) => {
      const role = String(m.role || '');
      const name = stripContacts(m.name || '');
      doc.fontSize(10).text(role, startX, y, { width: colRole - 10 });
      doc.fontSize(10).text(name, startX + colRole, y, { width: colName });
      y += 18;
      if (y > 760) {
        doc.addPage();
        y = 80;
      }
    });

    doc.moveDown(1);
    doc.fontSize(9).text(`Date: ${formatDateFr(new Date())}`, { align: 'right' });
    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public certificate verification
app.get('/api/public/verify-certificate', async (req, res) => {
  try {
    const settingsResult = await pool.query(
      'SELECT certificatesEnabled FROM tournament_settings WHERE id = 1'
    );
    const certEnabled = settingsResult.rows[0]?.certificatesenabled ?? settingsResult.rows[0]?.certificatesEnabled ?? 1;
    if (!certEnabled) {
      return res.status(403).json({ valid: false, message: 'Vérification des certificats désactivée.' });
    }
    const code = String(req.query.code || '').trim();
    const match = code.match(/^QI26-(\d+)-(\d{8})$/);
    if (!match) {
      return res.status(400).json({ valid: false, message: 'Code invalide.' });
    }
    const candidateId = Number(match[1]);
    if (!candidateId) {
      return res.status(400).json({ valid: false, message: 'Code invalide.' });
    }
    const result = await pool.query(
      'SELECT id, fullName, city, status FROM candidates WHERE id = $1',
      [candidateId]
    );
    const candidate = result.rows[0];
    if (!candidate) {
      return res.status(404).json({ valid: false, message: 'Certificat introuvable.' });
    }
    res.json({
      valid: true,
      candidate: {
        id: candidate.id,
        fullName: candidate.fullname || candidate.fullName,
        city: candidate.city,
        status: candidate.status
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public results
app.get('/api/public-results', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.fullname AS "fullName", c.city, c.country, c.photoUrl,
             COALESCE(v.totalVotes, 0) as totalVotes,
             COALESCE(s.averageScore, 0) as averageScore
      FROM candidates c
      LEFT JOIN (
        SELECT candidateId, COUNT(*) as totalVotes FROM votes GROUP BY candidateId
      ) v ON c.id = v.candidateId
      LEFT JOIN (
        SELECT candidateId,
               CAST(COALESCE(SUM(COALESCE(compositionScore, 0) + COALESCE(questionScore, themeScore, 0) + COALESCE(pontAsSiratScore, 0) + COALESCE(recognitionScore, 0)), 0) AS NUMERIC(10,2)) as totalScore,
               CAST(COALESCE(SUM(COALESCE(compositionScore, 0) + COALESCE(questionScore, themeScore, 0) + COALESCE(pontAsSiratScore, 0) + COALESCE(recognitionScore, 0)), 0) AS NUMERIC(10,2)) as averageScore
        FROM scores
        WHERE COALESCE(scorePhase, '${SCORE_PHASE_PREVIOUS}') = '${SCORE_PHASE_FINAL_2026}'
        GROUP BY candidateId
      ) s ON c.id = s.candidateId
      ORDER BY COALESCE(v.totalVotes, 0) DESC, c.fullname ASC
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
    await maybeSyncManualCandidates();
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
               CAST(COALESCE(SUM(COALESCE(s.compositionScore, 0) + COALESCE(s.questionScore, s.themeScore, 0) + COALESCE(s.pontAsSiratScore, 0) + COALESCE(s.recognitionScore, 0)), 0) AS NUMERIC(10,2)) as totalScore,
               CAST(COALESCE(SUM(COALESCE(s.compositionScore, 0) + COALESCE(s.questionScore, s.themeScore, 0) + COALESCE(s.pontAsSiratScore, 0) + COALESCE(s.recognitionScore, 0)), 0) AS NUMERIC(10,2)) as averageScore,
               COUNT(s.id) as passages
        FROM candidates c
        LEFT JOIN scores s
          ON c.id = s.candidateId
         AND COALESCE(s.scorePhase, '${SCORE_PHASE_PREVIOUS}') = '${SCORE_PHASE_FINAL_2026}'
        GROUP BY c.id, c.fullName
        ORDER BY averageScore DESC NULLS LAST
      `),
      pool.query('SELECT * FROM tournament_settings WHERE id = 1'),
      pool.query('SELECT * FROM contact_messages ORDER BY id DESC LIMIT 500'),
      pool.query(`SELECT COUNT(*)::int as count FROM donations WHERE status = 'pending'`)
    ]);

    res.json({
      candidates: await applyManualNamesToCandidates(candidates.rows),
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

app.get('/api/admin/archive-status', verifyAdmin, async (req, res) => {
  try {
    const archived = await isSeasonArchived();
    const label = await getAdminConfigValue('season_label');
    const archivedAt = await getAdminConfigValue('season_archived_at');
    res.json({ archived, label, archivedAt });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/admin/archive', verifyAdmin, async (req, res) => {
  try {
    const label = sanitizeString(req.body?.label, 20) || '2026';
    await setAdminConfigValue('season_archived', '1');
    await setAdminConfigValue('season_label', label);
    await setAdminConfigValue('season_archived_at', new Date().toISOString());
    await pool.query(
      `UPDATE tournament_settings
       SET registrationLocked = 1,
           competitionClosed = 1
       WHERE id = 1`
    );
    res.json({ message: 'Saison archivée.', label });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/admin/unarchive', verifyAdmin, async (req, res) => {
  try {
    await setAdminConfigValue('season_archived', '0');
    res.json({ message: 'Saison déverrouillée.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/admin/final-phase-lock', verifyAdmin, async (req, res) => {
  try {
    const locked = await isFinalPhaseLocked();
    res.json({ locked });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/admin/final-phase-lock', verifyAdmin, async (req, res) => {
  try {
    if (!(await ensureNotArchived(res))) return;
    const locked = Number(req.body?.locked || 0) === 1;
    await setAdminConfigValue('final_phase_locked', locked ? '1' : '0');
    await logScoreAudit(locked ? 'final_phase_lock' : 'final_phase_unlock', { locked }, req);
    res.json({ message: locked ? 'Phase finale verrouillée.' : 'Phase finale déverrouillée.', locked });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Waitlist when registrations are closed
app.post('/api/waitlist', waitlistLimiter, async (req, res) => {
  try {
    const { fullName, whatsapp, city } = req.body || {};
    const sanitizedName = sanitizeString(fullName, 255);
    const sanitizedCity = normalizeCommune(city);
    if (!sanitizedName || sanitizedName.length < 2) {
      return res.status(400).json({ message: 'Nom complet invalide.' });
    }
    const normalized = normalizeWhatsapp(whatsapp);
    if (!normalized) {
      return res.status(400).json({ message: 'Numéro WhatsApp invalide.' });
    }
    await pool.query(
      `INSERT INTO waitlist (fullName, whatsapp, city)
       VALUES ($1, $2, $3)`,
      [sanitizedName, normalized, sanitizedCity]
    );
    res.json({ message: 'Inscription en liste d’attente enregistrée.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin candidates list (fallback for dashboard)
app.get('/api/admin/candidates', verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM candidates ORDER BY id DESC');
    res.json(result.rows);
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

// Admin candidates bulk status update
app.post('/api/admin/candidates/bulk-status', verifyAdmin, async (req, res) => {
  try {
    if (!(await ensureNotArchived(res))) return;
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((id) => Number(id)).filter(Boolean) : [];
    const status = req.body?.status;
    const safeStatus = ['approved', 'pending', 'eliminated'].includes(status) ? status : 'approved';
    if (!ids.length) return res.status(400).json({ message: 'Aucun candidat sélectionné.' });
    const current = await pool.query(
      'SELECT id, status FROM candidates WHERE id = ANY($1::bigint[])',
      [ids]
    );
    await pool.query('UPDATE candidates SET status = $1 WHERE id = ANY($2::bigint[])', [safeStatus, ids]);
    const ip = getClientIp(req);
    for (const row of current.rows) {
      const oldStatus = row.status ?? null;
      if ((oldStatus || '') === (safeStatus || '')) continue;
      await pool.query(
        `INSERT INTO candidate_status_history (candidateId, oldStatus, newStatus, ip)
         VALUES ($1, $2, $3, $4)`,
        [row.id, oldStatus, safeStatus, ip]
      );
    }
    if (safeStatus === 'eliminated') {
      await pool.query(
        `INSERT INTO eliminated_candidates (candidateId, fullName, whatsapp, city, status)
         SELECT id, fullName, whatsapp, city, $1
         FROM candidates
         WHERE id = ANY($2::bigint[])
         ON CONFLICT (candidateId)
         DO UPDATE SET fullName = EXCLUDED.fullName,
                       whatsapp = EXCLUDED.whatsapp,
                       city = EXCLUDED.city,
                       status = EXCLUDED.status,
                       archivedAt = NOW()`,
        [safeStatus, ids]
      );
    }
    res.json({ message: 'Statuts mis à jour.', count: ids.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Admin candidates management
app.post('/api/admin/candidates', verifyAdmin, async (req, res) => {
  try {
    if (!(await ensureNotArchived(res))) return;
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

      const current = await pool.query('SELECT status FROM candidates WHERE id = $1', [parsedId]);
      const oldStatus = current.rows[0]?.status ?? null;

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

      if ((oldStatus || '') !== (safeStatus || '')) {
        await pool.query(
          `INSERT INTO candidate_status_history (candidateId, oldStatus, newStatus, ip)
           VALUES ($1, $2, $3, $4)`,
          [parsedId, oldStatus, safeStatus, getClientIp(req)]
        );
      }

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

    await pool.query(
      `INSERT INTO candidate_status_history (candidateId, oldStatus, newStatus, ip)
       VALUES ($1, $2, $3, $4)`,
      [candidateId, null, safeStatus, getClientIp(req)]
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
    const {
      votingEnabled,
      registrationLocked,
      competitionClosed,
      certificatesEnabled,
      announcementText,
      convocationDate,
      convocationTime,
      convocationPlace
    } = req.body;

    await pool.query(
      `UPDATE tournament_settings 
       SET votingEnabled = $1,
           registrationLocked = $2,
           competitionClosed = $3,
           certificatesEnabled = $4,
           announcementText = $5,
           convocationDate = $6,
           convocationTime = $7,
           convocationPlace = $8,
           updatedAt = NOW()
       WHERE id = 1`,
      [
        votingEnabled || 0,
        registrationLocked || 0,
        competitionClosed || 0,
        certificatesEnabled ?? 1,
        announcementText || '',
        convocationDate || '',
        convocationTime || '',
        convocationPlace || ''
      ]
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
    if (!(await ensureNotArchived(res))) return;
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
    const current = await pool.query('SELECT status FROM candidates WHERE id = $1', [candidateId]);
    const oldStatus = current.rows[0]?.status ?? null;
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
    if ((oldStatus || '') !== (safeStatus || '')) {
      await pool.query(
        `INSERT INTO candidate_status_history (candidateId, oldStatus, newStatus, ip)
         VALUES ($1, $2, $3, $4)`,
        [candidateId, oldStatus, safeStatus, getClientIp(req)]
      );
    }
    if (safeStatus === 'eliminated') {
      await pool.query(
        `INSERT INTO eliminated_candidates (candidateId, fullName, whatsapp, city, status)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (candidateId)
         DO UPDATE SET fullName = EXCLUDED.fullName,
                       whatsapp = EXCLUDED.whatsapp,
                       city = EXCLUDED.city,
                       status = EXCLUDED.status,
                       archivedAt = NOW()`,
        [candidateId, sanitizedName, normalized, sanitizedCity, safeStatus]
      );
    }
    res.json({ message: 'Candidat mis à jour.', candidateId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET - Certificate PDF for candidate
app.get('/api/admin/certificates/:id', verifyAdmin, async (req, res) => {
  try {
    const settingsResult = await pool.query(
      'SELECT certificatesEnabled FROM tournament_settings WHERE id = 1'
    );
    const certEnabled = settingsResult.rows[0]?.certificatesenabled ?? settingsResult.rows[0]?.certificatesEnabled ?? 1;
    if (!certEnabled) {
      return res.status(403).json({ message: 'Les certificats sont désactivés.' });
    }
    const candidateId = Number(req.params.id);
    if (!candidateId) return res.status(400).json({ message: 'ID candidat invalide.' });
    const result = await pool.query(
      'SELECT id, candidateCode, fullName, city, whatsapp, createdAt FROM candidates WHERE id = $1',
      [candidateId]
    );
    const candidate = result.rows[0];
    if (!candidate) return res.status(404).json({ message: 'Candidat introuvable.' });

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const filename = `certificat-${candidate.id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    // Decorative background
    const pageW = doc.page.width;
    const pageH = doc.page.height;
    doc
      .rect(30, 30, pageW - 60, pageH - 60)
      .lineWidth(2)
      .strokeColor('#e7dcc5')
      .stroke();
    doc
      .rect(40, 40, pageW - 80, pageH - 80)
      .lineWidth(1)
      .strokeColor('#f1e2c4')
      .stroke();

    const logoPath = join(__dirname, 'public', 'assets', 'logo.jpg');
    const emerald = '#0b6f4f';
    const gold = '#c59b3f';
    const ink = '#1c1c1c';
    const muted = '#6b6b6b';

    // Header band
    doc.save();
    doc.rect(0, 0, pageW, 90).fill(emerald);
    doc.restore();
    try {
      doc.image(logoPath, 40, 15, { width: 60, height: 60 });
    } catch {}
    doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .fillColor('#ffffff')
      .text('ASAA OFFICIEL', 0, 26, { align: 'center' });
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#ffffff')
      .text("Association des Serviteurs d'Allah Azawajal", 0, 52, { align: 'center' })
      .text('Quiz Islamique 2026 — Présélections', 0, 66, { align: 'center' });

    doc.moveTo(40, 92).lineTo(pageW - 40, 92).lineWidth(2).strokeColor(gold).stroke();

    // Watermark logo (center, low opacity)
    try {
      const wmWidth = 260;
      const wmX = (pageW - wmWidth) / 2;
      const wmY = (pageH - wmWidth) / 2 - 20;
      doc.save();
      doc.opacity(0.06);
      doc.image(logoPath, wmX, wmY, { width: wmWidth });
      doc.restore();
    } catch {}

    let cursorY = 118;
    doc
      .font('Times-Bold')
      .fontSize(28)
      .fillColor(ink)
      .text('CERTIFICAT OFFICIEL', 0, cursorY, { align: 'center' });
    cursorY += 30;
    doc
      .font('Times-Roman')
      .fontSize(14)
      .fillColor(muted)
      .text('de participation', 0, cursorY, { align: 'center' });
    cursorY += 22;
    doc
      .font('Helvetica')
      .fontSize(12)
      .fillColor(ink)
      .text('Décerné à :', 0, cursorY, { align: 'center' });
    cursorY += 20;

    const candidateName = candidate.fullname || candidate.fullName || 'Candidat';
    doc
      .font('Times-Bold')
      .fontSize(24)
      .text(candidateName.toUpperCase(), 0, cursorY, { align: 'center' });
    const nameWidth = doc.widthOfString(candidateName.toUpperCase());
    const nameLineY = cursorY + 28;
    doc
      .moveTo((pageW - nameWidth) / 2, nameLineY)
      .lineTo((pageW + nameWidth) / 2, nameLineY)
      .strokeColor(gold)
      .lineWidth(1)
      .stroke();
    cursorY = nameLineY + 18;

    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(ink)
      .text("Pour sa participation active aux présélections du Quiz Islamique 2026.", 80, cursorY, {
        align: 'center',
        width: pageW - 160
      })
      .text("Organisé par l'Association des Serviteurs d'Allah Azawajal.", 80, cursorY + 18, {
        align: 'center',
        width: pageW - 160
      });
    cursorY += 42;

    const todayStr = formatDateFr(new Date());
    const certNumber = `QI26-${candidate.id}-${todayStr.replace(/\//g, '')}`;
    const verifyUrl = `${getFrontendUrl(req)}/verify-certificate.html?code=${encodeURIComponent(certNumber)}`;

    const boxX = 90;
    const boxW = pageW - 180;
    const boxY = cursorY;
    const boxH = 108;
    doc.roundedRect(boxX, boxY, boxW, boxH, 8).lineWidth(1).strokeColor('#e7dcc5').stroke();
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(ink)
      .text(`Commune: ${candidate.city || '-'}`, boxX + 20, boxY + 16, { width: boxW - 40 })
      .text(`WhatsApp: ${candidate.whatsapp || '-'}`, boxX + 20, boxY + 36, { width: boxW - 40 })
      .text(`Date: ${todayStr}`, boxX + 20, boxY + 56, { width: boxW - 40 })
      .text(`Code candidat: ${candidate.candidatecode || candidate.candidateCode || '-'}`, boxX + 20, boxY + 76, {
        width: boxW - 40
      })
      .text(`N° Certificat: ${certNumber}`, boxX + 20, boxY + 96, { width: boxW - 40 });

    const pageWidth = doc.page.width;
    const pageBottom = doc.page.height - 120;
    const leftX = 80;
    const rightX = pageWidth - 260;

    // Signature lines
    doc.moveTo(leftX, pageBottom).lineTo(leftX + 200, pageBottom).strokeColor('#6b6b6b').stroke();
    doc.moveTo(rightX, pageBottom).lineTo(rightX + 200, pageBottom).strokeColor('#6b6b6b').stroke();

    // Labels
    doc
      .fontSize(11)
      .fillColor('#1c1c1c')
      .text('Le Président: DIARRA SIDI', leftX, pageBottom + 8, { width: 220, align: 'center' });
    doc
      .fontSize(11)
      .fillColor('#1c1c1c')
      .text('Le Secrétaire Général: LADJI MOUSSA OUATTARA', rightX - 10, pageBottom + 8, { width: 240, align: 'center' });

    // Simple seal stamp
    const sealX = pageWidth / 2;
    const sealY = pageBottom - 10;
    doc
      .lineWidth(1.5)
      .strokeColor('#c59b3f')
      .circle(sealX, sealY, 30)
      .stroke();
    doc
      .fontSize(9)
      .fillColor('#c59b3f')
      .text('ASAA', sealX - 10, sealY - 5, { width: 20, align: 'center' });
    doc
      .fontSize(9)
      .fillColor('#c59b3f')
      .text('CERTIFIÉ', sealX - 25, sealY + 10, { width: 50, align: 'center' });

    doc
      .fontSize(10)
      .fillColor('#1c1c1c')
      .text("Association des Serviteurs d'Allah Azawajal", { align: 'center' });

    try {
      const qrDataUrl = await generateQRCode(verifyUrl);
      const qrBase64 = String(qrDataUrl || '').split(',')[1] || '';
      if (qrBase64) {
        const qrBuffer = Buffer.from(qrBase64, 'base64');
        doc.image(qrBuffer, pageWidth - 140, pageBottom - 40, { width: 80 });
        doc.fontSize(8).fillColor('#6b6b6b').text('Vérifier', pageWidth - 140, pageBottom + 44, { width: 80, align: 'center' });
      }
    } catch {}

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/admin/candidates/:id', verifyAdmin, async (req, res) => {
  try {
    if (!(await ensureNotArchived(res))) return;
    const candidateId = Number(req.params.id);
    if (!candidateId) return res.status(400).json({ message: 'ID candidat invalide.' });
    await pool.query('DELETE FROM candidates WHERE id = $1', [candidateId]);
    res.json({ message: 'Candidat supprimé.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

function toCsv(rows, headers) {
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.join(',')];
  rows.forEach((row) => {
    lines.push(headers.map((h) => escape(row[h])).join(','));
  });
  return lines.join('\n');
}

function formatRank(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '';
  return n === 1 ? '1er' : `${n}e`;
}

function addRankLabels(rows, scoreKey) {
  let prevScore = null;
  let prevRank = 0;
  return rows.map((row, idx) => {
    row.fullName = row.fullName ?? row.fullname ?? '';
    row.averageScore = row.averageScore ?? row.averagescore ?? row.totalScore ?? row.totalscore ?? 0;
    row.totalScore = row.totalScore ?? row.totalscore ?? row.averageScore ?? row.averagescore ?? 0;
    const score = Number(row[scoreKey] ?? row[scoreKey?.toLowerCase?.()] ?? 0);
    let rank = 1;
    if (idx > 0) {
      rank = score === prevScore ? prevRank : idx + 1;
    }
    prevScore = score;
    prevRank = rank;
    row.rang = formatRank(rank);
    return row;
  });
}

async function verifyMember(req, res, next) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Accès membre non autorisé.' });
  }
  const token = auth.slice(7).trim();
  if (!token) return res.status(401).json({ message: 'Accès membre non autorisé.' });
  try {
    const result = await pool.query(
      `SELECT s.id as sessionId, s.memberId, s.expiresAt, m.username, m.fullName, m.role, m.email, m.phone, m.active
       FROM member_sessions s
       JOIN member_accounts m ON m.id = s.memberId
       WHERE s.token = $1
       LIMIT 1`,
      [token]
    );
    const row = result.rows[0];
    if (!row || !row.active) return res.status(401).json({ message: 'Accès membre non autorisé.' });
    if (row.expiresat && new Date(row.expiresat).getTime() < Date.now()) {
      return res.status(401).json({ message: 'Session expirée.' });
    }
    req.member = {
      id: row.memberid,
      username: row.username,
      fullName: row.fullname || row.fullName,
      role: row.role,
      email: row.email,
      phone: row.phone
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Accès membre non autorisé.' });
  }
}

async function logMemberAction(memberId, action, payload, req) {
  try {
    await pool.query(
      `INSERT INTO member_audit (memberId, action, payload, ip)
       VALUES ($1, $2, $3, $4)`,
      [memberId, action, JSON.stringify(payload || {}), getClientIp(req)]
    );
  } catch {}
}


app.get('/api/admin/scores-audit', verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT action, payload, ip, createdAt as "createdAt"
       FROM admin_audit
       WHERE action IN ('score_created', 'score_deleted', 'score_updated', 'final_phase_lock', 'final_phase_unlock')
       ORDER BY id DESC
       LIMIT 200`
    );
    res.json({ items: result.rows || [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/admin/scores/:id', verifyAdmin, async (req, res) => {
  try {
    if (!(await ensureNotArchived(res))) return;
    if (!(await ensureFinalPhaseUnlocked(res))) return;
    const scoreId = Number(req.params.id);
    if (!Number.isFinite(scoreId)) {
      return res.status(400).json({ message: 'ID note invalide.' });
    }
    const reason = sanitizeString(req.body?.correctionReason, 300);
    if (!reason) {
      return res.status(400).json({ message: 'Motif de correction obligatoire.' });
    }
    const previous = await pool.query(
      `SELECT id, candidateId, judgeName, compositionScore, questionScore, themeScore, pontAsSiratScore, recognitionScore, notes
       FROM scores
       WHERE id = $1
         AND COALESCE(scorePhase, $2) = $3
       LIMIT 1`,
      [scoreId, SCORE_PHASE_PREVIOUS, SCORE_PHASE_FINAL_2026]
    );
    if (!previous.rows.length) {
      return res.status(404).json({ message: 'Note introuvable.' });
    }
    const prev = previous.rows[0];
    const nextPayload = {
      compositionScore: Number(req.body?.compositionScore || 0),
      questionScore: Number(req.body?.questionScore || 0),
      themeScore: Number(req.body?.questionScore || req.body?.themeScore || 0),
      pontAsSiratScore: Number(req.body?.pontAsSiratScore || 0),
      recognitionScore: Number(req.body?.recognitionScore || 0),
      notes: sanitizeString(req.body?.notes, 500),
    };
    await pool.query(
      `UPDATE scores
       SET compositionScore = $1,
           questionScore = $2,
           themeScore = $3,
           pontAsSiratScore = $4,
           recognitionScore = $5,
           notes = $6
       WHERE id = $7`,
      [
        nextPayload.compositionScore,
        nextPayload.questionScore,
        nextPayload.themeScore,
        nextPayload.pontAsSiratScore,
        nextPayload.recognitionScore,
        nextPayload.notes,
        scoreId
      ]
    );
    await pool.query(
      `INSERT INTO score_corrections (scoreId, candidateId, judgeName, oldPayload, newPayload, reason, editedBy)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        scoreId,
        Number(prev.candidateid || prev.candidateId),
        prev.judgename || prev.judgeName || '',
        JSON.stringify(prev),
        JSON.stringify(nextPayload),
        reason,
        req.adminUser || 'admin',
      ]
    );
    await logScoreAudit('score_updated', { scoreId, reason }, req);
    res.json({ message: 'Note corrigée.' });
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

const docStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, join(__dirname, 'public/uploads/docs'));
  },
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    cb(null, filename);
  }
});

const uploadDocs = multer({
  storage: docStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files allowed'));
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
  return QRCode.toDataURL(text);
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

// POST - Upload sponsor PDF document
app.post('/api/upload/sponsor-file', uploadDocs.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `/uploads/docs/${req.file.filename}`;
    res.json({
      success: true,
      filename: req.file.filename,
      url: fileUrl,
      size: req.file.size
    });
  } catch (error) {
    console.error('Sponsor file upload error:', error);
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
        options: options.map((opt) => ({ key: opt, label: opt })),
        active: true
      },
      results: options.map((opt) => ({ label: opt, count: counts[opt] || 0 }))
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
    const optionKey = String(req.body?.optionKey || req.body?.option || '').trim();
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

registerAuthRoutes({
  app,
  pool,
  authIpLimiter,
  authProgressiveBlock,
  markAuthAttempt,
  verifyAdmin,
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
  ADMIN_USERNAME_ALT,
  ADMIN_PASSWORD_ALT,
  LEGACY_ADMIN_PASSWORD,
  hashPassword,
  checkPassword,
  sanitizeString,
  normalizeUsername,
  DEFAULT_SITE_CONTENT,
  buildMemberUsername,
  generateToken,
  logMemberAction
});

registerAdminSecurityThrottleRoutes({ app, pool, verifyAdmin, sanitizeString });
registerMemberRoutes({
  app,
  pool,
  verifyAdmin,
  verifyMember,
  sanitizeString,
  validateEmail,
  hashPassword,
  normalizeUsername,
  defaultMemberPassword,
  setMemberDefaultPassword: (value) => {
    memberDefaultPassword = value;
  },
  logMemberAction,
  isQuizOpenNow,
  quizDateKey,
  DEFAULT_DAILY_QUIZ,
  getMemberToolsConfig,
  sanitizeMemberTools
});

registerCandidateScoreRoutes({
  app,
  pool,
  verifyAdmin,
  SCORE_PHASE_PREVIOUS,
  SCORE_PHASE_FINAL_2026,
  toCsv,
  addRankLabels,
  join,
  __dirname,
  PDFDocument,
  formatDateFr,
  forceSyncManualCandidates,
  ensureNotArchived,
  ensureFinalPhaseUnlocked,
  sanitizeString,
  logScoreAudit,
  loadManualCandidates,
  replaceCandidatesFromManualList
});

// ==================== NEW FEATURES - Register Services ====================
registerNotificationRoutes(app, pool);
registerAchievementRoutes(app, pool);
registerReportRoutes(app, pool);
registerModerationRoutes(app, pool);

// ==================== SOCIAL FEATURES ====================
registerSocialFeaturesRoutes({ app, pool, sanitizeString });
registerEnhancedSocialRoutes({ app, pool, sanitizeString });
registerChatGroupsRoutes({ app, pool, sanitizeString, validateCandidateId });
registerCollaborativeQuizzesRoutes({ app, pool, sanitizeString, validateCandidateId });

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

// ==================== SOCIAL FEATURES API ====================

// ========== USER PROFILES ==========
app.get('/api/social/profile/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const profile = await pool.query(`
      SELECT c.id, c.fullName, c.city, c.photoUrl FROM candidates c WHERE c.id = $1
    `, [candidateId]);
    
    if (profile.rows.length === 0) return res.status(404).json({ message: 'Profil non trouvé' });
    
    const userProfile = await pool.query(`
      SELECT * FROM user_profiles WHERE candidate_id = $1
    `, [candidateId]);
    
    const profileData = userProfile.rows[0] || { candidate_id: candidateId, bio: '', avatar_url: null, website: '', location: '' };
    res.json({
      id: profileData.id,
      candidateId: profileData.candidate_id,
      fullName: profile.rows[0].fullname,
      bio: profileData.bio || '',
      avatar: profileData.avatar_url || profile.rows[0].photourl,
      website: profileData.website || '',
      location: profileData.location || profile.rows[0].city || '',
      followers: profileData.followers_count || 0,
      following: profileData.following_count || 0,
      joinedAt: profileData.joined_at
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/social/profile/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { bio, avatar_url, website, location } = req.body;

    if (bio && bio.length > 500) return res.status(400).json({ message: 'Bio trop longue' });

    await pool.query(`
      INSERT INTO user_profiles (candidate_id, bio, avatar_url, website, location)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (candidate_id) 
      DO UPDATE SET 
        bio = COALESCE($2, bio),
        avatar_url = COALESCE($3, avatar_url),
        website = COALESCE($4, website),
        location = COALESCE($5, location),
        updated_at = NOW()
    `, [candidateId, bio || null, avatar_url || null, website || null, location || null]);

    res.json({ message: 'Profil mis à jour' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== FOLLOWERS ==========
app.post('/api/social/follow', async (req, res) => {
  try {
    const { followerId, followingId } = req.body;

    if (followerId === followingId) return res.status(400).json({ message: 'Impossible de vous suivre vous-même' });

    const profiles = await pool.query(`
      SELECT id, candidate_id FROM user_profiles WHERE candidate_id IN ($1, $2)
    `, [followerId, followingId]);

    if (profiles.rows.length < 2) {
      await pool.query(`INSERT INTO user_profiles (candidate_id) VALUES ($1) ON CONFLICT DO NOTHING`, [followerId]);
      await pool.query(`INSERT INTO user_profiles (candidate_id) VALUES ($1) ON CONFLICT DO NOTHING`, [followingId]);
    }

    const followerProfile = await pool.query(`SELECT id FROM user_profiles WHERE candidate_id = $1`, [followerId]);
    const followingProfile = await pool.query(`SELECT id FROM user_profiles WHERE candidate_id = $1`, [followingId]);

    const followerProfileId = followerProfile.rows[0].id;
    const followingProfileId = followingProfile.rows[0].id;

    await pool.query('BEGIN');
    await pool.query(`
      INSERT INTO user_followers (follower_id, following_id) VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, [followerProfileId, followingProfileId]);

    await pool.query(`
      UPDATE user_profiles SET following_count = (SELECT COUNT(*) FROM user_followers WHERE follower_id = $1) WHERE id = $1
    `, [followerProfileId]);

    await pool.query(`
      UPDATE user_profiles SET followers_count = (SELECT COUNT(*) FROM user_followers WHERE following_id = $1) WHERE id = $1
    `, [followingProfileId]);

    await pool.query('COMMIT');
    res.json({ message: 'Utilisateur suivi' });
  } catch (error) {
    await pool.query('ROLLBACK').catch(() => {});
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/social/follow/:followingId', async (req, res) => {
  try {
    const { followingId } = req.params;
    const { followerId } = req.body;

    const followerProfile = await pool.query(`SELECT id FROM user_profiles WHERE candidate_id = $1`, [followerId]);
    if (followerProfile.rows.length === 0) return res.status(404).json({ message: 'Profil non trouvé' });

    const followerProfileId = followerProfile.rows[0].id;
    const followingProfile = await pool.query(`SELECT id FROM user_profiles WHERE candidate_id = $1`, [followingId]);
    const followingProfileId = followingProfile.rows[0].id;

    await pool.query('BEGIN');
    await pool.query(`DELETE FROM user_followers WHERE follower_id = $1 AND following_id = $2`, [followerProfileId, followingProfileId]);
    await pool.query(`UPDATE user_profiles SET following_count = (SELECT COUNT(*) FROM user_followers WHERE follower_id = $1) WHERE id = $1`, [followerProfileId]);
    await pool.query('COMMIT');
    res.json({ message: 'Utilisateur non suivi' });
  } catch (error) {
    await pool.query('ROLLBACK').catch(() => {});
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== DIRECT MESSAGING ==========
app.post('/api/social/messages', async (req, res) => {
  try {
    const { sender_id, recipient_id, content } = req.body;

    if (!content || content.length > 1000) return res.status(400).json({ message: 'Message invalide' });

    const senderProfile = await pool.query(`SELECT id FROM user_profiles WHERE candidate_id = $1`, [sender_id]);
    const recipientProfile = await pool.query(`SELECT id FROM user_profiles WHERE candidate_id = $1`, [recipient_id]);

    if (senderProfile.rows.length === 0 || recipientProfile.rows.length === 0) {
      await pool.query(`INSERT INTO user_profiles (candidate_id) VALUES ($1) ON CONFLICT DO NOTHING`, [sender_id]);
      await pool.query(`INSERT INTO user_profiles (candidate_id) VALUES ($1) ON CONFLICT DO NOTHING`, [recipient_id]);
    }

    const senderProfileId = senderProfile.rows[0]?.id || (await pool.query(`SELECT id FROM user_profiles WHERE candidate_id = $1`, [sender_id])).rows[0].id;
    const recipientProfileId = recipientProfile.rows[0]?.id || (await pool.query(`SELECT id FROM user_profiles WHERE candidate_id = $1`, [recipient_id])).rows[0].id;

    const result = await pool.query(`
      INSERT INTO direct_messages (sender_id, recipient_id, content) VALUES ($1, $2, $3) RETURNING *
    `, [senderProfileId, recipientProfileId, content]);

    res.status(201).json({ message: 'Message envoyé', data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/social/conversations/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const limit = parseInt(req.query.limit || '20', 10);

    const profile = await pool.query(`SELECT id FROM user_profiles WHERE candidate_id = $1`, [candidateId]);
    if (profile.rows.length === 0) return res.status(404).json({ message: 'Profil non trouvé' });

    const profileId = profile.rows[0].id;
    const conversations = await pool.query(`
      SELECT DISTINCT
        CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END as other_user_id,
        (SELECT up.candidate_id FROM user_profiles up WHERE up.id = CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END) as other_user_candidate_id,
        MAX(created_at) as last_message_at,
        SUM(CASE WHEN read_at IS NULL THEN 1 ELSE 0 END) as unread_count
      FROM direct_messages
      WHERE sender_id = $1 OR recipient_id = $1
      GROUP BY other_user_id
      ORDER BY last_message_at DESC
      LIMIT $2
    `, [profileId, limit]);

    const results = await Promise.all(conversations.rows.map(async (conv) => {
      const candidate = await pool.query(`SELECT fullName FROM candidates WHERE id = $1`, [conv.other_user_candidate_id]);
      return {
        other_user_id: conv.other_user_candidate_id,
        other_user_name: candidate.rows[0]?.fullname || 'Utilisateur',
        last_message_at: conv.last_message_at,
        unread_count: parseInt(conv.unread_count || 0, 10)
      };
    }));

    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/social/messages/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.query;
    const limit = parseInt(req.query.limit || '50', 10);

    const userProfile = await pool.query(`SELECT id FROM user_profiles WHERE candidate_id = $1`, [userId]);
    const conversationProfile = await pool.query(`SELECT id FROM user_profiles WHERE candidate_id = $1`, [conversationId]);

    if (userProfile.rows.length === 0 || conversationProfile.rows.length === 0) {
      return res.status(404).json({ message: 'Profil non trouvé' });
    }

    const userProfileId = userProfile.rows[0].id;
    const conversationProfileId = conversationProfile.rows[0].id;

    const messages = await pool.query(`
      SELECT dm.*, up.candidate_id as sender_candidate_id FROM direct_messages dm
      LEFT JOIN user_profiles up ON dm.sender_id = up.id
      WHERE (dm.sender_id = $1 AND dm.recipient_id = $2) OR (dm.sender_id = $2 AND dm.recipient_id = $1)
      ORDER BY dm.created_at ASC
      LIMIT $3
    `, [userProfileId, conversationProfileId, limit]);

    await pool.query(`
      UPDATE direct_messages SET read_at = NOW()
      WHERE recipient_id = $1 AND sender_id = $2 AND read_at IS NULL
    `, [userProfileId, conversationProfileId]);

    res.json(messages.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== LEADERBOARD ==========
app.get('/api/social/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '100', 10);

    const leaderboard = await pool.query(`
      SELECT c.id, c.fullName, c.city, c.photoUrl,
             COALESCE(COUNT(DISTINCT v.id), 0) as votes_count,
             COALESCE(COUNT(DISTINCT v.id) * 10 + COUNT(DISTINCT uf.id) * 5, 0) as score,
             COALESCE(COUNT(DISTINCT uf.id), 0) as profile_views
      FROM candidates c
      LEFT JOIN votes v ON c.id = v.candidateId
      LEFT JOIN user_followers uf ON c.id = (SELECT candidate_id FROM user_profiles WHERE id = uf.following_id)
      GROUP BY c.id, c.fullName, c.city, c.photoUrl
      ORDER BY score DESC
      LIMIT $1
    `, [limit]);

    res.json(leaderboard.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== ACHIEVEMENTS ==========
app.get('/api/social/achievements/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;

    const profile = await pool.query(`SELECT id FROM user_profiles WHERE candidate_id = $1`, [candidateId]);
    if (profile.rows.length === 0) {
      await pool.query(`INSERT INTO user_profiles (candidate_id) VALUES ($1) ON CONFLICT DO NOTHING`, [candidateId]);
    }

    const profileId = (await pool.query(`SELECT id FROM user_profiles WHERE candidate_id = $1`, [candidateId])).rows[0].id;

    const achievements = await pool.query(`
      SELECT a.id, a.name, a.description, a.icon_emoji, a.category, ua.unlocked_at
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
      ORDER BY a.id ASC
    `, [profileId]);

    res.json(achievements.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/social/achievements', async (req, res) => {
  try {
    const achievements = await pool.query(`
      SELECT id, name, description, icon_emoji, category, criteria_type, criteria_value FROM achievements ORDER BY id ASC
    `);
    res.json(achievements.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== ENHANCED SOCIAL FEATURES ==========

// ========== NOTIFICATIONS ==========

// Get user notifications
app.get('/api/social/notifications', async (req, res) => {
  try {
    const candidateId = req.query.candidateId;
    if (!candidateId) return res.status(400).json({ message: 'candidateId requis' });

    const unreadOnly = req.query.unread === 'true';
    let query = `
      SELECT n.id, n.type, n.title, n.message, n.is_read, n.created_at,
             up.fullName as sender_name, up.avatar_url as sender_avatar
      FROM notifications n
      LEFT JOIN user_profiles up ON n.sender_id = up.id
      WHERE n.recipient_id = (SELECT id FROM user_profiles WHERE candidate_id = $1)
    `;
    
    if (unreadOnly) query += ` AND n.is_read = 0`;
    query += ` ORDER BY n.created_at DESC LIMIT 50`;

    const result = await pool.query(query, [candidateId]);
    
    // Get unread count
    const countResult = await pool.query(
      `SELECT COUNT(*)::int as count FROM notifications 
       WHERE recipient_id = (SELECT id FROM user_profiles WHERE candidate_id = $1) AND is_read = 0`,
      [candidateId]
    );

    res.json({
      notifications: result.rows,
      unread_count: countResult.rows[0]?.count || 0
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark notification as read
app.put('/api/social/notifications/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;
    await pool.query(
      `UPDATE notifications SET is_read = 1, updated_at = NOW() WHERE id = $1`,
      [notificationId]
    );
    res.json({ message: 'Notification marquée comme lue' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark all notifications as read
app.put('/api/social/notifications/read-all', async (req, res) => {
  try {
    const { candidateId } = req.body;
    await pool.query(
      `UPDATE notifications SET is_read = 1, updated_at = NOW()
       WHERE recipient_id = (SELECT id FROM user_profiles WHERE candidate_id = $1)`,
      [candidateId]
    );
    res.json({ message: 'Toutes les notifications marquées comme lues' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== STORIES/ACTIVITY FEED ==========

// Post a story
app.post('/api/social/stories', async (req, res) => {
  try {
    const { candidateId, content, image_url, visibility } = req.body;

    if (!content || content.length > 1000) {
      return res.status(400).json({ message: 'Contenu invalide' });
    }

    const safeVisibility = ['public', 'followers', 'private'].includes(visibility) ? visibility : 'public';

    const userProfile = await pool.query(
      `SELECT id FROM user_profiles WHERE candidate_id = $1`,
      [candidateId]
    );

    if (userProfile.rows.length === 0) {
      return res.status(404).json({ message: 'Profil non trouvé' });
    }

    const result = await pool.query(`
      INSERT INTO user_stories (author_id, content, image_url, visibility)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [userProfile.rows[0].id, content, image_url || null, safeVisibility]);

    // Update user total posts
    await pool.query(
      `UPDATE user_profiles SET total_posts = total_posts + 1 WHERE id = $1`,
      [userProfile.rows[0].id]
    );

    res.status(201).json({ message: 'Story publiée', story: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get feed stories
app.get('/api/social/feed', async (req, res) => {
  try {
    const { candidateId, limit } = req.query;
    const safeLimit = parseInt(limit || '20', 10);

    const stories = await pool.query(`
      SELECT s.*, up.fullName as author_name, up.avatar_url, up.candidate_id,
             COALESCE((SELECT COUNT(*) FROM story_likes WHERE story_id = s.id), 0) as likes_count,
             COALESCE((SELECT COUNT(*) FROM story_comments WHERE story_id = s.id), 0) as comments_count,
             CASE WHEN EXISTS(SELECT 1 FROM story_likes WHERE story_id = s.id AND user_id = (SELECT id FROM user_profiles WHERE candidate_id = $1)) THEN 1 ELSE 0 END as is_liked
      FROM user_stories s
      JOIN user_profiles up ON s.author_id = up.id
      WHERE s.visibility = 'public' OR s.author_id = (SELECT id FROM user_profiles WHERE candidate_id = $1)
      ORDER BY s.created_at DESC
      LIMIT $2
    `, [candidateId, safeLimit]);

    res.json(stories.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Like a story
app.post('/api/social/stories/:storyId/like', async (req, res) => {
  try {
    const { storyId } = req.params;
    const { candidateId } = req.body;

    const userProfile = await pool.query(
      `SELECT id FROM user_profiles WHERE candidate_id = $1`,
      [candidateId]
    );

    if (userProfile.rows.length === 0) {
      return res.status(404).json({ message: 'Profil non trouvé' });
    }

    await pool.query(`
      INSERT INTO story_likes (story_id, user_id) VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, [storyId, userProfile.rows[0].id]);

    // Update likes count
    await pool.query(
      `UPDATE user_stories SET likes_count = (SELECT COUNT(*) FROM story_likes WHERE story_id = $1) WHERE id = $1`,
      [storyId]
    );

    res.json({ message: 'Story aimée' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Unlike a story
app.delete('/api/social/stories/:storyId/like', async (req, res) => {
  try {
    const { storyId } = req.params;
    const { candidateId } = req.body;

    const userProfile = await pool.query(
      `SELECT id FROM user_profiles WHERE candidate_id = $1`,
      [candidateId]
    );

    if (userProfile.rows.length === 0) {
      return res.status(404).json({ message: 'Profil non trouvé' });
    }

    await pool.query(`
      DELETE FROM story_likes WHERE story_id = $1 AND user_id = $2
    `, [storyId, userProfile.rows[0].id]);

    // Update likes count
    await pool.query(
      `UPDATE user_stories SET likes_count = (SELECT COUNT(*) FROM story_likes WHERE story_id = $1) WHERE id = $1`,
      [storyId]
    );

    res.json({ message: 'Story déaimée' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add comment to story
app.post('/api/social/stories/:storyId/comments', async (req, res) => {
  try {
    const { storyId } = req.params;
    const { candidateId, content } = req.body;

    if (!content || content.length > 500) {
      return res.status(400).json({ message: 'Commentaire invalide' });
    }

    const userProfile = await pool.query(
      `SELECT id FROM user_profiles WHERE candidate_id = $1`,
      [candidateId]
    );

    if (userProfile.rows.length === 0) {
      return res.status(404).json({ message: 'Profil non trouvé' });
    }

    const result = await pool.query(`
      INSERT INTO story_comments (story_id, author_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [storyId, userProfile.rows[0].id, content]);

    // Update comments count
    await pool.query(
      `UPDATE user_stories SET comments_count = (SELECT COUNT(*) FROM story_comments WHERE story_id = $1) WHERE id = $1`,
      [storyId]
    );

    res.json({ message: 'Commentaire ajouté', comment: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get story comments
app.get('/api/social/stories/:storyId/comments', async (req, res) => {
  try {
    const { storyId } = req.params;

    const comments = await pool.query(`
      SELECT sc.*, up.fullName as author_name, up.avatar_url
      FROM story_comments sc
      JOIN user_profiles up ON sc.author_id = up.id
      WHERE sc.story_id = $1
      ORDER BY sc.created_at ASC
    `, [storyId]);

    res.json(comments.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== USER SEARCH ==========

// Search users
app.get('/api/social/search/users', async (req, res) => {
  try {
    const { q, limit } = req.query;
    const query_text = String(q || '').trim().substring(0, 100);
    const safeLimit = Math.min(parseInt(limit || '20', 10), 50);

    if (query_text.length < 2) {
      return res.json([]);
    }

    const results = await pool.query(`
      SELECT up.id, up.candidate_id, c.fullName, up.avatar_url, up.bio,
             up.followers_count, up.verified,
             COALESCE(COUNT(DISTINCT uf.follower_id), 0) as mutual_followers
      FROM user_profiles up
      LEFT JOIN candidates c ON c.id = up.candidate_id::bigint
      LEFT JOIN user_followers uf ON uf.following_id = up.id
      WHERE c.fullName ILIKE $1 OR up.bio ILIKE $1
      GROUP BY up.id, up.candidate_id, c.fullName, up.avatar_url, up.bio, up.followers_count, up.verified
      ORDER BY up.followers_count DESC
      LIMIT $2
    `, [`%${query_text}%`, safeLimit]);

    res.json(results.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== PROFILE ENHANCEMENTS ==========

// Track profile view
app.post('/api/social/profiles/:candidateId/view', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { visitorId } = req.body;

    const profile = await pool.query(
      `SELECT id FROM user_profiles WHERE candidate_id = $1`,
      [candidateId]
    );

    if (profile.rows.length === 0) {
      return res.status(404).json({ message: 'Profil non trouvé' });
    }

    const profileId = profile.rows[0].id;
    const visitorProfileId = visitorId ? 
      (await pool.query(`SELECT id FROM user_profiles WHERE candidate_id = $1`, [visitorId])).rows[0]?.id 
      : null;

    await pool.query(`
      INSERT INTO profile_views (profile_id, visitor_id, ip_address)
      VALUES ($1, $2, $3)
    `, [profileId, visitorProfileId, req.ip || null]);

    // Update view count
    await pool.query(
      `UPDATE user_profiles SET profile_views_count = profile_views_count + 1 WHERE id = $1`,
      [profileId]
    );

    res.json({ message: 'Vue enregistrée' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get profile views count
app.get('/api/social/profiles/:candidateId/views', async (req, res) => {
  try {
    const { candidateId } = req.params;

    const result = await pool.query(`
      SELECT 
        profile_views_count as total_views,
        (SELECT COUNT(*) FROM profile_views WHERE profile_id = (SELECT id FROM user_profiles WHERE candidate_id = $1) AND visitor_id IS NOT NULL) as unique_visitors
      FROM user_profiles
      WHERE candidate_id = $1
    `, [candidateId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Profil non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user recommendations
app.get('/api/social/recommendations', async (req, res) => {
  try {
    const { candidateId, limit } = req.query;
    const safeLimit = Math.min(parseInt(limit || '10', 10), 20);

    const userProfile = await pool.query(
      `SELECT id FROM user_profiles WHERE candidate_id = $1`,
      [candidateId]
    );

    if (userProfile.rows.length === 0) {
      return res.status(404).json({ message: 'Profil non trouvé' });
    }

    const recommendations = await pool.query(`
      SELECT ur.*, up.fullName, up.avatar_url, up.bio, up.followers_count, up.candidate_id
      FROM user_recommendations ur
      JOIN user_profiles up ON ur.recommended_user_id = up.id
      WHERE ur.user_id = $1
      ORDER BY ur.score DESC
      LIMIT $2
    `, [userProfile.rows[0].id, safeLimit]);

    res.json(recommendations.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark recommendation as viewed
app.put('/api/social/recommendations/:recommendationId/view', async (req, res) => {
  try {
    const { recommendationId } = req.params;
    await pool.query(
      `UPDATE user_recommendations SET viewed_at = NOW() WHERE id = $1`,
      [recommendationId]
    );
    res.json({ message: 'Recommandation consultée' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== MESSAGE ENHANCEMENTS ==========

// Add reaction to message
app.post('/api/social/messages/:messageId/react', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { candidateId, emoji } = req.body;

    if (!emoji || emoji.length > 10) {
      return res.status(400).json({ message: 'Emoji invalide' });
    }

    const userProfile = await pool.query(
      `SELECT id FROM user_profiles WHERE candidate_id = $1`,
      [candidateId]
    );

    if (userProfile.rows.length === 0) {
      return res.status(404).json({ message: 'Profil non trouvé' });
    }

    await pool.query(`
      INSERT INTO message_reactions (message_id, user_id, emoji)
      VALUES ($1, $2, $3)
      ON CONFLICT DO NOTHING
    `, [messageId, userProfile.rows[0].id, emoji]);

    // Update reaction count
    await pool.query(
      `UPDATE direct_messages SET reactions_count = (SELECT COUNT(DISTINCT user_id) FROM message_reactions WHERE message_id = $1) WHERE id = $1`,
      [messageId]
    );

    res.json({ message: 'Réaction ajoutée' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get message reactions
app.get('/api/social/messages/:messageId/reactions', async (req, res) => {
  try {
    const { messageId } = req.params;

    const reactions = await pool.query(`
      SELECT emoji, COUNT(*) as count, array_agg(DISTINCT up.fullName) as users
      FROM message_reactions mr
      JOIN user_profiles up ON mr.user_id = up.id
      WHERE mr.message_id = $1
      GROUP BY emoji
    `, [messageId]);

    res.json(reactions.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Not found' });
});

// ========== CHAT GROUPS ENDPOINTS (Phase 3) ==========

// Create chat group
app.post('/api/social/chat-groups', async (req, res) => {
  try {
    const { candidateId, name, description, type, topic } = req.body;

    if (!name || name.length > 100 || !['public', 'private', 'invite-only'].includes(type)) {
      return res.status(400).json({ message: 'Données invalides' });
    }

    const userProfile = await pool.query(
      `SELECT id FROM user_profiles WHERE candidate_id = $1`,
      [candidateId]
    );

    if (userProfile.rows.length === 0) {
      return res.status(404).json({ message: 'Profil non trouvé' });
    }

    const result = await pool.query(`
      INSERT INTO chat_groups (name, description, type, topic, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name, description || null, type, topic || 'general', userProfile.rows[0].id]);

    // Add creator as member
    await pool.query(`
      INSERT INTO chat_group_members (group_id, user_id, role)
      VALUES ($1, $2, 'creator')
    `, [result.rows[0].id, userProfile.rows[0].id]);

    res.status(201).json({ message: 'Groupe créé', group: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all chat groups
app.get('/api/social/chat-groups', async (req, res) => {
  try {
    const { type, topic, limit, search } = req.query;
    const safeLimit = Math.min(parseInt(limit || '20', 10), 50);
    const searchTerm = String(search || '').trim();

    let query = `SELECT * FROM active_chat_groups WHERE 1=1`;
    const params = [];
    let paramCount = 0;

    if (type && ['public', 'private', 'invite-only'].includes(type)) {
      query += ` AND type = $${++paramCount}`;
      params.push(type);
    }

    if (topic) {
      query += ` AND topic = $${++paramCount}`;
      params.push(topic);
    }

    if (searchTerm) {
      query += ` AND name ILIKE $${++paramCount}`;
      params.push(`%${searchTerm}%`);
    }

    query += ` LIMIT $${++paramCount}`;
    params.push(safeLimit);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get chat group details
app.get('/api/social/chat-groups/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await pool.query(`
      SELECT cg.*, up.fullName as creator_name, up.avatar_url as creator_avatar
      FROM chat_groups cg
      JOIN user_profiles up ON cg.created_by = up.id
      WHERE cg.id = $1
    `, [groupId]);

    if (group.rows.length === 0) {
      return res.status(404).json({ message: 'Groupe non trouvé' });
    }

    res.json(group.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Join chat group
app.post('/api/social/chat-groups/:groupId/join', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { candidateId } = req.body;

    const userProfile = await pool.query(
      `SELECT id FROM user_profiles WHERE candidate_id = $1`,
      [candidateId]
    );

    if (userProfile.rows.length === 0) {
      return res.status(404).json({ message: 'Profil non trouvé' });
    }

    await pool.query(`
      INSERT INTO chat_group_members (group_id, user_id, role)
      VALUES ($1, $2, 'member')
      ON CONFLICT DO NOTHING
    `, [groupId, userProfile.rows[0].id]);

    res.json({ message: 'Groupe rejoint' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Leave chat group
app.post('/api/social/chat-groups/:groupId/leave', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { candidateId } = req.body;

    const userProfile = await pool.query(
      `SELECT id FROM user_profiles WHERE candidate_id = $1`,
      [candidateId]
    );

    if (userProfile.rows.length === 0) {
      return res.status(404).json({ message: 'Profil non trouvé' });
    }

    await pool.query(`
      DELETE FROM chat_group_members WHERE group_id = $1 AND user_id = $2
    `, [groupId, userProfile.rows[0].id]);

    res.json({ message: 'Groupe quitté' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get group members
app.get('/api/social/chat-groups/:groupId/members', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { limit } = req.query;
    const safeLimit = Math.min(parseInt(limit || '50', 10), 200);

    const members = await pool.query(`
      SELECT up.id, up.candidate_id, up.fullName, up.avatar_url, up.bio, up.verified,
             cgm.role, cgm.joined_at, cgm.notifications_enabled
      FROM chat_group_members cgm
      JOIN user_profiles up ON cgm.user_id = up.id
      WHERE cgm.group_id = $1
      ORDER BY cgm.joined_at ASC
      LIMIT $2
    `, [groupId, safeLimit]);

    res.json(members.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== CHAT MESSAGES ENDPOINTS ==========

// Post message to group
app.post('/api/social/chat-groups/:groupId/messages', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { candidateId, content, media_url, media_type, reply_to_id } = req.body;

    if (!content || content.length > 2000) {
      return res.status(400).json({ message: 'Contenu invalide' });
    }

    const userProfile = await pool.query(
      `SELECT id FROM user_profiles WHERE candidate_id = $1`,
      [candidateId]
    );

    if (userProfile.rows.length === 0) {
      return res.status(404).json({ message: 'Profil non trouvé' });
    }

    const result = await pool.query(`
      INSERT INTO chat_messages (group_id, author_id, content, media_url, media_type, reply_to_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [groupId, userProfile.rows[0].id, content, media_url || null, media_type || null, reply_to_id || null]);

    // Update user message count
    await pool.query(
      `UPDATE user_profiles SET chat_messages_count = chat_messages_count + 1 WHERE id = $1`,
      [userProfile.rows[0].id]
    );

    res.status(201).json({ message: 'Message envoyé', data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get group messages
app.get('/api/social/chat-groups/:groupId/messages', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { limit, offset } = req.query;
    const safeLimit = Math.min(parseInt(limit || '50', 10), 100);
    const safeOffset = Math.max(parseInt(offset || '0', 10), 0);

    const messages = await pool.query(`
      SELECT cm.*, up.fullName as author_name, up.avatar_url
      FROM chat_messages cm
      JOIN user_profiles up ON cm.author_id = up.id
      WHERE cm.group_id = $1
      ORDER BY cm.created_at DESC
      LIMIT $2 OFFSET $3
    `, [groupId, safeLimit, safeOffset]);

    res.json(messages.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add message reaction
app.post('/api/social/chat-groups/:groupId/messages/:messageId/react', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { candidateId, emoji } = req.body;

    if (!emoji || emoji.length > 10) {
      return res.status(400).json({ message: 'Emoji invalide' });
    }

    const userProfile = await pool.query(
      `SELECT id FROM user_profiles WHERE candidate_id = $1`,
      [candidateId]
    );

    if (userProfile.rows.length === 0) {
      return res.status(404).json({ message: 'Profil non trouvé' });
    }

    await pool.query(`
      INSERT INTO message_reactions (message_id, user_id, emoji)
      VALUES ($1, $2, $3)
      ON CONFLICT DO NOTHING
    `, [messageId, userProfile.rows[0].id, emoji]);

    res.json({ message: 'Réaction ajoutée' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== BADGES ENDPOINTS ==========

// Get all available badge templates
app.get('/api/social/badges', async (req, res) => {
  try {
    const { category, rarity } = req.query;

    let query = `SELECT * FROM badge_templates WHERE 1=1`;
    const params = [];

    if (category) {
      query += ` AND category = $${params.length + 1}`;
      params.push(category);
    }

    if (rarity && ['common', 'uncommon', 'rare', 'legendary'].includes(rarity)) {
      query += ` AND rarity = $${params.length + 1}`;
      params.push(rarity);
    }

    query += ` ORDER BY display_order ASC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's unlocked badges
app.get('/api/social/users/:candidateId/badges/unlocked', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { limit } = req.query;
    const safeLimit = Math.min(parseInt(limit || '50', 10), 100);

    const userProfile = await pool.query(
      `SELECT id FROM user_profiles WHERE candidate_id = $1`,
      [candidateId]
    );

    if (userProfile.rows.length === 0) {
      return res.status(404).json({ message: 'Profil non trouvé' });
    }

    const badges = await pool.query(`
      SELECT bt.*, ub.unlocked_at, ub.displayed_on_profile
      FROM user_badges ub
      JOIN badge_templates bt ON ub.badge_id = bt.id
      WHERE ub.user_id = $1
      ORDER BY ub.unlocked_at DESC
      LIMIT $2
    `, [userProfile.rows[0].id, safeLimit]);

    res.json(badges.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's badge progress
app.get('/api/social/users/:candidateId/badges/progress', async (req, res) => {
  try {
    const { candidateId } = req.params;

    const userProfile = await pool.query(
      `SELECT id FROM user_profiles WHERE candidate_id = $1`,
      [candidateId]
    );

    if (userProfile.rows.length === 0) {
      return res.status(404).json({ message: 'Profil non trouvé' });
    }

    const progress = await pool.query(`
      SELECT bt.*, bp.current_progress, bp.target_value,
             ROUND((bp.current_progress::float / bp.target_value) * 100) as progress_percent,
             CASE WHEN ub.id IS NOT NULL THEN 1 ELSE 0 END as is_unlocked
      FROM badge_progress bp
      JOIN badge_templates bt ON bp.badge_id = bt.id
      LEFT JOIN user_badges ub ON bp.user_id = ub.user_id AND bp.badge_id = ub.badge_id
      WHERE bp.user_id = $1
      ORDER BY bt.display_order ASC
    `, [userProfile.rows[0].id]);

    res.json(progress.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Unlock badge
app.post('/api/social/badges/unlock', async (req, res) => {
  try {
    const { candidateId, badge_id } = req.body;

    const userProfile = await pool.query(
      `SELECT id FROM user_profiles WHERE candidate_id = $1`,
      [candidateId]
    );

    if (userProfile.rows.length === 0) {
      return res.status(404).json({ message: 'Profil non trouvé' });
    }

    const result = await pool.query(`
      INSERT INTO user_badges (user_id, badge_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      RETURNING *
    `, [userProfile.rows[0].id, badge_id]);

    if (result.rows.length > 0) {
      res.json({ message: 'Badge déverrouillé!', badge: result.rows[0] });
    } else {
      res.json({ message: 'Badge déjà déverrouillé' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user badge stats
app.get('/api/social/users/:candidateId/badges/stats', async (req, res) => {
  try {
    const { candidateId } = req.params;

    const userProfile = await pool.query(
      `SELECT id FROM user_profiles WHERE candidate_id = $1`,
      [candidateId]
    );

    if (userProfile.rows.length === 0) {
      return res.status(404).json({ message: 'Profil non trouvé' });
    }

    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM user_badges WHERE user_id = $1) as badges_unlocked,
        (SELECT COUNT(*) FROM badge_templates) as badges_total,
        (SELECT COALESCE(SUM(bt.points_reward), 0) FROM user_badges ub JOIN badge_templates bt ON ub.badge_id = bt.id WHERE ub.user_id = $1) as total_points,
        (SELECT MAX(unlocked_at) FROM user_badges WHERE user_id = $1) as last_unlocked
    `, [userProfile.rows[0].id]);

    res.json(stats.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 404 handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

// ==================== SERVER START ====================
initDatabase().then(async () => {
  await loadMemberDefaultPassword();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
