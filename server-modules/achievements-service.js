/**
 * Service d'Achievements/Badges
 * Gère les systèmes de badges et achievements
 */

export const ACHIEVEMENTS = {
  // Quiz Achievements
  FIRST_QUIZ: { id: 'first_quiz', name: 'Premier Quiz', icon: '🎓', points: 10 },
  QUIZ_MASTER: { id: 'quiz_master', name: 'Maître du Quiz', icon: '👑', points: 100 },
  PERFECT_SCORE: { id: 'perfect_score', name: 'Score Parfait', icon: '⭐', points: 50 },
  
  // Social Achievements
  SOCIAL_BUTTERFLY: { id: 'social_butterfly', name: 'Papillon Social', icon: '🦋', points: 30 },
  CHAT_MASTER: { id: 'chat_master', name: 'Maître du Chat', icon: '💬', points: 40 },
  
  // Leaderboard Achievements
  TOP_10: { id: 'top_10', name: 'Top 10', icon: '🏅', points: 75 },
  TOP_5: { id: 'top_5', name: 'Top 5', icon: '🥇', points: 150 },
  CHAMPION: { id: 'champion', name: 'Champion', icon: '🏆', points: 200 },
  
  // Activity Achievements
  WEEK_ACTIVE: { id: 'week_active', name: 'Semaine Active', icon: '🔥', points: 25 },
  MONTH_ACTIVE: { id: 'month_active', name: 'Mois Actif', icon: '💪', points: 60 },
  
  // Engagement Achievements
  HELPFUL_MEMBER: { id: 'helpful_member', name: 'Membre Utile', icon: '🤝', points: 45 },
  TRUSTED_USER: { id: 'trusted_user', name: 'Utilisateur de Confiance', icon: '✅', points: 80 }
};

export class AchievementService {
  /**
   * Vérifier et débloquer les achievements possibles
   */
  static async checkAndUnlockAchievements(pool, userId, context = {}) {
    const unlockedAchievements = [];

    try {
      // Vérifier les achievements basés sur le contexte
      const { quizScore, totalQuizzes, chatMessages, userRank, isWeeklyActive } = context;

      // Achievement: Premier Quiz
      if (quizScore !== undefined && totalQuizzes === 1) {
        const unlocked = await this.unlockAchievement(pool, userId, ACHIEVEMENTS.FIRST_QUIZ.id);
        if (unlocked) unlockedAchievements.push(ACHIEVEMENTS.FIRST_QUIZ);
      }

      // Achievement: Score Parfait
      if (quizScore === 100) {
        const unlocked = await this.unlockAchievement(pool, userId, ACHIEVEMENTS.PERFECT_SCORE.id);
        if (unlocked) unlockedAchievements.push(ACHIEVEMENTS.PERFECT_SCORE);
      }

      // Achievement: Top 10
      if (userRank && userRank <= 10) {
        const unlocked = await this.unlockAchievement(pool, userId, ACHIEVEMENTS.TOP_10.id);
        if (unlocked) unlockedAchievements.push(ACHIEVEMENTS.TOP_10);
      }

      // Achievement: Top 5
      if (userRank && userRank <= 5) {
        const unlocked = await this.unlockAchievement(pool, userId, ACHIEVEMENTS.TOP_5.id);
        if (unlocked) unlockedAchievements.push(ACHIEVEMENTS.TOP_5);
      }

      // Achievement: Champion
      if (userRank === 1) {
        const unlocked = await this.unlockAchievement(pool, userId, ACHIEVEMENTS.CHAMPION.id);
        if (unlocked) unlockedAchievements.push(ACHIEVEMENTS.CHAMPION);
      }

      // Achievement: Maître du Chat
      if (chatMessages && chatMessages >= 100) {
        const unlocked = await this.unlockAchievement(pool, userId, ACHIEVEMENTS.CHAT_MASTER.id);
        if (unlocked) unlockedAchievements.push(ACHIEVEMENTS.CHAT_MASTER);
      }

      // Achievement: Semaine Active
      if (isWeeklyActive) {
        const unlocked = await this.unlockAchievement(pool, userId, ACHIEVEMENTS.WEEK_ACTIVE.id);
        if (unlocked) unlockedAchievements.push(ACHIEVEMENTS.WEEK_ACTIVE);
      }

      return unlockedAchievements;
    } catch (error) {
      console.error('Error checking achievements:', error);
      return unlockedAchievements;
    }
  }

