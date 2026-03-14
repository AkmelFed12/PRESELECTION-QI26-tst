const quizForm = document.getElementById('dailyQuizForm');
const quizStatus = document.getElementById('quizStatus');
const quizResult = document.getElementById('quizResult');
const quizTitle = document.getElementById('quizTitle');

function getAuth() {
  return localStorage.getItem('memberAuth') || '';
}

function setStatus(text) {
  if (quizStatus) quizStatus.textContent = text;
}

function setResult(text, ok = false) {
  if (!quizResult) return;
  quizResult.textContent = text;
  quizResult.style.color = ok ? '#0b6f4f' : '';
}

async function loadQuiz() {
  const auth = getAuth();
  if (!auth) {
    window.location.href = 'member-login.html';
    return;
  }
  setStatus('Chargement...');
  const res = await fetch('/api/members/daily-quiz', { headers: { Authorization: auth } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    setStatus(data.message || 'Quiz indisponible.');
    if (quizForm) quizForm.style.display = 'none';
    return;
  }
  if (quizTitle && data.title) quizTitle.textContent = data.title;
  if (data.attempted) {
    setStatus('Quiz déjà soumis.');
    setResult(`Votre score: ${data.previousScore}/${data.previousTotal}`, true);
    if (quizForm) quizForm.style.display = 'none';
    return;
  }
  const questions = data.questions || [];
  if (!questions.length) {
    setStatus('Aucune question disponible.');
    return;
  }
  if (quizForm) {
    quizForm.innerHTML = questions
      .map((q, idx) => {
        const options = (q.options || [])
          .map(
            (opt, oidx) => `
              <label style="display:block; margin:6px 0;">
                <input type="radio" name="q${idx}" value="${oidx}" required />
                ${opt}
              </label>
            `
          )
          .join('');
        return `
          <div class="full">
            <strong>${idx + 1}. ${q.question}</strong>
            <div style="margin-top:8px;">${options}</div>
          </div>
        `;
      })
      .join('');
    quizForm.innerHTML += `<div class="full"><button class="btn-primary" type="submit">Soumettre</button></div>`;
    quizForm.style.display = 'grid';
  }
  setStatus('Bonne chance !');
}

quizForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const auth = getAuth();
  const answers = [];
  const inputs = quizForm.querySelectorAll('input[type="radio"]:checked');
  inputs.forEach((input) => {
    const idx = Number(String(input.name || '').replace('q', ''));
    answers[idx] = Number(input.value);
  });
  setStatus('Envoi...');
  const res = await fetch('/api/members/daily-quiz/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify({ answers })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    setStatus(data.message || 'Erreur.');
    return;
  }
  setStatus('Quiz terminé.');
  setResult(`Score: ${data.score}/${data.total}`, true);
  if (quizForm) quizForm.style.display = 'none';
});

loadQuiz();
