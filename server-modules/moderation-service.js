/**
 * Service de Modération du Contenu
 * Gère la modération du contenu utilisateur
 */

export const MODERATION_RULES = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 5000,
  PROFANITY_PATTERNS: [
    /badword1/gi,
    /badword2/gi,
    // Ajouter plus de patterns selon les besoins
  ],
  SPAM_PATTERNS: [
    /http[s]?:\/\/.*?(\.com|\.net|\.org)/gi,
    /^(.+)\1{3,}$/gm, // Répétition excessive
  ]
};

export class ModerationService {
  /**
   * Analyser le contenu
   */
  static analyzeContent(content) {
    const analysis = {
      isSpam: false,
      hasProfanity: false,
      hasExcessiveUrls: false,
      issues: [],
      score: 100
    };

    // Vérifier la longueur
    if (content.length < MODERATION_RULES.MIN_LENGTH) {
      analysis.issues.push('Contenu trop court');
      analysis.score -= 10;
    }

    if (content.length > MODERATION_RULES.MAX_LENGTH) {
      analysis.issues.push('Contenu trop long');
      analysis.score -= 20;
    }

    // Vérifier les profanités
    for (const pattern of MODERATION_RULES.PROFANITY_PATTERNS) {
      if (pattern.test(content)) {
        analysis.hasProfanity = true;
        analysis.issues.push('Langage inapproprié détecté');
        analysis.score -= 30;
        break;
      }
    }

    // Vérifier le spam
    for (const pattern of MODERATION_RULES.SPAM_PATTERNS) {
      if (pattern.test(content)) {
        analysis.isSpam = true;
        analysis.issues.push('Contenu de type spam détecté');
        analysis.score -= 25;
        break;
      }
    }

    // Vérifier les majuscules excessives
    const uppercaseRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (uppercaseRatio > 0.5) {
      analysis.issues.push('Trop de majuscules');
      analysis.score -= 15;
    }

    return analysis;
  }

  /**
   * Nettoyer le contenu
   */
  static sanitizeContent(content) {
    let sanitized = content;

    // Remplacer les profanités
    for (const pattern of MODERATION_RULES.PROFANITY_PATTERNS) {
      sanitized = sanitized.replace(pattern, '***');
    }

    // Normaliser les espaces
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    return sanitized;
  }

