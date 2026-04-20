// ==================== ENHANCED SOCIAL FEATURES API ====================
// Add these endpoints to server.js

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
