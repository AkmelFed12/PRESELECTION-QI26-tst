const loginForm = document.getElementById('loginForm');
const loginMsg = document.getElementById('loginMsg');
const adminPanel = document.getElementById('adminPanel');
const candidatesPanel = document.getElementById('candidatesPanel');
const scorePanel = document.getElementById('scorePanel');
const tablesPanel = document.getElementById('tablesPanel');
const dashboardPanel = document.getElementById('dashboardPanel');
const securityPanel = document.getElementById('securityPanel');
const postsPanel = document.getElementById('postsPanel');
const storiesPanel = document.getElementById('storiesPanel');
const donationsPanel = document.getElementById('donationsPanel');
const mediaPanel = document.getElementById('mediaPanel');
const settingsForm = document.getElementById('settingsForm');
const settingsMsg = document.getElementById('settingsMsg');
const passwordForm = document.getElementById('passwordForm');
const passwordMsg = document.getElementById('passwordMsg');
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
const exportDonations = document.getElementById('exportDonations');
const sponsorsTableBody = document.querySelector('#sponsorsTable tbody');
const exportSponsors = document.getElementById('exportSponsors');
const mediaAdminStats = document.getElementById('mediaAdminStats');
const mediaSearchAdmin = document.getElementById('mediaSearchAdmin');
const mediaTypeAdmin = document.getElementById('mediaTypeAdmin');
const mediaSortAdmin = document.getElementById('mediaSortAdmin');
const mediaAdminReload = document.getElementById('mediaAdminReload');
const mediaAdminTableBody = document.querySelector('#mediaAdminTable tbody');
const statCandidates = document.getElementById('statCandidates');
const statVotes = document.getElementById('statVotes');
const statScores = document.getElementById('statScores');
const statContacts = document.getElementById('statContacts');
const statDonationsPending = document.getElementById('statDonationsPending');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const lastRefresh = document.getElementById('lastRefresh');
const refreshNow = document.getElementById('refreshNow');
const refreshInterval = document.getElementById('refreshInterval');
const toggleRegistrationLock = document.getElementById('toggleRegistrationLock');
const registrationLockStatus = document.getElementById('registrationLockStatus');
const toggleVoting = document.getElementById('toggleVoting');
const votingStatus = document.getElementById('votingStatus');

let authHeader = '';

// Fallbacks if utils.js did not load
if (typeof window.showToast !== 'function') {
  window.showToast = (message) => {
    if (loginMsg) loginMsg.textContent = String(message || '');
  };
}
if (typeof window.setFormLoading !== 'function') {
  window.setFormLoading = (form, loading) => {
    if (!form) return;
    form.querySelectorAll('input, button, select, textarea').forEach((el) => {
      el.disabled = !!loading;
    });
  };
}

if (loginMsg) {
  loginMsg.textContent = 'Prêt à se connecter.';
}

function showAdminPanels() {
  adminPanel.classList.remove('hidden');
  dashboardPanel.classList.remove('hidden');
  candidatesPanel.classList.remove('hidden');
  scorePanel.classList.remove('hidden');
  tablesPanel.classList.remove('hidden');
  securityPanel.classList.remove('hidden');
  postsPanel.classList.remove('hidden');
  storiesPanel.classList.remove('hidden');
  donationsPanel.classList.remove('hidden');
  mediaPanel.classList.remove('hidden');
  logoutBtn.classList.remove('hidden');
}

// (Auto-login removed: keep simple manual login)
let candidatesCache = [];
let votesCache = [];
let rankingCache = [];
let settingsCache = {};
let scoresByCandidate = {};
let contactsCache = [];
let auditCache = [];
let mediaAdminCache = [];
let dashboardTimer = null;
let dashboardLoading = false;
let mediaAdminFilters = { search: '', type: 'all', sort: 'newest' };
let lastDashboardStats = { candidates: 0, contacts: 0, donationsPending: 0 };

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
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
        ...(options.headers || {}),
      },
    });
    
    // Vérifier si la réponse est OK
    if (!res.ok && res.status !== 401) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || error.message || `HTTP ${res.status}`);
    }
    
    return res;
  } catch (error) {
    console.error(`Fetch error (${url}):`, error);
    throw error;
  }
}

