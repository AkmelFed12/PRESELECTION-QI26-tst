const loginForm = document.getElementById('loginForm');
const loginMsg = document.getElementById('loginMsg');
const adminPanel = document.getElementById('adminPanel');
const scorePanel = document.getElementById('scorePanel');
const tablesPanel = document.getElementById('tablesPanel');
const settingsForm = document.getElementById('settingsForm');
const settingsMsg = document.getElementById('settingsMsg');
const scoreForm = document.getElementById('scoreForm');
const scoreMsg = document.getElementById('scoreMsg');

let authHeader = '';

function toBasic(username, password) {
  return 'Basic ' + btoa(`${username}:${password}`);
}

async function authedFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
      ...(options.headers || {}),
    },
  });
  return res;
}

async function loadDashboard() {
  const [candidatesRes, votesRes, rankingRes, settingsRes] = await Promise.all([
    authedFetch('/api/candidates'),
    authedFetch('/api/votes/summary'),
    authedFetch('/api/scores/ranking'),
    authedFetch('/api/tournament-settings'),
  ]);

  if ([candidatesRes, votesRes, rankingRes, settingsRes].some((r) => r.status === 401)) {
    loginMsg.textContent = 'Session invalide.';
    return;
  }

  const candidates = await candidatesRes.json();
  const votes = await votesRes.json();
  const ranking = await rankingRes.json();
  const settings = await settingsRes.json();

  const candidatesBody = document.querySelector('#candidatesTable tbody');
  candidatesBody.innerHTML = candidates
    .map(
      (c) => `<tr><td>${c.id}</td><td>${c.fullName}</td><td>${c.whatsapp || ''}</td><td>${c.country || ''}</td><td>${c.createdAt}</td></tr>`,
    )
    .join('');

  const votesBody = document.querySelector('#votesTable tbody');
  votesBody.innerHTML = votes.map((v) => `<tr><td>${v.fullName}</td><td>${v.totalVotes}</td></tr>`).join('');

  const rankingBody = document.querySelector('#rankingTable tbody');
  rankingBody.innerHTML = ranking
    .map((r) => `<tr><td>${r.fullName}</td><td>${r.averageScore ?? '-'}</td><td>${r.passages}</td></tr>`)
    .join('');

  Object.keys(settings).forEach((key) => {
    const field = settingsForm.elements[key];
    if (field) field.value = settings[key];
  });
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const { username, password } = Object.fromEntries(new FormData(loginForm).entries());
  authHeader = toBasic(username, password);

  const res = await authedFetch('/api/candidates');
  if (res.status === 401) {
    loginMsg.textContent = 'Identifiants incorrects.';
    return;
  }

  loginMsg.textContent = 'Connexion réussie.';
  adminPanel.classList.remove('hidden');
  scorePanel.classList.remove('hidden');
  tablesPanel.classList.remove('hidden');
  await loadDashboard();
});

settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(settingsForm).entries());
  Object.keys(payload).forEach((k) => (payload[k] = Number(payload[k])));

  const res = await authedFetch('/api/tournament-settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  settingsMsg.textContent = data.message || 'Mise à jour effectuée.';
});

scoreForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(scoreForm).entries());
  ['candidateId', 'tajwidScore', 'memorizationScore', 'presenceScore'].forEach((k) => {
    payload[k] = Number(payload[k] || 0);
  });

  const res = await authedFetch('/api/scores', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  scoreMsg.textContent = data.message || 'Notation enregistrée.';
  if (res.ok) {
    scoreForm.reset();
    await loadDashboard();
  }
});
