/**
 * Service d'Export de Rapports
 * Gère la génération et export de rapports PDF/CSV
 */

import PDFDocument from 'pdfkit';

export class ReportsService {
  /**
   * Générer un rapport utilisateur
   */
  static async generateUserReport(pool, userId, format = 'pdf') {
    try {
      // Récupérer les données utilisateur
      const userResult = await pool.query(
        `SELECT id, email, nom, prenom, date_inscription 
         FROM users WHERE id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Récupérer les scores de quiz
      const scoresResult = await pool.query(
        `SELECT quiz_id, score, passed, date_quiz 
         FROM quiz_scores WHERE user_id = $1 
         ORDER BY date_quiz DESC`,
        [userId]
      );

      // Récupérer les achievements
      const achievementsResult = await pool.query(
        `SELECT achievement_id, unlocked_at 
         FROM achievements_unlocked WHERE user_id = $1 
         ORDER BY unlocked_at DESC`,
        [userId]
      );

      // Récupérer les statistiques
      const statsResult = await pool.query(
        `SELECT 
          COUNT(DISTINCT quiz_id) as quiz_count,
          AVG(score) as avg_score,
          MAX(score) as max_score,
          COUNT(CASE WHEN passed = true THEN 1 END) as passed_count
         FROM quiz_scores WHERE user_id = $1`,
        [userId]
      );

      const stats = statsResult.rows[0];

      if (format === 'pdf') {
        return this.generatePDFReport(user, scoresResult.rows, achievementsResult.rows, stats);
      } else if (format === 'csv') {
        return this.generateCSVReport(user, scoresResult.rows, achievementsResult.rows, stats);
      } else if (format === 'json') {
        return {
          user,
          scores: scoresResult.rows,
          achievements: achievementsResult.rows,
          statistics: stats
        };
      }
    } catch (error) {
      console.error('Error generating user report:', error);
      throw error;
    }
  }

  /**
   * Générer un rapport PDF
   */
  static generatePDFReport(user, scores, achievements, stats) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => {
          resolve(Buffer.concat(chunks));
        });

        // Titre
        doc.fontSize(20).text('Rapport Personnel', { align: 'center' });
        doc.moveDown();

        // Informations utilisateur
        doc.fontSize(14).text('Informations Personnelles', { underline: true });
        doc.fontSize(11);
        doc.text(`Nom: ${user.prenom} ${user.nom}`);
        doc.text(`Email: ${user.email}`);
        doc.text(`Date d'inscription: ${new Date(user.date_inscription).toLocaleDateString()}`);
        doc.moveDown();

        // Statistiques
        doc.fontSize(14).text('Statistiques', { underline: true });
        doc.fontSize(11);
        doc.text(`Nombre de Quiz: ${stats.quiz_count || 0}`);
        doc.text(`Score Moyen: ${(stats.avg_score || 0).toFixed(2)}%`);
        doc.text(`Score Maximum: ${stats.max_score || 0}%`);
        doc.text(`Quiz Réussis: ${stats.passed_count || 0}`);
        doc.moveDown();

        // Historique des quiz
        if (scores.length > 0) {
          doc.fontSize(14).text('Historique des Quiz', { underline: true });
          doc.fontSize(10);
          
          scores.forEach((score, index) => {
            doc.text(`${index + 1}. Quiz #${score.quiz_id}: ${score.score}% - ${score.passed ? '✓ Réussi' : '✗ Échoué'}`);
          });
          doc.moveDown();
        }

        // Achievements
        if (achievements.length > 0) {
          doc.fontSize(14).text('Achievements Débloqués', { underline: true });
          doc.fontSize(10);
          
          achievements.forEach((ach, index) => {
            doc.text(`${index + 1}. ${ach.achievement_id} - ${new Date(ach.unlocked_at).toLocaleDateString()}`);
          });
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Générer un rapport CSV
   */
  static generateCSVReport(user, scores, achievements, stats) {
    let csv = 'Rapport Personnel\n\n';
    
    csv += 'Informations Personnelles\n';
    csv += `Nom,${user.prenom} ${user.nom}\n`;
    csv += `Email,${user.email}\n`;
    csv += `Date d'inscription,${new Date(user.date_inscription).toLocaleDateString()}\n\n`;

    csv += 'Statistiques\n';
    csv += `Nombre de Quiz,${stats.quiz_count || 0}\n`;
    csv += `Score Moyen,${(stats.avg_score || 0).toFixed(2)}%\n`;
    csv += `Score Maximum,${stats.max_score || 0}%\n`;
    csv += `Quiz Réussis,${stats.passed_count || 0}\n\n`;

    if (scores.length > 0) {
      csv += 'Historique des Quiz\n';
      csv += 'Quiz ID,Score,Statut,Date\n';
      scores.forEach(score => {
        csv += `${score.quiz_id},${score.score}%,${score.passed ? 'Réussi' : 'Échoué'},${new Date(score.date_quiz).toLocaleDateString()}\n`;
      });
    }

    csv += '\n';

    if (achievements.length > 0) {
      csv += 'Achievements Débloqués\n';
      csv += 'Achievement ID,Date de Déblocage\n';
      achievements.forEach(ach => {
        csv += `${ach.achievement_id},${new Date(ach.unlocked_at).toLocaleDateString()}\n`;
      });
    }

    return csv;
  }

  /**
   * Générer un rapport d'administration
   */
  static async generateAdminReport(pool, startDate, endDate) {
    try {
      const report = {};

      // Statistiques globales
      const globalStats = await pool.query(
        `SELECT 
          COUNT(DISTINCT user_id) as total_users,
          COUNT(*) as total_quiz_attempts,
          AVG(score) as avg_score,
          MAX(score) as max_score
         FROM quiz_scores 
         WHERE date_quiz BETWEEN $1 AND $2`,
        [startDate, endDate]
      );

      report.globalStatistics = globalStats.rows[0];

      // Utilisateurs actifs
      const activeUsers = await pool.query(
        `SELECT user_id, COUNT(*) as attempt_count, AVG(score) as avg_score
         FROM quiz_scores 
         WHERE date_quiz BETWEEN $1 AND $2
         GROUP BY user_id
         ORDER BY attempt_count DESC
         LIMIT 10`,
        [startDate, endDate]
      );

      report.topActiveUsers = activeUsers.rows;

      // Taux de réussite
      const successRate = await pool.query(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN passed = true THEN 1 END) as passed,
          ROUND(100.0 * COUNT(CASE WHEN passed = true THEN 1 END) / COUNT(*), 2) as pass_rate
         FROM quiz_scores 
         WHERE date_quiz BETWEEN $1 AND $2`,
        [startDate, endDate]
      );

      report.successMetrics = successRate.rows[0];

      return report;
    } catch (error) {
      console.error('Error generating admin report:', error);
      throw error;
    }
  }
}

export function registerReportRoutes(app, pool) {
  /**
   * GET /api/reports/user/:userId?format=pdf|csv|json
   */
  app.get('/api/reports/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const format = req.query.format || 'pdf';

      const report = await ReportsService.generateUserReport(pool, userId, format);

      if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="rapport-${userId}.pdf"`);
        res.send(report);
      } else if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="rapport-${userId}.csv"`);
        res.send(report);
      } else {
        res.json(report);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/reports/admin - Rapport d'administration
   */
  app.get('/api/reports/admin', async (req, res) => {
    try {
      const startDate = req.query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate || new Date();

      const report = await ReportsService.generateAdminReport(pool, startDate, endDate);
      res.json(report);
    } catch (error) {
      console.error('Error generating admin report:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}
