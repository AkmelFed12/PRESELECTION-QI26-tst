const loginForm = document.getElementById('loginForm');
const loginMsg = document.getElementById('loginMsg');
const adminPanel = document.getElementById('adminPanel');
const candidatesPanel = document.getElementById('candidatesPanel');
const scorePanel = document.getElementById('scorePanel');
const tablesPanel = document.getElementById('tablesPanel');
const dashboardPanel = document.getElementById('dashboardPanel');
const settingsForm = document.getElementById('settingsForm');
const settingsMsg = document.getElementById('settingsMsg');
const scoreForm = document.getElementById('scoreForm');
const scoreMsg = document.getElementById('scoreMsg');
const candidateForm = document.getElementById('candidateForm');
const candidateMsg = document.getElementById('candidateMsg');
const adminCandidatesTable = document.querySelector('#adminCandidatesTable tbody');
const logoutBtn = document.getElementById('logoutBtn');
const candidateSearch = document.getElementById('candidateSearch');
const candidateSort = document.getElementById('candidateSort');
const candidateStatusFilter = document.getElementById('candidateStatusFilter');
const candidatePreview = document.getElementById('candidatePreview');
const exportCandidates = document.getElementById('exportCandidates');
const exportVotes = document.getElementById('exportVotes');
const exportRanking = document.getElementById('exportRanking');
const exportRankingPdf = document.getElementById('exportRankingPdf');
const statCandidates = document.getElementById('statCandidates');
const statVotes = document.getElementById('statVotes');
const statScores = document.getElementById('statScores');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

let authHeader = '';
let candidatesCache = [];
let votesCache = [];
let rankingCache = [];
let settingsCache = {};

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
  candidatesCache = Array.isArray(candidates) ? candidates : [];
  votesCache = Array.isArray(votes) ? votes : [];
  rankingCache = Array.isArray(ranking) ? ranking : [];
  settingsCache = settings || {};

  const candidatesBody = document.querySelector('#candidatesTable tbody');
  candidatesBody.innerHTML = candidates
    .map(
      (c) => `<tr><td>${c.id}</td><td>${c.fullName}</td><td>${c.whatsapp || ''}</td><td>${c.country || ''}</td><td>${c.createdAt}</td></tr>`,
    )
    .join('');

  const votesBody = document.querySelector('#votesTable tbody');
  votesBody.innerHTML = votesCache.map((v) => `<tr><td>${v.fullName}</td><td>${v.totalVotes}</td></tr>`).join('');

  const rankingBody = document.querySelector('#rankingTable tbody');
  rankingBody.innerHTML = rankingCache
    .map((r) => `<tr><td>${r.fullName}</td><td>${r.averageScore ?? '-'}</td><td>${r.passages}</td></tr>`)
    .join('');

  Object.keys(settings).forEach((key) => {
    const field = settingsForm.elements[key];
    if (!field) return;
    if (field.type === 'checkbox') {
      field.checked = Number(settings[key]) === 1;
      return;
    }
    field.value = settings[key];
  });

  renderCandidatesTable();
  updateDashboard();
}

function renderCandidatesTable() {
  if (!adminCandidatesTable) return;
  const query = (candidateSearch?.value || '').toLowerCase().trim();
  const sort = candidateSort?.value || 'id-desc';
  const statusFilter = candidateStatusFilter?.value || '';
  let list = [...candidatesCache];
  if (query) {
    list = list.filter((c) => {
      const target = `${c.fullName || ''} ${c.country || ''} ${c.whatsapp || ''}`.toLowerCase();
      return target.includes(query);
    });
  }
  if (statusFilter) {
    list = list.filter((c) => (c.status || 'pending') === statusFilter);
  }
  if (sort === 'name-asc') {
    list.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
  } else if (sort === 'country-asc') {
    list.sort((a, b) => (a.country || '').localeCompare(b.country || ''));
  } else {
    list.sort((a, b) => b.id - a.id);
  }
  adminCandidatesTable.innerHTML = list
    .map(
      (c) => `
        <tr>
          <td>${c.photoUrl ? `<img src="${c.photoUrl}" alt="${c.fullName}" class="mini-photo" />` : '-'}</td>
          <td>${c.id}</td>
          <td>${c.fullName}</td>
          <td>${c.country || ''}</td>
          <td>${formatStatus(c.status)}</td>
          <td>${c.whatsapp || ''}</td>
          <td>
            <button class="small-btn" data-action="edit" data-id="${c.id}">Modifier</button>
            <button class="small-btn danger" data-action="delete" data-id="${c.id}">Supprimer</button>
          </td>
        </tr>
      `,
    )
    .join('');
}