async function loadDashboard() {
  if (dashboardLoading) return;
  dashboardLoading = true;
  try {
    const res = await authedFetch('/api/admin/dashboard');
    if (res.status === 401) {
      loginMsg.textContent = 'Session invalide.';
      stopAutoRefresh();
      return;
    }
    const data = await res.json();

    // Gestion robuste des différents formats de réponse
    const candidates = Array.isArray(data) ? data : (Array.isArray(data.candidates) ? data.candidates : []);
    const votes = Array.isArray(data.votes) ? data.votes : [];
    const ranking = Array.isArray(data.ranking) ? data.ranking : [];
    const settings = data.settings || {};
    const contacts = Array.isArray(data.contacts) ? data.contacts : [];
    const audit = Array.isArray(data.audit) ? data.audit : [];
    const stats = data.stats || {};

    candidatesCache = candidates;
    votesCache = votes;
    rankingCache = ranking;
    settingsCache = settings;
    contactsCache = contacts;
    auditCache = audit;
    scoresByCandidate = rankingCache.reduce((acc, row) => {
      acc[row.id] = row;
      return acc;
    }, {});

    if (stats.candidates > lastDashboardStats.candidates) {
      showToast('Nouveau candidat inscrit.', 'success');
    }
    if (stats.contacts > lastDashboardStats.contacts) {
      showToast('Nouveau message reçu.', 'info');
    }
    if (stats.donationsPending > lastDashboardStats.donationsPending) {
      showToast('Nouvelle donation en attente.', 'info');
    }
    lastDashboardStats = {
      candidates: stats.candidates || candidates.length,
      contacts: stats.contacts || contacts.length,
      donationsPending: stats.donationsPending || 0
    };

    const candidatesBody = document.querySelector('#candidatesTable tbody');
    if (candidatesBody) {
      candidatesBody.innerHTML = candidatesCache.length > 0
        ? candidatesCache.map(
            (c) =>
              `<tr><td>${c.id}</td><td>${escapeHtml(c.fullName || 'Inconnu')}</td><td>${escapeHtml(
                c.whatsapp || '',
              )}</td><td>${escapeHtml(c.city || '')}</td><td>${escapeHtml(c.country || '')}</td><td>${escapeHtml(
                c.email || '',
              )}</td><td>${escapeHtml(c.phone || '')}</td><td>${escapeHtml(c.createdAt || '')}</td></tr>`,
          ).join('')
        : '<tr><td colspan="8" class="empty">Aucun candidat inscrit</td></tr>';
    }

    const votesBody = document.querySelector('#votesTable tbody');
    votesBody.innerHTML = votesCache
      .map((v) => `<tr><td>${escapeHtml(v.fullName || 'Inconnu')}</td><td>${v.totalVotes}</td></tr>`)
      .join('');

    const rankingBody = document.querySelector('#rankingTable tbody');
    rankingBody.innerHTML = rankingCache
      .map((r) => `<tr><td>${escapeHtml(r.fullName || 'Inconnu')}</td><td>${r.averageScore ?? '-'}</td><td>${r.passages}</td></tr>`)
      .join('');

    if (contactTableBody) {
      renderContactsTable();
    }
    if (sponsorsTableBody) {
      renderSponsorsTable();
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
    if (lastRefresh) {
      lastRefresh.textContent = new Date().toLocaleTimeString('fr-FR');
    }
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
      const target = `${c.fullName || ''} ${c.city || ''} ${c.country || ''} ${c.whatsapp || ''} ${c.email || ''} ${c.phone || ''}`.toLowerCase();
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
        <tr data-candidate-id="${c.id}">
          <td>${
            c.photoUrl ? `<img src="${safeUrl(c.photoUrl)}" alt="${escapeHtml(c.fullName)}" class="mini-photo" />` : '-'
          }</td>
          <td>${escapeHtml(c.candidateCode || '-')}</td>
          <td>${escapeHtml(c.fullName || 'Inconnu')}</td>
          <td>${escapeHtml(c.city || '')}</td>
          <td>${escapeHtml(c.country || '')}</td>
          <td>${escapeHtml(c.email || '')}</td>
          <td>${escapeHtml(c.phone || '')}</td>
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

  // Vérification stricte avec gestion de null/undefined/0
  if (!row) return '-';

  const score = Number(row.averageScore);
  const passages = Number(row.passages);

  // Vérifier NaN et valeurs invalides
  if (isNaN(score) || isNaN(passages)) return '-';

  // Afficher simplement la moyenne (pas score * passages qui n'a pas de sens)
  return score.toFixed(2);
}

function updateDashboard() {
  if (!statCandidates) return;
  const totalCandidates = candidatesCache.length;
  const totalVotes = votesCache.reduce((sum, v) => sum + Number(v.totalVotes || 0), 0);
  const totalScores = rankingCache.reduce((sum, r) => sum + Number(r.passages || 0), 0);
  statCandidates.textContent = totalCandidates;
  statVotes.textContent = totalVotes;
  statScores.textContent = totalScores;
  if (statContacts) statContacts.textContent = contactsCache.length;
  if (statDonationsPending) statDonationsPending.textContent = lastDashboardStats.donationsPending || 0;
  if (statContacts) statContacts.textContent = contactsCache.length;
  if (statDonationsPending) statDonationsPending.textContent = lastDashboardStats.donationsPending || 0;

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

  // Render charts
  renderCharts();
}

// Stockage des instances Chart.js pour destruction avant recréation
let chartInstances = {
  topVotes: null,
  countries: null,
  topScores: null,
  inscriptions: null
};

function renderCharts() {
  if (!window.Chart) return;

  // Détruire les graphiques existants
  Object.values(chartInstances).forEach(chart => {
    if (chart) chart.destroy();
  });

  // Graphique 1: Top 10 candidats par votes
  const chartTopVotesCanvas = document.getElementById('chartTopVotes');
  if (chartTopVotesCanvas) {
    const top10Votes = votesCache.slice(0, 10);
    chartInstances.topVotes = new Chart(chartTopVotesCanvas, {
      type: 'bar',
      data: {
        labels: top10Votes.map(v => v.fullName || 'Inconnu'),
        datasets: [{
          label: 'Nombre de votes',
          data: top10Votes.map(v => Number(v.totalVotes || 0)),
          backgroundColor: 'rgba(11, 111, 79, 0.7)',
          borderColor: 'rgba(11, 111, 79, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }

  // Graphique 2: Répartition géographique
  const chartCountriesCanvas = document.getElementById('chartCountries');
  if (chartCountriesCanvas) {
    const countryCounts = {};
    candidatesCache.forEach(c => {
      const country = (c.country || 'Non renseigné').trim();
      countryCounts[country] = (countryCounts[country] || 0) + 1;
    });
    const countryData = Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    chartInstances.countries = new Chart(chartCountriesCanvas, {
      type: 'doughnut',
      data: {
        labels: countryData.map(c => c[0]),
        datasets: [{
          data: countryData.map(c => c[1]),
          backgroundColor: [
            'rgba(11, 111, 79, 0.8)',
            'rgba(197, 155, 63, 0.8)',
            'rgba(52, 152, 219, 0.8)',
            'rgba(231, 76, 60, 0.8)',
            'rgba(155, 89, 182, 0.8)',
            'rgba(241, 196, 15, 0.8)',
            'rgba(46, 204, 113, 0.8)',
            'rgba(149, 165, 166, 0.8)'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'right' }
        }
      }
    });
  }

  // Graphique 3: Top 10 candidats par scores
  const chartTopScoresCanvas = document.getElementById('chartTopScores');
  if (chartTopScoresCanvas) {
    const top10Scores = rankingCache.slice(0, 10);
    chartInstances.topScores = new Chart(chartTopScoresCanvas, {
      type: 'bar',
      data: {
        labels: top10Scores.map(r => r.fullName || 'Inconnu'),
        datasets: [{
          label: 'Score moyen',
          data: top10Scores.map(r => Number(r.averageScore || 0)),
          backgroundColor: 'rgba(197, 155, 63, 0.7)',
          borderColor: 'rgba(197, 155, 63, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }

  // Graphique 4: Évolution des inscriptions (par date)
  const chartInscriptionsCanvas = document.getElementById('chartInscriptions');
  if (chartInscriptionsCanvas) {
    const inscriptionsByDate = {};
    candidatesCache.forEach(c => {
      if (c.createdAt) {
        const date = new Date(c.createdAt).toLocaleDateString('fr-FR');
        inscriptionsByDate[date] = (inscriptionsByDate[date] || 0) + 1;
      }
    });

    const dates = Object.keys(inscriptionsByDate).sort((a, b) => {
      return new Date(a.split('/').reverse().join('-')) - new Date(b.split('/').reverse().join('-'));
    });

    // Calculer inscriptions cumulées
    let cumulative = 0;
    const cumulativeData = dates.map(date => {
      cumulative += inscriptionsByDate[date];
      return cumulative;
    });

    chartInstances.inscriptions = new Chart(chartInscriptionsCanvas, {
      type: 'line',
      data: {
        labels: dates,
        datasets: [{
          label: 'Inscriptions cumulées',
          data: cumulativeData,
          borderColor: 'rgba(11, 111, 79, 1)',
          backgroundColor: 'rgba(11, 111, 79, 0.1)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: true }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }
}

function buildMediaAdminQuery(page = 1) {
  const q = new URLSearchParams({
    page: String(page),
    pageSize: '60',
    type: mediaAdminFilters.type || 'all',
    sort: mediaAdminFilters.sort || 'newest',
    search: mediaAdminFilters.search || '',
  });
  return q.toString();
}

async function loadMediaAdmin() {
  if (!mediaAdminTableBody) return;
  try {
    const [mediaRes, statsRes] = await Promise.all([
      authedFetch(`/api/admin/media?${buildMediaAdminQuery()}`),
      authedFetch('/api/public-media/stats'),
    ]);
    if (mediaRes.status === 401 || statsRes.status === 401) return;
    const mediaData = await mediaRes.json();
    const statsData = await statsRes.json();
    mediaAdminCache = Array.isArray(mediaData.items) ? mediaData.items : [];
    if (mediaAdminStats) {
      mediaAdminStats.textContent =
        `Médias: ${statsData.totalMedia || 0} | ` +
        `Vues: ${statsData.totalViews || 0} | ` +
        `Téléchargements: ${statsData.totalDownloads || 0}`;
    }
    renderMediaAdminTable();
  } catch (error) {
    showToast(error.message || 'Erreur chargement galerie admin', 'error');
  }
}

function renderMediaAdminTable() {
  if (!mediaAdminTableBody) return;
  mediaAdminTableBody.innerHTML = mediaAdminCache
    .map((m) => `
      <tr data-media-name="${encodeURIComponent(m.name)}">
        <td>${escapeHtml(m.name)}</td>
        <td>${escapeHtml(m.type)}</td>
        <td><input type="number" class="media-order-input" value="${Number(m.order || 0)}" /></td>
        <td><input type="checkbox" class="media-hidden-input" ${m.hidden ? 'checked' : ''} /></td>
        <td><input type="text" class="media-caption-input" value="${escapeHtml(m.caption || '')}" maxlength="240" /></td>
        <td>${Number(m.views || 0)} vues / ${Number(m.downloads || 0)} dl / ${Number(m.favorites || 0)} ❤️</td>
        <td><button type="button" class="small-btn" data-action="save-media">Enregistrer</button></td>
      </tr>
    `)
    .join('');
}

function startAutoRefresh() {
  if (dashboardTimer) clearInterval(dashboardTimer);
  const intervalSec = Number(refreshInterval?.value || 20);
  if (!intervalSec) return;
  dashboardTimer = setInterval(() => {
    if (document.hidden) return;
    loadDashboard();
  }, intervalSec * 1000);
}

function stopAutoRefresh() {
  if (dashboardTimer) {
    clearInterval(dashboardTimer);
    dashboardTimer = null;
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    setFormLoading(loginForm, true);
    
    const { username, password } = Object.fromEntries(new FormData(loginForm).entries());
    
    if (!username || !password) {
      throw new Error('Identifiant et mot de passe requis.');
    }
    
    if (loginMsg) loginMsg.textContent = 'Connexion en cours...';

    // Login via dedicated endpoint (more reliable than Basic in some browsers)
    const loginRes = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const loginData = await loginRes.json().catch(() => ({}));
    if (!loginRes.ok) {
      throw new Error(loginData.message || 'Identifiants incorrects.');
    }

    authHeader = `Bearer ${loginData.token}`;

    // Tester l'authentification avec le dashboard
    const res = await authedFetch('/api/admin/dashboard');
    if (res.status === 401) {
      authHeader = ''; // réinitialiser
      throw new Error('Identifiants incorrects.');
    }

    showToast('✓ Connexion réussie', 'success');
    showAdminPanels();
    loginForm.reset();
    await loadDashboard();
    await loadMediaAdmin();
    await loadPostsAdmin();
    await loadStoriesAdmin();
    await loadDonationsAdmin();
    startAutoRefresh();
  } catch (error) {
    const msg = error.message || 'Erreur lors de la connexion';
    showToast(msg, 'error');
    if (loginMsg) loginMsg.textContent = msg;
    authHeader = '';
  } finally {
    setFormLoading(loginForm, false);
  }
});

// Auto-fill from query params removed (optional behavior)

refreshNow?.addEventListener('click', async () => {
  await loadDashboard();
  await loadPostsAdmin();
  await loadStoriesAdmin();
  await loadDonationsAdmin();
  await loadMediaAdmin();
});

refreshInterval?.addEventListener('change', () => {
  startAutoRefresh();
});

settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    setFormLoading(settingsForm, true);
    const payload = Object.fromEntries(new FormData(settingsForm).entries());
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
    
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Erreur lors de la mise à jour');
    }
    
    const data = await res.json();
    showToast('✓ Paramètres mis à jour', 'success');
    await loadDashboard();
  } catch (error) {
    showToast(error.message || 'Erreur lors de la mise à jour', 'error');
  } finally {
    setFormLoading(settingsForm, false);
  }
});

passwordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    setFormLoading(passwordForm, true);
    const { currentPassword, newPassword, confirmPassword } = Object.fromEntries(new FormData(passwordForm).entries());
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      throw new Error('Tous les champs sont requis.');
    }
    
    if (newPassword !== confirmPassword) {
      throw new Error('Les mots de passe ne correspondent pas.');
    }
    
    if (newPassword.length < 8) {
      throw new Error('Le mot de passe doit contenir au moins 8 caractères.');
    }

    const res = await authedFetch('/api/admin/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || data.message || 'Erreur lors du changement de mot de passe');
    }
    
    showToast('✓ Mot de passe changé avec succès. Vous devez vous reconnecter.', 'success');
    setTimeout(() => {
      logoutBtn.click();
    }, 1500);
  } catch (error) {
    showToast(error.message || 'Erreur lors du changement de mot de passe', 'error');
  } finally {
    setFormLoading(passwordForm, false);
  }
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
  try {
    const locked = Number(settingsCache.registrationLocked || 0) === 1;
    const payload = buildSettingsPayload({ registrationLocked: locked ? 0 : 1 });
    toggleRegistrationLock.disabled = true;
    const res = await authedFetch('/api/tournament-settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.message || 'Erreur lors de la mise à jour');
    }
    settingsMsg.textContent = data.message || 'Mise à jour effectuée.';
    showToast(locked ? 'Inscriptions ouvertes' : 'Inscriptions fermées', 'success');
    await loadDashboard();
  } catch (error) {
    showToast(error.message || 'Erreur lors de la mise à jour', 'error');
  } finally {
    toggleRegistrationLock.disabled = false;
  }
});

toggleVoting?.addEventListener('click', async () => {
  try {
    const enabled = Number(settingsCache.votingEnabled || 0) === 1;
    const payload = buildSettingsPayload({ votingEnabled: enabled ? 0 : 1 });
    toggleVoting.disabled = true;
    const res = await authedFetch('/api/tournament-settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.message || 'Erreur lors de la mise à jour');
    }
    settingsMsg.textContent = data.message || 'Mise à jour effectuée.';
    showToast(enabled ? 'Votes fermés' : 'Votes ouverts', 'success');
    await loadDashboard();
  } catch (error) {
    showToast(error.message || 'Erreur lors de la mise à jour', 'error');
  } finally {
    toggleVoting.disabled = false;
  }
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
  if (payload.city) payload.city = String(payload.city).trim().toUpperCase();
  if (payload.age) payload.age = Number(payload.age);
  if (payload.candidateId) payload.candidateId = Number(payload.candidateId);
  if (!payload.status) payload.status = 'pending';
  delete payload.photoFile;

  const isEdit = Number(payload.candidateId || 0) > 0;
  const res = await authedFetch(
    isEdit ? `/api/admin/candidates/${payload.candidateId}` : '/api/admin/candidates',
    {
      method: isEdit ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    }
  );
  const data = await res.json();
  candidateMsg.textContent = data.message || 'Candidat enregistré.';
  if (res.ok) {
    candidateForm.reset();
    candidateForm.querySelector('button[type="submit"]').textContent = 'Enregistrer le candidat';
    candidateMsg.textContent = payload.candidateId ? 'Candidat mis à jour.' : 'Candidat ajouté.';
    await loadDashboard();
  }
});

function handleCandidateAction(e) {
  const button = e.target.closest('button[data-action]');
  if (!button) return;
  const row = button.closest('tr[data-candidate-id]');
  const candidateId = Number(button.dataset.id || row?.dataset.candidateId || 0);
  if (!candidateId) return;
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
    if (res.ok) {
      showToast('Candidat supprimé', 'success');
      await loadDashboard();
    } else {
      showToast(data.error || data.message || 'Erreur lors de la suppression', 'error');
    }
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
  candidateForm.querySelector('button[type="submit"]').textContent = 'Mettre à jour';
  if (candidatePreview && candidate.photoUrl) {
    candidatePreview.src = candidate.photoUrl;
    candidatePreview.style.display = 'block';
  }
  candidateMsg.textContent = `Modification du candidat ${candidate.fullName}.`;
  candidateForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

adminCandidatesTable?.addEventListener('click', handleCandidateAction);
document.addEventListener('click', (e) => {
  if (e.target.closest('#adminCandidatesTable')) return;
  handleCandidateAction(e);
});

scoreForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    setFormLoading(scoreForm, true);
    const payload = Object.fromEntries(new FormData(scoreForm).entries());
    ['candidateId', 'themeChosenScore', 'themeImposedScore'].forEach((k) => {
      payload[k] = Number(payload[k] || 0);
    });

    const res = await authedFetch('/api/scores', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || data.message || 'Erreur lors de la notation');
    }
    
    const data = await res.json();
    showToast('✓ Notation enregistrée', 'success');
    scoreForm.reset();
    await loadDashboard();
  } catch (error) {
    showToast(error.message || 'Erreur lors de la notation', 'error');
  } finally {
    setFormLoading(scoreForm, false);
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
  securityPanel.classList.add('hidden');
  postsPanel.classList.add('hidden');
  storiesPanel.classList.add('hidden');
  donationsPanel.classList.add('hidden');
  mediaPanel.classList.add('hidden');
  logoutBtn.classList.add('hidden');
  passwordForm.reset();
  passwordMsg.textContent = '';
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
        `<tr><td>${idx + 1}</td><td>${escapeHtml(r.fullName)}</td><td>${escapeHtml(r.averageScore ?? '-')}</td><td>${escapeHtml(r.passages)}</td></tr>`,
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

exportSponsors?.addEventListener('click', () => {
  const rows = contactsCache
    .filter((c) => isSponsorMessage(c))
    .map((c) => ({
      id: c.id,
      createdAt: c.createdAt,
      fullName: c.fullName,
      email: c.email,
      message: c.message,
      archived: Number(c.archived || 0) === 1 ? 'oui' : 'non',
    }));
  downloadCSV('sponsors.csv', rows);
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

exportDonations?.addEventListener('click', () => {
  const rows = donationsCache.map((d) => ({
    id: d.id,
    donorName: d.donorName,
    donorEmail: d.donorEmail,
    amount: d.amount,
    currency: d.currency,
    paymentMethod: d.paymentMethod,
    status: d.status,
    createdAt: d.createdAt,
  }));
  downloadCSV('donations.csv', rows);
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

function isSponsorMessage(c) {
  const subject = (c.subject || '').toLowerCase();
  const message = (c.message || '').toLowerCase();
  return subject.includes('sponsor') || subject.includes('sponsoring') || message.includes('sponsor');
}

function renderSponsorsTable() {
  if (!sponsorsTableBody) return;
  const list = contactsCache.filter((c) => isSponsorMessage(c));
  sponsorsTableBody.innerHTML = list
    .map((c) => {
      const archiveLabel = Number(c.archived || 0) === 1 ? 'Désarchiver' : 'Archiver';
      const archiveValue = Number(c.archived || 0) === 1 ? 0 : 1;
      const statusLabel = Number(c.archived || 0) === 1 ? 'archivé' : 'actif';
      return `<tr>
        <td>${escapeHtml(c.createdAt)}</td>
        <td>${escapeHtml(c.fullName)}</td>
        <td>${escapeHtml(c.email)}</td>
        <td>${escapeHtml(c.message)}</td>
        <td>${statusLabel}</td>
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
      renderSponsorsTable();
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
      renderSponsorsTable();
    }
  }
});

mediaAdminReload?.addEventListener('click', () => {
  loadMediaAdmin();
});

mediaSearchAdmin?.addEventListener('input', debounce(() => {
  mediaAdminFilters.search = (mediaSearchAdmin.value || '').trim();
  loadMediaAdmin();
}, 250));
mediaTypeAdmin?.addEventListener('change', () => {
  mediaAdminFilters.type = mediaTypeAdmin.value || 'all';
  loadMediaAdmin();
});
mediaSortAdmin?.addEventListener('change', () => {
  mediaAdminFilters.sort = mediaSortAdmin.value || 'newest';
  loadMediaAdmin();
});

mediaAdminTableBody?.addEventListener('click', async (e) => {
  const button = e.target.closest('button[data-action="save-media"]');
  if (!button) return;
  const row = button.closest('tr[data-media-name]');
  if (!row) return;
  const mediaName = decodeURIComponent(row.dataset.mediaName || '');
  const orderInput = row.querySelector('.media-order-input');
  const hiddenInput = row.querySelector('.media-hidden-input');
  const captionInput = row.querySelector('.media-caption-input');
  const payload = {
    order: Number(orderInput?.value || 0),
    hidden: !!hiddenInput?.checked,
    caption: (captionInput?.value || '').trim(),
  };
  try {
    const res = await authedFetch(`/api/admin/media/${encodeURIComponent(mediaName)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || 'Erreur de sauvegarde');
    showToast('Média mis à jour', 'success');
    await loadMediaAdmin();
  } catch (error) {
    showToast(error.message || 'Erreur de sauvegarde', 'error');
  }
});

// ==================== POSTS MANAGEMENT ====================
let postsCache = [];

async function loadPostsAdmin() {
  try {
    const res = await authedFetch('/api/admin/posts');
    if (res.status === 401) return;
    postsCache = await res.json();
    renderPostsAdminTable();
  } catch (error) {
    showToast(error.message || 'Erreur chargement posts', 'error');
  }
}

function renderPostsAdminTable() {
  const postTableBody = document.querySelector('#postsAdminTable tbody');
  if (!postTableBody) return;
  
  postTableBody.innerHTML = postsCache.map((post) => `
    <tr>
      <td>${escapeHtml(post.authorName)}</td>
      <td>${escapeHtml(post.content.substring(0, 50))}...</td>
      <td>${formatStatus(post.status)}</td>
      <td>${escapeHtml(post.createdAt || '')}</td>
      <td>
        ${post.status === 'pending' ? `
          <button class="small-btn" data-action="approve-post" data-id="${post.id}">Approuver</button>
          <button class="small-btn danger" data-action="reject-post" data-id="${post.id}">Rejeter</button>
        ` : ''}
        <button class="small-btn danger" data-action="delete-post" data-id="${post.id}">Supprimer</button>
      </td>
    </tr>
  `).join('');
}

document.addEventListener('click', async (e) => {
  const button = e.target.closest('button[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  const id = button.dataset.id;
  
  if (action === 'approve-post') {
    try {
      const res = await authedFetch(`/api/admin/posts/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'approved' })
      });
      if (res.ok) {
        showToast('Post approuvé', 'success');
        loadPostsAdmin();
      } else {
        throw new Error('Erreur approbation');
      }
    } catch (error) {
      showToast(error.message, 'error');
    }
  }
  
  if (action === 'reject-post') {
    try {
      const res = await authedFetch(`/api/admin/posts/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'rejected' })
      });
      if (res.ok) {
        showToast('Post rejeté', 'success');
        loadPostsAdmin();
      } else {
        throw new Error('Erreur rejet');
      }
    } catch (error) {
      showToast(error.message, 'error');
    }
  }
  
  if (action === 'delete-post') {
    if (!confirm('Supprimer ce post?')) return;
    try {
      const res = await authedFetch(`/api/admin/posts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Post supprimé', 'success');
        loadPostsAdmin();
      } else {
        throw new Error('Erreur suppression');
      }
    } catch (error) {
      showToast(error.message, 'error');
    }
  }
  
  // Stories management
  if (action === 'approve-story') {
    try {
      const res = await authedFetch(`/api/admin/stories/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'approved' })
      });
      if (res.ok) {
        showToast('Story approuvée', 'success');
        loadStoriesAdmin();
      } else {
        throw new Error('Erreur approbation');
      }
    } catch (error) {
      showToast(error.message, 'error');
    }
  }
  
  if (action === 'reject-story') {
    try {
      const res = await authedFetch(`/api/admin/stories/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'rejected' })
      });
      if (res.ok) {
        showToast('Story rejetée', 'success');
        loadStoriesAdmin();
      } else {
        throw new Error('Erreur rejet');
      }
    } catch (error) {
      showToast(error.message, 'error');
    }
  }
  
  if (action === 'delete-story') {
    if (!confirm('Supprimer cette story?')) return;
    try {
      const res = await authedFetch(`/api/admin/stories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Story supprimée', 'success');
        loadStoriesAdmin();
      } else {
        throw new Error('Erreur suppression');
      }
    } catch (error) {
      showToast(error.message, 'error');
    }
  }
});

// ==================== STORIES MANAGEMENT ====================
let storiesCache = [];

async function loadStoriesAdmin() {
  try {
    const res = await authedFetch('/api/admin/stories');
    if (res.status === 401) return;
    storiesCache = await res.json();
    renderStoriesAdminTable();
  } catch (error) {
    showToast(error.message || 'Erreur chargement stories', 'error');
  }
}

function renderStoriesAdminTable() {
  const storyTableBody = document.querySelector('#storiesAdminTable tbody');
  if (!storyTableBody) return;
  
  storyTableBody.innerHTML = storiesCache.map((story) => {
    const expiresAt = new Date(story.expiresAt);
    const now = new Date();
    const hoursLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60));
    
    return `<tr>
      <td>${escapeHtml(story.authorName)}</td>
      <td>${escapeHtml(story.content.substring(0, 50))}...</td>
      <td>${formatStatus(story.status)}</td>
      <td>${hoursLeft > 0 ? hoursLeft + 'h' : 'Expirée'}</td>
      <td>
        ${story.status === 'pending' ? `
          <button class="small-btn" data-action="approve-story" data-id="${story.id}">Approuver</button>
          <button class="small-btn danger" data-action="reject-story" data-id="${story.id}">Rejeter</button>
        ` : ''}
        <button class="small-btn danger" data-action="delete-story" data-id="${story.id}">Supprimer</button>
      </td>
    </tr>`;
  }).join('');
}

// ==================== DONATIONS MANAGEMENT ====================
let donationsCache = [];

async function loadDonationsAdmin() {
  try {
    const res = await authedFetch('/api/admin/donations');
    if (res.status === 401) return;
    donationsCache = await res.json();
    renderDonationsAdminTable();
  } catch (error) {
    showToast(error.message || 'Erreur chargement donations', 'error');
  }
}

function renderDonationsAdminTable() {
  const donationTableBody = document.querySelector('#donationsAdminTable tbody');
  if (!donationTableBody) return;
  
  let totalConfirmed = 0;
  donationsCache.forEach(d => {
    if (d.status === 'confirmed') {
      totalConfirmed += parseFloat(d.amount || 0);
    }
  });
  
  donationTableBody.innerHTML = donationsCache.map((donation) => {
    const statusColor = donation.status === 'confirmed' ? '#4CAF50' : donation.status === 'pending' ? '#FF9800' : '#999';
    return `<tr>
      <td>${escapeHtml(donation.donorName)}</td>
      <td>${donation.amount} ${donation.currency}</td>
      <td>${donation.paymentMethod}</td>
      <td style="color: ${statusColor}; font-weight: bold;">${donation.status}</td>
      <td>${escapeHtml(donation.createdAt || '')}</td>
      <td>
        ${donation.status === 'pending' ? `
          <button class="small-btn" data-action="confirm-donation" data-id="${donation.id}">Confirmer</button>
          <button class="small-btn danger" data-action="cancel-donation" data-id="${donation.id}">Annuler</button>
        ` : ''}
        <button class="small-btn danger" data-action="delete-donation" data-id="${donation.id}">Supprimer</button>
      </td>
    </tr>`;
  }).join('');
  
  const donationStatsEl = document.querySelector('#donationStats');
  if (donationStatsEl) {
    donationStatsEl.textContent = `Total confirmé: ${totalConfirmed.toLocaleString('fr-FR')} FCA | Donations: ${donationsCache.length}`;
  }
}

// Handle donation actions
document.addEventListener('click', async (e) => {
  const button = e.target.closest('button[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  const id = button.dataset.id;
  
  if (action === 'confirm-donation') {
    try {
      const res = await authedFetch(`/api/admin/donations/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'confirmed' })
      });
      if (res.ok) {
        showToast('Donation confirmée', 'success');
        loadDonationsAdmin();
      } else {
        throw new Error('Erreur confirmation');
      }
    } catch (error) {
      showToast(error.message, 'error');
    }
  }
  
  if (action === 'cancel-donation') {
    if (!confirm('Annuler cette donation?')) return;
    try {
      const res = await authedFetch(`/api/admin/donations/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'cancelled' })
      });
      if (res.ok) {
        showToast('Donation annulée', 'success');
        loadDonationsAdmin();
      } else {
        throw new Error('Erreur annulation');
      }
    } catch (error) {
      showToast(error.message, 'error');
    }
  }
  
  if (action === 'delete-donation') {
    if (!confirm('Supprimer cette donation?')) return;
    try {
      const res = await authedFetch(`/api/admin/donations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Donation supprimée', 'success');
        loadDonationsAdmin();
      } else {
        throw new Error('Erreur suppression');
      }
    } catch (error) {
      showToast(error.message, 'error');
    }
  }
});

// Auto-load management tabs when logged in
document.addEventListener('adminLogin', () => {
  loadPostsAdmin();
  loadStoriesAdmin();
  loadDonationsAdmin();
});

// Refresh management data every 60 seconds
setInterval(() => {
  if (authHeader && window.location.pathname.includes('admin') && !document.hidden) {
    loadPostsAdmin();
    loadStoriesAdmin();
    loadDonationsAdmin();
    loadMediaAdmin();
  }
}, 60000);
