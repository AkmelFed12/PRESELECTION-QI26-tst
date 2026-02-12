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
const candidatePhotoFilter = document.getElementById('candidatePhotoFilter');
const candidatePreview = document.getElementById('candidatePreview');
const exportCandidates = document.getElementById('exportCandidates');
const exportVotes = document.getElementById('exportVotes');
const exportRanking = document.getElementById('exportRanking');
const exportRankingPdf = document.getElementById('exportRankingPdf');
const exportContacts = document.getElementById('exportContacts');
const contactTableBody = document.querySelector('#contactTable tbody');
const contactFilter = document.getElementById('contactFilter');
const contactSearch = document.getElementById('contactSearch');
const auditTableBody = document.querySelector('#auditTable tbody');
const exportAudit = document.getElementById('exportAudit');
const statCandidates = document.getElementById('statCandidates');
const statVotes = document.getElementById('statVotes');
const statScores = document.getElementById('statScores');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const toggleRegistrationLock = document.getElementById('toggleRegistrationLock');
const registrationLockStatus = document.getElementById('registrationLockStatus');
const toggleVoting = document.getElementById('toggleVoting');
const votingStatus = document.getElementById('votingStatus');

let authHeader = '';
let candidatesCache = [];
let votesCache = [];
let rankingCache = [];
let settingsCache = {};
let scoresByCandidate = {};
let contactsCache = [];
let auditCache = [];
let dashboardTimer = null;
let dashboardLoading = false;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeUrl(value) {
  const url = String(value ?? '').trim();
  if (!url) return '';
  return /^https?:\/\//i.test(url) ? url : '';
}

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
  if (dashboardLoading) return;
  dashboardLoading = true;
  try {
    const [candidatesRes, votesRes, rankingRes, settingsRes, contactsRes, auditRes] = await Promise.all([
      authedFetch('/api/candidates'),
      authedFetch('/api/votes/summary'),
      authedFetch('/api/scores/ranking'),
      authedFetch('/api/tournament-settings'),
      authedFetch('/api/contact-messages'),
      authedFetch('/api/admin-audit'),
    ]);

    if ([candidatesRes, votesRes, rankingRes, settingsRes, contactsRes, auditRes].some((r) => r.status === 401)) {
      loginMsg.textContent = 'Session invalide.';
      stopAutoRefresh();
      return;
    }

    const candidates = await candidatesRes.json();
    const votes = await votesRes.json();
    const ranking = await rankingRes.json();
    const settings = await settingsRes.json();
    const contacts = await contactsRes.json();
    const audit = await auditRes.json();
    candidatesCache = Array.isArray(candidates) ? candidates : [];
    votesCache = Array.isArray(votes) ? votes : [];
    rankingCache = Array.isArray(ranking) ? ranking : [];
    settingsCache = settings || {};
    contactsCache = Array.isArray(contacts) ? contacts : [];
    auditCache = Array.isArray(audit) ? audit : [];
    scoresByCandidate = rankingCache.reduce((acc, row) => {
      acc[row.id] = row;
      return acc;
    }, {});

    const candidatesBody = document.querySelector('#candidatesTable tbody');
    candidatesBody.innerHTML = candidates
      .map(
        (c) =>
          `<tr><td>${c.id}</td><td>${escapeHtml(c.fullName)}</td><td>${escapeHtml(
            c.whatsapp || '',
          )}</td><td>${escapeHtml(c.country || '')}</td><td>${escapeHtml(c.createdAt || '')}</td></tr>`,
      )
      .join('');

    const votesBody = document.querySelector('#votesTable tbody');
    votesBody.innerHTML = votesCache
      .map((v) => `<tr><td>${escapeHtml(v.fullName)}</td><td>${v.totalVotes}</td></tr>`)
      .join('');

    const rankingBody = document.querySelector('#rankingTable tbody');
    rankingBody.innerHTML = rankingCache
      .map((r) => `<tr><td>${escapeHtml(r.fullName)}</td><td>${r.averageScore ?? '-'}</td><td>${r.passages}</td></tr>`)
      .join('');

    if (contactTableBody) {
      renderContactsTable();
    }

    if (auditTableBody) {
      auditTableBody.innerHTML = auditCache
        .map(
          (a) =>
            `<tr><td>${escapeHtml(a.createdAt)}</td><td>${escapeHtml(a.action)}</td><td>${escapeHtml(
              a.payload || '',
            )}</td><td>${escapeHtml(a.ip || '')}</td></tr>`,
        )
        .join('');
    }

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
  } finally {
    dashboardLoading = false;
  }
}

