// ============= COLLABORATIVE QUIZZES CLIENT =============

let currentUser = null;
let currentSession = null;
let selectedAnswer = null;
let timer = null;
let timeRemaining = 30;
let ws = null;

const sessionsGrid = document.getElementById('sessionsGrid');
const quizRoom = document.getElementById('quizRoom');
const sessionsList = document.getElementById('sessionsList');
const backBtn = document.getElementById('backBtn');
const createBtn = document.getElementById('createSessionBtn');
const createModal = document.getElementById('createModal');
const createForm = document.getElementById('createForm');

// ============= AUTHENTICATION =============
function getAuth() {
  return localStorage.getItem('memberAuth') || '';
}

function getCandidateId() {
  return localStorage.getItem('candidateId') || '';
}

// ============= LOAD SESSIONS =============
async function loadSessions() {
  try {
    const response = await fetch('/api/quizzes/collaborative?status=waiting&limit=20', {
      headers: { 'Authorization': getAuth() }
    });

    if (!response.ok) throw new Error('Failed to fetch sessions');

    const data = await response.json();
    renderSessions(data.sessions || []);
  } catch (e) {
    console.error('Error loading sessions:', e);
    sessionsGrid.innerHTML = '<div style="grid-column: 1/-1; padding: 2rem; text-align: center; color: #c41e3a;">Erreur lors du chargement des sessions</div>';
  }
}

function renderSessions(sessions) {
  if (!sessions.length) {
    sessionsGrid.innerHTML = '<div style="grid-column: 1/-1; padding: 2rem; text-align: center; color: #999;">Aucune session disponible. Crée-en une!</div>';
    return;
  }

  sessionsGrid.innerHTML = sessions.map(session => `
    <div class="session-card">
      <div class="session-header">
        <div class="session-title">${session.title}</div>
        <div class="session-status">
          ${session.status === 'waiting' ? '⏳ En attente' : '🎮 En direct'}
        </div>
      </div>
      <div class="session-body">
        <div class="session-description">${session.description || 'Quiz en compétition'}</div>
        <div class="session-stats">
          <div class="stat-box">
            <div class="stat-number">${session.actual_participant_count || session.current_players}/${session.max_players}</div>
            <div class="stat-label">Joueurs</div>
          </div>
          <div class="stat-box">
            <div class="stat-number">${session.total_questions || '?'}</div>
            <div class="stat-label">Questions</div>
          </div>
        </div>
        <div class="session-actions">
          <button class="btn-join" onclick="joinSession(${session.id})" ${session.current_players >= session.max_players ? 'disabled' : ''}>
            ${session.current_players >= session.max_players ? 'Complet' : 'Rejoindre'}
          </button>
          <button class="btn-view" onclick="viewSession(${session.id})">Voir</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ============= JOIN SESSION =============
async function joinSession(sessionId) {
  try {
    const response = await fetch(`/api/quizzes/collaborative/${sessionId}/join`, {
      method: 'POST',
      headers: {
        'Authorization': getAuth(),
        'candidate-id': getCandidateId()
      }
    });

    if (!response.ok) {
      const error = await response.json();
      alert(error.error || 'Erreur');
      return;
    }

    await viewSession(sessionId);
  } catch (e) {
    console.error('Error joining session:', e);
    alert('Erreur lors de la connexion');
  }
}

// ============= VIEW SESSION =============
async function viewSession(sessionId) {
  try {
    const response = await fetch(`/api/quizzes/collaborative/${sessionId}`, {
      headers: { 'Authorization': getAuth() }
    });

    if (!response.ok) throw new Error('Failed to fetch session');

    const data = await response.json();
    currentSession = data.session;

    // Show quiz room
    sessionsList.style.display = 'none';
    quizRoom.classList.add('active');

    document.getElementById('roomTitle').textContent = currentSession.title;
    document.getElementById('roomStatus').textContent = `${data.participants.length}/${currentSession.max_players} joueurs • Question ${currentSession.question_index + 1}/${currentSession.total_questions}`;

    renderParticipants(data.participants);
    updateLeaderboard(data.leaderboard);

    // Connect WebSocket if game is active
    if (currentSession.status === 'active') {
      connectWebSocket();
      loadNextQuestion();
    }
  } catch (e) {
    console.error('Error viewing session:', e);
    alert('Erreur');
  }
}

// ============= PARTICIPANTS =============
function renderParticipants(participants) {
  const grid = document.getElementById('participantsGrid');
  grid.innerHTML = participants.map((p, idx) => {
    const isMe = p.user_id === parseInt(getCandidateId());
    return `
      <div class="participant-card ${isMe ? 'me' : ''}">
        <div class="participant-avatar">${String.fromCharCode(65 + (idx % 26))}</div>
        <div class="participant-name">${p.fullName}</div>
        <div class="participant-status">
          ${p.status === 'playing' ? '🎮' : p.status === 'finished' ? '✓' : '⏳'}
          ${p.current_score} pts
        </div>
      </div>
    `;
  }).join('');
}

// ============= LEADERBOARD =============
function updateLeaderboard(leaderboard) {
  const list = document.getElementById('leaderboardList');
  list.innerHTML = leaderboard.map((user, idx) => `
    <li class="leaderboard-item">
      <div class="leaderboard-rank rank-${user.rank}">
        ${user.rank <= 3 ? ['🥇', '🥈', '🥉'][user.rank - 1] : user.rank}
      </div>
      <div class="leaderboard-name">${user.fullName}</div>
      <div class="leaderboard-score">${user.score} pts</div>
    </li>
  `).join('');
}

// ============= WEBSOCKET CONNECTION =============
function connectWebSocket() {
  if (ws) return;

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/chat`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('WebSocket connected');
    ws.send(JSON.stringify({
      type: 'join',
      groupId: currentSession.id,
      userId: getCandidateId(),
      auth: getAuth()
    }));
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    } catch (e) {
      console.error('WebSocket parse error:', e);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected');
  };
}

