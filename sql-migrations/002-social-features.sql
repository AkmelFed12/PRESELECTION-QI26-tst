-- ==================== SOCIAL FEATURES TABLES ====================
-- Date: April 20, 2026
-- Purpose: Add user profiles, messaging, leaderboards, and achievements

-- 1. User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  candidate_id VARCHAR(20) UNIQUE NOT NULL REFERENCES candidates(code),
  bio TEXT DEFAULT '' CONSTRAINT bio_max_length CHECK (LENGTH(bio) <= 500),
  avatar_url VARCHAR(500),
  website VARCHAR(200),
  location VARCHAR(100),
  joined_at TIMESTAMP DEFAULT NOW(),
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_candidate_id ON user_profiles(candidate_id);

-- 2. User Following/Followers Table
CREATE TABLE IF NOT EXISTS user_followers (
  id SERIAL PRIMARY KEY,
  follower_id INTEGER NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  following_id INTEGER NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

CREATE INDEX idx_followers_follower ON user_followers(follower_id);
CREATE INDEX idx_followers_following ON user_followers(following_id);

-- 3. Direct Messages Table
CREATE TABLE IF NOT EXISTS direct_messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  recipient_id INTEGER NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CONSTRAINT message_max_length CHECK (LENGTH(content) <= 1000),
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_messages_sender ON direct_messages(sender_id);
CREATE INDEX idx_messages_recipient ON direct_messages(recipient_id);
CREATE INDEX idx_messages_conversation ON direct_messages(sender_id, recipient_id);
CREATE INDEX idx_messages_created_at ON direct_messages(created_at DESC);

-- 4. Leaderboard Table
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
  candidate_id VARCHAR(20) REFERENCES candidates(code),
  rank INTEGER,
  score DECIMAL(10, 2) DEFAULT 0,
  votes_count INTEGER DEFAULT 0,
  profile_views INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_leaderboard_rank ON leaderboard_entries(rank);
CREATE INDEX idx_leaderboard_score ON leaderboard_entries(score DESC);

-- 5. Achievements/Badges Table
CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon_url VARCHAR(500),
  icon_emoji VARCHAR(10),
  category VARCHAR(50), -- 'social', 'engagement', 'milestone', 'special'
  criteria_type VARCHAR(50), -- 'followers', 'messages', 'votes', 'views', 'special'
  criteria_value INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. User Achievements Table
CREATE TABLE IF NOT EXISTS user_achievements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_achievement ON user_achievements(achievement_id);

-- ==================== SEED ACHIEVEMENTS ====================

INSERT INTO achievements (name, description, icon_emoji, category, criteria_type, criteria_value)
VALUES
  ('Nouvel Arrivant', 'Créez votre profil', '🎉', 'milestone', 'special', 1),
  ('Social Butterfly', 'Obtenez 10 followers', '🦋', 'social', 'followers', 10),
  ('Très Populaire', 'Obtenez 50 followers', '⭐', 'social', 'followers', 50),
  ('Légende', 'Obtenez 100 followers', '👑', 'social', 'followers', 100),
  ('Communicateur', 'Envoyez 10 messages', '💬', 'engagement', 'messages', 10),
  ('Grand Orateur', 'Envoyez 50 messages', '🎤', 'engagement', 'messages', 50),
  ('Votant Actif', 'Recevez 10 votes', '✅', 'engagement', 'votes', 10),
  ('Célébrité', 'Recevez 50 votes', '🌟', 'engagement', 'votes', 50),
  ('Curieux', 'Obtenez 100 vues de profil', '👀', 'engagement', 'views', 100),
  ('Classé', 'Entrez dans le top 100 du classement', '🏆', 'milestone', 'special', 0),
  ('Au Sommet', 'Entrez dans le top 10 du classement', '🥇', 'milestone', 'special', 0)
ON CONFLICT (name) DO NOTHING;

-- ==================== INDEXES FOR PERFORMANCE ====================

CREATE INDEX IF NOT EXISTS idx_direct_messages_unread 
  ON direct_messages(recipient_id, read_at) 
  WHERE read_at IS NULL;

-- ==================== MIGRATION COMPLETE ====================
