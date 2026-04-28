// ==================== ENHANCED SOCIAL FEATURES API - PRODUCTION READY ====================
// Optimized & secured version with proper error handling and validation

export function registerEnhancedSocialRoutes({
  app,
  pool,
  sanitizeString,
}) {
  // Helper: Validate candidateId
  function validateCandidateId(id) {
    if (!id || typeof id !== 'string') return null;
    const cleaned = id.trim().substring(0, 50);
    return /^[A-Z0-9]{3,}$/.test(cleaned) ? cleaned : null;
  }

  // Helper: Validate numeric ID
  function validateNumericId(id) {
    if (!id) return null;
    const parsed = Number.parseInt(id, 10);
    return parsed > 0 ? parsed : null;
  }

  // ========== STORIES/ACTIVITY FEED ==========

  // Post a story
  app.post('/api/social/stories', async (req, res) => {
    try {
      const candidateId = validateCandidateId(req.body?.candidateId);
      const content = sanitizeString(req.body?.content, 1000);
      const image_url = sanitizeString(req.body?.image_url, 500);
      const visibility = ['public', 'followers', 'private'].includes(req.body?.visibility)
        ? req.body.visibility
        : 'public';

      if (!candidateId) {
        return res.status(400).json({ message: 'ID de candidat invalide' });
      }

      if (!content || content.length === 0) {
        return res.status(400).json({ message: 'Le contenu ne peut pas être vide' });
      }

      // Get user profile
      const profile = await pool.query(
        'SELECT id FROM user_profiles WHERE candidate_id = $1 LIMIT 1',
        [candidateId]
      );

      if (!profile.rows[0]) {
        return res.status(404).json({ message: 'Profil non trouvé' });
      }

      const result = await pool.query(
        `INSERT INTO user_stories (author_id, content, image_url, visibility)
         VALUES ($1, $2, $3, $4)
         RETURNING id, author_id, content, image_url, visibility, created_at, likes_count, comments_count`,
        [profile.rows[0].id, content, image_url || null, visibility]
      );

      // Increment post count
      await pool.query(
        'UPDATE user_profiles SET total_posts = COALESCE(total_posts, 0) + 1 WHERE id = $1',
        [profile.rows[0].id]
      );

      res.status(201).json({
        message: 'Story publiée avec succès',
        story: result.rows[0]
      });
    } catch (error) {
      console.error('[Social] POST story error:', error.message);
      res.status(500).json({ message: 'Erreur lors de la publication' });
    }
  });

  // Get feed stories
  app.get('/api/social/feed', async (req, res) => {
    try {
      const candidateId = validateCandidateId(req.query.candidateId);
      const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);

      if (!candidateId) {
        return res.status(400).json({ message: 'ID de candidat invalide' });
      }

      // Get user profile first
      const userProfile = await pool.query(
        'SELECT id FROM user_profiles WHERE candidate_id = $1 LIMIT 1',
        [candidateId]
      );

      if (!userProfile.rows[0]) {
        return res.json([]);
      }

      const userProfileId = userProfile.rows[0].id;

      // Optimized query
      const stories = await pool.query(
        `SELECT 
          s.id, s.author_id, s.content, s.image_url, s.visibility, s.created_at,
          up.candidate_id as author_candidate_id, c.fullName as author_name, up.avatar_url,
          COALESCE(s.likes_count, 0) as likes_count,
          COALESCE(s.comments_count, 0) as comments_count,
          CASE WHEN EXISTS(
            SELECT 1 FROM story_likes WHERE story_id = s.id AND user_id = $1
          ) THEN true ELSE false END as is_liked
         FROM user_stories s
         JOIN user_profiles up ON s.author_id = up.id
         LEFT JOIN candidates c ON up.candidate_id = c.candidateCode
         WHERE s.visibility = 'public' OR s.author_id = $1
         ORDER BY s.created_at DESC
         LIMIT $2`,
        [userProfileId, limit]
      );

      res.json(stories.rows.map(s => ({
        ...s,
        author_name: s.author_name || 'Utilisateur supprimé'
      })));
    } catch (error) {
      console.error('[Social] GET feed error:', error.message);
      res.status(500).json({ message: 'Erreur lors de la récupération du fil' });
    }
  });

  // Like a story
  app.post('/api/social/stories/:storyId/like', async (req, res) => {
    try {
      const storyId = validateNumericId(req.params.storyId);
      const candidateId = validateCandidateId(req.body?.candidateId);

      if (!storyId || !candidateId) {
        return res.status(400).json({ message: 'Paramètres invalides' });
      }

      const userProfile = await pool.query(
        'SELECT id FROM user_profiles WHERE candidate_id = $1 LIMIT 1',
        [candidateId]
      );

      if (!userProfile.rows[0]) {
        return res.status(404).json({ message: 'Profil non trouvé' });
      }

      const userProfileId = userProfile.rows[0].id;

      // Insert like
      await pool.query(
        `INSERT INTO story_likes (story_id, user_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [storyId, userProfileId]
      );

      // Update like count
      const likeCount = await pool.query(
        'SELECT COUNT(*) as count FROM story_likes WHERE story_id = $1',
        [storyId]
      );

      await pool.query(
        'UPDATE user_stories SET likes_count = $1 WHERE id = $2',
        [likeCount.rows[0].count, storyId]
      );

      res.json({ message: 'Story aimée' });
    } catch (error) {
      console.error('[Social] POST like error:', error.message);
      res.status(500).json({ message: 'Erreur lors du like' });
    }
  });

  // Unlike a story
  app.delete('/api/social/stories/:storyId/like', async (req, res) => {
    try {
      const storyId = validateNumericId(req.params.storyId);
      const candidateId = validateCandidateId(req.body?.candidateId);

      if (!storyId || !candidateId) {
        return res.status(400).json({ message: 'Paramètres invalides' });
      }

      const userProfile = await pool.query(
        'SELECT id FROM user_profiles WHERE candidate_id = $1 LIMIT 1',
        [candidateId]
      );

      if (!userProfile.rows[0]) {
        return res.status(404).json({ message: 'Profil non trouvé' });
      }

      const userProfileId = userProfile.rows[0].id;

      // Delete like
      await pool.query(
        'DELETE FROM story_likes WHERE story_id = $1 AND user_id = $2',
        [storyId, userProfileId]
      );

      // Update like count
      const likeCount = await pool.query(
        'SELECT COUNT(*) as count FROM story_likes WHERE story_id = $1',
        [storyId]
      );

      await pool.query(
        'UPDATE user_stories SET likes_count = $1 WHERE id = $2',
        [likeCount.rows[0].count, storyId]
      );

      res.json({ message: 'Story déaimée' });
    } catch (error) {
      console.error('[Social] DELETE like error:', error.message);
      res.status(500).json({ message: 'Erreur lors de la suppression du like' });
    }
  });

  // Add comment to story
  app.post('/api/social/stories/:storyId/comments', async (req, res) => {
    try {
      const storyId = validateNumericId(req.params.storyId);
      const candidateId = validateCandidateId(req.body?.candidateId);
      const content = sanitizeString(req.body?.content, 500);

      if (!storyId || !candidateId) {
        return res.status(400).json({ message: 'Paramètres invalides' });
      }

      if (!content || content.length === 0) {
        return res.status(400).json({ message: 'Commentaire ne peut pas être vide' });
      }

      const userProfile = await pool.query(
        'SELECT id FROM user_profiles WHERE candidate_id = $1 LIMIT 1',
        [candidateId]
      );

      if (!userProfile.rows[0]) {
        return res.status(404).json({ message: 'Profil non trouvé' });
      }

      const result = await pool.query(
        `INSERT INTO story_comments (story_id, author_id, content)
         VALUES ($1, $2, $3)
         RETURNING id, story_id, author_id, content, created_at`,
        [storyId, userProfile.rows[0].id, content]
      );

      // Update comment count
      const commentCount = await pool.query(
        'SELECT COUNT(*) as count FROM story_comments WHERE story_id = $1',
        [storyId]
      );

      await pool.query(
        'UPDATE user_stories SET comments_count = $1 WHERE id = $2',
        [commentCount.rows[0].count, storyId]
      );

      res.status(201).json({
        message: 'Commentaire ajouté',
        comment: result.rows[0]
      });
    } catch (error) {
      console.error('[Social] POST comment error:', error.message);
      res.status(500).json({ message: 'Erreur lors de l\'ajout du commentaire' });
    }
  });

  // Get story comments
  app.get('/api/social/stories/:storyId/comments', async (req, res) => {
    try {
      const storyId = validateNumericId(req.params.storyId);
      if (!storyId) {
        return res.status(400).json({ message: 'ID de story invalide' });
      }

      const comments = await pool.query(
        `SELECT sc.id, sc.story_id, sc.author_id, sc.content, sc.created_at,
                up.candidate_id as author_candidate_id, c.fullName as author_name, up.avatar_url
         FROM story_comments sc
         JOIN user_profiles up ON sc.author_id = up.id
         LEFT JOIN candidates c ON up.candidate_id = c.candidateCode
         WHERE sc.story_id = $1
         ORDER BY sc.created_at ASC`,
        [storyId]
      );

      res.json(comments.rows.map(c => ({
        ...c,
        author_name: c.author_name || 'Utilisateur supprimé'
      })));
    } catch (error) {
      console.error('[Social] GET comments error:', error.message);
      res.status(500).json({ message: 'Erreur lors de la récupération des commentaires' });
    }
  });

  // ========== USER SEARCH ==========

  // Search users
  app.get('/api/social/search/users', async (req, res) => {
    try {
      const query = String(req.query.q || '').trim().substring(0, 100);
      const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);

      if (query.length < 2) {
        return res.json([]);
      }

      const results = await pool.query(
        `SELECT up.id, up.candidate_id, c.fullName, up.avatar_url, up.bio,
                up.followers_count, COALESCE(up.verified, false) as verified
         FROM user_profiles up
         LEFT JOIN candidates c ON up.candidate_id = c.candidateCode
         WHERE c.fullName ILIKE $1 OR up.bio ILIKE $1
         ORDER BY up.followers_count DESC
         LIMIT $2`,
        [`%${query}%`, limit]
      );

      res.json(results.rows.map(r => ({
        ...r,
        fullName: r.fullName || 'Utilisateur supprimé'
      })));
    } catch (error) {
      console.error('[Social] GET search error:', error.message);
      res.status(500).json({ message: 'Erreur lors de la recherche' });
    }
  });

  // ========== NOTIFICATIONS ==========

  // Get user notifications
  app.get('/api/social/notifications', async (req, res) => {
    try {
      const candidateId = validateCandidateId(req.query.candidateId);
      if (!candidateId) {
        return res.status(400).json({ message: 'ID de candidat invalide' });
      }

      const unreadOnly = req.query.unread === 'true';
      const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);

      const userProfile = await pool.query(
        'SELECT id FROM user_profiles WHERE candidate_id = $1 LIMIT 1',
        [candidateId]
      );

      if (!userProfile.rows[0]) {
        return res.json({ notifications: [], unread_count: 0 });
      }

      let query = `
        SELECT n.id, n.type, n.title, n.message, n.is_read, n.created_at,
               up.candidate_id as sender_candidate_id, up.fullName as sender_name, up.avatar_url
        FROM notifications n
        LEFT JOIN user_profiles up ON n.sender_id = up.id
        WHERE n.recipient_id = $1
      `;

      if (unreadOnly) query += ` AND n.is_read = false`;
      query += ` ORDER BY n.created_at DESC LIMIT $2`;

      const [notifications, unreadCount] = await Promise.all([
        pool.query(query, [userProfile.rows[0].id, limit]),
        pool.query(
          'SELECT COUNT(*) as count FROM notifications WHERE recipient_id = $1 AND is_read = false',
          [userProfile.rows[0].id]
        )
      ]);

      res.json({
        notifications: notifications.rows,
        unread_count: unreadCount.rows[0].count
      });
    } catch (error) {
      console.error('[Social] GET notifications error:', error.message);
      res.status(500).json({ message: 'Erreur lors de la récupération des notifications' });
    }
  });

  // Mark notification as read
  app.put('/api/social/notifications/:notificationId/read', async (req, res) => {
    try {
      const notificationId = validateNumericId(req.params.notificationId);
      if (!notificationId) {
        return res.status(400).json({ message: 'ID de notification invalide' });
      }

      await pool.query(
        'UPDATE notifications SET is_read = true, updated_at = NOW() WHERE id = $1',
        [notificationId]
      );

      res.json({ message: 'Notification marquée comme lue' });
    } catch (error) {
      console.error('[Social] PUT notification read error:', error.message);
      res.status(500).json({ message: 'Erreur lors de la mise à jour' });
    }
  });

  console.log('✅ Enhanced social routes registered');
}