function handleWebSocketMessage(data) {
  const { type } = data;

  if (type === 'user_joined') {
    loadSessions();
    viewSession(currentSession.id);
  } else if (type === 'user_left') {
    loadSessions();
    viewSession(currentSession.id);
  }
}

// ============= QUIZ QUESTIONS =============
async function loadNextQuestion() {
  try {
    // For demo: use hardcoded questions
    const questions = [
      {
        id: 1,
        text: 'Combien de sourates contient le Coran?',
        options: ['103', '114', '120', '150'],
        correct: '114'
      },
      {
        id: 2,
        text: 'Quel est le premier mois du calendrier islamique?',
        options: ['Muharram', 'Safar', 'Rabi al-Awwal', 'Rajab'],
        correct: 'Muharram'
      }
    ];

    const currentQuestion = questions[currentSession.question_index || 0];
    if (!currentQuestion) {
      finishQuiz();
      return;
    }

    document.getElementById('questionText').textContent = currentQuestion.text;

    const grid = document.getElementById('answersGrid');
    grid.innerHTML = currentQuestion.options.map((option, idx) => `
      <div class="answer-option" onclick="selectAnswer('${option}', this)">
        ${option}
      </div>
    `).join('');

    document.getElementById('submitBtn').style.display = 'block';
    startTimer();
  } catch (e) {
    console.error('Error loading question:', e);
  }
}

function selectAnswer(answer, element) {
  selectedAnswer = answer;

  // Remove previous selection
  document.querySelectorAll('.answer-option').forEach(opt => {
    opt.classList.remove('selected');
  });

  // Mark as selected
  element.classList.add('selected');
}

function startTimer() {
  if (timer) clearInterval(timer);
  timeRemaining = currentSession.time_limit_per_question || 30;

  timer = setInterval(() => {
    timeRemaining--;
    document.getElementById('roomTimer').textContent = timeRemaining + 's';

    if (timeRemaining === 0) {
      clearInterval(timer);
      submitAnswer();
    }
  }, 1000);
}

