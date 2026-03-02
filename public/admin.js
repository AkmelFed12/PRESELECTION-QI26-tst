const loginForm = document.getElementById('loginForm');
const loginMsg = document.getElementById('loginMsg');
const loginCard = document.getElementById('loginCard');
const dashboard = document.getElementById('dashboard');
const settingsSection = document.getElementById('settingsSection');
const candidatesSection = document.getElementById('candidatesSection');
const scoresSection = document.getElementById('scoresSection');

const settingsForm = document.getElementById('settingsForm');
const settingsMsg = document.getElementById('settingsMsg');

const candidateForm = document.getElementById('candidateForm');
const candidateMsg = document.getElementById('candidateMsg');
const candidatesTable = document.querySelector('#candidatesTable tbody');

const scoreForm = document.getElementById('scoreForm');
const scoreMsg = document.getElementById('scoreMsg');
const rankingTable = document.querySelector('#rankingTable tbody');

let authHeader = '';

function showAdmin() {
  loginCard.classList.add('admin-hidden');
  dashboard.classList.remove('admin-hidden');
  settingsSection.classList.remove('admin-hidden');
  candidatesSection.classList.remove('admin-hidden');
  scoresSection.classList.remove('admin-hidden');
}

function setStatus(el, text) {
  if (el) el.textContent = text || '';
}

async function authedFetch(url, options = {}) {
  if (!authHeader) {
    const stored = localStorage.getItem('adminAuth');
    if (stored) authHeader = stored;
  }
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
      ...(options.headers || {})
    }
  });
}

async function loadDashboard() {
  const res = await authedFetch('/api/admin/dashboard');
  if (!res.ok) {
    setStatus(loginMsg, 'Erreur chargement admin.');
    return;
  }
  const data = await res.json();
  document.getElementById('statCandidates').textContent = data.stats?.candidates ?? 0;
  document.getElementById('statVotes').textContent = Array.isArray(data.votes)
    ? data.votes.reduce((sum, v) => sum + Number(v.totalVotes || 0), 0)
    : 0;
  document.getElementById('statScores').textContent = Array.isArray(data.ranking)
    ? data.ranking.reduce((sum, r) => sum + Number(r.passages || 0), 0)
    : 0;

  // settings
  const settings = data.settings || {};
  Array.from(settingsForm.elements).forEach((el) => {
    if (!el.name) return;
    el.value = settings[el.name] ?? '';
  });

  // candidates
  renderCandidates(data.candidates || []);

  // ranking
  renderRanking(data.ranking || []);
}

function renderCandidates(list) {
  if (!candidatesTable) return;
  candidatesTable.innerHTML = list
    .map(
      (c) => `
      <tr>
        <td>${c.id}</td>
        <td>${c.fullName || 'Inconnu'}</td>
        <td>${c.whatsapp || ''}</td>
        <td>${c.city || ''}</td>
        <td>${c.status || 'pending'}</td>
        <td><button data-edit="${c.id}">Modifier</button></td>
      </tr>
    `,
    )
    .join('');
}

function renderRanking(list) {
  if (!rankingTable) return;
  rankingTable.innerHTML = list
    .map((r) => `<tr><td>${r.fullName || 'Inconnu'}</td><td>${r.averageScore ?? '-'}</td><td>${r.passages}</td></tr>`)
    .join('');
}

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus(loginMsg, 'Connexion...');
  const payload = Object.fromEntries(new FormData(loginForm).entries());
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    setStatus(loginMsg, data.message || 'Identifiants incorrects.');
    return;
  }
  authHeader = `Bearer ${data.token}`;
  localStorage.setItem('adminAuth', authHeader);
  showAdmin();
  await loadDashboard();
});

settingsForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus(settingsMsg, 'Enregistrement...');
  const payload = Object.fromEntries(new FormData(settingsForm).entries());
  Object.keys(payload).forEach((k) => (payload[k] = Number(payload[k])));
  const res = await authedFetch('/api/tournament-settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  setStatus(settingsMsg, data.message || (res.ok ? 'Mis à jour.' : 'Erreur.'));
});

candidateForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus(candidateMsg, 'Sauvegarde...');
  const payload = Object.fromEntries(new FormData(candidateForm).entries());
  payload.city = (payload.city || '').toUpperCase();
  const id = payload.id;
  delete payload.id;
  const res = await authedFetch(id ? `/api/admin/candidates/${id}` : '/api/admin/candidates', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  setStatus(candidateMsg, data.message || (res.ok ? 'Sauvegardé.' : 'Erreur.'));
  await loadDashboard();
});

candidatesTable?.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-edit]');
  if (!btn) return;
  const row = btn.closest('tr');
  const cells = row.querySelectorAll('td');
  candidateForm.querySelector('#candidateId').value = cells[0].textContent;
  candidateForm.querySelector('#candidateName').value = cells[1].textContent;
  candidateForm.querySelector('#candidateWhatsapp').value = cells[2].textContent;
  candidateForm.querySelector('#candidateCity').value = cells[3].textContent;
  candidateForm.querySelector('#candidateStatus').value = cells[4].textContent === 'Validé' ? 'approved' : cells[4].textContent === 'Éliminé' ? 'eliminated' : 'pending';
});

scoreForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus(scoreMsg, 'Enregistrement...');
  const payload = Object.fromEntries(new FormData(scoreForm).entries());
  const res = await authedFetch('/api/admin/scores', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  setStatus(scoreMsg, data.message || (res.ok ? 'Note enregistrée.' : 'Erreur.'));
  await loadDashboard();
});

// Auto-login if token exists
const stored = localStorage.getItem('adminAuth');
if (stored) {
  authHeader = stored;
  showAdmin();
  loadDashboard();
}
