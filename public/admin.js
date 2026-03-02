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
const exportCandidatesCsv = document.getElementById('exportCandidatesCsv');
const exportRankingCsv = document.getElementById('exportRankingCsv');
const exportRankingPdf = document.getElementById('exportRankingPdf');

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
        <td>${c.fullName || c.name || 'Inconnu'}</td>
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

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
  try {
    await authedFetch('/api/admin/sync-manual-candidates', { method: 'POST' });
  } catch {}
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

exportCandidatesCsv?.addEventListener('click', async () => {
  const res = await authedFetch('/api/admin/export/candidates');
  if (!res.ok) return;
  const text = await res.text();
  downloadFile('candidats.csv', text);
});

exportRankingCsv?.addEventListener('click', async () => {
  const res = await authedFetch('/api/admin/export/ranking');
  if (!res.ok) return;
  const text = await res.text();
  downloadFile('classement.csv', text);
});

exportRankingPdf?.addEventListener('click', () => {
  const rows = Array.from(document.querySelectorAll('#rankingTable tbody tr'));
  if (!rows.length) return;
  const bodyRows = rows
    .map((row) => {
      const cells = row.querySelectorAll('td');
      return `<tr><td>${cells[0].textContent}</td><td>${cells[1].textContent}</td><td>${cells[2].textContent}</td></tr>`;
    })
    .join('');
  const html = `
    <html>
      <head>
        <title>Classement - Quiz Islamique 2026</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; }
          h1 { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f3f3f3; }
        </style>
      </head>
      <body>
        <h1>Classement — Quiz Islamique 2026</h1>
        <table>
          <thead><tr><th>Candidat</th><th>Moyenne</th><th>Passages</th></tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </body>
    </html>`;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
});
