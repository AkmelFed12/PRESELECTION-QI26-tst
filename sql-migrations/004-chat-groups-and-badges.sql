-- SQL MIGRATION 004: Real-time Chat Groups & Dynamic Badges System
-- Phase 3: Interactive Features

-- ========== CHAT GROUPS TABLES ==========

CREATE TABLE IF NOT EXISTS chat_groups (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'public' CHECK (type IN ('public', 'private', 'invite-only')),
  topic TEXT DEFAULT 'general',
  created_by BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  avatar_url TEXT,
  members_count INTEGER DEFAULT 1,
  is_archived INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_group_members (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('creator', 'admin', 'moderator', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  muted INTEGER DEFAULT 0,
  notifications_enabled INTEGER DEFAULT 1,
  UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  author_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT, -- 'image', 'file', 'link'
  is_pinned INTEGER DEFAULT 0,
  is_edited INTEGER DEFAULT 0,
  reactions_count INTEGER DEFAULT 0,
  reply_to_id BIGINT REFERENCES chat_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_reactions (
  id BIGSERIAL PRIMARY KEY,
  message_id BIGINT NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS typing_indicators (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  is_typing INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- ========== DYNAMIC BADGES TABLES ==========

CREATE TABLE IF NOT EXISTS badge_templates (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  emoji TEXT NOT NULL,
  icon_url TEXT,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'achievement', 'milestone', 'special', 'seasonal')),
  requirement_type TEXT NOT NULL, -- 'quiz_count', 'score', 'streak', 'social', 'community'
  requirement_value INTEGER,
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'legendary')),
  points_reward INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_badges (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  badge_id BIGINT NOT NULL REFERENCES badge_templates(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  progress INTEGER DEFAULT 100,
  displayed_on_profile INTEGER DEFAULT 1,
  UNIQUE(user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS badge_progress (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  badge_id BIGINT NOT NULL REFERENCES badge_templates(id) ON DELETE CASCADE,
  current_progress INTEGER DEFAULT 0,
  target_value INTEGER NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- ========== INDEXES FOR PERFORMANCE ==========

CREATE INDEX IF NOT EXISTS idx_chat_groups_creator ON chat_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_groups_type ON chat_groups(type);
CREATE INDEX IF NOT EXISTS idx_chat_groups_topic ON chat_groups(topic);
CREATE INDEX IF NOT EXISTS idx_chat_groups_created ON chat_groups(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_group_members_group ON chat_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_chat_group_members_user ON chat_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_group_members_role ON chat_group_members(role);
CREATE INDEX IF NOT EXISTS idx_chat_group_members_joined ON chat_group_members(joined_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_group ON chat_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_author ON chat_messages(author_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_pinned ON chat_messages(is_pinned);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply ON chat_messages(reply_to_id);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_emoji ON message_reactions(emoji);

CREATE INDEX IF NOT EXISTS idx_typing_indicators_group ON typing_indicators(group_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_user ON typing_indicators(user_id);

CREATE INDEX IF NOT EXISTS idx_badge_templates_category ON badge_templates(category);
CREATE INDEX IF NOT EXISTS idx_badge_templates_rarity ON badge_templates(rarity);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_unlocked ON user_badges(unlocked_at DESC);

CREATE INDEX IF NOT EXISTS idx_badge_progress_user ON badge_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_badge_progress_updated ON badge_progress(last_updated DESC);

-- ========== VIEWS ==========

-- Active chat groups with member count
CREATE OR REPLACE VIEW active_chat_groups AS
SELECT 
  cg.id,
  cg.name,
  cg.description,
  cg.type,
  cg.topic,
  cg.avatar_url,
  cg.created_by,
  COUNT(DISTINCT cgm.user_id) as member_count,
  COUNT(DISTINCT cm.id) as message_count,
  MAX(cm.created_at) as last_message_at,
  cg.created_at
FROM chat_groups cg
LEFT JOIN chat_group_members cgm ON cg.id = cgm.group_id
LEFT JOIN chat_messages cm ON cg.id = cm.group_id
WHERE cg.is_archived = 0
GROUP BY cg.id, cg.name, cg.description, cg.type, cg.topic, cg.avatar_url, cg.created_by, cg.created_at
ORDER BY MAX(cm.created_at) DESC;

-- User badge progress overview
CREATE OR REPLACE VIEW user_badge_overview AS
SELECT 
  up.id as user_id,
  COUNT(DISTINCT ub.id) as badges_unlocked,
  COUNT(DISTINCT bt.id) as badges_total,
  COALESCE(SUM(bt.points_reward), 0) as total_badge_points,
  MAX(ub.unlocked_at) as last_badge_unlocked
FROM user_profiles up
LEFT JOIN user_badges ub ON up.id = ub.user_id
LEFT JOIN badge_templates bt ON ub.badge_id = bt.id
LEFT JOIN badge_templates bt2 ON 1=1
GROUP BY up.id;

-- ========== PRE-POPULATION: BADGE TEMPLATES ==========

INSERT INTO badge_templates (name, description, emoji, category, requirement_type, requirement_value, rarity, points_reward, display_order)
VALUES
  ('Quiz Starter', 'Take your first quiz', '🎯', 'milestone', 'quiz_count', 1, 'common', 10, 1),
  ('Quiz Enthusiast', 'Complete 10 quizzes', '📝', 'milestone', 'quiz_count', 10, 'uncommon', 50, 2),
  ('Quiz Master', 'Complete 100 quizzes', '🏆', 'achievement', 'quiz_count', 100, 'rare', 200, 3),
  ('Perfect Score', 'Score 100% on 5 quizzes', '⭐', 'achievement', 'score', 100, 'uncommon', 100, 4),
  ('Week Warrior', 'Take quizzes 7 days in a row', '🔥', 'streak', 'streak', 7, 'rare', 150, 5),
  ('Social Butterfly', 'Follow 50 users', '🦋', 'social', 'social', 50, 'uncommon', 75, 6),
  ('Community Helper', 'Get 100 message reactions', '💬', 'community', 'community', 100, 'uncommon', 80, 7),
  ('Knowledge Seeker', 'Join 5 study groups', '📚', 'community', 'community', 5, 'uncommon', 60, 8),
  ('Generous Soul', 'Give 50 gift points', 'user_id', 'special', 'community', 50, 'rare', 120, 9),
  ('Night Owl', 'Take 10 quizzes between 10pm-6am', '🌙', 'special', 'streak', 10, 'uncommon', 90, 10),
  ('Speed Runner', 'Complete 5 quizzes under 2 minutes each', '⚡', 'achievement', 'score', 5, 'rare', 130, 11),
  ('Ranking Master', 'Reach top 10 in monthly leaderboard', '🏅', 'achievement', 'score', 10, 'rare', 180, 12),
  ('First Steps', 'Complete profile setup', '👣', 'milestone', 'quiz_count', 0, 'common', 5, 0),
  ('Team Player', 'Participate in a group quiz challenge', '🤝', 'community', 'community', 1, 'uncommon', 70, 13),
  ('Legend', 'Achieve Rank 1 on leaderboard for a month', '👑', 'special', 'score', 1, 'legendary', 500, 99);

-- ========== ALTER EXISTING TABLES ==========

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS chat_groups_joined_count INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS chat_messages_count INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS badges_unlocked_count INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS badge_points_total INTEGER DEFAULT 0;

-- ========== AUTO-UPDATE TRIGGERS (Optional - for PostgreSQL) ==========

-- Update members_count when member joins/leaves
CREATE OR REPLACE FUNCTION update_group_members_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE chat_groups SET members_count = members_count + 1 WHERE id = NEW.group_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE chat_groups SET members_count = GREATEST(members_count - 1, 1) WHERE id = OLD.group_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_group_members_count
AFTER INSERT OR DELETE ON chat_group_members
FOR EACH ROW
EXECUTE FUNCTION update_group_members_count();

-- Update user's total badge points when badge unlocked
CREATE OR REPLACE FUNCTION update_user_badge_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles
  SET 
    badges_unlocked_count = (SELECT COUNT(*) FROM user_badges WHERE user_id = NEW.user_id),
    badge_points_total = COALESCE((SELECT SUM(bt.points_reward) FROM user_badges ub JOIN badge_templates bt ON ub.badge_id = bt.id WHERE ub.user_id = NEW.user_id), 0)
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_badge_stats
AFTER INSERT ON user_badges
FOR EACH ROW
EXECUTE FUNCTION update_user_badge_stats();

-- ========== SEED DATA ==========

-- Pre-populate user badge progress for existing users
INSERT INTO badge_progress (user_id, badge_id, current_progress, target_value)
SELECT up.id, bt.id, 0, COALESCE(bt.requirement_value, 1)
FROM user_profiles up
CROSS JOIN badge_templates bt
ON CONFLICT DO NOTHING;
