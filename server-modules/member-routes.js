export function registerMemberRoutes({
  app,
  pool,
  verifyAdmin,
  verifyMember,
  sanitizeString,
  validateEmail,
  hashPassword,
  normalizeUsername,
  defaultMemberPassword,
  setMemberDefaultPassword,
  logMemberAction,
  isQuizOpenNow,
  quizDateKey,
  DEFAULT_DAILY_QUIZ,
  getMemberToolsConfig,
  sanitizeMemberTools
}) {
  async function getDailyQuizConfig() {
    try {
      const result = await pool.query(
        "SELECT value FROM admin_config WHERE key = 'daily_quiz' LIMIT 1"
      );
      const raw = result.rows[0]?.value;
      if (!raw) return DEFAULT_DAILY_QUIZ;
      const parsed = JSON.parse(raw);
      return parsed && Array.isArray(parsed.questions) ? parsed : DEFAULT_DAILY_QUIZ;
    } catch {
      return DEFAULT_DAILY_QUIZ;
    }
  }

  // Member profile
  app.get('/api/members/me', verifyMember, async (req, res) => {
    res.json({ member: req.member });
  });

  app.put('/api/members/me', verifyMember, async (req, res) => {
    try {
      const { fullName, email, phone } = req.body || {};
      const safeName = sanitizeString(fullName, 255) || req.member.fullName;
      const safeEmail = sanitizeString(email, 120);
      const safePhone = sanitizeString(phone, 30);
      if (safeEmail && !validateEmail(safeEmail)) {
        return res.status(400).json({ message: 'Email invalide.' });
      }
      await pool.query(
        `UPDATE member_accounts
         SET fullName = $1, email = $2, phone = $3, updatedAt = NOW()
         WHERE id = $4`,
        [safeName, safeEmail || null, safePhone || null, req.member.id]
      );
      await logMemberAction(req.member.id, 'profile_update', { fullName: safeName, email: safeEmail, phone: safePhone }, req);
      res.json({ message: 'Profil mis à jour.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  });

  // Daily quiz (members only, 22:00–23:59)
  app.get('/api/members/daily-quiz', verifyMember, async (req, res) => {
    const now = new Date();
    if (!isQuizOpenNow(now)) {
      return res.status(403).json({ open: false, message: 'Le quiz est ouvert de 22h00 à 23h59.' });
    }
    const quiz = await getDailyQuizConfig();
    const quizDate = quizDateKey(now);
    const attempt = await pool.query(
      'SELECT score, total FROM daily_quiz_attempts WHERE memberId = $1 AND quizDate = $2',
      [req.member.id, quizDate]
    );
    const attempted = attempt.rows[0];
    const safeQuestions = quiz.questions.map(({ answerIndex, ...rest }) => rest);
    res.json({
      open: true,
      title: quiz.title || 'Quiz du jour',
      quizDate,
      attempted: Boolean(attempted),
      previousScore: attempted ? attempted.score : null,
      previousTotal: attempted ? attempted.total : null,
      questions: attempted ? [] : safeQuestions
    });
  });

  app.post('/api/members/daily-quiz/submit', verifyMember, async (req, res) => {
    const now = new Date();
    if (!isQuizOpenNow(now)) {
      return res.status(403).json({ message: 'Le quiz est ouvert de 22h00 à 23h59.' });
    }
    const quiz = await getDailyQuizConfig();
    const quizDate = quizDateKey(now);
    const existing = await pool.query(
      'SELECT id FROM daily_quiz_attempts WHERE memberId = $1 AND quizDate = $2',
      [req.member.id, quizDate]
    );
    if (existing.rows.length) {
      return res.status(409).json({ message: 'Quiz déjà soumis pour aujourd’hui.' });
    }
    const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
    let score = 0;
    quiz.questions.forEach((q, idx) => {
      if (Number(answers[idx]) === Number(q.answerIndex)) score += 1;
    });
    const total = quiz.questions.length;
    await pool.query(
      `INSERT INTO daily_quiz_attempts (memberId, quizDate, score, total, answersJson)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.member.id, quizDate, score, total, JSON.stringify(answers)]
    );
    await logMemberAction(req.member.id, 'daily_quiz_submit', { quizDate, score, total }, req);
    res.json({ message: 'Quiz enregistré.', score, total });
  });

  // Admin: member accounts
  app.get('/api/admin/members', verifyAdmin, async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT id, username, fullName, role, email, phone, active, createdAt, updatedAt FROM member_accounts ORDER BY id ASC'
      );
      const pwdRes = await pool.query(
        "SELECT value FROM admin_config WHERE key = 'member_default_password' LIMIT 1"
      );
      const defaultPassword = pwdRes.rows[0]?.value || defaultMemberPassword();
      res.json({ members: result.rows, defaultPassword });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post('/api/admin/members', verifyAdmin, async (req, res) => {
    try {
      const { username, fullName, role, email, phone, password } = req.body || {};
      const uname = normalizeUsername(username);
      const name = sanitizeString(fullName, 255);
      if (!uname || !name) return res.status(400).json({ message: 'Identifiant et nom requis.' });
      if (email && !validateEmail(email)) return res.status(400).json({ message: 'Email invalide.' });
      const passHash = await hashPassword(password || defaultMemberPassword());
      await pool.query(
        `INSERT INTO member_accounts (username, fullName, role, email, phone, passwordHash)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uname, name, role || '', email || null, phone || null, passHash]
      );
      res.status(201).json({ message: 'Compte membre créé.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.put('/api/admin/members/:id', verifyAdmin, async (req, res) => {
    try {
      const memberId = Number(req.params.id);
      if (!memberId) return res.status(400).json({ message: 'ID invalide.' });
      const { username, fullName, role, email, phone, password, active } = req.body || {};
      const uname = username ? normalizeUsername(username) : null;
      const name = fullName ? sanitizeString(fullName, 255) : null;
      if (email && !validateEmail(email)) return res.status(400).json({ message: 'Email invalide.' });
      if (uname) {
        await pool.query('UPDATE member_accounts SET username = $1 WHERE id = $2', [uname, memberId]);
      }
      if (name) {
        await pool.query('UPDATE member_accounts SET fullName = $1 WHERE id = $2', [name, memberId]);
      }
      await pool.query(
        `UPDATE member_accounts
         SET role = COALESCE($1, role),
             email = COALESCE($2, email),
             phone = COALESCE($3, phone),
             active = COALESCE($4, active),
             updatedAt = NOW()
         WHERE id = $5`,
        [role ?? null, email ?? null, phone ?? null, typeof active === 'number' ? active : null, memberId]
      );
      if (password) {
        const passHash = await hashPassword(password);
        await pool.query('UPDATE member_accounts SET passwordHash = $1 WHERE id = $2', [passHash, memberId]);
      }
      res.json({ message: 'Compte membre mis à jour.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.delete('/api/admin/members/:id', verifyAdmin, async (req, res) => {
    try {
      const memberId = Number(req.params.id);
      if (!memberId) return res.status(400).json({ message: 'ID invalide.' });
      await pool.query('UPDATE member_accounts SET active = 0 WHERE id = $1', [memberId]);
      res.json({ message: 'Compte membre désactivé.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/member-audit', verifyAdmin, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT a.id, a.action, a.payload, a.createdAt, m.fullName, m.username
         FROM member_audit a
         LEFT JOIN member_accounts m ON m.id = a.memberId
         ORDER BY a.id DESC LIMIT 200`
      );
      res.json({ logs: result.rows });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Admin: member performance summary
  app.get('/api/admin/member-performance', verifyAdmin, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT memberId, COUNT(*)::int as count
         FROM member_audit
         GROUP BY memberId`
      );
      const items = {};
      result.rows.forEach((row) => {
        const count = Number(row.count || 0);
        let label = 'Actif';
        if (count >= 30) label = 'Excellent';
        else if (count >= 15) label = 'Très actif';
        else if (count === 0) label = 'Inactif';
        items[String(row.memberid || row.memberId)] = label;
      });
      res.json({ items });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Admin: daily quiz config
  app.get('/api/admin/daily-quiz', verifyAdmin, async (req, res) => {
    try {
      const quiz = await getDailyQuizConfig();
      res.json(quiz);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.put('/api/admin/daily-quiz', verifyAdmin, async (req, res) => {
    try {
      const title = sanitizeString(req.body?.title, 160) || 'Quiz du jour';
      const questions = Array.isArray(req.body?.questions) ? req.body.questions : [];
      const sanitized = questions
        .map((q) => ({
          id: q.id || `q${Math.random().toString(36).slice(2, 7)}`,
          question: sanitizeString(q.question, 200),
          options: Array.isArray(q.options) ? q.options.map((o) => sanitizeString(o, 120)).filter(Boolean) : [],
          answerIndex: Number.isInteger(q.answerIndex) ? q.answerIndex : Number(q.answerIndex || 0)
        }))
        .filter((q) => q.question && q.options.length >= 2 && q.answerIndex >= 0 && q.answerIndex < q.options.length);
      const payload = { title, questions: sanitized.length ? sanitized : DEFAULT_DAILY_QUIZ.questions };
      await pool.query(
        "INSERT INTO admin_config (key, value) VALUES ('daily_quiz', $1) ON CONFLICT (key) DO UPDATE SET value = $1, updatedAt = NOW()",
        [JSON.stringify(payload)]
      );
      res.json({ message: 'Quiz mis à jour.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Admin: member tools (messages, tasks, documents)
  app.get('/api/admin/member-tools', verifyAdmin, async (req, res) => {
    try {
      const tools = await getMemberToolsConfig();
      res.json(tools);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.put('/api/admin/member-tools', verifyAdmin, async (req, res) => {
    try {
      const sanitized = sanitizeMemberTools(req.body || {});
      await pool.query(
        "INSERT INTO admin_config (key, value) VALUES ('member_tools', $1)\n       ON CONFLICT (key) DO UPDATE SET value = $1, updatedAt = NOW()",
        [JSON.stringify(sanitized)]
      );
      res.json({ message: 'Outils membres mis à jour.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/admin/member-tools/whatsapp-log', verifyAdmin, async (req, res) => {
    try {
      const tools = await getMemberToolsConfig();
      const entry = {
        sentAt: new Date().toISOString(),
        template: sanitizeString(req.body?.template, 800),
        count: Number(req.body?.count || 0)
      };
      const updated = {
        ...tools,
        whatsappLogs: [entry, ...(tools.whatsappLogs || [])].slice(0, 20)
      };
      const sanitized = sanitizeMemberTools(updated);
      await pool.query(
        "INSERT INTO admin_config (key, value) VALUES ('member_tools', $1)\n       ON CONFLICT (key) DO UPDATE SET value = $1, updatedAt = NOW()",
        [JSON.stringify(sanitized)]
      );
      res.json({ message: 'Log enregistré.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Member: tools + actions
  app.get('/api/members/member-tools', verifyMember, async (req, res) => {
    try {
      const tools = await getMemberToolsConfig();
      const username = String(req.member?.username || '').toLowerCase();
      const filteredMessages = (tools.messages || []).filter((m) => {
        const scope = String(m.scope || 'all').toLowerCase();
        return scope === 'all' || scope === username;
      });
      const filteredTasks = (tools.tasks || []).filter((t) => {
        const assignee = String(t.assignee || 'all').toLowerCase();
        return assignee === 'all' || assignee === username;
      });
      res.json({
        messages: filteredMessages,
        tasks: filteredTasks,
        documents: tools.documents || []
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/members/actions', verifyMember, async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT action, details, createdAt FROM member_audit WHERE memberId = $1 ORDER BY createdAt DESC LIMIT 30',
        [req.member.id]
      );
      res.json({ actions: result.rows || [] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Member: log custom actions (downloads, etc.)
  app.post('/api/members/log', verifyMember, async (req, res) => {
    try {
      const action = sanitizeString(req.body?.action, 80);
      const details = req.body?.details || {};
      if (!action) return res.status(400).json({ message: 'Action requise.' });
      await logMemberAction(req.member.id, action, details, req);
      res.json({ message: 'Enregistré.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Admin: reset all member passwords to default
  app.post('/api/admin/members/reset-passwords', verifyAdmin, async (req, res) => {
    try {
      const requested = sanitizeString(req.body?.password, 200);
      if (requested) {
        setMemberDefaultPassword(requested);
        await pool.query(
          "INSERT INTO admin_config (key, value) VALUES ('member_default_password', $1)\n         ON CONFLICT (key) DO UPDATE SET value = $1, updatedAt = NOW()",
          [requested]
        );
      }
      const passHash = await hashPassword(defaultMemberPassword());
      await pool.query('UPDATE member_accounts SET passwordHash = $1', [passHash]);
      res.json({ message: 'Mots de passe réinitialisés.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });
}
