/**
 * Service de Notifications en Temps Réel
 * Gère les notifications utilisateur avec WebSocket
 */

const notificationSubscribers = new Map(); // userId -> Set of WebSocket connections

export class NotificationService {
  /**
   * Enregistrer une connexion WebSocket pour les notifications
   */
  static subscribe(userId, ws) {
    if (!notificationSubscribers.has(userId)) {
      notificationSubscribers.set(userId, new Set());
    }
    notificationSubscribers.get(userId).add(ws);
    
    ws.on('close', () => {
      const subscribers = notificationSubscribers.get(userId);
      if (subscribers) {
        subscribers.delete(ws);
        if (subscribers.size === 0) {
          notificationSubscribers.delete(userId);
        }
      }
    });
  }

  /**
   * Envoyer une notification à un utilisateur
   */
  static notifyUser(userId, notification) {
    const subscribers = notificationSubscribers.get(userId);
    if (subscribers && subscribers.size > 0) {
      const message = JSON.stringify({
        type: 'notification',
        timestamp: new Date().toISOString(),
        ...notification
      });
      
      subscribers.forEach(ws => {
        if (ws.readyState === 1) { // WebSocket.OPEN
          ws.send(message);
        }
      });
      return true;
    }
    return false;
  }

  /**
   * Envoyer une notification broadcast
   */
  static broadcastNotification(notification, excludeUserId = null) {
    let count = 0;
    notificationSubscribers.forEach((subscribers, userId) => {
      if (userId !== excludeUserId) {
        const message = JSON.stringify({
          type: 'broadcast',
          timestamp: new Date().toISOString(),
          ...notification
        });
        
        subscribers.forEach(ws => {
          if (ws.readyState === 1) {
            ws.send(message);
            count++;
          }
        });
      }
    });
    return count;
  }

  /**
   * Obtenir le nombre de notifications actives
   */
  static getActiveConnections(userId) {
    return notificationSubscribers.get(userId)?.size || 0;
  }

  /**
   * Envoyer une notification avec persistance en base de données
   */
  static async persistNotification(pool, userId, title, message, type = 'info', metadata = {}) {
    try {
      const result = await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, metadata, created_at, read_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NULL)
         RETURNING id`,
        [userId, title, message, type, JSON.stringify(metadata)]
      );
      
      // Envoyer en temps réel
      this.notifyUser(userId, {
        id: result.rows[0].id,
        title,
        message,
        type,
        metadata
      });
      
      return result.rows[0];
    } catch (error) {
      console.error('Error persisting notification:', error);
      throw error;
    }
  }
}

export function registerNotificationRoutes(app, pool) {
  /**
   * GET /api/notifications - Récupérer les notifications de l'utilisateur
   */
  app.get('/api/notifications', async (req, res) => {
    try {
      const userId = req.query.userId;
      if (!userId) return res.status(400).json({ error: 'userId required' });

      const result = await pool.query(
        `SELECT * FROM notifications 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT 50`,
        [userId]
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * POST /api/notifications/:id/read - Marquer une notification comme lue
   */
  app.post('/api/notifications/:id/read', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `UPDATE notifications 
         SET read_at = NOW() 
         WHERE id = $1 
         RETURNING *`,
        [id]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * DELETE /api/notifications/:id - Supprimer une notification
   */
  app.delete('/api/notifications/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM notifications WHERE id = $1', [id]);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}
