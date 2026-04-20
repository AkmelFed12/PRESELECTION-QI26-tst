// ============= COLLABORATIVE QUIZZES API ENDPOINTS =============

// GET active collaborative quizzes
app.get('/api/quizzes/collaborative', async (req, res) => {
  try {
    const { status = 'active', limit = 10, offset = 0 } = req.query;
    
    const result = await pool.query(
      `SELECT * FROM active_collaborative_quizzes 
       WHERE status = $1 OR status = 'waiting'
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [status, parseInt(limit), parseInt(offset)]
    );
    
    res.json({ sessions: result.rows });
  } catch (e) {
    console.error('Error fetching collaborative quizzes:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET single collaborative quiz session
app.get('/api/quizzes/collaborative/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const sessionResult = await pool.query(
      `SELECT * FROM collaborative_quiz_sessions WHERE id = $1`,
      [sessionId]
    );
    
    if (!sessionResult.rows.length) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }
    
    const session = sessionResult.rows[0];
    
    const participantsResult = await pool.query(
      `SELECT cqp.id, cqp.user_id, up.fullName, cqp.status, cqp.current_score, cqp.questions_correct
       FROM collaborative_quiz_participants cqp
       JOIN user_profiles up ON cqp.user_id = up.id
       WHERE cqp.session_id = $1
       ORDER BY cqp.current_score DESC`,
      [sessionId]
    );
    
    const leaderboardResult = await pool.query(
      `SELECT * FROM collab_quiz_rankings WHERE session_id = $1 ORDER BY rank ASC`,
      [sessionId]
    );
    
    res.json({
      session,
      participants: participantsResult.rows,
      leaderboard: leaderboardResult.rows
    });
  } catch (e) {
    console.error('Error fetching quiz session:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST create collaborative quiz session
app.post('/api/quizzes/collaborative', async (req, res) => {
  try {
    const { title, description, quiz_id, max_players, time_limit_per_question } = req.body;
    const candidateId = req.headers['candidate-id'];
    
    if (!candidateId || !title || !max_players) {
      return res.status(400).json({ error: 'Données manquantes' });
    }
    
    // Get total questions from quiz
    let totalQuestions = 10;
    if (quiz_id) {
      const qResult = await pool.query(
        `SELECT COUNT(*) as count FROM questions WHERE quiz_id = $1`,
        [quiz_id]
      );
      totalQuestions = qResult.rows[0].count;
    }
    
    const result = await pool.query(
      `INSERT INTO collaborative_quiz_sessions 
       (title, description, quiz_id, created_by, max_players, time_limit_per_question, total_questions)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, status, created_at`,
      [title, description || '', quiz_id || null, candidateId, max_players, time_limit_per_question || 30, totalQuestions]
    );
    
    const sessionId = result.rows[0].id;
    
    // Add creator as first participant
    await pool.query(
      `INSERT INTO collaborative_quiz_participants (session_id, user_id, status)
       VALUES ($1, $2, 'waiting')`,
      [sessionId, candidateId]
    );
    
    res.status(201).json({
      session: result.rows[0],
      message: 'Session créée avec succès'
    });
  } catch (e) {
    console.error('Error creating collaborative quiz:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST join collaborative quiz
app.post('/api/quizzes/collaborative/:sessionId/join', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const candidateId = req.headers['candidate-id'];
    
    if (!candidateId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }
    
    // Check if already joined
    const existingResult = await pool.query(
      `SELECT id FROM collaborative_quiz_participants WHERE session_id = $1 AND user_id = $2`,
      [sessionId, candidateId]
    );
    
    if (existingResult.rows.length) {
      return res.status(400).json({ error: 'Déjà rejoint cette session' });
    }
    
    // Check session status and player count
    const sessionResult = await pool.query(
      `SELECT * FROM collaborative_quiz_sessions WHERE id = $1`,
      [sessionId]
    );
    
    if (!sessionResult.rows.length) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }
    
    const session = sessionResult.rows[0];
    if (session.status !== 'waiting') {
      return res.status(400).json({ error: 'Session non disponible' });
    }
    
    if (session.current_players >= session.max_players) {
      return res.status(400).json({ error: 'Session pleine' });
    }
    
    // Add participant
    const result = await pool.query(
      `INSERT INTO collaborative_quiz_participants (session_id, user_id, status)
       VALUES ($1, $2, 'waiting')
       RETURNING id, user_id, status`,
      [sessionId, candidateId]
    );
    
    res.json({
      participant: result.rows[0],
      message: 'Rejoint la session'
    });
  } catch (e) {
    console.error('Error joining collaborative quiz:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST start collaborative quiz
app.post('/api/quizzes/collaborative/:sessionId/start', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const candidateId = req.headers['candidate-id'];
    
    // Verify creator
    const sessionResult = await pool.query(
      `SELECT created_by FROM collaborative_quiz_sessions WHERE id = $1`,
      [sessionId]
    );
    
    if (!sessionResult.rows.length || sessionResult.rows[0].created_by !== parseInt(candidateId)) {
      return res.status(403).json({ error: 'Non autorisé' });
    }
    
    // Start session
    const result = await pool.query(
      `UPDATE collaborative_quiz_sessions 
       SET status = 'active', started_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING id, status, started_at`,
      [sessionId]
    );
    
    // Update participants status
    await pool.query(
      `UPDATE collaborative_quiz_participants SET status = 'playing' WHERE session_id = $1`,
      [sessionId]
    );
    
    res.json({
      session: result.rows[0],
      message: 'Session démarrée'
    });
  } catch (e) {
    console.error('Error starting collaborative quiz:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST submit answer in collaborative quiz
app.post('/api/quizzes/collaborative/:sessionId/answer', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const candidateId = req.headers['candidate-id'];
    const { question_id, answer_text, time_taken } = req.body;
    
    if (!question_id || !answer_text) {
      return res.status(400).json({ error: 'Données manquantes' });
    }
    
    // Get participant
    const participantResult = await pool.query(
      `SELECT id FROM collaborative_quiz_participants WHERE session_id = $1 AND user_id = $2`,
      [sessionId, candidateId]
    );
    
    if (!participantResult.rows.length) {
      return res.status(404).json({ error: 'Participant non trouvé' });
    }
    
    const participantId = participantResult.rows[0].id;
    
    // Check if correct answer
    const questionResult = await pool.query(
      `SELECT correctAnswer FROM questions WHERE id = $1`,
      [question_id]
    );
    
    let isCorrect = 0;
    let pointsEarned = 0;
    
    if (questionResult.rows.length) {
      const correct = questionResult.rows[0].correctAnswer;
      isCorrect = answer_text.toLowerCase().trim() === correct.toLowerCase().trim() ? 1 : 0;
      
      // Calculate points: bonus for speed
      if (isCorrect) {
        const speedBonus = Math.max(0, 100 - (time_taken || 60));
        pointsEarned = 10 + Math.floor(speedBonus / 6); // 10-26 points
      }
    }
    
    // Save answer
    const answerResult = await pool.query(
      `INSERT INTO collaborative_quiz_answers 
       (session_id, participant_id, question_id, answer_text, is_correct, time_taken, points_earned)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, is_correct, points_earned`,
      [sessionId, participantId, question_id, answer_text, isCorrect, time_taken, pointsEarned]
    );
    
    // Update participant score
    const scoreResult = await pool.query(
      `SELECT COALESCE(SUM(points_earned), 0) as total_score, COUNT(*) as questions_answered
       FROM collaborative_quiz_answers WHERE participant_id = $1`,
      [participantId]
    );
    
    await pool.query(
      `UPDATE collaborative_quiz_participants 
       SET current_score = $1, questions_correct = (SELECT COUNT(*) FROM collaborative_quiz_answers WHERE participant_id = $2 AND is_correct = 1)
       WHERE id = $2`,
      [scoreResult.rows[0].total_score, participantId]
    );
    
    res.json({
      answer: answerResult.rows[0],
      updatedScore: scoreResult.rows[0].total_score,
      message: isCorrect ? '✓ Correct!' : '✗ Incorrect'
    });
  } catch (e) {
    console.error('Error submitting answer:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST finish collaborative quiz
app.post('/api/quizzes/collaborative/:sessionId/finish', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const candidateId = req.headers['candidate-id'];
    
    // Get participant
    const participantResult = await pool.query(
      `SELECT id FROM collaborative_quiz_participants WHERE session_id = $1 AND user_id = $2`,
      [sessionId, candidateId]
    );
    
    if (!participantResult.rows.length) {
      return res.status(404).json({ error: 'Participant non trouvé' });
    }
    
    const participantId = participantResult.rows[0].id;
    
    // Update participant status
    await pool.query(
      `UPDATE collaborative_quiz_participants SET status = 'finished' WHERE id = $1`,
      [participantId]
    );
    
    // Check if all finished
    const allFinishedResult = await pool.query(
      `SELECT COUNT(*) as remaining FROM collaborative_quiz_participants 
       WHERE session_id = $1 AND status != 'finished'`,
      [sessionId]
    );
    
    if (allFinishedResult.rows[0].remaining === 0) {
      // All finished, close session
      await pool.query(
        `UPDATE collaborative_quiz_sessions SET status = 'finished', finished_at = NOW() WHERE id = $1`,
        [sessionId]
      );
    }
    
    // Get final leaderboard
    const leaderboardResult = await pool.query(
      `SELECT * FROM collab_quiz_rankings WHERE session_id = $1 ORDER BY rank ASC`,
      [sessionId]
    );
    
    res.json({
      leaderboard: leaderboardResult.rows,
      message: 'Quiz terminé'
    });
  } catch (e) {
    console.error('Error finishing quiz:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET leaderboard for collaborative quiz
app.get('/api/quizzes/collaborative/:sessionId/leaderboard', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const result = await pool.query(
      `SELECT * FROM collab_quiz_rankings WHERE session_id = $1 ORDER BY rank ASC`,
      [sessionId]
    );
    
    res.json({ leaderboard: result.rows });
  } catch (e) {
    console.error('Error fetching leaderboard:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
