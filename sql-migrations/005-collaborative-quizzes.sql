-- ============= PHASE 3 EXTENDED: COLLABORATIVE QUIZZES =============

-- Collaborative Quiz Sessions
CREATE TABLE IF NOT EXISTS collaborative_quiz_sessions (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  quiz_id BIGINT REFERENCES quiz(id) ON DELETE SET NULL,
  created_by BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
  max_players INTEGER DEFAULT 4,
  current_players INTEGER DEFAULT 1,
  question_index INTEGER DEFAULT 0,
  time_limit_per_question INTEGER DEFAULT 30,
  total_questions INTEGER,
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_public INTEGER DEFAULT 1
);

-- Collaborative Quiz Participants
CREATE TABLE IF NOT EXISTS collaborative_quiz_participants (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES collaborative_quiz_sessions(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  current_score INTEGER DEFAULT 0,
  questions_correct INTEGER DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

-- Collaborative Quiz Answers (tracking each participant's answer per question)
CREATE TABLE IF NOT EXISTS collaborative_quiz_answers (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES collaborative_quiz_sessions(id) ON DELETE CASCADE,
  participant_id BIGINT NOT NULL REFERENCES collaborative_quiz_participants(id) ON DELETE CASCADE,
  question_id BIGINT REFERENCES questions(id) ON DELETE SET NULL,
  answer_text TEXT,
  is_correct INTEGER DEFAULT 0,
  time_taken INTEGER,
  points_earned INTEGER DEFAULT 0,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Collaborative Quiz Leaderboard (realtime score updates)
CREATE TABLE IF NOT EXISTS collaborative_quiz_leaderboard (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES collaborative_quiz_sessions(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  rank INTEGER,
  score INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============= INDEXES FOR PERFORMANCE =============
CREATE INDEX IF NOT EXISTS idx_collab_quiz_creator ON collaborative_quiz_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_collab_quiz_status ON collaborative_quiz_sessions(status);
CREATE INDEX IF NOT EXISTS idx_collab_quiz_public ON collaborative_quiz_sessions(is_public);
CREATE INDEX IF NOT EXISTS idx_collab_participants_session ON collaborative_quiz_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_collab_participants_user ON collaborative_quiz_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_collab_answers_session ON collaborative_quiz_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_collab_answers_participant ON collaborative_quiz_answers(participant_id);
CREATE INDEX IF NOT EXISTS idx_collab_leaderboard_session ON collaborative_quiz_leaderboard(session_id);

-- ============= VIEWS =============
CREATE OR REPLACE VIEW active_collaborative_quizzes AS
SELECT 
  cqs.id,
  cqs.title,
  cqs.description,
  cqs.created_by,
  up.fullName as creator_name,
  cqs.status,
  cqs.current_players,
  cqs.max_players,
  cqs.time_limit_per_question,
  cqs.total_questions,
  cqs.question_index,
  cqs.started_at,
  cqs.created_at,
  COUNT(DISTINCT cqp.user_id) as actual_participant_count
FROM collaborative_quiz_sessions cqs
LEFT JOIN user_profiles up ON cqs.created_by = up.id
LEFT JOIN collaborative_quiz_participants cqp ON cqs.id = cqp.session_id
WHERE cqs.status IN ('waiting', 'active')
GROUP BY cqs.id, up.fullName;

CREATE OR REPLACE VIEW collab_quiz_rankings AS
SELECT 
  cql.session_id,
  cql.user_id,
  up.fullName,
  cql.rank,
  cql.score,
  cql.updated_at,
  COUNT(cqa.id) as questions_answered
FROM collaborative_quiz_leaderboard cql
LEFT JOIN user_profiles up ON cql.user_id = up.id
LEFT JOIN collaborative_quiz_answers cqa ON cql.session_id = cqa.session_id AND cql.user_id = cqa.participant_id
GROUP BY cql.session_id, cql.user_id, up.fullName, cql.rank, cql.score, cql.updated_at;

-- ============= TRIGGER FUNCTIONS =============
CREATE OR REPLACE FUNCTION update_collaborative_quiz_leaderboard()
RETURNS TRIGGER AS $$
BEGIN
  -- Update leaderboard after answer submitted
  WITH ranked_scores AS (
    SELECT 
      session_id,
      participant_id,
      cqp.user_id,
      SUM(cqa.points_earned) as total_score,
      ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY SUM(cqa.points_earned) DESC) as rank
    FROM collaborative_quiz_answers cqa
    JOIN collaborative_quiz_participants cqp ON cqa.participant_id = cqp.id
    WHERE cqa.session_id = NEW.session_id
    GROUP BY session_id, participant_id, cqp.user_id
  )
  INSERT INTO collaborative_quiz_leaderboard (session_id, user_id, rank, score)
  SELECT session_id, user_id, rank, COALESCE(total_score, 0)
  FROM ranked_scores
  ON CONFLICT (session_id, user_id) DO UPDATE
  SET rank = EXCLUDED.rank, score = EXCLUDED.score, updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_collab_leaderboard
AFTER INSERT ON collaborative_quiz_answers
FOR EACH ROW
EXECUTE FUNCTION update_collaborative_quiz_leaderboard();

CREATE OR REPLACE FUNCTION update_collaborative_participants_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE collaborative_quiz_sessions
    SET current_players = (SELECT COUNT(*) FROM collaborative_quiz_participants WHERE session_id = NEW.session_id)
    WHERE id = NEW.session_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE collaborative_quiz_sessions
    SET current_players = (SELECT COUNT(*) FROM collaborative_quiz_participants WHERE session_id = OLD.session_id)
    WHERE id = OLD.session_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_participants_count
AFTER INSERT OR DELETE ON collaborative_quiz_participants
FOR EACH ROW
EXECUTE FUNCTION update_collaborative_participants_count();

-- ============= SAMPLE DATA =============
INSERT INTO collaborative_quiz_sessions (title, description, created_by, is_public, max_players, time_limit_per_question, total_questions)
SELECT 
  'Quiz Coran Challenge',
  'Compétition rapide sur le Coran - 5 questions, 30s par question',
  id,
  1,
  4,
  30,
  5
FROM user_profiles LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO collaborative_quiz_sessions (title, description, created_by, is_public, max_players, time_limit_per_question, total_questions)
SELECT 
  'Hadith Speed Run',
  'Course contre la montre - hadith difficiles',
  id,
  1,
  4,
  45,
  10
FROM user_profiles LIMIT 1 OFFSET 1
ON CONFLICT DO NOTHING;
