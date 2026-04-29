// ==================== COLLABORATIVE QUIZZES API - PRODUCTION READY ====================
// Secure implementation with proper validation and error handling

export function registerCollaborativeQuizzesRoutes({
  app,
  pool,
  sanitizeString,
  validateCandidateId,
}) {
  // Helper: Validate and parse positive integers
  function validatePositiveInt(value, defaultVal = 10, max = 100) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed) || parsed < 0) return defaultVal;
    return Math.min(parsed, max);
  }

  // ========== GET ACTIVE COLLABORATIVE QUIZZES ==========

  app.get('/api/quizzes/collaborative', async (req, res) => {
    try {
      const status = ['active', 'waiting'].includes(req.query.status)
        ? req.query.status
        : 'active';
      const limit = validatePositiveInt(req.query.limit, 10, 50);
      const offset = validatePositiveInt(req.query.offset, 0, 1000);

      const result = await pool.query(
        `SELECT id, name, description, status, participant_count, 
                created_at, updated_at
         FROM collaborative_quiz_sessions
         WHERE status = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [status, limit, offset]
      );

      res.json({
        sessions: result.rows,
        total: result.rows.length,
        limit,
        offset
      });
    } catch (error) {
      console.error('[Quizzes] GET collaborative error:', error.message);
      res.status(500).json({ message: 'Erreur lors de la récupération des quiz' });
    }
  });

  // ========== GET SINGLE QUIZ SESSION ==========

  app.get('/api/quizzes/collaborative/:sessionId', async (req, res) => {
    try {
      const sessionId = validatePositiveInt(req.params.sessionId);
      if (!sessionId) {
        return res.status(400).json({ message: 'ID de session invalide' });
      }

      const sessionResult = await pool.query(
        `SELECT id, name, description, status, participant_count, 
                created_at, updated_at, rules
         FROM collaborative_quiz_sessions
         WHERE id = $1 LIMIT 1`,
        [sessionId]
      );

      if (sessionResult.rows.length === 0) {
        return res.status(404).json({ message: 'Session non trouvée' });
      }

      const session = sessionResult.rows[0];

      // Get participants
      const participantsResult = await pool.query(
        `SELECT cqp.id, cqp.candidate_id, c.fullName, cqp.status,
                cqp.current_score, cqp.questions_correct, cqp.joined_at
         FROM collab_quiz_participants cqp
         LEFT JOIN candidates c ON cqp.candidate_id = c.candidateCode
         WHERE cqp.session_id = $1
         ORDER BY cqp.current_score DESC
         LIMIT 100`,
        [sessionId]
      );

      // Get rankings
      const rankingResult = await pool.query(
        `SELECT rank, candidate_id, current_score, questions_correct
         FROM collab_quiz_rankings
         WHERE session_id = $1
         ORDER BY rank ASC`,
        [sessionId]
      );

      res.json({
        session,
        participants: participantsResult.rows,
        rankings: rankingResult.rows
      });
    } catch (error) {
      console.error('[Quizzes] GET session error:', error.message);
      res.status(500).json({ message: 'Erreur lors de la récupération de la session' });
    }
  });

  // ========== JOIN QUIZ SESSION ==========

  app.post('/api/quizzes/collaborative/:sessionId/join', async (req, res) => {
    try {
      const sessionId = validatePositiveInt(req.params.sessionId);
      const candidateId = validateCandidateId(req.body?.candidateId);

      if (!sessionId || !candidateId) {
        return res.status(400).json({ message: 'Paramètres invalides' });
      }

      // Check session exists
      const sessionResult = await pool.query(
        'SELECT status FROM collaborative_quiz_sessions WHERE id = $1 LIMIT 1',
        [sessionId]
      );

      if (sessionResult.rows.length === 0) {
        return res.status(404).json({ message: 'Session non trouvée' });
      }

      if (sessionResult.rows[0].status !== 'active' && sessionResult.rows[0].status !== 'waiting') {
        return res.status(400).json({ message: 'Session non disponible' });
      }

      // Check candidate exists
      const candidateResult = await pool.query(
        'SELECT candidateCode FROM candidates WHERE candidateCode = $1 LIMIT 1',
        [candidateId]
      );

      if (candidateResult.rows.length === 0) {
        return res.status(404).json({ message: 'Candidat non trouvé' });
      }

      // Check if already joined
      const existingResult = await pool.query(
        `SELECT 1 FROM collab_quiz_participants 
         WHERE session_id = $1 AND candidate_id = $2 LIMIT 1`,
        [sessionId, candidateId]
      );

      if (existingResult.rows.length > 0) {
        return res.status(400).json({ message: 'Déjà participant' });
      }

      // Add participant
      const result = await pool.query(
        `INSERT INTO collab_quiz_participants (session_id, candidate_id, status, current_score, questions_correct, joined_at)
         VALUES ($1, $2, 'active', 0, 0, NOW())
         RETURNING id, session_id, candidate_id, status`,
        [sessionId, candidateId]
      );

      // Increment participant count
      await pool.query(
        'UPDATE collaborative_quiz_sessions SET participant_count = participant_count + 1 WHERE id = $1',
        [sessionId]
      );

      res.status(201).json({
        message: 'Participant ajouté',
        participant: result.rows[0]
      });
    } catch (error) {
      console.error('[Quizzes] POST join error:', error.message);
      res.status(500).json({ message: 'Erreur lors de la participation' });
    }
  });

  // ========== SUBMIT ANSWER ==========

  app.post('/api/quizzes/collaborative/:sessionId/answer', async (req, res) => {
    try {
      const sessionId = validatePositiveInt(req.params.sessionId);
      const candidateId = validateCandidateId(req.body?.candidateId);
      const questionId = validatePositiveInt(req.body?.questionId);
      const answer = sanitizeString(req.body?.answer, 500);

      if (!sessionId || !candidateId || !questionId || !answer) {
        return res.status(400).json({ message: 'Paramètres invalides' });
      }

      // Get correct answer
      const questionResult = await pool.query(
        'SELECT correct_answer FROM quiz_questions WHERE id = $1 LIMIT 1',
        [questionId]
      );

      if (questionResult.rows.length === 0) {
        return res.status(404).json({ message: 'Question non trouvée' });
      }

      const isCorrect = answer.toLowerCase() === questionResult.rows[0].correct_answer.toLowerCase();

      // Update participant score
      const updateResult = await pool.query(
        `UPDATE collab_quiz_participants 
         SET current_score = current_score + $1,
             questions_correct = questions_correct + $2,
             updated_at = NOW()
         WHERE session_id = $3 AND candidate_id = $4
         RETURNING current_score, questions_correct`,
        [isCorrect ? 10 : 0, isCorrect ? 1 : 0, sessionId, candidateId]
      );

      if (updateResult.rows.length === 0) {
        return res.status(404).json({ message: 'Participant non trouvé' });
      }

      res.json({
        correct: isCorrect,
        score: updateResult.rows[0].current_score,
        questionsCorrect: updateResult.rows[0].questions_correct
      });
    } catch (error) {
      console.error('[Quizzes] POST answer error:', error.message);
      res.status(500).json({ message: 'Erreur lors de la soumission' });
    }
  });

  console.log('✅ Collaborative quizzes routes registered');
}
