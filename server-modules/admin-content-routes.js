export function registerAdminContentRoutes({
  app,
  pool,
  verifyAdmin,
  sanitizeString,
  getSiteContent,
  sanitizeSiteContent
}) {
  // Public site content (official pages)
  app.get('/api/public/site-content', async (req, res) => {
    try {
      const data = await getSiteContent();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  // Admin site content
  app.get('/api/admin/site-content', verifyAdmin, async (req, res) => {
    try {
      const data = await getSiteContent();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.put('/api/admin/site-content', verifyAdmin, async (req, res) => {
    try {
      const sanitized = sanitizeSiteContent(req.body || {});
      await pool.query(
        "INSERT INTO admin_config (key, value) VALUES ('site_content', $1) ON CONFLICT (key) DO UPDATE SET value = $1, updatedAt = NOW()",
        [JSON.stringify(sanitized)]
      );
      res.json({ message: 'Contenus mis à jour.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Public news
  app.get('/api/public-news', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, title, body, createdAt, featured, category, imageUrl, imagesJson, publishAt
         FROM news_posts
         WHERE status = 'published'
            OR (status = 'scheduled' AND publishAt IS NOT NULL AND publishAt <= NOW())
         ORDER BY featured DESC, createdAt DESC
         LIMIT 50`
      );
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Database error' });
    }
  });

  // Admin news
  app.get('/api/admin/news', verifyAdmin, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM news_posts ORDER BY createdAt DESC');
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/admin/news', verifyAdmin, async (req, res) => {
    try {
      const { title, body, status, featured, category, imageUrl, images, publishAt } = req.body || {};
      if (!title || !body) {
        return res.status(400).json({ message: 'Titre et contenu requis.' });
      }
      const safeStatus = status === 'draft' || status === 'scheduled' ? status : 'published';
      const isFeatured = Boolean(featured);
      const safeCategory = category ? sanitizeString(category, 50) : null;
      const safeImageUrl = imageUrl ? sanitizeString(imageUrl, 500) : null;
      const safeImages = Array.isArray(images)
        ? images.map((u) => sanitizeString(u, 500)).filter(Boolean)
        : [];
      const parsedPublishAt = publishAt ? new Date(publishAt) : null;
      const safePublishAt = parsedPublishAt && !Number.isNaN(parsedPublishAt.getTime()) ? parsedPublishAt : null;
      if (isFeatured) {
        await pool.query(`UPDATE news_posts SET featured = FALSE`);
      }
      await pool.query(
        'INSERT INTO news_posts (title, body, status, featured, category, imageUrl, imagesJson, publishAt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [
          sanitizeString(title, 200),
          sanitizeString(body, 2000),
          safeStatus,
          isFeatured,
          safeCategory,
          safeImageUrl,
          JSON.stringify(safeImages),
          safePublishAt
        ]
      );
      res.status(201).json({ message: 'Actualité enregistrée.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.put('/api/admin/news/:id', verifyAdmin, async (req, res) => {
    try {
      const { title, body, status, featured, category, imageUrl, images, publishAt } = req.body || {};
      const safeStatus = status === 'draft' || status === 'scheduled' ? status : 'published';
      const isFeatured = Boolean(featured);
      const safeCategory = category ? sanitizeString(category, 50) : null;
      const safeImageUrl = imageUrl ? sanitizeString(imageUrl, 500) : null;
      const safeImages = Array.isArray(images)
        ? images.map((u) => sanitizeString(u, 500)).filter(Boolean)
        : [];
      const parsedPublishAt = publishAt ? new Date(publishAt) : null;
      const safePublishAt = parsedPublishAt && !Number.isNaN(parsedPublishAt.getTime()) ? parsedPublishAt : null;
      if (isFeatured) {
        await pool.query(`UPDATE news_posts SET featured = FALSE`);
      }
      await pool.query(
        'UPDATE news_posts SET title = $1, body = $2, status = $3, featured = $4, category = $5, imageUrl = $6, imagesJson = $7, publishAt = $8 WHERE id = $9',
        [
          sanitizeString(title, 200),
          sanitizeString(body, 2000),
          safeStatus,
          isFeatured,
          safeCategory,
          safeImageUrl,
          JSON.stringify(safeImages),
          safePublishAt,
          req.params.id
        ]
      );
      res.json({ message: 'Actualité mise à jour.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.delete('/api/admin/news/:id', verifyAdmin, async (req, res) => {
    try {
      await pool.query('DELETE FROM news_posts WHERE id = $1', [req.params.id]);
      res.json({ message: 'Actualité supprimée.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.patch('/api/admin/news/:id/status', verifyAdmin, async (req, res) => {
    try {
      const { status } = req.body || {};
      const safeStatus = status === 'draft' || status === 'scheduled' ? status : 'published';
      await pool.query('UPDATE news_posts SET status = $1 WHERE id = $2', [safeStatus, req.params.id]);
      res.json({ message: 'Statut mis à jour.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.patch('/api/admin/news/:id/feature', verifyAdmin, async (req, res) => {
    try {
      const { featured } = req.body || {};
      const isFeatured = Boolean(featured);
      if (isFeatured) {
        await pool.query('UPDATE news_posts SET featured = FALSE');
      }
      await pool.query('UPDATE news_posts SET featured = $1 WHERE id = $2', [isFeatured, req.params.id]);
      res.json({ message: 'Mise à la une mise à jour.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Public sponsors
  app.get('/api/public-sponsors', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, name, logoUrl, website, amount, createdAt
         FROM sponsors
         WHERE status = 'approved'
         ORDER BY createdAt DESC`
      );
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/public-sponsors', async (req, res) => {
    try {
      const { name, contactName, email, phone, amount, logoUrl, website, files } = req.body || {};
      if (!name) return res.status(400).json({ message: 'Nom requis.' });
      const safeFiles = Array.isArray(files)
        ? files.map((u) => sanitizeString(u, 500)).filter(Boolean)
        : [];
      await pool.query(
        `INSERT INTO sponsors (name, contactName, email, phone, amount, logoUrl, website, filesJson, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')`,
        [
          sanitizeString(name, 200),
          contactName ? sanitizeString(contactName, 200) : null,
          email ? sanitizeString(email, 200) : null,
          phone ? sanitizeString(phone, 50) : null,
          amount ? Number(amount) : null,
          logoUrl ? sanitizeString(logoUrl, 500) : null,
          website ? sanitizeString(website, 300) : null,
          JSON.stringify(safeFiles)
        ]
      );
      res.status(201).json({ message: 'Demande sponsor envoyée.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Admin sponsors
  app.get('/api/admin/sponsors', verifyAdmin, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM sponsors ORDER BY createdAt DESC');
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/admin/sponsors', verifyAdmin, async (req, res) => {
    try {
      const { name, contactName, email, phone, amount, logoUrl, website, status, files } = req.body || {};
      if (!name) return res.status(400).json({ message: 'Nom requis.' });
      const safeStatus = status === 'approved' ? 'approved' : 'pending';
      const safeFiles = Array.isArray(files)
        ? files.map((u) => sanitizeString(u, 500)).filter(Boolean)
        : [];
      await pool.query(
        `INSERT INTO sponsors (name, contactName, email, phone, amount, logoUrl, website, filesJson, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          sanitizeString(name, 200),
          contactName ? sanitizeString(contactName, 200) : null,
          email ? sanitizeString(email, 200) : null,
          phone ? sanitizeString(phone, 50) : null,
          amount ? Number(amount) : null,
          logoUrl ? sanitizeString(logoUrl, 500) : null,
          website ? sanitizeString(website, 300) : null,
          JSON.stringify(safeFiles),
          safeStatus
        ]
      );
      res.status(201).json({ message: 'Sponsor enregistré.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.put('/api/admin/sponsors/:id', verifyAdmin, async (req, res) => {
    try {
      const { name, contactName, email, phone, amount, logoUrl, website, status, files } = req.body || {};
      const safeStatus = status === 'approved' ? 'approved' : 'pending';
      const safeFiles = Array.isArray(files)
        ? files.map((u) => sanitizeString(u, 500)).filter(Boolean)
        : [];
      await pool.query(
        `UPDATE sponsors
         SET name = $1, contactName = $2, email = $3, phone = $4, amount = $5, logoUrl = $6, website = $7, filesJson = $8, status = $9
         WHERE id = $10`,
        [
          sanitizeString(name || '', 200),
          contactName ? sanitizeString(contactName, 200) : null,
          email ? sanitizeString(email, 200) : null,
          phone ? sanitizeString(phone, 50) : null,
          amount ? Number(amount) : null,
          logoUrl ? sanitizeString(logoUrl, 500) : null,
          website ? sanitizeString(website, 300) : null,
          JSON.stringify(safeFiles),
          safeStatus,
          req.params.id
        ]
      );
      res.json({ message: 'Sponsor mis à jour.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.delete('/api/admin/sponsors/:id', verifyAdmin, async (req, res) => {
    try {
      await pool.query('DELETE FROM sponsors WHERE id = $1', [req.params.id]);
      res.json({ message: 'Sponsor supprimé.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Admin poll
  app.get('/api/admin/poll', verifyAdmin, async (req, res) => {
    try {
      const pollRes = await pool.query(
        `SELECT id, question, optionsJson, active FROM poll ORDER BY id DESC LIMIT 1`
      );
      const poll = pollRes.rows[0];
      if (!poll) return res.json({ poll: null });
      const options = JSON.parse(poll.optionsjson || poll.optionsJson || '[]');
      res.json({
        poll: {
          id: poll.id,
          question: poll.question,
          options: options.map((opt) => ({ key: opt, label: opt })),
          active: poll.active === 1 || poll.active === true
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/admin/poll', verifyAdmin, async (req, res) => {
    try {
      const { question, options, active } = req.body || {};
      if (!question || !Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ message: 'Question et options requises (min 2).' });
      }
      const safeOptions = options.map((o) => sanitizeString(o, 100)).filter(Boolean);
      await pool.query(`UPDATE poll SET active = 0`);
      await pool.query(
        `INSERT INTO poll (question, optionsJson, active) VALUES ($1, $2, $3)`,
        [sanitizeString(question, 200), JSON.stringify(safeOptions), active ? 1 : 0]
      );
      res.json({ message: 'Sondage enregistré.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });
}
