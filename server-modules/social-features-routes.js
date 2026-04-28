// ==================== SOCIAL FEATURES API - PRODUCTION READY ====================
// Corrected & optimized version with proper validation, error handling, and security

export function registerSocialFeaturesRoutes({
  app,
  pool,
  sanitizeString,
}) {
  // Helper: Validate and normalize candidateId
  function validateCandidateId(id) {
    if (!id || typeof id !== 'string') return null;
    const cleaned = id.trim().substring(0, 50);
    return /^[A-Z0-9]{3,}$/.test(cleaned) ? cleaned : null;
  }

  // Helper: Safe numeric ID validation
  function validateNumericId(id) {
    if (!id) return null;
    const parsed = Number.parseInt(id, 10);
    return parsed > 0 ? parsed : null;
  }

  // Helper: Get or create user profile
  async function getUserProfile(candidateId) {
    try {
      const result = await pool.query(
        'SELECT id FROM user_profiles WHERE candidate_id = $1 LIMIT 1',
        [candidateId]
      );
      if (result.rows.length > 0) return result.rows[0].id;
      
      // Verify candidate exists before creating profile
      const candidateExists = await pool.query(
        'SELECT 1 FROM candidates WHERE candidateCode = $1 LIMIT 1',
        [candidateId]
      );
      if (candidateExists.rows.length === 0) return null;

      // Create profile
      const newProfile = await pool.query(
        `INSERT INTO user_profiles (candidate_id) VALUES ($1) 
         ON CONFLICT (candidate_id) DO UPDATE SET updated_at = NOW() 
         RETURNING id`,
        [candidateId]
      );
      return newProfile.rows[0]?.id || null;
    } catch (error) {
      console.error('[Social] Error getting user profile:', error.message);
      return null;
    }
  }

  // ========== USER PROFILES ==========

  // Get user profile
  app.get('/api/social/profile/:candidateId', async (req, res) => {
    try {
      const candidateId = validateCandidateId(req.params.candidateId);
      if (!candidateId) {
        return res.status(400).json({ message: 'ID de candidat invalide' });
      }

      const profile = await pool.query(
        `SELECT 
          up.id, up.candidate_id, up.bio, up.avatar_url, up.website, 
          up.location, up.followers_count, up.following_count, up.joined_at,
          c.fullName, c.city, c.photoUrl
        FROM user_profiles up
        LEFT JOIN candidates c ON up.candidate_id = c.candidateCode
        WHERE up.candidate_id = $1 LIMIT 1`,
        [candidateId]
      );

      if (profile.rows.length === 0) {
        return res.status(404).json({ message: 'Profil non trouvé' });
      }

      const data = profile.rows[0];
      res.json({
        id: data.id,
        candidateId: data.candidate_id,
        fullName: data.fullName,
        bio: sanitizeString(data.bio, 500),
        avatar: data.avatar_url || data.photoUrl,
        website: data.website,
        location: data.location || data.city,
        followers: data.followers_count || 0,
        following: data.following_count || 0,
        joinedAt: data.joined_at
      });
    } catch (error) {
      console.error('[Social] GET profile error:', error.message);
      res.status(500).json({ message: 'Erreur serveur. Veuillez réessayer.' });
    }
  });

  // Update user profile
  app.put('/api/social/profile/:candidateId', async (req, res) => {
    try {
      const candidateId = validateCandidateId(req.params.candidateId);
      if (!candidateId) {
        return res.status(400).json({ message: 'ID de candidat invalide' });
      }

      const { bio, avatar_url, website, location } = req.body || {};

      // Validate input
      if (bio && bio.length > 500) {
        return res.status(400).json({ message: 'Bio trop longue (max 500 caractères)' });
      }
      if (website && website.length > 500) {
        return res.status(400).json({ message: 'URL du site trop longue' });
      }
      if (location && location.length > 100) {
        return res.status(400).json({ message: 'Localisation trop longue' });
      }

      // Sanitize inputs
      const safeBio = bio ? sanitizeString(bio, 500) : null;
      const safeUrl = avatar_url ? sanitizeString(avatar_url, 500) : null;
      const safeWebsite = website ? sanitizeString(website, 500) : null;
      const safeLocation = location ? sanitizeString(location, 100) : null;

      const result = await pool.query(
        `INSERT INTO user_profiles (candidate_id, bio, avatar_url, website, location, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (candidate_id) DO UPDATE SET
           bio = COALESCE($2, bio),
           avatar_url = COALESCE($3, avatar_url),
           website = COALESCE($4, website),
           location = COALESCE($5, location),
           updated_at = NOW()
         RETURNING id, candidate_id, bio, avatar_url, website, location`,
        [candidateId, safeBio, safeUrl, safeWebsite, safeLocation]
      );

      if (!result.rows[0]) {
        return res.status(400).json({ message: 'Impossible de mettre à jour le profil' });
      }

      res.json({
        message: 'Profil mis à jour avec succès',
        profile: result.rows[0]
      });
    } catch (error) {
      console.error('[Social] PUT profile error:', error.message);
      res.status(500).json({ message: 'Erreur lors de la mise à jour du profil' });
    }
  });

  // ========== FOLLOWERS ==========

  // Follow user
  app.post('/api/social/follow', async (req, res) => {
    try {
      const followerId = validateCandidateId(req.body?.followerId);
      const followingId = validateCandidateId(req.body?.followingId);

      if (!followerId || !followingId) {
        return res.status(400).json({ message: 'IDs de candidat invalides' });
      }

      if (followerId === followingId) {
        return res.status(400).json({ message: 'Impossible de vous suivre vous-même' });
      }

      // Get both profiles
      const [followerProfileId, followingProfileId] = await Promise.all([
        getUserProfile(followerId),
        getUserProfile(followingId)
      ]);

      if (!followerProfileId || !followingProfileId) {
        return res.status(404).json({ message: 'Un ou plusieurs profils non trouvés' });
      }

      // Start transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Insert follow relationship
        await client.query(
          `INSERT INTO user_followers (follower_id, following_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [followerProfileId, followingProfileId]
        );

        // Update counts
        const followerCounts = await client.query(
          'SELECT COUNT(*) as count FROM user_followers WHERE follower_id = $1',
          [followerProfileId]
        );
        const followingCounts = await client.query(
          'SELECT COUNT(*) as count FROM user_followers WHERE following_id = $1',
          [followingProfileId]
        );

        await Promise.all([
          client.query('UPDATE user_profiles SET following_count = $1 WHERE id = $2',
            [followerCounts.rows[0].count, followerProfileId]),
          client.query('UPDATE user_profiles SET followers_count = $1 WHERE id = $2',
            [followingCounts.rows[0].count, followingProfileId])
        ]);

        await client.query('COMMIT');
        res.json({ message: 'Utilisateur suivi avec succès' });
      } catch (txnError) {
        await client.query('ROLLBACK');
        throw txnError;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('[Social] POST follow error:', error.message);
      res.status(500).json({ message: 'Erreur lors du suivi' });
    }
  });

  // Unfollow user
  app.delete('/api/social/follow/:followingId', async (req, res) => {
    try {
      const followerId = validateCandidateId(req.body?.followerId);
      const followingId = validateCandidateId(req.params.followingId);

      if (!followerId || !followingId) {
        return res.status(400).json({ message: 'IDs de candidat invalides' });
      }

      // Get profile IDs
      const [followerProfile, followingProfile] = await Promise.all([
        pool.query('SELECT id FROM user_profiles WHERE candidate_id = $1 LIMIT 1', [followerId]),
        pool.query('SELECT id FROM user_profiles WHERE candidate_id = $1 LIMIT 1', [followingId])
      ]);

      if (!followerProfile.rows[0] || !followingProfile.rows[0]) {
        return res.status(404).json({ message: 'Profil non trouvé' });
      }

      const followerProfileId = followerProfile.rows[0].id;
      const followingProfileId = followingProfile.rows[0].id;

      // Delete follow relationship
      await pool.query(
        'DELETE FROM user_followers WHERE follower_id = $1 AND following_id = $2',
        [followerProfileId, followingProfileId]
      );

      // Update counts
      const followingCounts = await pool.query(
        'SELECT COUNT(*) as count FROM user_followers WHERE follower_id = $1',
        [followerProfileId]
      );
      const followerCounts = await pool.query(
        'SELECT COUNT(*) as count FROM user_followers WHERE following_id = $1',
        [followingProfileId]
      );

      await Promise.all([
        pool.query('UPDATE user_profiles SET following_count = $1 WHERE id = $2',
          [followingCounts.rows[0].count, followerProfileId]),
        pool.query('UPDATE user_profiles SET followers_count = $1 WHERE id = $2',
          [followerCounts.rows[0].count, followingProfileId])
      ]);

      res.json({ message: 'Utilisateur non suivi' });
    } catch (error) {
      console.error('[Social] DELETE follow error:', error.message);
      res.status(500).json({ message: 'Erreur lors du non-suivi' });
    }
  });

  // ========== DIRECT MESSAGING ==========

  // Send message
  app.post('/api/social/messages', async (req, res) => {
    try {
      const senderId = validateCandidateId(req.body?.sender_id);
      const recipientId = validateCandidateId(req.body?.recipient_id);
      const content = sanitizeString(req.body?.content, 1000);

      if (!senderId || !recipientId) {
        return res.status(400).json({ message: 'IDs de candidat invalides' });
      }

      if (!content || content.length === 0) {
        return res.status(400).json({ message: 'Message vide' });
      }

      // Get profile IDs
      const [senderProfile, recipientProfile] = await Promise.all([
        pool.query('SELECT id FROM user_profiles WHERE candidate_id = $1 LIMIT 1', [senderId]),
        pool.query('SELECT id FROM user_profiles WHERE candidate_id = $1 LIMIT 1', [recipientId])
      ]);

      if (!senderProfile.rows[0] || !recipientProfile.rows[0]) {
        return res.status(404).json({ message: 'Profil non trouvé' });
      }

      const result = await pool.query(
        `INSERT INTO direct_messages (sender_id, recipient_id, content)
         VALUES ($1, $2, $3)
         RETURNING id, sender_id, recipient_id, content, created_at`,
        [senderProfile.rows[0].id, recipientProfile.rows[0].id, content]
      );

      res.status(201).json({
        message: 'Message envoyé',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('[Social] POST message error:', error.message);
      res.status(500).json({ message: 'Erreur lors de l\'envoi du message' });
    }
  });

  // Get message conversations
  app.get('/api/social/conversations/:candidateId', async (req, res) => {
    try {
      const candidateId = validateCandidateId(req.params.candidateId);
      if (!candidateId) {
        return res.status(400).json({ message: 'ID de candidat invalide' });
      }

      const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);

      const profile = await pool.query(
        'SELECT id FROM user_profiles WHERE candidate_id = $1 LIMIT 1',
        [candidateId]
      );

      if (!profile.rows[0]) {
        return res.status(404).json({ message: 'Profil non trouvé' });
      }

      const conversations = await pool.query(
        `SELECT DISTINCT
          CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END as other_profile_id,
          MAX(created_at) as last_message_at,
          COUNT(*) FILTER (WHERE read_at IS NULL AND recipient_id = $1) as unread_count
        FROM direct_messages
        WHERE sender_id = $1 OR recipient_id = $1
        GROUP BY other_profile_id
        ORDER BY last_message_at DESC
        LIMIT $2`,
        [profile.rows[0].id, limit]
      );

      // Enrich with user details
      const enriched = await Promise.all(
        conversations.rows.map(async (conv) => {
          const otherProfile = await pool.query(
            `SELECT up.candidate_id, c.fullName 
             FROM user_profiles up
             LEFT JOIN candidates c ON up.candidate_id = c.candidateCode
             WHERE up.id = $1 LIMIT 1`,
            [conv.other_profile_id]
          );
          return {
            ...conv,
            otherCandidateId: otherProfile.rows[0]?.candidate_id,
            otherName: otherProfile.rows[0]?.fullName
          };
        })
      );

      res.json(enriched);
    } catch (error) {
      console.error('[Social] GET conversations error:', error.message);
      res.status(500).json({ message: 'Erreur lors de la récupération des conversations' });
    }
  });

  // Get message history
  app.get('/api/social/messages/:conversationId', async (req, res) => {
    try {
      const userId = validateCandidateId(req.query.userId);
      const conversationId = validateCandidateId(req.params.conversationId);
      const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);

      if (!userId || !conversationId) {
        return res.status(400).json({ message: 'Paramètres invalides' });
      }

      // Get profile IDs
      const [userProfile, convProfile] = await Promise.all([
        pool.query('SELECT id FROM user_profiles WHERE candidate_id = $1 LIMIT 1', [userId]),
        pool.query('SELECT id FROM user_profiles WHERE candidate_id = $1 LIMIT 1', [conversationId])
      ]);

      if (!userProfile.rows[0] || !convProfile.rows[0]) {
        return res.status(404).json({ message: 'Profil non trouvé' });
      }

      const userProfileId = userProfile.rows[0].id;
      const convProfileId = convProfile.rows[0].id;

      // Get messages
      const messages = await pool.query(
        `SELECT id, sender_id, recipient_id, content, created_at, read_at
         FROM direct_messages
         WHERE (sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1)
         ORDER BY created_at DESC
         LIMIT $3`,
        [userProfileId, convProfileId, limit]
      );

      // Mark as read
      await pool.query(
        `UPDATE direct_messages SET read_at = NOW()
         WHERE recipient_id = $1 AND sender_id = $2 AND read_at IS NULL`,
        [userProfileId, convProfileId]
      );

      res.json(messages.rows.reverse());
    } catch (error) {
      console.error('[Social] GET messages error:', error.message);
      res.status(500).json({ message: 'Erreur lors de la récupération des messages' });
    }
  });

  console.log('✅ Social features routes registered');
}
