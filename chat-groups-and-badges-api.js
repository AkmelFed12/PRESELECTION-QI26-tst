// Phase 3: Chat Groups & Dynamic Badges API Implementation
// This file contains all endpoints for chat groups and badge system
// To integrate into server.js, copy all endpoints and add before the 404 handler

// ========== CHAT GROUPS ENDPOINTS ==========

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
      SELECT cm.*, up.fullName as author_name, up.avatar_url,
             COALESCE(COUNT(mr.id), 0) as reaction_count,
             array_agg(json_build_object('emoji', mr.emoji, 'count', COUNT(mr.id))) FILTER (WHERE mr.emoji IS NOT NULL) as reactions
      FROM chat_messages cm
      JOIN user_profiles up ON cm.author_id = up.id
      LEFT JOIN message_reactions mr ON cm.id = mr.message_id
      WHERE cm.group_id = $1
      GROUP BY cm.id, up.fullName, up.avatar_url
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
    const { groupId, messageId } = req.params;
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
    const reactionCount = await pool.query(
      `SELECT COUNT(*) as count FROM message_reactions WHERE message_id = $1`,
      [messageId]
    );

    res.json({ message: 'Réaction ajoutée', reaction_count: reactionCount.rows[0].count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get message reactions
app.get('/api/social/chat-groups/:groupId/messages/:messageId/reactions', async (req, res) => {
  try {
    const { messageId } = req.params;

    const reactions = await pool.query(`
      SELECT emoji, COUNT(*) as count, array_agg(DISTINCT up.fullName) as users
      FROM message_reactions mr
      JOIN user_profiles up ON mr.user_id = up.id
      WHERE mr.message_id = $1
      GROUP BY emoji
      ORDER BY count DESC
    `, [messageId]);

    res.json(reactions.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== TYPING INDICATOR ==========

// Update typing status
app.post('/api/social/chat-groups/:groupId/typing', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { candidateId, is_typing } = req.body;

    const userProfile = await pool.query(
      `SELECT id FROM user_profiles WHERE candidate_id = $1`,
      [candidateId]
    );

    if (userProfile.rows.length === 0) {
      return res.status(404).json({ message: 'Profil non trouvé' });
    }

    if (is_typing) {
      await pool.query(`
        INSERT INTO typing_indicators (group_id, user_id, is_typing)
        VALUES ($1, $2, 1)
        ON CONFLICT (group_id, user_id) DO UPDATE SET
        is_typing = 1, created_at = NOW()
      `, [groupId, userProfile.rows[0].id]);
    } else {
      await pool.query(`
        DELETE FROM typing_indicators WHERE group_id = $1 AND user_id = $2
      `, [groupId, userProfile.rows[0].id]);
    }

    res.json({ message: 'Statut mis à jour' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get who's typing
app.get('/api/social/chat-groups/:groupId/typing', async (req, res) => {
  try {
    const { groupId } = req.params;

    const typing = await pool.query(`
      SELECT up.fullName, up.avatar_url
      FROM typing_indicators ti
      JOIN user_profiles up ON ti.user_id = up.id
      WHERE ti.group_id = $1 AND ti.is_typing = 1
      AND ti.created_at > NOW() - INTERVAL '5 seconds'
    `, [groupId]);

    res.json(typing.rows);
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

// Unlock badge (admin/system endpoint)
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

// Update badge progress
app.put('/api/social/badges/:badgeId/progress', async (req, res) => {
  try {
    const { badgeId } = req.params;
    const { candidateId, progress_increment } = req.body;

    const userProfile = await pool.query(
      `SELECT id FROM user_profiles WHERE candidate_id = $1`,
      [candidateId]
    );

    if (userProfile.rows.length === 0) {
      return res.status(404).json({ message: 'Profil non trouvé' });
    }

    const result = await pool.query(`
      UPDATE badge_progress
      SET current_progress = current_progress + $1,
          last_updated = NOW()
      WHERE user_id = $2 AND badge_id = $3
      RETURNING *
    `, [progress_increment || 1, userProfile.rows[0].id, badgeId]);

    // Check if badge should be unlocked
    if (result.rows.length > 0 && result.rows[0].current_progress >= result.rows[0].target_value) {
      await pool.query(`
        INSERT INTO user_badges (user_id, badge_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [userProfile.rows[0].id, badgeId]);
    }

    res.json({ message: 'Progrès mis à jour', progress: result.rows[0] });
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