function formatStatus(value) {
  if (value === 'approved') return 'Validé';
  if (value === 'eliminated') return 'Éliminé';
  return 'En attente';
}

function updateDashboard() {
  if (!statCandidates) return;
  const totalCandidates = candidatesCache.length;
  const totalVotes = votesCache.reduce((sum, v) => sum + Number(v.totalVotes || 0), 0);
  const totalScores = rankingCache.reduce((sum, r) => sum + Number(r.passages || 0), 0);
  statCandidates.textContent = totalCandidates;
  statVotes.textContent = totalVotes;
  statScores.textContent = totalScores;

  const maxCandidates = Number(settingsCache.maxCandidates || 0);
  const progress = maxCandidates ? Math.min(100, Math.round((totalCandidates / maxCandidates) * 100)) : 0;
  if (progressBar) progressBar.style.width = `${progress}%`;
  if (progressText) {
    progressText.textContent = maxCandidates ? `${progress}% (${totalCandidates}/${maxCandidates})` : `${totalCandidates}`;
  }
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
  dashboardPanel.classList.remove('hidden');
  candidatesPanel.classList.remove('hidden');
  scorePanel.classList.remove('hidden');
  tablesPanel.classList.remove('hidden');
  logoutBtn.classList.remove('hidden');
  await loadDashboard();
});

settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(settingsForm).entries());
  Object.keys(payload).forEach((k) => (payload[k] = Number(payload[k])));
  payload.votingEnabled = settingsForm.elements.votingEnabled.checked ? 1 : 0;
  payload.registrationLocked = settingsForm.elements.registrationLocked.checked ? 1 : 0;

  const res = await authedFetch('/api/tournament-settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  settingsMsg.textContent = data.message || 'Mise à jour effectuée.';
});

candidateSearch?.addEventListener('input', renderCandidatesTable);
candidateSort?.addEventListener('change', renderCandidatesTable);
candidateStatusFilter?.addEventListener('change', renderCandidatesTable);

candidateForm.elements.photoFile?.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file || !candidatePreview) return;
  const url = URL.createObjectURL(file);
  candidatePreview.src = url;
  candidatePreview.style.display = 'block';
});

candidateForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(candidateForm);
  const file = formData.get('photoFile');

  if (file && file.size > 0) {
    const uploadData = new FormData();
    uploadData.append('photo', file);
    const uploadRes = await fetch('/api/admin/upload-photo', {
      method: 'POST',
      headers: { Authorization: authHeader },
      body: uploadData,
    });
    const uploadJson = await uploadRes.json();
    if (!uploadRes.ok) {
      candidateMsg.textContent = uploadJson.message || 'Erreur lors de l’upload.';
      return;
    }
    candidateForm.elements.photoUrl.value = uploadJson.photoUrl;
    if (candidatePreview) {
      candidatePreview.src = uploadJson.photoUrl;
      candidatePreview.style.display = 'block';
    }
  }

  const payload = Object.fromEntries(new FormData(candidateForm).entries());
  if (payload.age) payload.age = Number(payload.age);
  if (payload.candidateId) payload.candidateId = Number(payload.candidateId);
  if (!payload.status) payload.status = 'pending';
  delete payload.photoFile;

  const res = await authedFetch('/api/admin/candidates', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  candidateMsg.textContent = data.message || 'Candidat enregistré.';
  if (res.ok) {
    candidateForm.reset();
    await loadDashboard();
  }
});