  /**
   * Créer un rapport de modération
   */
  static async createModerationReport(pool, contentId, contentType, reason, reportedBy) {
    try {
      const result = await pool.query(
        `INSERT INTO moderation_reports 
         (content_id, content_type, reason, reported_by, status, created_at)
         VALUES ($1, $2, $3, $4, 'pending', NOW())
         RETURNING id`,
        [contentId, contentType, reason, reportedBy]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error creating moderation report:', error);
      throw error;
    }
  }

  /**
   * Obtenir les rapports de modération
   */
  static async getModerationReports(pool, status = null, limit = 50) {
    try {
      let query = 'SELECT * FROM moderation_reports';
      const params = [];

      if (status) {
        query += ' WHERE status = $1';
        params.push(status);
      }

      query += ` ORDER BY created_at DESC LIMIT ${limit}`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error fetching moderation reports:', error);
      throw error;
    }
  }

  /**
   * Approuver un contenu
   */
  static async approveContent(pool, reportId, moderatorId) {
    try {
      await pool.query(
        `UPDATE moderation_reports 
         SET status = 'approved', moderated_by = $1, moderated_at = NOW()
         WHERE id = $2`,
        [moderatorId, reportId]
      );

      return true;
    } catch (error) {
      console.error('Error approving content:', error);
      throw error;
    }
  }

  /**
   * Rejeter/Supprimer un contenu
   */
  static async rejectContent(pool, reportId, moderatorId, reason) {
    try {
      const report = await pool.query(
        'SELECT content_id, content_type FROM moderation_reports WHERE id = $1',
        [reportId]
      );

      if (report.rows.length === 0) {
        throw new Error('Report not found');
      }

      const { content_id, content_type } = report.rows[0];

      // Supprimer le contenu selon son type
      if (content_type === 'chat_message') {
        await pool.query(
          'UPDATE chat_messages SET deleted_at = NOW(), deleted_reason = $1 WHERE id = $2',
          [reason, content_id]
        );
      } else if (content_type === 'comment') {
        await pool.query(
          'UPDATE comments SET deleted_at = NOW(), deleted_reason = $1 WHERE id = $2',
          [reason, content_id]
        );
      }

      // Mettre à jour le rapport
      await pool.query(
        `UPDATE moderation_reports 
         SET status = 'rejected', moderated_by = $1, moderated_at = NOW()
         WHERE id = $2`,
        [moderatorId, reportId]
      );

      return true;
    } catch (error) {
      console.error('Error rejecting content:', error);
      throw error;
    }
  }

  /**
   * Bannir un utilisateur
   */
  static async banUser(pool, userId, reason, duration = null) {
    try {
      const banUntil = duration ? new Date(Date.now() + duration) : null;

      await pool.query(
        `UPDATE users 
         SET is_banned = true, ban_reason = $1, ban_until = $2, banned_at = NOW()
         WHERE id = $3`,
        [reason, banUntil, userId]
      );

      return true;
    } catch (error) {
      console.error('Error banning user:', error);
      throw error;
    }
  }

  /**
   * Débannir un utilisateur
   */
  static async unbanUser(pool, userId) {
    try {
      await pool.query(
        `UPDATE users 
         SET is_banned = false, ban_reason = NULL, ban_until = NULL
         WHERE id = $1`,
        [userId]
      );

      return true;
    } catch (error) {
      console.error('Error unbanning user:', error);
      throw error;
    }
  }

  /**
   * Obtenir les utilisateurs bannis
   */
  static async getBannedUsers(pool) {
    try {
      const result = await pool.query(
        `SELECT id, email, nom, prenom, ban_reason, banned_at, ban_until
         FROM users WHERE is_banned = true
         ORDER BY banned_at DESC`
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching banned users:', error);
      throw error;
    }
  }
}

export function registerModerationRoutes(app, pool) {
  /**
   * POST /api/moderation/analyze - Analyser le contenu
   */
  app.post('/api/moderation/analyze', (req, res) => {
    try {
      const { content } = req.body;
      if (!content) return res.status(400).json({ error: 'Content required' });

      const analysis = ModerationService.analyzeContent(content);
      res.json(analysis);
    } catch (error) {
      console.error('Error analyzing content:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * POST /api/moderation/report - Créer un rapport
   */
  app.post('/api/moderation/report', async (req, res) => {
    try {
      const { contentId, contentType, reason, reportedBy } = req.body;

      if (!contentId || !contentType || !reason) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const report = await ModerationService.createModerationReport(
        pool, contentId, contentType, reason, reportedBy
      );

      res.json(report);
    } catch (error) {
      console.error('Error creating report:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/moderation/reports?status=pending - Récupérer les rapports
   */
  app.get('/api/moderation/reports', async (req, res) => {
    try {
      const status = req.query.status;
      const reports = await ModerationService.getModerationReports(pool, status);
      res.json(reports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * POST /api/moderation/reports/:id/approve - Approuver
   */
  app.post('/api/moderation/reports/:id/approve', async (req, res) => {
    try {
      const { id } = req.params;
      const { moderatorId } = req.body;

      if (!moderatorId) return res.status(400).json({ error: 'moderatorId required' });

      await ModerationService.approveContent(pool, id, moderatorId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error approving content:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * POST /api/moderation/reports/:id/reject - Rejeter
   */
  app.post('/api/moderation/reports/:id/reject', async (req, res) => {
    try {
      const { id } = req.params;
      const { moderatorId, reason } = req.body;

      if (!moderatorId) return res.status(400).json({ error: 'moderatorId required' });

      await ModerationService.rejectContent(pool, id, moderatorId, reason);
      res.json({ success: true });
    } catch (error) {
      console.error('Error rejecting content:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * POST /api/moderation/users/:userId/ban - Bannir un utilisateur
   */
  app.post('/api/moderation/users/:userId/ban', async (req, res) => {
    try {
      const { userId } = req.params;
      const { reason, duration } = req.body;

      if (!reason) return res.status(400).json({ error: 'reason required' });

      await ModerationService.banUser(pool, userId, reason, duration);
      res.json({ success: true });
    } catch (error) {
      console.error('Error banning user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * POST /api/moderation/users/:userId/unban - Débannir un utilisateur
   */
  app.post('/api/moderation/users/:userId/unban', async (req, res) => {
    try {
      const { userId } = req.params;
      await ModerationService.unbanUser(pool, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error unbanning user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/moderation/users/banned - Lister les utilisateurs bannis
   */
  app.get('/api/moderation/users/banned', async (req, res) => {
    try {
      const bannedUsers = await ModerationService.getBannedUsers(pool);
      res.json(bannedUsers);
    } catch (error) {
      console.error('Error fetching banned users:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}
