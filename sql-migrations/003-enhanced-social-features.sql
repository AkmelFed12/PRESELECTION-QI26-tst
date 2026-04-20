-- ==================== ENHANCED SOCIAL FEATURES ====================
-- Date: April 20, 2026
-- Purpose: Add notifications, stories, activity feeds, profile improvements

-- 1. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  recipient_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  sender_id BIGINT REFERENCES user_profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL, -- 'follow', 'message', 'achievement', 'mention', 'like', 'comment'
  title TEXT NOT NULL,
  message TEXT,
  related_id BIGINT, -- ID of related object (message, achievement, etc)
  related_type TEXT, -- 'message', 'achievement', 'profile'
  is_read INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);

-- 2. STORIES/ACTIVITY FEED TABLE
CREATE TABLE IF NOT EXISTS user_stories (
  id BIGSERIAL PRIMARY KEY,
  author_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  visibility TEXT DEFAULT 'public', -- 'public', 'followers', 'private'
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_stories_author ON user_stories(author_id);
CREATE INDEX idx_stories_created ON user_stories(created_at DESC);
CREATE INDEX idx_stories_expires ON user_stories(expires_at);
CREATE INDEX idx_stories_visibility ON user_stories(visibility);

-- 3. STORY LIKES TABLE
CREATE TABLE IF NOT EXISTS story_likes (
  id BIGSERIAL PRIMARY KEY,
  story_id BIGINT NOT NULL REFERENCES user_stories(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(story_id, user_id)
);

CREATE INDEX idx_story_likes_story ON story_likes(story_id);
CREATE INDEX idx_story_likes_user ON story_likes(user_id);

-- 4. STORY COMMENTS TABLE
CREATE TABLE IF NOT EXISTS story_comments (
  id BIGSERIAL PRIMARY KEY,
  story_id BIGINT NOT NULL REFERENCES user_stories(id) ON DELETE CASCADE,
  author_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CONSTRAINT comment_max_length CHECK (LENGTH(content) <= 500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_story_comments_story ON story_comments(story_id);
CREATE INDEX idx_story_comments_author ON story_comments(author_id);

-- 5. PROFILE VIEWS TRACKING
CREATE TABLE IF NOT EXISTS profile_views (
  id BIGSERIAL PRIMARY KEY,
  profile_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  visitor_id BIGINT REFERENCES user_profiles(id) ON DELETE SET NULL,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_profile_views_profile ON profile_views(profile_id);
CREATE INDEX idx_profile_views_visitor ON profile_views(visitor_id);
CREATE INDEX idx_profile_views_created ON profile_views(created_at DESC);

-- 6. USER INTERESTS/PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS user_preferences (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
  interests TEXT[], -- Array of interests for recommendations
  notification_settings TEXT, -- JSON settings for different notification types
  privacy_level TEXT DEFAULT 'public', -- 'public', 'followers_only', 'private'
  show_online_status INTEGER DEFAULT 1,
  allow_messages INTEGER DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_preferences_user ON user_preferences(user_id);

-- 7. SEARCH HISTORY TABLE
CREATE TABLE IF NOT EXISTS search_history (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  query_type TEXT DEFAULT 'user', -- 'user', 'achievement', 'tag'
  result_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_search_history_user ON search_history(user_id);
CREATE INDEX idx_search_history_created ON search_history(created_at DESC);

-- 8. USER RECOMMENDATIONS TABLE
CREATE TABLE IF NOT EXISTS user_recommendations (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  recommended_user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  reason TEXT, -- 'mutual_followers', 'similar_interests', 'trending'
  score REAL DEFAULT 0.0,
  viewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, recommended_user_id)
);

CREATE INDEX idx_recommendations_user ON user_recommendations(user_id);
CREATE INDEX idx_recommendations_score ON user_recommendations(score DESC);

-- 9. MESSAGE REACTIONS TABLE (enhance direct messages)
CREATE TABLE IF NOT EXISTS message_reactions (
  id BIGSERIAL PRIMARY KEY,
  message_id BIGINT NOT NULL REFERENCES direct_messages(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL, -- '👍', '❤️', '😂', etc
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX idx_message_reactions_message ON message_reactions(message_id);

-- 10. PROFILE BADGES/ROLES TABLE
CREATE TABLE IF NOT EXISTS user_roles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL, -- 'verified', 'admin', 'moderator', 'ambassador'
  badge_emoji TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role_name)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);

-- Enhance user_profiles table with additional fields
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS profile_views_count INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS total_posts INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_online INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS verified INTEGER DEFAULT 0;

-- Enhance direct_messages table
ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS is_liked INTEGER DEFAULT 0;
ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS reactions_count INTEGER DEFAULT 0;

-- Insert default user preferences for existing users
INSERT INTO user_preferences (user_id, interests, privacy_level)
SELECT id, ARRAY['quiz', 'education', 'islamic'], 'public'
FROM user_profiles
WHERE id NOT IN (SELECT user_id FROM user_preferences)
ON CONFLICT DO NOTHING;

-- Create view for user activity feed (combine stories + notifications)
CREATE OR REPLACE VIEW activity_feed AS
SELECT 
  'story' as activity_type,
  id as activity_id,
  author_id as user_id,
  content as description,
  image_url,
  created_at
FROM user_stories
WHERE visibility = 'public'
UNION ALL
SELECT
  'achievement' as activity_type,
  id as activity_id,
  recipient_id as user_id,
  title as description,
  NULL as image_url,
  created_at
FROM notifications
WHERE type = 'achievement'
ORDER BY created_at DESC;
