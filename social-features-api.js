// ==================== SOCIAL FEATURES API ENDPOINTS ====================
// Add these endpoints to server.js after other API routes

// ========== USER PROFILES ==========

// Get user profile
app.get('/api/social/profile/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;
    
    const profile = await pool.query(`
      SELECT 
        up.id,
        up.candidate_id,
        up.bio,
        up.avatar_url,
        up.website,
        up.location,
        up.followers_count,
        up.following_count,
        up.joined_at,
        c.fullName,
        c.city,
        c.photoUrl
      FROM user_profiles up
      LEFT JOIN candidates c ON up.candidate_id = c.candidateCode
      WHERE up.candidate_id = $1
      LIMIT 1
    `, [candidateId]);

    if (profile.rows.length === 0) {
      return res.status(404).json({ message: 'Profil non trouvé' });
    }

    const profileData = profile.rows[0];
    res.json({
      id: profileData.id,
      candidateId: profileData.candidate_id,
      fullName: profileData.fullname,
      bio: profileData.bio,
      avatar: profileData.avatar_url || profileData.photourl,
      website: profileData.website,
      location: profileData.location || profileData.city,
      followers: profileData.followers_count,
      following: profileData.following_count,
      joinedAt: profileData.joined_at
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile
app.put('/api/social/profile/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { bio, avatar_url, website, location } = req.body;

    // Basic validation
    if (bio && bio.length > 500) {
      return res.status(400).json({ message: 'Bio trop longue' });
    }

    const result = await pool.query(`
      INSERT INTO user_profiles (candidate_id, bio, avatar_url, website, location)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (candidate_id) 
      DO UPDATE SET 
        bio = COALESCE($2, bio),
        avatar_url = COALESCE($3, avatar_url),
        website = COALESCE($4, website),
        location = COALESCE($5, location),
        updated_at = NOW()
      RETURNING *
    `, [candidateId, bio || null, avatar_url || null, website || null, location || null]);

    res.json({ message: 'Profil mis à jour', profile: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== FOLLOWERS ==========

// Follow user
app.post('/api/social/follow', async (req, res) => {
  try {
    const { followerId, followingId } = req.body;

    if (followerId === followingId) {
      return res.status(400).json({ message: 'Impossible de vous suivre vous-même' });
    }

    // Get profile IDs
    const profiles = await pool.query(`
      SELECT id, candidate_id FROM user_profiles 
      WHERE candidate_id IN ($1, $2)
    `, [followerId, followingId]);

    if (profiles.rows.length < 2) {
      return res.status(404).json({ message: 'Profil non trouvé' });
    }

    const followerProfileId = profiles.rows.find(p => p.candidate_id === followerId).id;
    const followingProfileId = profiles.rows.find(p => p.candidate_id === followingId).id;

    await pool.query('BEGIN');

    await pool.query(`
      INSERT INTO user_followers (follower_id, following_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, [followerProfileId, followingProfileId]);

    // Update follower counts
    await pool.query(`
      UPDATE user_profiles 
      SET following_count = (
        SELECT COUNT(*) FROM user_followers WHERE follower_id = $1
      )
      WHERE id = $1
    `, [followerProfileId]);

    await pool.query(`
      UPDATE user_profiles 
      SET followers_count = (
        SELECT COUNT(*) FROM user_followers WHERE following_id = $1
      )
      WHERE id = $1
    `, [followingProfileId]);

    await pool.query('COMMIT');

    res.json({ message: 'Utilisateur suivi' });
  } catch (error) {
    await pool.query('ROLLBACK').catch(() => {});
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Unfollow user
app.delete('/api/social/follow/:followingId', async (req, res) => {
  try {
    const { followingId } = req.params;
    const { followerId } = req.body;

    const profiles = await pool.query(`
      SELECT id FROM user_profiles WHERE candidate_id = $1
    `, [followerId]);

    if (profiles.rows.length === 0) {
      return res.status(404).json({ message: 'Profil non trouvé' });
    }

    const followerProfileId = profiles.rows[0].id;

    await pool.query('BEGIN');

    await pool.query(`
      DELETE FROM user_followers 
      WHERE follower_id = $1 AND following_id = (
        SELECT id FROM user_profiles WHERE candidate_id = $2
      )
    `, [followerProfileId, followingId]);

    // Update counts
    await pool.query(`
      UPDATE user_profiles 
      SET following_count = (
        SELECT COUNT(*) FROM user_followers WHERE follower_id = $1
      )
      WHERE id = $1
    `, [followerProfileId]);

    await pool.query('COMMIT');

    res.json({ message: 'Utilisateur non suivi' });
  } catch (error) {
    await pool.query('ROLLBACK').catch(() => {});
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== DIRECT MESSAGING ==========

// Send message
app.post('/api/social/messages', async (req, res) => {
  try {
    const { sender_id, recipient_id, content } = req.body;

    if (!content || content.length > 1000) {
      return res.status(400).json({ message: 'Message invalide' });
    }

    const profiles = await pool.query(`
      SELECT id FROM user_profiles 
      WHERE candidate_id IN ($1, $2)
    `, [sender_id, recipient_id]);

    if (profiles.rows.length < 2) {
      return res.status(404).json({ message: 'Profil non trouvé' });
    }

    const senderProfileId = profiles.rows.find(p => p.candidate_id === sender_id).id;
    const recipientProfileId = profiles.rows.find(p => p.candidate_id === recipient_id).id;

    const result = await pool.query(`
      INSERT INTO direct_messages (sender_id, recipient_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [senderProfileId, recipientProfileId, content]);

    res.status(201).json({ message: 'Message envoyé', data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get conversations
app.get('/api/social/conversations/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const limit = parseInt(req.query.limit || '20', 10);

    const profile = await pool.query(`
      SELECT id FROM user_profiles WHERE candidate_id = $1
    `, [candidateId]);

    if (profile.rows.length === 0) {
      return res.status(404).json({ message: 'Profil non trouvé' });
    }

    const profileId = profile.rows[0].id;

    const conversations = await pool.query(`
      SELECT DISTINCT
        CASE 
          WHEN sender_id = $1 THEN recipient_id 
          ELSE sender_id 
        END as other_user_id,
        (SELECT fullName FROM candidates c WHERE c.id = (
          SELECT id FROM candidates 
          WHERE candidateCode = (
            SELECT candidate_id FROM user_profiles 
            WHERE id = CASE 
              WHEN sender_id = $1 THEN recipient_id 
              ELSE sender_id 
            END
          )
        )) as other_user_name,
        MAX(created_at) as last_message_at,
        SUM(CASE WHEN read_at IS NULL AND (sender_id = $1 OR recipient_id = $1) THEN 1 ELSE 0 END) as unread_count
      FROM direct_messages
      WHERE sender_id = $1 OR recipient_id = $1
      GROUP BY other_user_id
      ORDER BY last_message_at DESC
      LIMIT $2
    `, [profileId, limit]);

    res.json(conversations.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get message history
app.get('/api/social/messages/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.query;
    const limit = parseInt(req.query.limit || '50', 10);

    const messages = await pool.query(`
      SELECT dm.*, 
        up.candidate_id as sender_candidate_id,
        (SELECT fullName FROM candidates c WHERE c.candidateCode = up.candidate_id) as sender_name
      FROM direct_messages dm
      LEFT JOIN user_profiles up ON dm.sender_id = up.id
      WHERE (dm.sender_id = $1 AND dm.recipient_id = $2)
         OR (dm.sender_id = $2 AND dm.recipient_id = $1)
      ORDER BY dm.created_at DESC
      LIMIT $3
    `, [userId, conversationId, limit]);

    // Mark as read
    await pool.query(`
      UPDATE direct_messages 
      SET read_at = NOW()
      WHERE recipient_id = $1 AND sender_id = $2 AND read_at IS NULL
    `, [userId, conversationId]);

    res.json(messages.rows.reverse());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== LEADERBOARD ==========

// Get leaderboard
app.get('/api/social/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '100', 10);

    const leaderboard = await pool.query(`
      SELECT 
        ROW_NUMBER() OVER (ORDER BY score DESC) as rank,
        le.candidate_id,
        le.score,
        le.votes_count,
        le.profile_views,
        c.fullName,
        c.city,
        c.photoUrl,
        up.avatar_url
      FROM leaderboard_entries le
      LEFT JOIN candidates c ON le.candidate_id = c.candidateCode
      LEFT JOIN user_profiles up ON le.candidate_id = up.candidate_id
      ORDER BY le.score DESC
      LIMIT $1
    `, [limit]);

    res.json(leaderboard.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update leaderboard (internal - admin only)
app.post('/api/social/leaderboard/update', verifyAdmin, async (req, res) => {
  try {
    // Recalculate scores from votes and engagement
    await pool.query(`
      INSERT INTO leaderboard_entries (user_id, candidate_id, score, votes_count)
      SELECT 
        up.id,
        up.candidate_id,
        (COUNT(v.id) * 10 + COALESCE(COUNT(uf.id), 0) * 5) as score,
        COUNT(v.id) as votes_count
      FROM user_profiles up
      LEFT JOIN votes v ON v.candidateId = (SELECT id FROM candidates WHERE candidateCode = up.candidate_id)
      LEFT JOIN user_followers uf ON uf.following_id = up.id
      GROUP BY up.id, up.candidate_id
      ON CONFLICT (user_id) DO UPDATE SET 
        score = EXCLUDED.score,
        votes_count = EXCLUDED.votes_count,
        updated_at = NOW()
    `);

    res.json({ message: 'Classement mis à jour' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== ACHIEVEMENTS ==========

// Get user achievements
app.get('/api/social/achievements/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;

    const profile = await pool.query(`
      SELECT id FROM user_profiles WHERE candidate_id = $1
    `, [candidateId]);

    if (profile.rows.length === 0) {
      return res.status(404).json({ message: 'Profil non trouvé' });
    }

    const achievements = await pool.query(`
      SELECT 
        a.id,
        a.name,
        a.description,
        a.icon_emoji,
        a.category,
        ua.unlocked_at
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
      ORDER BY a.id ASC
    `, [profile.rows[0].id]);

    res.json(achievements.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all achievements
app.get('/api/social/achievements', async (req, res) => {
  try {
    const achievements = await pool.query(`
      SELECT 
        id,
        name,
        description,
        icon_emoji,
        category,
        criteria_type,
        criteria_value
      FROM achievements
      ORDER BY id ASC
    `);

    res.json(achievements.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check and award achievements (internal)
app.post('/api/social/achievements/check', async (req, res) => {
  try {
    const { userId, candidateId } = req.body;

    const profile = await pool.query(`
      SELECT id, followers_count FROM user_profiles WHERE candidate_id = $1
    `, [candidateId]);

    if (profile.rows.length === 0) {
      return res.status(404).json({ message: 'Profil non trouvé' });
    }

    const profileId = profile.rows[0].id;
    const followersCount = profile.rows[0].followers_count;

    // Check for achievements
    const achievements = await pool.query(`
      SELECT id, criteria_type, criteria_value FROM achievements
    `);

    for (const achievement of achievements.rows) {
      const { id, criteria_type, criteria_value } = achievement;

      let shouldAward = false;

      if (criteria_type === 'followers' && followersCount >= criteria_value) {
        shouldAward = true;
      }

      if (shouldAward) {
        await pool.query(`
          INSERT INTO user_achievements (user_id, achievement_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [profileId, id]);
      }
    }

    res.json({ message: 'Achievements vérifiés' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});
