-- Stand Reservations Table
-- This table stores reservations for stands at the Quiz Islamique 2026 event

CREATE TABLE IF NOT EXISTS stand_reservations (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(255) NOT NULL,
  telephone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  activite VARCHAR(100) NOT NULL,
  nom_activite VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  besoins TEXT,
  payment_confirmed BOOLEAN DEFAULT FALSE,
  receipt TEXT,
  receipt_verified BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'en_attente',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_stand_reservations_created_at ON stand_reservations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stand_reservations_status ON stand_reservations(status);
