const PUBLIC_COMMENT_LIMIT = 6;
const ADMIN_LIMIT = 250;
const VALID_COMMENT_STATUS = new Set(['pending', 'approved', 'rejected']);
const VALID_AUDIENCE_GENDER = new Set(['frere', 'soeur']);

function clean(value, max = 500) {
  return String(value || '').trim().replace(/[<>]/g, '').slice(0, max).trim();
}

function normalizeSlug(value) {
  return clean(value, 80).toLowerCase().replace(/[^a-z0-9-]/g, '');
}

function normalizeVisitorKey(value, fallback) {
  const cleaned = clean(value, 96).replace(/[^a-zA-Z0-9._:-]/g, '');
  return cleaned || fallback || '';
}

function getRequestIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.ip || '';
}

function normalizePhone(value) {
  return String(value || '').replace(/[^\d+]/g, '').slice(0, 30);
}

function parseAudienceRow(row = {}) {
  return {
    id: Number(row.id || 0),
    fullName: row.fullname || row.fullName || '',
    gender: row.gender || '',
    whatsapp: row.whatsapp || '',
    phone: row.phone || '',
    commune: row.commune || '',
    ageRange: row.agerange || row.ageRange || '',
    note: row.note || '',
    createdAt: row.createdat || row.createdAt || ''
  };
}

function parseCommentRow(row = {}) {
  return {
    id: Number(row.id || 0),
    itemSlug: row.itemslug || row.itemSlug || '',
    authorName: row.authorname || row.authorName || '',
    content: row.content || '',
    status: row.status || 'pending',
    moderationScore: Number(row.moderationscore || row.moderationScore || 0),
    createdAt: row.createdat || row.createdAt || ''
  };
}

async function getAudienceStats(pool) {
  const [totals, byCommune] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE gender = 'frere')::int AS brothers,
        COUNT(*) FILTER (WHERE gender = 'soeur')::int AS sisters
      FROM qi26_audience_registrations
    `),
    pool.query(`
      SELECT commune, COUNT(*)::int AS total
      FROM qi26_audience_registrations
      GROUP BY commune
      ORDER BY total DESC, commune ASC
      LIMIT 20
    `)
  ]);

  const row = totals.rows[0] || {};
  return {
    total: Number(row.total || 0),
    brothers: Number(row.brothers || 0),
    sisters: Number(row.sisters || 0),
    byCommune: byCommune.rows.map((item) => ({
      commune: item.commune || 'Non renseignée',
      total: Number(item.total || 0)
    }))
  };
}

export async function ensureQi26EngagementTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS qi26_engagement_likes (
      id BIGSERIAL PRIMARY KEY,
      itemSlug TEXT NOT NULL,
      visitorKey TEXT NOT NULL,
      ip TEXT,
      createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(itemSlug, visitorKey)
    );

    CREATE TABLE IF NOT EXISTS qi26_engagement_comments (
      id BIGSERIAL PRIMARY KEY,
      itemSlug TEXT NOT NULL,
      authorName TEXT,
      content TEXT NOT NULL,
      visitorKey TEXT,
      ip TEXT,
      status TEXT DEFAULT 'pending',
      moderationScore INTEGER DEFAULT 100,
      moderationIssues TEXT,
      createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      reviewedAt TIMESTAMP WITH TIME ZONE,
      reviewedBy TEXT
    );

    CREATE TABLE IF NOT EXISTS qi26_audience_registrations (
      id BIGSERIAL PRIMARY KEY,
      fullName TEXT NOT NULL,
      gender TEXT NOT NULL CHECK (gender IN ('frere', 'soeur')),
      whatsapp TEXT,
      phone TEXT,
      commune TEXT NOT NULL,
      ageRange TEXT,
      note TEXT,
      ip TEXT,
      createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_qi26_likes_item ON qi26_engagement_likes(itemSlug);
    CREATE INDEX IF NOT EXISTS idx_qi26_comments_item_status ON qi26_engagement_comments(itemSlug, status, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_qi26_comments_status ON qi26_engagement_comments(status, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_qi26_audience_created ON qi26_audience_registrations(createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_qi26_audience_commune ON qi26_audience_registrations(commune);
    CREATE INDEX IF NOT EXISTS idx_qi26_audience_gender ON qi26_audience_registrations(gender);
  `);
}

let qi26TablesReadyPromise = null;

