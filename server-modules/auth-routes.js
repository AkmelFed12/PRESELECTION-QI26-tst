export function registerAuthRoutes({
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
}) {
  // Admin login (returns token for subsequent calls)
  app.post('/api/admin/login', authIpLimiter, authProgressiveBlock('admin'), async (req, res) => {
    try {
      const { username, password } = req.body || {};
      const rawUsername = typeof username === 'string' ? username.trim() : '';
      const rawPassword = typeof password === 'string' ? password.trim() : '';
      if (!rawUsername || !rawPassword) {
        await markAuthAttempt(req, false);
        return res.status(400).json({ message: 'Identifiant et mot de passe requis.' });
      }
      const normalizedUsername = rawUsername.toLowerCase();
      const primaryUser = ADMIN_USERNAME.toLowerCase();
      const altUser = ADMIN_USERNAME_ALT.toLowerCase();
      const legacyMatch = rawPassword === LEGACY_ADMIN_PASSWORD;

      let hashKey = null;
      let defaultPassword = null;
      if (normalizedUsername === primaryUser) {
        hashKey = 'admin_password_hash';
        defaultPassword = ADMIN_PASSWORD;
      } else if (normalizedUsername === altUser) {
        hashKey = 'admin_password_hash_alt';
        defaultPassword = ADMIN_PASSWORD_ALT;
      } else if (legacyMatch) {
        hashKey = 'admin_password_hash_alt';
        defaultPassword = ADMIN_PASSWORD_ALT;
      } else {
        await markAuthAttempt(req, false);
        return res.status(401).json({ message: 'Accès non autorisé' });
      }

      if (legacyMatch) {
        const newHash = await hashPassword(rawPassword);
        await pool.query(
          "INSERT INTO admin_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2",
          [hashKey, newHash]
        );
        await markAuthAttempt(req, true);
        return res.json({ token: defaultPassword });
      }
      const result = await pool.query(
        "SELECT value FROM admin_config WHERE key = $1 LIMIT 1",
        [hashKey]
      );
      const adminHash = result.rows[0]?.value || await hashPassword(defaultPassword);
      let valid = await checkPassword(rawPassword, adminHash);

      if (!valid && rawPassword === defaultPassword) {
        valid = true;
        const newHash = await hashPassword(rawPassword);
        await pool.query(
          "INSERT INTO admin_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2",
          [hashKey, newHash]
        );
      }

      if (!valid) {
        await markAuthAttempt(req, false);
        return res.status(401).json({ message: 'Identifiants incorrects.' });
      }

      await markAuthAttempt(req, true);
      return res.json({ token: defaultPassword });
    } catch (error) {
      await markAuthAttempt(req, false);
      console.error(error);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  });

  app.post('/api/admin/verify-password', verifyAdmin, async (req, res) => {
    try {
      const { password } = req.body || {};
      if (!password) return res.status(400).json({ message: 'Mot de passe requis.' });
      const [primary, alt] = await Promise.all([
        pool.query("SELECT value FROM admin_config WHERE key = 'admin_password_hash' LIMIT 1"),
        pool.query("SELECT value FROM admin_config WHERE key = 'admin_password_hash_alt' LIMIT 1")
      ]);
      const adminHash = primary.rows[0]?.value || await hashPassword(ADMIN_PASSWORD);
      const altHash = alt.rows[0]?.value || await hashPassword(ADMIN_PASSWORD_ALT);
      const valid =
        (await checkPassword(password, adminHash)) ||
        (await checkPassword(password, altHash)) ||
        password === LEGACY_ADMIN_PASSWORD;
      if (!valid) return res.status(401).json({ message: 'Mot de passe incorrect.' });
      res.json({ valid: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  });

  // Member login
  app.post('/api/members/login', authIpLimiter, authProgressiveBlock('member'), async (req, res) => {
    try {
      const { username, password } = req.body || {};
      const rawUsername = sanitizeString(username, 80);
      if (!rawUsername || !password) {
        await markAuthAttempt(req, false);
        return res.status(400).json({ message: 'Identifiant et mot de passe requis.' });
      }
      const normalized = normalizeUsername(rawUsername);
      let result = await pool.query(
        'SELECT id, username, fullName, role, email, phone, passwordHash, active FROM member_accounts WHERE username = $1',
        [normalized]
      );
      let member = result.rows[0];

      if (!member) {
        const matched = DEFAULT_SITE_CONTENT.committee.members.filter((m) =>
          String(m.name || '').toLowerCase().startsWith(rawUsername.toLowerCase())
        );
        if (matched.length === 1) {
          const fallback = buildMemberUsername(matched[0].name);
          if (fallback && fallback !== normalized) {
            result = await pool.query(
              'SELECT id, username, fullName, role, email, phone, passwordHash, active FROM member_accounts WHERE username = $1',
              [fallback]
            );
            member = result.rows[0];
          }
        }
      }
      if (!member || !member.active) {
        await markAuthAttempt(req, false);
        return res.status(401).json({ message: 'Identifiants incorrects.' });
      }
      const valid = await checkPassword(password, member.passwordhash || member.passwordHash || '');
      if (!valid) {
        await markAuthAttempt(req, false);
        return res.status(401).json({ message: 'Identifiants incorrects.' });
      }
      const token = generateToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await pool.query(
        'INSERT INTO member_sessions (memberId, token, expiresAt) VALUES ($1, $2, $3)',
        [member.id, token, expiresAt]
      );
      await logMemberAction(member.id, 'login', { username: member.username }, req);
      await markAuthAttempt(req, true);
      res.json({
        token,
        member: {
          id: member.id,
          username: member.username,
          fullName: member.fullname || member.fullName,
          role: member.role,
          email: member.email,
          phone: member.phone
        }
      });
    } catch (error) {
      await markAuthAttempt(req, false);
      console.error(error);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  });
}
