-- Migration: Create achievements tables
CREATE TABLE IF NOT EXISTS achievements_unlocked (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  achievement_id VARCHAR(100) NOT NULL,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, achievement_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add achievement_points column to users if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS achievement_points INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_achievements_unlocked_user_id ON achievements_unlocked(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_unlocked_achievement_id ON achievements_unlocked(achievement_id);
