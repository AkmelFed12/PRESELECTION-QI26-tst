// ==================== CHAT GROUPS & BADGES API - PRODUCTION READY ====================
// Secure implementation with comprehensive validation

export function registerChatGroupsRoutes({
  app,
  pool,
  sanitizeString,
  validateCandidateId,
}) {
  // Helper: Validate positive integers
  function validatePositiveInt(value, defaultVal = 20, max = 100) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed) || parsed < 0) return defaultVal;
    return Math.min(parsed, max);
  }

  // Helper: Get user profile
  async function getUserProfile(candidateId) {
    const result = await pool.query(
      'SELECT id FROM user_profiles WHERE candidate_id = $1 LIMIT 1',
      [candidateId]
    );
    return result.rows[0] || null;
  }

  // ========== CREATE CHAT GROUP ==========

  app.post('/api/social/chat-groups', async (req, res) => {
    try {
      const candidateId = validateCandidateId(req.body?.candidateId);
      const name = sanitizeString(req.body?.name, 100);
      const description = sanitizeString(req.body?.description, 500);
      const type = ['public', 'private', 'invite-only'].includes(req.body?.type)
        ? req.body.type
        : 'public';
      const topic = sanitizeString(req.body?.topic, 50) || 'general';

      if (!candidateId || !name) {
        return res.status(400).json({ message: 'Nom du groupe requis' });
      }

      // Get user profile
      const userProfile = await getUserProfile(candidateId);
      if (!userProfile) {
        return res.status(404).json({ message: 'Profil non trouvé' });
      }

      // Create group
      const result = await pool.query(
        `INSERT INTO chat_groups (name, description, type, topic, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id, name, description, type, topic, created_at`,
        [name, description || null, type, topic, userProfile.id]
      );

      const groupId = result.rows[0].id;

      // Add creator as member with admin role
      await pool.query(
        `INSERT INTO chat_group_members (group_id, user_id, role, joined_at)
         VALUES ($1, $2, 'admin', NOW())`,
        [groupId, userProfile.id]
      );

      res.status(201).json({
        message: 'Groupe créé',
        group: result.rows[0]
      });
    } catch (error) {
      console.error('[Groups] POST create error:', error.message);
      res.status(500).json({ message: 'Erreur lors de la création du groupe' });
    }
  });

  // ========== LIST ALL GROUPS ==========

  app.get('/api/social/chat-groups', async (req, res) => {
    try {
      const type = ['public', 'private', 'invite-only'].includes(req.query.type)
        ? req.query.type
        : null;
      const topic = sanitizeString(req.query.topic, 50);
      const search = sanitizeString(req.query.search, 100);
      const limit = validatePositiveInt(req.query.limit, 20, 100);
      const offset = validatePositiveInt(req.query.offset, 0, 1000);

      let query = 'SELECT id, name, description, type, topic, member_count, created_at FROM chat_groups WHERE 1=1';
      const params = [];
      let paramCount = 1;

      // Add type filter
      if (type) {
        query += ` AND type = $${paramCount}`;
        params.push(type);
        paramCount++;
      }

      // Add topic filter
      if (topic) {
        query += ` AND topic = $${paramCount}`;
        params.push(topic);
        paramCount++;
      }

      // Add search filter
      if (search) {
        query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
        params.push(`%${search}%`);
        paramCount++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      res.json({
        groups: result.rows,
        limit,
        offset
      });
    } catch (error) {
      console.error('[Groups] GET list error:', error.message);
      res.status(500).json({ message: 'Erreur lors de la récupération des groupes' });
    }
  });

  // ========== GET GROUP DETAILS ==========

  app.get('/api/social/chat-groups/:groupId', async (req, res) => {
    try {
      const groupId = validatePositiveInt(req.params.groupId);
      if (!groupId) {
        return res.status(400).json({ message: 'ID de groupe invalide' });
      }

      const groupResult = await pool.query(
        `SELECT id, name, description, type, topic, member_count, created_at
         FROM chat_groups WHERE id = $1 LIMIT 1`,
        [groupId]
      );

      if (groupResult.rows.length === 0) {
        return res.status(404).json({ message: 'Groupe non trouvé' });
      }

      // Get members
      const membersResult = await pool.query(
        `SELECT cgm.id, up.candidate_id, c.fullName, cgm.role, cgm.joined_at
         FROM chat_group_members cgm
         JOIN user_profiles up ON cgm.user_id = up.id
         LEFT JOIN candidates c ON up.candidate_id = c.candidateCode
         WHERE cgm.group_id = $1
         ORDER BY cgm.joined_at DESC
         LIMIT 50`,
        [groupId]
      );

      res.json({
        group: groupResult.rows[0],
        members: membersResult.rows
      });
    } catch (error) {
      console.error('[Groups] GET details error:', error.message);
      res.status(500).json({ message: 'Erreur lors de la récupération du groupe' });
    }
  });

  // ========== JOIN GROUP ==========

  app.post('/api/social/chat-groups/:groupId/join', async (req, res) => {
    try {
      const groupId = validatePositiveInt(req.params.groupId);
      const candidateId = validateCandidateId(req.body?.candidateId);

      if (!groupId || !candidateId) {
        return res.status(400).json({ message: 'Paramètres invalides' });
      }

      // Get user profile
      const userProfile = await getUserProfile(candidateId);
      if (!userProfile) {
        return res.status(404).json({ message: 'Profil non trouvé' });
      }

      // Check group exists
      const groupResult = await pool.query(
        'SELECT type FROM chat_groups WHERE id = $1 LIMIT 1',
        [groupId]
      );

      if (groupResult.rows.length === 0) {
        return res.status(404).json({ message: 'Groupe non trouvé' });
      }

      // Check if already member
      const memberResult = await pool.query(
        `SELECT 1 FROM chat_group_members
         WHERE group_id = $1 AND user_id = $2 LIMIT 1`,
        [groupId, userProfile.id]
      );

      if (memberResult.rows.length > 0) {
        return res.status(400).json({ message: 'Déjà membre du groupe' });
      }

      // Add as member
      await pool.query(
        `INSERT INTO chat_group_members (group_id, user_id, role, joined_at)
         VALUES ($1, $2, 'member', NOW())`,
        [groupId, userProfile.id]
      );

      // Update member count
      await pool.query(
        'UPDATE chat_groups SET member_count = member_count + 1 WHERE id = $1',
        [groupId]
      );

      res.status(201).json({ message: 'Groupe rejoint' });
    } catch (error) {
      console.error('[Groups] POST join error:', error.message);
      res.status(500).json({ message: 'Erreur lors de la participation au groupe' });
    }
  });

  // ========== LEAVE GROUP ==========

  app.delete('/api/social/chat-groups/:groupId/leave', async (req, res) => {
    try {
      const groupId = validatePositiveInt(req.params.groupId);
      const candidateId = validateCandidateId(req.body?.candidateId);

      if (!groupId || !candidateId) {
        return res.status(400).json({ message: 'Paramètres invalides' });
      }

      // Get user profile
      const userProfile = await getUserProfile(candidateId);
      if (!userProfile) {
        return res.status(404).json({ message: 'Profil non trouvé' });
      }

      // Check if admin (can't leave if only admin)
      const adminResult = await pool.query(
        `SELECT COUNT(*) as count FROM chat_group_members
         WHERE group_id = $1 AND role = 'admin'`,
        [groupId]
      );

      const adminCount = adminResult.rows[0].count;
      const userRole = await pool.query(
        `SELECT role FROM chat_group_members
         WHERE group_id = $1 AND user_id = $2 LIMIT 1`,
        [groupId, userProfile.id]
      );

      if (userRole.rows.length === 0) {
        return res.status(404).json({ message: 'Pas membre du groupe' });
      }

      if (userRole.rows[0].role === 'admin' && adminCount === 1) {
        return res.status(400).json({ message: 'Dernier admin ne peut pas partir' });
      }

      // Remove member
      await pool.query(
        `DELETE FROM chat_group_members
         WHERE group_id = $1 AND user_id = $2`,
        [groupId, userProfile.id]
      );

      // Update member count
      await pool.query(
        'UPDATE chat_groups SET member_count = member_count - 1 WHERE id = $1',
        [groupId]
      );

      res.json({ message: 'Groupe quitté' });
    } catch (error) {
      console.error('[Groups] DELETE leave error:', error.message);
      res.status(500).json({ message: 'Erreur lors du départ du groupe' });
    }
  });

  // ========== POST MESSAGE TO GROUP ==========

  app.post('/api/social/chat-groups/:groupId/messages', async (req, res) => {
    try {
      const groupId = validatePositiveInt(req.params.groupId);
      const candidateId = validateCandidateId(req.body?.candidateId);
      const content = sanitizeString(req.body?.content, 2000);

      if (!groupId || !candidateId || !content) {
        return res.status(400).json({ message: 'Paramètres invalides' });
      }

      // Get user profile
      const userProfile = await getUserProfile(candidateId);
      if (!userProfile) {
        return res.status(404).json({ message: 'Profil non trouvé' });
      }

      // Check if member
      const memberResult = await pool.query(
        `SELECT 1 FROM chat_group_members
         WHERE group_id = $1 AND user_id = $2 LIMIT 1`,
        [groupId, userProfile.id]
      );

      if (memberResult.rows.length === 0) {
        return res.status(403).json({ message: 'Pas membre du groupe' });
      }

      // Insert message
      const result = await pool.query(
        `INSERT INTO chat_group_messages (group_id, author_id, content, created_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING id, author_id, content, created_at`,
        [groupId, userProfile.id, content]
      );

      res.status(201).json({
        message: 'Message envoyé',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('[Groups] POST message error:', error.message);
      res.status(500).json({ message: 'Erreur lors de l\'envoi du message' });
    }
  });

  console.log('✅ Chat groups routes registered');
}