function renderCandidatesTable() {
  if (!adminCandidatesTable) return;
  const query = (candidateSearch?.value || '').toLowerCase().trim();
  const sort = candidateSort?.value || 'id-desc';
  const statusFilter = candidateStatusFilter?.value || '';
  const photoFilter = candidatePhotoFilter?.checked;
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
  if (photoFilter) {
    list = list.filter((c) => !c.photoUrl);
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
          <td>${
            c.photoUrl ? `<img src="${safeUrl(c.photoUrl)}" alt="${escapeHtml(c.fullName)}" class="mini-photo" />` : '-'
          }</td>
          <td>${escapeHtml(c.candidateCode || '-')}</td>
          <td>${escapeHtml(c.fullName)}</td>
          <td>${escapeHtml(c.country || '')}</td>
          <td>${formatStatus(c.status)}</td>
          <td>${formatTotalScore(c.id)}</td>
          <td>${escapeHtml(c.whatsapp || '')}</td>
          <td>
            <button class="small-btn" data-action="edit" data-id="${c.id}">Modifier</button>
            <button class="small-btn danger" data-action="delete" data-id="${c.id}">Supprimer</button>
            <button class="small-btn" data-action="whatsapp" data-id="${c.id}">WhatsApp</button>
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

function formatTotalScore(candidateId) {
  const row = scoresByCandidate[candidateId];
  if (!row || !row.averageScore || !row.passages) return '-';
  const total = Number(row.averageScore) * Number(row.passages);
  return total.toFixed(2);
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

  if (registrationLockStatus && toggleRegistrationLock) {
    const locked = Number(settingsCache.registrationLocked || 0) === 1;
    const closed = Number(settingsCache.competitionClosed || 0) === 1;
    registrationLockStatus.textContent = closed ? 'Clôturée' : locked ? 'Fermées' : 'Ouvertes';
    toggleRegistrationLock.textContent = locked ? 'Déverrouiller' : 'Verrouiller';
    toggleRegistrationLock.disabled = closed;
  }
  if (votingStatus && toggleVoting) {
    const enabled = Number(settingsCache.votingEnabled || 0) === 1;
    votingStatus.textContent = enabled ? 'Ouverts' : 'Fermés';
    toggleVoting.textContent = enabled ? 'Fermer' : 'Ouvrir';
  }
}

function startAutoRefresh() {
  if (dashboardTimer) clearInterval(dashboardTimer);
  dashboardTimer = setInterval(() => {
    loadDashboard();
  }, 20000);
}

function stopAutoRefresh() {
  if (dashboardTimer) {
    clearInterval(dashboardTimer);
    dashboardTimer = null;
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
  startAutoRefresh();
});

settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(settingsForm).entries());
  // Convertir les champs numériques en nombres, sauf les textes
  const stringFields = ['announcementText', 'scheduleJson'];
  Object.keys(payload).forEach((k) => {
    if (!stringFields.includes(k)) {
      payload[k] = Number(payload[k]);
    }
  });
  payload.votingEnabled = settingsForm.elements.votingEnabled.checked ? 1 : 0;
  payload.registrationLocked = settingsForm.elements.registrationLocked.checked ? 1 : 0;
  payload.competitionClosed = settingsForm.elements.competitionClosed.checked ? 1 : 0;

  const res = await authedFetch('/api/tournament-settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  settingsMsg.textContent = data.message || 'Mise à jour effectuée.';
});

function buildSettingsPayload(overrides = {}) {
  return {
    maxCandidates: Number(settingsCache.maxCandidates || 64),
    directQualified: Number(settingsCache.directQualified || 16),
    playoffParticipants: Number(settingsCache.playoffParticipants || 32),
    playoffWinners: Number(settingsCache.playoffWinners || 16),
    groupsCount: Number(settingsCache.groupsCount || 8),
    candidatesPerGroup: Number(settingsCache.candidatesPerGroup || 4),
    finalistsFromWinners: Number(settingsCache.finalistsFromWinners || 8),
    finalistsFromBestSecond: Number(settingsCache.finalistsFromBestSecond || 2),
    totalFinalists: Number(settingsCache.totalFinalists || 10),
    votingEnabled: Number(settingsCache.votingEnabled || 0),
    registrationLocked: Number(settingsCache.registrationLocked || 0),
    competitionClosed: Number(settingsCache.competitionClosed || 0),
    announcementText: settingsCache.announcementText || '',
    scheduleJson: settingsCache.scheduleJson || '[]',
    ...overrides,
  };
}

