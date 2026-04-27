-- Migration: Create moderation tables
CREATE TABLE IF NOT EXISTS moderation_reports (
  id SERIAL PRIMARY KEY,
  content_id INTEGER NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  reason TEXT NOT NULL,
  reported_by INTEGER,
  status VARCHAR(50) DEFAULT 'pending',
  moderated_by INTEGER,
  moderated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add moderation columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_until TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP;

-- Add deletion columns to chat_messages if table exists
ALTER TABLE IF EXISTS chat_messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE IF EXISTS chat_messages ADD COLUMN IF NOT EXISTS deleted_reason TEXT;

-- Add deletion columns to comments if table exists
ALTER TABLE IF EXISTS comments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE IF EXISTS comments ADD COLUMN IF NOT EXISTS deleted_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_moderation_reports_status ON moderation_reports(status);
CREATE INDEX IF NOT EXISTS idx_moderation_reports_created_at ON moderation_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_is_banned ON users(is_banned);