adminCandidatesTable?.addEventListener('click', async (e) => {
  const button = e.target.closest('button[data-id]');
  if (!button) return;
  const candidateId = Number(button.dataset.id);
  const action = button.dataset.action || 'edit';
  if (action === 'delete') {
    if (!confirm('Supprimer ce candidat ? Cette action est définitive.')) return;
    const res = await authedFetch(`/api/admin/candidates/${candidateId}`, { method: 'DELETE' });
    const data = await res.json();
    candidateMsg.textContent = data.message || 'Candidat supprimé.';
    if (res.ok) await loadDashboard();
    return;
  }
  const candidate = candidatesCache.find((c) => c.id === candidateId);
  if (!candidate) return;
  Array.from(candidateForm.elements).forEach((field) => {
    if (!field.name || field.type === 'file') return;
    if (candidate[field.name] !== undefined && candidate[field.name] !== null) {
      field.value = candidate[field.name];
    }
  });
  candidateForm.elements.candidateId.value = candidate.id;
  candidateForm.elements.photoUrl.value = candidate.photoUrl || '';
  candidateForm.elements.status.value = candidate.status || 'pending';
  if (candidatePreview && candidate.photoUrl) {
    candidatePreview.src = candidate.photoUrl;
    candidatePreview.style.display = 'block';
  }
  candidateMsg.textContent = `Modification du candidat ${candidate.fullName}.`;
});

scoreForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(scoreForm).entries());
  ['candidateId', 'themeChosenScore', 'themeImposedScore'].forEach((k) => {
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

logoutBtn?.addEventListener('click', () => {
  authHeader = '';
  loginMsg.textContent = 'Déconnecté.';
  adminPanel.classList.add('hidden');
  dashboardPanel.classList.add('hidden');
  candidatesPanel.classList.add('hidden');
  scorePanel.classList.add('hidden');
  tablesPanel.classList.add('hidden');
  logoutBtn.classList.add('hidden');
});

function downloadCSV(filename, rows) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.join(',')]
    .concat(rows.map((row) => headers.map((h) => escape(row[h])).join(',')))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

exportCandidates?.addEventListener('click', () => {
  const rows = candidatesCache.map((c) => ({
    id: c.id,
    fullName: c.fullName,
    whatsapp: c.whatsapp,
    status: formatStatus(c.status),
    country: c.country,
    city: c.city,
    email: c.email,
    phone: c.phone,
    createdAt: c.createdAt,
  }));
  downloadCSV('candidats.csv', rows);
});

exportVotes?.addEventListener('click', () => {
  const rows = votesCache.map((v) => ({
    candidate: v.fullName,
    totalVotes: v.totalVotes,
  }));
  downloadCSV('votes.csv', rows);
});

exportRanking?.addEventListener('click', () => {
  const rows = rankingCache.map((r) => ({
    candidate: r.fullName,
    averageScore: r.averageScore ?? '',
    passages: r.passages,
  }));
  downloadCSV('notes.csv', rows);
});

exportRankingPdf?.addEventListener('click', () => {
  if (!rankingCache.length) return;
  const rows = rankingCache
    .map(
      (r, idx) =>
        `<tr><td>${idx + 1}</td><td>${r.fullName}</td><td>${r.averageScore ?? '-'}</td><td>${r.passages}</td></tr>`,
    )
    .join('');
  const html = `
    <html>
      <head>
        <title>Classement final</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; }
          h1 { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f3f3f3; }
        </style>
      </head>
      <body>
        <h1>Classement final — Quiz Islamique 2026</h1>
        <table>
          <thead><tr><th>Rang</th><th>Candidat</th><th>Moyenne /30</th><th>Passages</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
});