toggleRegistrationLock?.addEventListener('click', async () => {
  const locked = Number(settingsCache.registrationLocked || 0) === 1;
  const payload = buildSettingsPayload({ registrationLocked: locked ? 0 : 1 });
  toggleRegistrationLock.disabled = true;
  const res = await authedFetch('/api/tournament-settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  settingsMsg.textContent = data.message || 'Mise à jour effectuée.';
  await loadDashboard();
  toggleRegistrationLock.disabled = false;
});

toggleVoting?.addEventListener('click', async () => {
  const enabled = Number(settingsCache.votingEnabled || 0) === 1;
  const payload = buildSettingsPayload({ votingEnabled: enabled ? 0 : 1 });
  toggleVoting.disabled = true;
  const res = await authedFetch('/api/tournament-settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  settingsMsg.textContent = data.message || 'Mise à jour effectuée.';
  await loadDashboard();
  toggleVoting.disabled = false;
});

candidateSearch?.addEventListener('input', renderCandidatesTable);
candidateSort?.addEventListener('change', renderCandidatesTable);
candidateStatusFilter?.addEventListener('change', renderCandidatesTable);
candidatePhotoFilter?.addEventListener('change', renderCandidatesTable);

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
  if (action === 'whatsapp') {
    const candidate = candidatesCache.find((c) => c.id === candidateId);
    if (!candidate || !candidate.whatsapp) return;
    const msg = encodeURIComponent(
      `Assalamou alaykoum ${candidate.fullName}, nous vous contactons pour le Quiz Islamique 2026.`
    );
    window.open(`https://wa.me/${candidate.whatsapp}?text=${msg}`, '_blank');
    return;
  }
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
  candidateForm.elements.candidateCode.value = candidate.candidateCode || '';
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
  stopAutoRefresh();
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
    candidateCode: c.candidateCode,
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

exportContacts?.addEventListener('click', () => {
  const rows = contactsCache.map((c) => ({
    id: c.id,
    createdAt: c.createdAt,
    fullName: c.fullName,
    email: c.email,
    subject: c.subject,
    message: c.message,
    ip: c.ip,
    archived: Number(c.archived || 0) === 1 ? 'oui' : 'non',
  }));
  downloadCSV('contacts.csv', rows);
});

exportAudit?.addEventListener('click', () => {
  const rows = auditCache.map((a) => ({
    id: a.id,
    createdAt: a.createdAt,
    action: a.action,
    payload: a.payload,
    ip: a.ip,
  }));
  downloadCSV('audit.csv', rows);
});

function renderContactsTable() {
  if (!contactTableBody) return;
  const filter = contactFilter?.value || 'active';
  const query = (contactSearch?.value || '').trim().toLowerCase();
  const list = contactsCache.filter((c) => {
    const isArchived = Number(c.archived || 0) === 1;
    if (filter === 'archived') return isArchived;
    if (filter === 'active') return !isArchived;
    return true;
  }).filter((c) => {
    if (!query) return true;
    const target = `${c.fullName || ''} ${c.email || ''} ${c.subject || ''}`.toLowerCase();
    return target.includes(query);
  });
  contactTableBody.innerHTML = list
    .map((c) => {
      const archiveLabel = Number(c.archived || 0) === 1 ? 'Désarchiver' : 'Archiver';
      const archiveValue = Number(c.archived || 0) === 1 ? 0 : 1;
      return `<tr>
        <td>${escapeHtml(c.createdAt)}</td>
        <td>${escapeHtml(c.fullName)}</td>
        <td>${escapeHtml(c.email)}</td>
        <td>${escapeHtml(c.subject)}</td>
        <td>${escapeHtml(c.message)}</td>
        <td>${escapeHtml(c.ip || '')}</td>
        <td>
          <button class="small-btn" data-contact-action="archive" data-id="${c.id}" data-value="${archiveValue}">${archiveLabel}</button>
          <button class="small-btn danger" data-contact-action="delete" data-id="${c.id}">Supprimer</button>
        </td>
      </tr>`;
    })
    .join('');
}

contactFilter?.addEventListener('change', renderContactsTable);
contactSearch?.addEventListener('input', renderContactsTable);

contactTableBody?.addEventListener('click', async (e) => {
  const button = e.target.closest('button[data-contact-action]');
  if (!button) return;
  const messageId = button.dataset.id;
  const action = button.dataset.contactAction;
  if (action === 'delete') {
    if (!confirm('Supprimer ce message ?')) return;
    const res = await authedFetch(`/api/contact-messages/${messageId}`, { method: 'DELETE' });
    const data = await res.json();
    settingsMsg.textContent = data.message || 'Message supprimé.';
    if (res.ok) {
      contactsCache = contactsCache.filter((c) => String(c.id) !== String(messageId));
      renderContactsTable();
    }
    return;
  }
  if (action === 'archive') {
    const archivedValue = Number(button.dataset.value || 0);
    const res = await authedFetch(`/api/contact-messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({ archived: archivedValue }),
    });
    const data = await res.json();
    settingsMsg.textContent = data.message || 'Message mis à jour.';
    if (res.ok) {
      contactsCache = contactsCache.map((c) =>
        String(c.id) === String(messageId) ? { ...c, archived: archivedValue } : c,
      );
      renderContactsTable();
    }
  }
});
