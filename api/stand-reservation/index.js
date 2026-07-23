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
      const { nom, telephone, email, activite, nom_activite, description, besoins, paymentConfirmed, receipt } = req.body;
      
      if (!nom || !telephone || !activite || !nom_activite || !description) {
        return res.status(400).json({ error: 'Champs obligatoires manquants' });
      }

      try {
        const result = await pool.query(`
          INSERT INTO stand_reservations 
          (nom, telephone, email, activite, nom_activite, description, besoins, payment_confirmed, receipt, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          RETURNING *
        `, [nom, telephone, email || null, activite, nom_activite, description, besoins || null, paymentConfirmed || false, receipt || null]);

        res.json({ message: 'Réservation créée avec succès', reservation: result.rows[0] });
      } catch (dbError) {
        console.log('Database error, using in-memory fallback:', dbError.message);
        
        // In-memory fallback for Vercel serverless
        if (!global.standReservations) {
          global.standReservations = [];
        }
        
        const newReservation = {
          id: Date.now(),
          nom,
          telephone,
          email: email || null,
          activite,
          nom_activite,
          description,
          besoins: besoins || null,
          payment_confirmed: paymentConfirmed || false,
          receipt: receipt || null,
          created_at: new Date().toISOString()
        };
        
        global.standReservations.push(newReservation);
        
        res.json({ message: 'Réservation créée avec succès (mémoire)', reservation: newReservation });
      }
    } catch (error) {
      console.error('Error creating stand reservation:', error);
      res.status(500).json({ error: 'Erreur serveur lors de la création de la réservation' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