async function submitAnswer() {
  if (!selectedAnswer) {
    alert('Sélectionne une réponse');
    return;
  }

  try {
    clearInterval(timer);

    const startTime = Date.now();
    const timeTaken = Math.round((startTime - (Date.now() - (currentSession.time_limit_per_question * 1000))) / 1000);

    const response = await fetch(`/api/quizzes/collaborative/${currentSession.id}/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuth(),
        'candidate-id': getCandidateId()
      },
      body: JSON.stringify({
        question_id: 1, // Would be dynamic
        answer_text: selectedAnswer,
        time_taken: Math.abs(timeTaken) || 5
      })
    });

    if (!response.ok) throw new Error('Failed to submit');

    const result = await response.json();

    // Show feedback
    document.querySelectorAll('.answer-option').forEach(opt => {
      opt.classList.remove('selected');
      if (opt.textContent.includes(selectedAnswer)) {
        opt.classList.add(result.answer.is_correct ? 'correct' : 'incorrect');
      }
    });

    document.getElementById('submitBtn').style.display = 'none';

    setTimeout(async () => {
      // Load next question or finish
      await viewSession(currentSession.id);
      selectedAnswer = null;
    }, 2000);
  } catch (e) {
    console.error('Error submitting answer:', e);
    alert('Erreur');
  }
}

async function finishQuiz() {
  try {
    const response = await fetch(`/api/quizzes/collaborative/${currentSession.id}/finish`, {
      method: 'POST',
      headers: {
        'Authorization': getAuth(),
        'candidate-id': getCandidateId()
      }
    });

    if (!response.ok) throw new Error('Failed to finish');

    const result = await response.json();

    // Show results modal
    showResultsModal(result.leaderboard);
  } catch (e) {
    console.error('Error finishing quiz:', e);
  }
}

function showResultsModal(leaderboard) {
  const modal = document.getElementById('resultsModal');
  const resultsList = document.getElementById('resultsList');

  resultsList.innerHTML = leaderboard.map((user, idx) => `
    <li class="leaderboard-item">
      <div class="leaderboard-rank rank-${user.rank}">
        ${user.rank <= 3 ? ['🥇', '🥈', '🥉'][user.rank - 1] : user.rank}
      </div>
      <div class="leaderboard-name">${user.fullName}</div>
      <div class="leaderboard-score">${user.score} pts</div>
    </li>
  `).join('');

  modal.classList.add('active');
}

// ============= CREATE SESSION =============
createBtn?.addEventListener('click', () => {
  createModal.classList.add('active');
});

function closeCreateModal() {
  createModal.classList.remove('active');
}

createForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = document.getElementById('sessionTitle').value;
  const description = document.getElementById('sessionDescription').value;
  const maxPlayers = parseInt(document.getElementById('sessionMaxPlayers').value);

  try {
    const response = await fetch('/api/quizzes/collaborative', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuth(),
        'candidate-id': getCandidateId()
      },
      body: JSON.stringify({ title, description, max_players: maxPlayers })
    });

    if (!response.ok) throw new Error('Failed to create');

    const result = await response.json();
    closeCreateModal();
    loadSessions();
    await viewSession(result.session.id);
  } catch (e) {
    console.error('Error creating session:', e);
    alert('Erreur');
  }
});

// ============= BACK BUTTON =============
function backToList() {
  sessionsList.style.display = 'block';
  quizRoom.classList.remove('active');
  document.getElementById('resultsModal').classList.remove('active');
  
  if (ws) {
    ws.close();
    ws = null;
  }
  
  if (timer) {
    clearInterval(timer);
  }
  
  loadSessions();
}

// ============= INIT =============
loadSessions();

// Refresh every 5 seconds
setInterval(loadSessions, 5000);