  /**
   * Débloquer un achievement
   */
  static async unlockAchievement(pool, userId, achievementId) {
    try {
      // Vérifier si déjà débloqué
      const check = await pool.query(
        `SELECT id FROM achievements_unlocked 
         WHERE user_id = $1 AND achievement_id = $2`,
        [userId, achievementId]
      );

      if (check.rows.length > 0) return false;

      // Débloquer
      await pool.query(
        `INSERT INTO achievements_unlocked (user_id, achievement_id, unlocked_at)
         VALUES ($1, $2, NOW())`,
        [userId, achievementId]
      );

      // Ajouter les points
      const achievement = Object.values(ACHIEVEMENTS).find(a => a.id === achievementId);
      if (achievement) {
        await pool.query(
          `UPDATE users SET achievement_points = COALESCE(achievement_points, 0) + $1
           WHERE id = $2`,
          [achievement.points, userId]
        );
      }

      return true;
    } catch (error) {
      console.error('Error unlocking achievement:', error);
      return false;
    }
  }

  /**
   * Obtenir les achievements débloqués d'un utilisateur
   */
  static async getUserAchievements(pool, userId) {
    try {
      const result = await pool.query(
        `SELECT achievement_id, unlocked_at FROM achievements_unlocked 
         WHERE user_id = $1 
         ORDER BY unlocked_at DESC`,
        [userId]
      );

      return result.rows.map(row => {
        const achievement = Object.values(ACHIEVEMENTS).find(a => a.id === row.achievement_id);
        return {
          ...achievement,
          unlockedAt: row.unlocked_at
        };
      });
    } catch (error) {
      console.error('Error fetching user achievements:', error);
      return [];
    }
  }

  /**
   * Obtenir les statistiques des achievements
   */
  static async getAchievementStats(pool, userId) {
    try {
      const result = await pool.query(
        `SELECT COUNT(*) as total, SUM(COALESCE(a.points, 0)) as total_points
         FROM achievements_unlocked au
         LEFT JOIN (
           SELECT id, 
                  CASE 
                    WHEN achievement_id = $1 THEN 10
                    WHEN achievement_id = $2 THEN 50
                    WHEN achievement_id = $3 THEN 75
                    WHEN achievement_id = $4 THEN 150
                    WHEN achievement_id = $5 THEN 200
                    WHEN achievement_id = $6 THEN 40
                    ELSE 30
                  END as points
           FROM achievements_unlocked
         ) a ON au.achievement_id = a.id
         WHERE au.user_id = $6`,
        [
          ACHIEVEMENTS.FIRST_QUIZ.id,
          ACHIEVEMENTS.PERFECT_SCORE.id,
          ACHIEVEMENTS.TOP_10.id,
          ACHIEVEMENTS.TOP_5.id,
          ACHIEVEMENTS.CHAMPION.id,
          userId
        ]
      );

      const row = result.rows[0];
      return {
        totalUnlocked: parseInt(row.total) || 0,
        totalPoints: parseInt(row.total_points) || 0,
        availableCount: Object.keys(ACHIEVEMENTS).length
      };
    } catch (error) {
      console.error('Error fetching achievement stats:', error);
      return { totalUnlocked: 0, totalPoints: 0, availableCount: Object.keys(ACHIEVEMENTS).length };
    }
  }
}

export function registerAchievementRoutes(app, pool) {
  /**
   * GET /api/achievements/user/:userId - Récupérer les achievements d'un utilisateur
   */
  app.get('/api/achievements/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const achievements = await AchievementService.getUserAchievements(pool, userId);
      const stats = await AchievementService.getAchievementStats(pool, userId);
      
      res.json({
        achievements,
        stats,
        availableAchievements: Object.values(ACHIEVEMENTS)
      });
    } catch (error) {
      console.error('Error fetching achievements:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/achievements/leaderboard - Leaderboard des achievements
   */
  app.get('/api/achievements/leaderboard', async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 50, 100);
      
      const result = await pool.query(
        `SELECT user_id, COUNT(*) as achievements_count, COUNT(*) * 10 as estimated_points
         FROM achievements_unlocked 
         GROUP BY user_id 
         ORDER BY achievements_count DESC 
         LIMIT $1`,
        [limit]
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching achievements leaderboard:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}
