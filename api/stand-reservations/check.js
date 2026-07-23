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

  if (req.method === 'POST') {
    try {
      const { telephone, email } = req.body;
      
      try {
        const result = await pool.query(`
          SELECT * FROM stand_reservations 
          WHERE telephone = $1 OR ($2 IS NOT NULL AND email = $2)
          LIMIT 1
        `, [telephone, email || null]);
        
        res.json({ exists: result.rows.length > 0 });
      } catch (dbError) {
        console.log('Database error, using in-memory fallback:', dbError.message);
        
        // In-memory fallback for Vercel serverless
        const reservations = global.standReservations || [];
        const exists = reservations.some(r => 
          r.telephone === telephone || (email && r.email === email)
        );
        res.json({ exists });
      }
    } catch (error) {
      console.error('Error checking reservation:', error);
      res.status(500).json({ error: 'Erreur serveur lors de la vérification' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
