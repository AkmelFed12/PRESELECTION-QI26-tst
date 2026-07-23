const { Pool } = require('pg');

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Simple admin verification (in production, use proper auth)
function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader === 'Bearer admin-secret-key') {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

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

  if (req.method === 'GET') {
    try {
      // Verify admin
      const authHeader = req.headers.authorization;
      if (!authHeader || authHeader !== 'Bearer admin-secret-key') {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      try {
        const result = await pool.query(`
          SELECT * FROM stand_reservations 
          ORDER BY created_at DESC
        `);
        res.json(result.rows);
      } catch (dbError) {
        console.log('Database error, using in-memory fallback:', dbError.message);
        
        // In-memory fallback for Vercel serverless
        const reservations = global.standReservations || [];
        res.json(reservations);
      }
    } catch (error) {
      console.error('Error fetching stand reservations:', error);
      res.status(500).json({ error: 'Erreur serveur lors de la récupération des réservations' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
