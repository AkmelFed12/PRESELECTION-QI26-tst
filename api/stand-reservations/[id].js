const { Pool } = require('pg');

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { id } = req.query;

  // Verify admin
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== 'Bearer admin-secret-key') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'DELETE') {
    try {
      try {
        await pool.query('DELETE FROM stand_reservations WHERE id = $1', [id]);
        res.json({ message: 'Réservation supprimée avec succès' });
      } catch (dbError) {
        console.log('Database error, using in-memory fallback:', dbError.message);
        
        // In-memory fallback for Vercel serverless
        if (global.standReservations) {
          global.standReservations = global.standReservations.filter(r => r.id !== parseInt(id));
        }
        res.json({ message: 'Réservation supprimée avec succès (mémoire)' });
      }
    } catch (error) {
      console.error('Error deleting reservation:', error);
      res.status(500).json({ error: 'Erreur serveur lors de la suppression' });
    }
  } else if (req.method === 'PATCH') {
    try {
      const { receipt_verified, status, payment_confirmed } = req.body;
      
      try {
        const result = await pool.query(
          'UPDATE stand_reservations SET receipt_verified = COALESCE($1, receipt_verified), status = COALESCE($2, status), payment_confirmed = COALESCE($3, payment_confirmed) WHERE id = $4 RETURNING *',
          [receipt_verified, status, payment_confirmed, id]
        );
        res.json({ message: 'Réservation mise à jour', reservation: result.rows[0] });
      } catch (dbError) {
        console.log('Database error, using in-memory fallback:', dbError.message);
        
        // In-memory fallback for Vercel serverless
        if (global.standReservations) {
          const reservation = global.standReservations.find(r => r.id === parseInt(id));
          if (reservation) {
            if (receipt_verified !== undefined) reservation.receipt_verified = receipt_verified;
            if (status !== undefined) reservation.status = status;
            if (payment_confirmed !== undefined) reservation.payment_confirmed = payment_confirmed;
          }
        }
        res.json({ message: 'Réservation mise à jour (mémoire)' });
      }
    } catch (error) {
      console.error('Error updating reservation:', error);
      res.status(500).json({ error: 'Erreur serveur lors de la mise à jour' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