async function ensureQi26TablesReady(pool) {
  if (!qi26TablesReadyPromise) {
    qi26TablesReadyPromise = ensureQi26EngagementTables(pool).catch((error) => {
      qi26TablesReadyPromise = null;
      throw error;
    });
  }
  return qi26TablesReadyPromise;
}

export function registerQi26EngagementRoutes({
  app,
  pool,
  verifyAdmin,
  rateLimit,
  ModerationService,
  normalizeWhatsapp
}) {
  const publicLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Trop de tentatives. Merci de réessayer dans un instant.' }
  });

  const commentLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Commentaires trop rapprochés. Merci de patienter.' }
  });

  const audienceLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 12,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Enregistrements trop rapprochés. Merci de patienter.' }
  });

  const ensureRuntimeTables = async (req, res, next) => {
    try {
      await ensureQi26TablesReady(pool);
      next();
    } catch (error) {
      console.error('[QI26] table ensure error:', error.message);
      res.status(500).json({ message: 'Service QI26 temporairement indisponible.' });
    }
  };

  app.use(['/api/qi26', '/api/admin/qi26-audience', '/api/admin/qi26-engagement'], ensureRuntimeTables);

  app.get('/api/qi26/engagement/:slug', publicLimiter, async (req, res) => {
    const itemSlug = normalizeSlug(req.params.slug);
    if (!itemSlug) return res.status(400).json({ message: 'Profil invalide.' });

    const visitorKey = normalizeVisitorKey(req.query.visitorKey, '');
    try {
      const [likes, comments, viewer] = await Promise.all([
        pool.query('SELECT COUNT(*)::int AS total FROM qi26_engagement_likes WHERE itemSlug = $1', [itemSlug]),
        pool.query(
          `SELECT id, itemSlug, authorName, content, status, createdAt
           FROM qi26_engagement_comments
           WHERE itemSlug = $1 AND status = 'approved'
           ORDER BY createdAt DESC
           LIMIT $2`,
          [itemSlug, PUBLIC_COMMENT_LIMIT]
        ),
        visitorKey
          ? pool.query(
              'SELECT 1 FROM qi26_engagement_likes WHERE itemSlug = $1 AND visitorKey = $2 LIMIT 1',
              [itemSlug, visitorKey]
            )
          : Promise.resolve({ rows: [] })
      ]);

      res.json({
        itemSlug,
        likes: Number(likes.rows[0]?.total || 0),
        liked: viewer.rows.length > 0,
        comments: comments.rows.map(parseCommentRow)
      });
    } catch (error) {
      console.error('[QI26 Engagement] GET error:', error.message);
      res.status(500).json({ message: 'Interaction indisponible.' });
    }
  });

  app.post('/api/qi26/engagement/:slug/like', publicLimiter, async (req, res) => {
    const itemSlug = normalizeSlug(req.params.slug);
    const visitorKey = normalizeVisitorKey(req.body?.visitorKey, getRequestIp(req));
    if (!itemSlug || !visitorKey) return res.status(400).json({ message: 'Profil invalide.' });

    try {
      await pool.query(
        `INSERT INTO qi26_engagement_likes (itemSlug, visitorKey, ip)
         VALUES ($1, $2, $3)
         ON CONFLICT (itemSlug, visitorKey) DO NOTHING`,
        [itemSlug, visitorKey, getRequestIp(req)]
      );
      const count = await pool.query('SELECT COUNT(*)::int AS total FROM qi26_engagement_likes WHERE itemSlug = $1', [itemSlug]);
      res.status(201).json({ liked: true, likes: Number(count.rows[0]?.total || 0) });
    } catch (error) {
      console.error('[QI26 Engagement] like error:', error.message);
      res.status(500).json({ message: 'Like indisponible.' });
    }
  });

  app.delete('/api/qi26/engagement/:slug/like', publicLimiter, async (req, res) => {
    const itemSlug = normalizeSlug(req.params.slug);
    const visitorKey = normalizeVisitorKey(req.body?.visitorKey, getRequestIp(req));
    if (!itemSlug || !visitorKey) return res.status(400).json({ message: 'Profil invalide.' });

    try {
      await pool.query('DELETE FROM qi26_engagement_likes WHERE itemSlug = $1 AND visitorKey = $2', [itemSlug, visitorKey]);
      const count = await pool.query('SELECT COUNT(*)::int AS total FROM qi26_engagement_likes WHERE itemSlug = $1', [itemSlug]);
      res.json({ liked: false, likes: Number(count.rows[0]?.total || 0) });
    } catch (error) {
      console.error('[QI26 Engagement] unlike error:', error.message);
      res.status(500).json({ message: 'Action indisponible.' });
    }
  });

  app.post('/api/qi26/engagement/:slug/comments', commentLimiter, async (req, res) => {
    const itemSlug = normalizeSlug(req.params.slug);
    const authorName = clean(req.body?.authorName, 80) || 'Anonyme';
    const content = clean(req.body?.content, 700);
    const visitorKey = normalizeVisitorKey(req.body?.visitorKey, getRequestIp(req));

    if (!itemSlug) return res.status(400).json({ message: 'Profil invalide.' });
    if (content.length < 3) return res.status(400).json({ message: 'Commentaire trop court.' });
    if (content.length > 700) return res.status(400).json({ message: 'Commentaire trop long.' });

    const analysis = ModerationService?.analyzeContent
      ? ModerationService.analyzeContent(content)
      : { score: 100, issues: [], isSpam: false, hasProfanity: false };
    const status = analysis.score >= 70 && !analysis.isSpam && !analysis.hasProfanity ? 'approved' : 'pending';

    try {
      const result = await pool.query(
        `INSERT INTO qi26_engagement_comments
         (itemSlug, authorName, content, visitorKey, ip, status, moderationScore, moderationIssues)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, itemSlug, authorName, content, status, moderationScore, createdAt`,
        [
          itemSlug,
          authorName,
          content,
          visitorKey,
          getRequestIp(req),
          status,
          Math.max(0, Math.min(100, Number(analysis.score || 0))),
          JSON.stringify(analysis.issues || [])
        ]
      );
      res.status(201).json({
        comment: parseCommentRow(result.rows[0]),
        message: status === 'approved'
          ? 'Commentaire publié. Merci pour votre contribution.'
          : 'Commentaire reçu. Il sera visible après validation.'
      });
    } catch (error) {
      console.error('[QI26 Engagement] comment error:', error.message);
      res.status(500).json({ message: 'Commentaire indisponible.' });
    }
  });

  app.post('/api/qi26/audience', audienceLimiter, async (req, res) => {
    const fullName = clean(req.body?.fullName, 120);
    const gender = clean(req.body?.gender, 12).toLowerCase();
    const whatsapp = normalizeWhatsapp ? normalizeWhatsapp(req.body?.whatsapp) : normalizePhone(req.body?.whatsapp);
    const phone = normalizePhone(req.body?.phone);
    const commune = clean(req.body?.commune, 80);
    const ageRange = clean(req.body?.ageRange, 40);
    const note = clean(req.body?.note, 240);

    if (fullName.length < 2) return res.status(400).json({ message: 'Nom et prénom obligatoires.' });
    if (!VALID_AUDIENCE_GENDER.has(gender)) return res.status(400).json({ message: 'Merci de choisir Frère ou Sœur.' });
    if (!commune) return res.status(400).json({ message: 'Commune obligatoire.' });
    if (!whatsapp) return res.status(400).json({ message: 'Numéro WhatsApp obligatoire.' });

    try {
      if (whatsapp || phone) {
        const duplicate = await pool.query(
          `SELECT id FROM qi26_audience_registrations
           WHERE ($1 <> '' AND whatsapp = $1) OR ($2 <> '' AND phone = $2)
           LIMIT 1`,
          [whatsapp, phone]
        );
        if (duplicate.rows.length) {
          return res.status(409).json({ message: 'Cette personne semble déjà enregistrée.', stats: await getAudienceStats(pool) });
        }
      }

      const result = await pool.query(
        `INSERT INTO qi26_audience_registrations
         (fullName, gender, whatsapp, phone, commune, ageRange, note, ip)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, fullName, gender, whatsapp, phone, commune, ageRange, note, createdAt`,
        [fullName, gender, whatsapp, phone, commune, ageRange, note, getRequestIp(req)]
      );
      res.status(201).json({
        message: 'Présence enregistrée. Qu’Allah récompense votre soutien.',
        registration: parseAudienceRow(result.rows[0]),
        stats: await getAudienceStats(pool)
      });
    } catch (error) {
      console.error('[QI26 Audience] register error:', error.message);
      res.status(500).json({ message: 'Enregistrement indisponible.' });
    }
  });

  app.get('/api/qi26/audience/stats', publicLimiter, async (req, res) => {
    try {
      res.json({ stats: await getAudienceStats(pool) });
    } catch (error) {
      console.error('[QI26 Audience] stats error:', error.message);
      res.status(500).json({ message: 'Compteurs indisponibles.' });
    }
  });

  app.get('/api/admin/qi26-audience', verifyAdmin, async (req, res) => {
    try {
      const registrations = await pool.query(
        `SELECT id, fullName, gender, whatsapp, phone, commune, ageRange, note, createdAt
         FROM qi26_audience_registrations
         ORDER BY createdAt DESC
         LIMIT $1`,
        [ADMIN_LIMIT]
      );
      res.json({
        stats: await getAudienceStats(pool),
        registrations: registrations.rows.map(parseAudienceRow)
      });
    } catch (error) {
      console.error('[QI26 Audience] admin list error:', error.message);
      res.status(500).json({ message: 'Audience indisponible.' });
    }
  });

  app.get('/api/admin/qi26-audience/export.csv', verifyAdmin, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, fullName, gender, whatsapp, phone, commune, ageRange, note, createdAt
         FROM qi26_audience_registrations
         ORDER BY createdAt ASC`
      );
      const header = ['ID', 'Nom et prenom', 'Genre', 'WhatsApp', 'Telephone', 'Commune', 'Age', 'Note', 'Date'];
      const rows = result.rows.map(parseAudienceRow).map((item) => [
        item.id,
        item.fullName,
        item.gender === 'soeur' ? 'Soeur' : 'Frere',
        item.whatsapp,
        item.phone,
        item.commune,
        item.ageRange,
        item.note,
        item.createdAt
      ]);
      const csv = [header, ...rows]
        .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="audience-qi26.csv"');
      res.send(csv);
    } catch (error) {
      console.error('[QI26 Audience] export error:', error.message);
      res.status(500).json({ message: 'Export indisponible.' });
    }
  });

  app.delete('/api/admin/qi26-audience/:id', verifyAdmin, async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Enregistrement invalide.' });
    }

    try {
      const result = await pool.query('DELETE FROM qi26_audience_registrations WHERE id = $1 RETURNING id', [id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'Enregistrement introuvable.' });
      }
      res.json({ message: 'Enregistrement supprimé.' });
    } catch (error) {
      console.error('[QI26 Audience] delete error:', error.message);
      res.status(500).json({ message: 'Suppression indisponible.' });
    }
  });

  app.get('/api/admin/qi26-engagement/comments', verifyAdmin, async (req, res) => {
    const status = clean(req.query.status, 20);
    const params = [];
    let where = '';
    if (VALID_COMMENT_STATUS.has(status)) {
      params.push(status);
      where = 'WHERE status = $1';
    }
    params.push(ADMIN_LIMIT);

    try {
      const comments = await pool.query(
        `SELECT id, itemSlug, authorName, content, status, moderationScore, createdAt
         FROM qi26_engagement_comments
         ${where}
         ORDER BY createdAt DESC
         LIMIT $${params.length}`,
        params
      );
      const summary = await pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
          COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
          COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected
        FROM qi26_engagement_comments
      `);
      res.json({ summary: summary.rows[0] || {}, comments: comments.rows.map(parseCommentRow) });
    } catch (error) {
      console.error('[QI26 Engagement] admin comments error:', error.message);
      res.status(500).json({ message: 'Commentaires indisponibles.' });
    }
  });

  app.patch('/api/admin/qi26-engagement/comments/:id', verifyAdmin, async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    const status = clean(req.body?.status, 20);
    if (!id || !VALID_COMMENT_STATUS.has(status)) {
      return res.status(400).json({ message: 'Statut invalide.' });
    }

    try {
      const result = await pool.query(
        `UPDATE qi26_engagement_comments
         SET status = $1, reviewedAt = NOW(), reviewedBy = $2
         WHERE id = $3
         RETURNING id, itemSlug, authorName, content, status, moderationScore, createdAt`,
        [status, req.adminUser || 'admin', id]
      );
      if (!result.rows.length) return res.status(404).json({ message: 'Commentaire introuvable.' });
      res.json({ message: 'Commentaire mis à jour.', comment: parseCommentRow(result.rows[0]) });
    } catch (error) {
      console.error('[QI26 Engagement] update comment error:', error.message);
      res.status(500).json({ message: 'Mise à jour indisponible.' });
    }
  });
}
