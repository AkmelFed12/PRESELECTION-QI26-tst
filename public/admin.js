const loginForm = document.getElementById('loginForm');
const loginMsg = document.getElementById('loginMsg');
const loginCard = document.getElementById('loginCard');
const dashboard = document.getElementById('dashboard');
const settingsSection = document.getElementById('settingsSection');
const candidatesSection = document.getElementById('candidatesSection');
const scoresSection = document.getElementById('scoresSection');
const communeStats = document.getElementById('communeStats');
const offlineBanner = document.getElementById('offlineBanner');
const globalSearchSection = document.getElementById('globalSearchSection');
const globalSearchInput = document.getElementById('globalSearchInput');
const globalSearchResults = document.getElementById('globalSearchResults');

const settingsForm = document.getElementById('settingsForm');
const settingsMsg = document.getElementById('settingsMsg');
const eventDate = document.getElementById('eventDate');
const eventTime = document.getElementById('eventTime');
const eventTitle = document.getElementById('eventTitle');
const addEventBtn = document.getElementById('addEventBtn');
const eventList = document.getElementById('eventList');

const candidateForm = document.getElementById('candidateForm');
const candidateMsg = document.getElementById('candidateMsg');
const candidatesTable = document.querySelector('#candidatesTable tbody');
const candidateSearch = document.getElementById('candidateSearch');
const printAttendanceBtn = document.getElementById('printAttendanceBtn');

const scoreForm = document.getElementById('scoreForm');
const scoreMsg = document.getElementById('scoreMsg');
const rankingTable = document.querySelector('#rankingTable tbody');
const exportCandidatesCsv = document.getElementById('exportCandidatesCsv');
const exportRankingCsv = document.getElementById('exportRankingCsv');
const exportRankingPdf = document.getElementById('exportRankingPdf');
const exportCandidatesPdf = document.getElementById('exportCandidatesPdf');
const exportFullPdf = document.getElementById('exportFullPdf');
const newsSection = document.getElementById('newsSection');
const newsForm = document.getElementById('newsForm');
const newsMsg = document.getElementById('newsMsg');
const newsTable = document.querySelector('#newsTable tbody');
const newsFeatured = document.getElementById('newsFeatured');
const newsCategory = document.getElementById('newsCategory');
const newsPublishAt = document.getElementById('newsPublishAt');
const newsImageUrl = document.getElementById('newsImageUrl');
const newsImageFile = document.getElementById('newsImageFile');
const newsImagePreview = document.getElementById('newsImagePreview');
const newsImagesList = document.getElementById('newsImagesList');
const newsImagesClear = document.getElementById('newsImagesClear');

const sponsorsSection = document.getElementById('sponsorsSection');
const sponsorForm = document.getElementById('sponsorForm');
const sponsorMsg = document.getElementById('sponsorMsg');
const sponsorsTable = document.querySelector('#sponsorsTable tbody');
const sponsorLogoUrl = document.getElementById('sponsorLogoUrl');
const sponsorFilesList = document.getElementById('sponsorFilesList');
const sponsorLogoFile = document.getElementById('sponsorLogoFile');
const sponsorLogoPreview = document.getElementById('sponsorLogoPreview');
const sponsorLogoReplace = document.getElementById('sponsorLogoReplace');
const sponsorLogoRemove = document.getElementById('sponsorLogoRemove');

const financeSection = document.getElementById('financeSection');
const donationsTable = document.querySelector('#donationsTable tbody');
const donationCount = document.getElementById('donationCount');
const donationTotal = document.getElementById('donationTotal');
const sponsorApprovedCount = document.getElementById('sponsorApprovedCount');
const sponsorPendingCount = document.getElementById('sponsorPendingCount');
const donationChart = document.getElementById('donationChart');
const registrationChart = document.getElementById('registrationChart');

const pollSection = document.getElementById('pollSection');
const pollForm = document.getElementById('pollForm');
const pollMsg = document.getElementById('pollMsg');
const pollQuestionInput = document.getElementById('pollQuestionInput');
const pollOptionsInput = document.getElementById('pollOptionsInput');
const pollActive = document.getElementById('pollActive');

let authHeader = '';
let scheduleCache = [];
let candidatesCache = [];
let newsCache = [];
let sponsorsCache = [];
let newsImages = [];

const manualNameMap = {
  "2250564108763": "OUATTARA FATOUMATA",
  "2250501952414": "OUATTARA HAWA",
  "2250103665205": "KONE SIRAH",
  "2250152606015": "KAGONE FATIMA AIDA DJAMELLA",
  "224612694187": "DIALLO IBRAHIM KHALIL",
  "2250554013332": "COULIBALY MIRIAM",
  "2250171715400": "MOHAMED AWWAL",
  "22676035015": "KAMAGATE MATENIN",
  "2250778762501": "SAYORE NASSIRATOU",
  "2250140719281": "KOKORA MOHAMED OUATTARA",
  "2250143513550": "FOFANA SANY",
  "2250105721307": "DIABY AWA",
  "2250140443333": "DIAKHITE IBRAHIM",
  "2250575933452": "SIDIBE MOHAMED",
  "2250502118573": "DIALLO RAMATOULAYE WALIYA",
  "2250787898322": "BALLO KASSIM",
  "2250779831850": "TARNAGUEDA OUMOU",
  "2250555821712": "BAH KHADIDJA",
  "2250501514168": "DIALLO AICHA",
  "2250594716937": "TRAORE ABDOUL RAOUL",
  "2250720710513": "KABA MARIAM",
  "2250101664229": "TRAORE MOUHAMMAD ABOUBAKR",
  "2250546051686": "BAMBA VASSI SOULEYMANE",
  "2250503525546": "SYLLA ABOUBAKAR SIDIK ABDOUL AZIZ",
  "2250102138333": "KONE MAIMOUNA",
  "2250748375320": "DIABATÉ AWA",
  "2250586403819": "OYEWO FATIATOU OLAMIDE",
  "2250160311520": "DIALLO FATIMA",
  "2250564292128": "KOUYATE AMARA",
  "2250151728966": "TRAORE MOHAMED AMINE",
  "2250502203868": "COULIBALY ROKIA",
  "2250170703125": "KONDA AMSETOU",
  "2250595194172": "BAH MARIAM",
  "2250747964642": "TRAORE ADJARA",
  "2250748745910": "KOUASSI SAHRA LESLIE",
  "2250584233531": "OUATTARA FAOUZIYA"
};

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function resolveName(candidate) {
  const current = candidate.fullName || candidate.name || '';
  if (current && current !== 'Inconnu') return current;
  const digits = digitsOnly(candidate.whatsapp);
  if (manualNameMap[digits]) return manualNameMap[digits];
  if (digits.length >= 8) {
    const last8 = digits.slice(-8);
    const entry = Object.entries(manualNameMap).find(([key]) => key.endsWith(last8));
    if (entry) return entry[1];
  }
  return 'Inconnu';
}

function showAdmin() {
  loginCard.classList.add('admin-hidden');
  dashboard.classList.remove('admin-hidden');
  settingsSection.classList.remove('admin-hidden');
  candidatesSection.classList.remove('admin-hidden');
  scoresSection.classList.remove('admin-hidden');
  newsSection?.classList.remove('admin-hidden');
  sponsorsSection?.classList.remove('admin-hidden');
  globalSearchSection?.classList.remove('admin-hidden');
  financeSection?.classList.remove('admin-hidden');
  pollSection?.classList.remove('admin-hidden');
}

function hideAdmin() {
  dashboard.classList.add('admin-hidden');
  settingsSection.classList.add('admin-hidden');
  candidatesSection.classList.add('admin-hidden');
  scoresSection.classList.add('admin-hidden');
  newsSection?.classList.add('admin-hidden');
  sponsorsSection?.classList.add('admin-hidden');
  globalSearchSection?.classList.add('admin-hidden');
  financeSection?.classList.add('admin-hidden');
  pollSection?.classList.add('admin-hidden');
  loginCard.classList.remove('admin-hidden');
}

function setStatus(el, text) {
  if (el) el.textContent = text || '';
}

async function authedFetch(url, options = {}) {
  if (!authHeader) {
    const stored = localStorage.getItem('adminAuth');
    if (stored) authHeader = stored;
  }
  const isFormData = options.body instanceof FormData;
  return fetch(url, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      Authorization: authHeader,
      ...(options.headers || {})
    }
  });
}

async function loadDashboard() {
  const res = await authedFetch('/api/admin/dashboard');
  if (!res.ok) {
    setStatus(loginMsg, 'Erreur chargement admin.');
    const cached = localStorage.getItem('adminCache');
    if (cached) {
      try {
        const data = JSON.parse(cached);
        renderFromCache(data);
        if (offlineBanner) offlineBanner.style.display = 'block';
      } catch {}
    }
    return;
  }
  const data = await res.json();
  localStorage.setItem('adminCache', JSON.stringify(data));
  if (offlineBanner) offlineBanner.style.display = 'none';
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
  scheduleCache = [];
  try {
    scheduleCache = JSON.parse(settings.scheduleJson || '[]') || [];
  } catch {}
  renderSchedule();

  // candidates
  candidatesCache = data.candidates || [];
  renderCandidates(candidatesCache);
  renderCommuneStats(candidatesCache);

  // ranking
  renderRanking(data.ranking || []);

  // news
  await loadNewsAdmin();

  // sponsors
  await loadSponsors();

  renderGlobalSearch();
  await loadFinances();
  await loadPollAdmin();
}

function renderFromCache(data) {
  document.getElementById('statCandidates').textContent = data.stats?.candidates ?? 0;
  document.getElementById('statVotes').textContent = Array.isArray(data.votes)
    ? data.votes.reduce((sum, v) => sum + Number(v.totalVotes || 0), 0)
    : 0;
  document.getElementById('statScores').textContent = Array.isArray(data.ranking)
    ? data.ranking.reduce((sum, r) => sum + Number(r.passages || 0), 0)
    : 0;
  const settings = data.settings || {};
  Array.from(settingsForm.elements).forEach((el) => {
    if (!el.name) return;
    el.value = settings[el.name] ?? '';
  });
  scheduleCache = [];
  try {
    scheduleCache = JSON.parse(settings.scheduleJson || '[]') || [];
  } catch {}
  renderSchedule();
  candidatesCache = data.candidates || [];
  renderCandidates(candidatesCache);
  renderCommuneStats(candidatesCache);
  renderRanking(data.ranking || []);
  renderGlobalSearch();
}

function renderCandidates(list) {
  if (!candidatesTable) return;
  candidatesTable.innerHTML = list
    .map(
      (c) => `
      <tr>
        <td>${c.id}</td>
        <td>${resolveName(c)}</td>
        <td>${c.whatsapp || ''}</td>
        <td>${c.city || ''}</td>
        <td>${c.status || 'pending'}</td>
        <td><button data-edit="${c.id}">Modifier</button></td>
      </tr>
    `,
    )
    .join('');
}

function printAttendanceList() {
  const list = Array.isArray(candidatesCache) ? candidatesCache.slice() : [];
  if (!list.length) {
    alert('Aucun candidat à imprimer.');
    return;
  }
  const sorted = list.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
  const rows = sorted
    .map(
      (c, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${c.id || ''}</td>
          <td>${resolveName(c)}</td>
          <td>${c.whatsapp || ''}</td>
          <td>${c.city || ''}</td>
          <td style="height:26px;"></td>
          <td style="height:26px;"></td>
        </tr>
      `,
    )
    .join('');
  const html = `
    <html>
      <head>
        <title>Liste d'appel — Quiz Islamique 2026</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; }
          h1 { text-align: center; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f3f3f3; }
        </style>
      </head>
      <body>
        <h1>Liste d'appel — Quiz Islamique 2026</h1>
        <p>Date : _____________</p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>ID</th>
              <th>Nom</th>
              <th>WhatsApp</th>
              <th>Commune</th>
              <th>Présent</th>
              <th>Signature</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>`;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

function filterCandidates() {
  const query = (candidateSearch?.value || '').trim().toLowerCase();
  if (!query) {
    renderCandidates(candidatesCache);
    return;
  }
  const filtered = candidatesCache.filter((c) => {
    const name = resolveName(c).toLowerCase();
    const city = (c.city || '').toLowerCase();
    const phone = (c.whatsapp || '').toLowerCase();
    return name.includes(query) || city.includes(query) || phone.includes(query);
  });
  renderCandidates(filtered);
}

function renderRanking(list) {
  if (!rankingTable) return;
  rankingTable.innerHTML = list
    .map((r) => `<tr><td>${r.fullName || 'Inconnu'}</td><td>${r.averageScore ?? '-'}</td><td>${r.passages}</td></tr>`)
    .join('');
}

function renderCommuneStats(list) {
  if (!communeStats) return;
  if (!list.length) {
    communeStats.textContent = 'Aucune donnée.';
    return;
  }
  const counts = list.reduce((acc, c) => {
    const key = (c.city || 'INCONNU').toUpperCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, v]) => v));
  communeStats.innerHTML = entries
    .map(
      ([name, value]) => `
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
        <div style="min-width:90px; font-weight:600;">${name}</div>
        <div style="flex:1; background:#efe6d6; border-radius:999px; height:10px; position:relative;">
          <div style="background:var(--emerald); width:${Math.round((value / max) * 100)}%; height:10px; border-radius:999px;"></div>
        </div>
        <div style="width:32px; text-align:right;">${value}</div>
      </div>
    `,
    )
    .join('');
}

function renderMonthlyBarChart(target, data) {
  if (!target) return;
  if (!data.length) {
    target.textContent = 'Aucune donnée.';
    return;
  }
  const max = Math.max(...data.map((d) => d.value));
  target.innerHTML = data
    .map(
      (d) => `
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
        <div style="min-width:48px;">${d.label}</div>
        <div style="flex:1; background:#efe6d6; border-radius:999px; height:10px;">
          <div style="background:var(--emerald); width:${max ? Math.round((d.value / max) * 100) : 0}%; height:10px; border-radius:999px;"></div>
        </div>
        <div style="width:36px; text-align:right;">${d.value}</div>
      </div>
    `,
    )
    .join('');
}

function buildMonthlySeries(items, dateKey, months = 6) {
  const now = new Date();
  const series = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString('fr-FR', { month: 'short' });
    series.push({ year: d.getFullYear(), month: d.getMonth(), label, value: 0 });
  }
  items.forEach((item) => {
    const raw = item[dateKey] || item[dateKey.toLowerCase()];
    if (!raw) return;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return;
    series.forEach((s) => {
      if (s.year === d.getFullYear() && s.month === d.getMonth()) {
        s.value += 1;
      }
    });
  });
  return series.map(({ label, value }) => ({ label, value }));
}

function renderGlobalSearch() {
  if (!globalSearchResults) return;
  const query = (globalSearchInput?.value || '').trim().toLowerCase();
  if (!query) {
    globalSearchResults.textContent = 'Aucun résultat.';
    return;
  }
  const results = [];
  candidatesCache.forEach((c) => {
    const name = resolveName(c).toLowerCase();
    const city = (c.city || '').toLowerCase();
    const phone = (c.whatsapp || '').toLowerCase();
    if (name.includes(query) || city.includes(query) || phone.includes(query)) {
      results.push(`Candidat: ${resolveName(c)} — ${c.city || ''} — ${c.whatsapp || ''}`);
    }
  });
  newsCache.forEach((n) => {
    const title = (n.title || '').toLowerCase();
    const body = (n.body || '').toLowerCase();
    if (title.includes(query) || body.includes(query)) {
      results.push(`Actualité: ${n.title || ''}`);
    }
  });
  sponsorsCache.forEach((s) => {
    const name = (s.name || '').toLowerCase();
    const contact = (s.contactname || s.contactName || '').toLowerCase();
    if (name.includes(query) || contact.includes(query)) {
      results.push(`Sponsor: ${s.name || ''}`);
    }
  });
  globalSearchResults.innerHTML = results.length
    ? results.map((r) => `<div>${r}</div>`).join('')
    : 'Aucun résultat.';
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('fr-FR');
}

async function uploadNewsImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await authedFetch('/api/upload/photo', {
    method: 'POST',
    headers: {},
    body: formData,
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  return data.url || null;
}

async function uploadSponsorLogo(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await authedFetch('/api/upload/photo', {
    method: 'POST',
    headers: {},
    body: formData,
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  return data.url || null;
}

function renderNews(list) {
  if (!newsTable) return;
  newsTable.innerHTML = list
    .map(
      (n) => `
      <tr>
        <td>${n.id}</td>
        <td>${n.title || ''}</td>
        <td>${n.status || 'draft'}${n.featured ? ' · À la une' : ''}${n.category ? ` · ${n.category}` : ''}</td>
        <td>${formatDate(n.createdAt)}</td>
        <td>
          <button data-edit-news="${n.id}">Modifier</button>
          <button data-toggle-status="${n.id}" data-next-status="${n.status === 'published' ? 'draft' : 'published'}">
            ${n.status === 'published' ? 'Dépublier' : 'Publier'}
          </button>
          <button data-toggle-feature="${n.id}" data-next-feature="${n.featured ? 'false' : 'true'}">
            ${n.featured ? 'Retirer la une' : 'Mettre à la une'}
          </button>
          <button data-delete-news="${n.id}">Supprimer</button>
        </td>
      </tr>
    `,
    )
    .join('');
}

function parseImagesInput(value) {
  if (!value) return [];
  return value
    .split(/[\n,]+/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function renderNewsImagesPreview() {
  if (!newsImagePreview) return;
  if (!newsImages.length) {
    newsImagePreview.textContent = 'Aucun aperçu';
    return;
  }
  newsImagePreview.innerHTML = newsImages
    .map(
      (url) =>
        `<img src="${url}" alt="Aperçu" style="max-width:120px; border-radius:8px; margin:4px;" />`,
    )
    .join('');
}

async function loadNewsAdmin() {
  const res = await authedFetch('/api/admin/news');
  if (!res.ok) return;
  const data = await res.json();
  const items = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
  newsCache = items;
  renderNews(items);
}

function renderSponsors(list) {
  if (!sponsorsTable) return;
  sponsorsTable.innerHTML = list
    .map(
      (s) => `
      <tr>
        <td>${s.id}</td>
        <td>${s.name || ''}</td>
        <td>${s.contactname || s.contactName || ''}</td>
        <td>${s.status || 'pending'}</td>
        <td>
          <button data-edit-sponsor="${s.id}">Modifier</button>
          <button data-approve-sponsor="${s.id}">Approuver</button>
          <button data-pending-sponsor="${s.id}">Mettre en attente</button>
          <button data-delete-sponsor="${s.id}">Supprimer</button>
        </td>
      </tr>
    `,
    )
    .join('');
}

async function loadSponsors() {
  const res = await authedFetch('/api/admin/sponsors');
  if (!res.ok) return;
  const data = await res.json();
  const items = Array.isArray(data) ? data : [];
  sponsorsCache = items;
  renderSponsors(items);
}

async function loadFinances() {
  const res = await authedFetch('/api/admin/donations');
  if (res.ok) {
    const donations = await res.json();
    const list = Array.isArray(donations) ? donations : [];
    const confirmed = list.filter((d) => (d.status || '').toLowerCase() === 'confirmed');
    if (donationCount) donationCount.textContent = confirmed.length;
    if (donationTotal) {
      const total = confirmed.reduce((sum, d) => sum + Number(d.amount || 0), 0);
      donationTotal.textContent = total.toFixed(0);
    }
    if (donationsTable) {
      donationsTable.innerHTML = list
        .slice(0, 20)
        .map(
          (d) => `
          <tr>
            <td>${d.id}</td>
            <td>${d.donorname || d.donorName || ''}</td>
            <td>${d.donoremail || d.donorEmail || ''}</td>
            <td>${d.amount || ''}</td>
            <td>${d.status || ''}</td>
            <td>
              <button data-confirm-donation="${d.id}">Confirmer</button>
            </td>
          </tr>
        `,
        )
        .join('');
    }
    const donationSeries = buildMonthlySeries(list, 'createdAt', 6);
    renderMonthlyBarChart(donationChart, donationSeries);
  }
  const approved = sponsorsCache.filter((s) => (s.status || '').toLowerCase() === 'approved').length;
  const pending = sponsorsCache.filter((s) => (s.status || '').toLowerCase() === 'pending').length;
  if (sponsorApprovedCount) sponsorApprovedCount.textContent = approved;
  if (sponsorPendingCount) sponsorPendingCount.textContent = pending;
  const registrationSeries = buildMonthlySeries(candidatesCache, 'createdAt', 6);
  renderMonthlyBarChart(registrationChart, registrationSeries);
}

async function loadPollAdmin() {
  const res = await authedFetch('/api/admin/poll');
  if (!res.ok) return;
  const data = await res.json();
  if (!data.poll) return;
  if (pollQuestionInput) pollQuestionInput.value = data.poll.question || '';
  if (pollOptionsInput) {
    pollOptionsInput.value = (data.poll.options || []).map((o) => o.label || o).join('\n');
  }
  if (pollActive) pollActive.value = data.poll.active ? '1' : '0';
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
  Object.keys(payload).forEach((k) => {
    if (k === 'announcementText') return;
    payload[k] = Number(payload[k]);
  });
  payload.scheduleJson = JSON.stringify(scheduleCache);
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

candidateSearch?.addEventListener('input', () => {
  filterCandidates();
});

printAttendanceBtn?.addEventListener('click', printAttendanceList);

globalSearchInput?.addEventListener('input', () => {
  renderGlobalSearch();
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

newsForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus(newsMsg, 'Sauvegarde...');
  const payload = Object.fromEntries(new FormData(newsForm).entries());
  payload.featured = payload.featured === 'true';
  const manualImages = parseImagesInput(newsImagesList?.value || '');
  newsImages = Array.from(new Set([...newsImages, ...manualImages]));
  payload.images = newsImages;
  if (payload.publishAt) {
    payload.publishAt = new Date(payload.publishAt).toISOString();
  }
  const id = payload.id;
  delete payload.id;
  const res = await authedFetch(id ? `/api/admin/news/${id}` : '/api/admin/news', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  setStatus(newsMsg, data.message || (res.ok ? 'Actualité enregistrée.' : 'Erreur.'));
  if (res.ok) {
    newsForm.reset();
    newsImages = [];
    if (newsImagePreview) newsImagePreview.textContent = 'Aucun aperçu';
  }
  await loadNewsAdmin();
});

newsImageFile?.addEventListener('change', async () => {
  const files = Array.from(newsImageFile.files || []);
  if (!files.length) return;
  setStatus(newsMsg, 'Upload images...');
  for (const file of files) {
    const url = await uploadNewsImage(file);
    if (url) {
      newsImages.push(url);
    }
  }
  newsImages = Array.from(new Set(newsImages));
  renderNewsImagesPreview();
  setStatus(newsMsg, 'Images téléversées.');
});

newsImagesClear?.addEventListener('click', () => {
  newsImages = [];
  if (newsImagesList) newsImagesList.value = '';
  renderNewsImagesPreview();
});

newsImagesList?.addEventListener('input', () => {
  const manualImages = parseImagesInput(newsImagesList.value);
  newsImages = Array.from(new Set(manualImages));
  renderNewsImagesPreview();
});

newsTable?.addEventListener('click', async (e) => {
  const editBtn = e.target.closest('button[data-edit-news]');
  const deleteBtn = e.target.closest('button[data-delete-news]');
  const toggleStatusBtn = e.target.closest('button[data-toggle-status]');
  const toggleFeatureBtn = e.target.closest('button[data-toggle-feature]');
  if (editBtn) {
    const row = editBtn.closest('tr');
    const cells = row.querySelectorAll('td');
    newsForm.querySelector('#newsId').value = cells[0].textContent;
    newsForm.querySelector('#newsTitle').value = cells[1].textContent;
    const res = await authedFetch(`/api/admin/news`);
    if (res.ok) {
      const data = await res.json();
      const items = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
      const item = items.find((n) => String(n.id) === String(cells[0].textContent));
      if (item) {
        newsForm.querySelector('#newsBody').value = item.body || '';
        newsForm.querySelector('#newsStatus').value = item.status || 'draft';
        if (newsFeatured) newsFeatured.value = item.featured ? 'true' : 'false';
        if (newsCategory) newsCategory.value = item.category || '';
        if (newsImageUrl) newsImageUrl.value = item.imageurl || item.imageUrl || '';
        if (newsPublishAt) {
          const ts = item.publishat || item.publishAt;
          newsPublishAt.value = ts ? new Date(ts).toISOString().slice(0, 16) : '';
        }
        const rawImages = item.imagesjson || item.imagesJson;
        try {
          newsImages = rawImages ? JSON.parse(rawImages) : [];
        } catch {
          newsImages = [];
        }
        const mainUrl = item.imageurl || item.imageUrl;
        if (mainUrl) newsImages.unshift(mainUrl);
        newsImages = Array.from(new Set(newsImages));
        if (newsImagesList) newsImagesList.value = newsImages.join(', ');
        renderNewsImagesPreview();
      }
    }
    return;
  }
  if (toggleStatusBtn) {
    const id = toggleStatusBtn.dataset.toggleStatus;
    const nextStatus = toggleStatusBtn.dataset.nextStatus || 'draft';
    await authedFetch(`/api/admin/news/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus }),
    });
    await loadNewsAdmin();
    return;
  }
  if (toggleFeatureBtn) {
    const id = toggleFeatureBtn.dataset.toggleFeature;
    const nextFeature = toggleFeatureBtn.dataset.nextFeature === 'true';
    await authedFetch(`/api/admin/news/${id}/feature`, {
      method: 'PATCH',
      body: JSON.stringify({ featured: nextFeature }),
    });
    await loadNewsAdmin();
    return;
  }
  if (deleteBtn) {
    const id = deleteBtn.dataset.deleteNews;
    const res = await authedFetch(`/api/admin/news/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setStatus(newsMsg, 'Supprimé.');
      await loadNewsAdmin();
    }
  }
});

sponsorForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus(sponsorMsg, 'Sauvegarde...');
  const payload = Object.fromEntries(new FormData(sponsorForm).entries());
  if (sponsorFilesList) {
    payload.files = (sponsorFilesList.value || '')
      .split(/[\n,]+/)
      .map((v) => v.trim())
      .filter(Boolean);
  }
  const id = payload.id;
  delete payload.id;
  const res = await authedFetch(id ? `/api/admin/sponsors/${id}` : '/api/admin/sponsors', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  setStatus(sponsorMsg, data.message || (res.ok ? 'Sponsor enregistré.' : 'Erreur.'));
  if (res.ok) sponsorForm.reset();
  await loadSponsors();
});

sponsorLogoFile?.addEventListener('change', async () => {
  const file = sponsorLogoFile.files?.[0];
  if (!file) return;
  setStatus(sponsorMsg, 'Upload logo...');
  const url = await uploadSponsorLogo(file);
  if (url) {
    if (sponsorLogoUrl) sponsorLogoUrl.value = url;
    if (sponsorLogoPreview) {
      sponsorLogoPreview.innerHTML = `<img src="${url}" alt="Logo" style="max-width:160px; border-radius:8px;" />`;
    }
    setStatus(sponsorMsg, 'Logo téléversé.');
  } else {
    setStatus(sponsorMsg, 'Erreur upload logo.');
  }
});

sponsorLogoReplace?.addEventListener('click', () => {
  sponsorLogoFile?.click();
});

sponsorLogoRemove?.addEventListener('click', () => {
  if (sponsorLogoUrl) sponsorLogoUrl.value = '';
  if (sponsorLogoFile) sponsorLogoFile.value = '';
  if (sponsorLogoPreview) sponsorLogoPreview.textContent = 'Aucun aperçu';
  setStatus(sponsorMsg, 'Logo supprimé (pensez à enregistrer).');
});

sponsorsTable?.addEventListener('click', async (e) => {
  const editBtn = e.target.closest('button[data-edit-sponsor]');
  const deleteBtn = e.target.closest('button[data-delete-sponsor]');
  const approveBtn = e.target.closest('button[data-approve-sponsor]');
  const pendingBtn = e.target.closest('button[data-pending-sponsor]');
  if (editBtn) {
    const id = editBtn.dataset.editSponsor;
    const res = await authedFetch('/api/admin/sponsors');
    if (res.ok) {
      const data = await res.json();
      const items = Array.isArray(data) ? data : [];
      const item = items.find((s) => String(s.id) === String(id));
      if (item) {
        sponsorForm.querySelector('#sponsorId').value = item.id;
        sponsorForm.querySelector('#sponsorName').value = item.name || '';
        sponsorForm.querySelector('#sponsorContact').value = item.contactname || item.contactName || '';
        sponsorForm.querySelector('#sponsorEmail').value = item.email || '';
        sponsorForm.querySelector('#sponsorPhone').value = item.phone || '';
        sponsorForm.querySelector('#sponsorAmount').value = item.amount || '';
        sponsorForm.querySelector('#sponsorWebsite').value = item.website || '';
        sponsorForm.querySelector('#sponsorLogoUrl').value = item.logourl || item.logoUrl || '';
        sponsorForm.querySelector('#sponsorStatus').value = item.status || 'pending';
        if (sponsorFilesList) {
          const raw = item.filesjson || item.filesJson;
          let files = [];
          try {
            files = raw ? JSON.parse(raw) : [];
          } catch {}
          sponsorFilesList.value = files.join(', ');
        }
        if (sponsorLogoPreview) {
          const logo = item.logourl || item.logoUrl;
          sponsorLogoPreview.innerHTML = logo
            ? `<img src="${logo}" alt="Logo" style="max-width:160px; border-radius:8px;" />`
            : 'Aucun aperçu';
        }
      }
    }
  }
  if (deleteBtn) {
    const id = deleteBtn.dataset.deleteSponsor;
    const res = await authedFetch(`/api/admin/sponsors/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setStatus(sponsorMsg, 'Supprimé.');
      await loadSponsors();
    }
  }
  if (approveBtn) {
    const id = approveBtn.dataset.approveSponsor;
    const item = sponsorsCache.find((s) => String(s.id) === String(id));
    if (item) {
      await authedFetch(`/api/admin/sponsors/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: item.name || '',
          contactName: item.contactname || item.contactName || '',
          email: item.email || '',
          phone: item.phone || '',
          amount: item.amount || '',
          logoUrl: item.logourl || item.logoUrl || '',
          website: item.website || '',
          files: (() => {
            try { return item.filesjson ? JSON.parse(item.filesjson) : item.filesJson ? JSON.parse(item.filesJson) : []; }
            catch { return []; }
          })(),
          status: 'approved'
        })
      });
    }
    await loadSponsors();
    await loadFinances();
  }
  if (pendingBtn) {
    const id = pendingBtn.dataset.pendingSponsor;
    const item = sponsorsCache.find((s) => String(s.id) === String(id));
    if (item) {
      await authedFetch(`/api/admin/sponsors/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: item.name || '',
          contactName: item.contactname || item.contactName || '',
          email: item.email || '',
          phone: item.phone || '',
          amount: item.amount || '',
          logoUrl: item.logourl || item.logoUrl || '',
          website: item.website || '',
          files: (() => {
            try { return item.filesjson ? JSON.parse(item.filesjson) : item.filesJson ? JSON.parse(item.filesJson) : []; }
            catch { return []; }
          })(),
          status: 'pending'
        })
      });
    }
    await loadSponsors();
    await loadFinances();
  }
});

donationsTable?.addEventListener('click', async (e) => {
  const confirmBtn = e.target.closest('button[data-confirm-donation]');
  if (!confirmBtn) return;
  const id = confirmBtn.dataset.confirmDonation;
  await authedFetch(`/api/admin/donations/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'confirmed' })
  });
  await loadFinances();
});

pollForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!pollQuestionInput || !pollOptionsInput || !pollActive) return;
  setStatus(pollMsg, 'Enregistrement...');
  const question = pollQuestionInput.value.trim();
  const options = pollOptionsInput.value
    .split('\n')
    .map((v) => v.trim())
    .filter(Boolean);
  const active = pollActive.value === '1';
  const res = await authedFetch('/api/admin/poll', {
    method: 'POST',
    body: JSON.stringify({ question, options, active })
  });
  const data = await res.json().catch(() => ({}));
  setStatus(pollMsg, data.message || (res.ok ? 'Sondage mis à jour.' : 'Erreur.'));
  await loadPollAdmin();
});

// Force login each time for security
hideAdmin();
localStorage.removeItem('adminAuth');

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

const exportCandidatesXls = document.createElement('button');
exportCandidatesXls.className = 'btn-primary';
exportCandidatesXls.type = 'button';
exportCandidatesXls.textContent = 'Exporter candidats (Excel)';
exportCandidatesCsv?.parentElement?.appendChild(exportCandidatesXls);

const exportRankingXls = document.createElement('button');
exportRankingXls.className = 'btn-primary';
exportRankingXls.type = 'button';
exportRankingXls.textContent = 'Exporter classement (Excel)';
exportRankingCsv?.parentElement?.appendChild(exportRankingXls);

exportCandidatesXls.addEventListener('click', async () => {
  const res = await authedFetch('/api/admin/export/candidates-xls');
  if (!res.ok) return;
  const text = await res.text();
  downloadFile('candidats.xls', text);
});

exportRankingXls.addEventListener('click', async () => {
  const res = await authedFetch('/api/admin/export/ranking-xls');
  if (!res.ok) return;
  const text = await res.text();
  downloadFile('classement.xls', text);
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

exportCandidatesPdf?.addEventListener('click', () => {
  const rows = Array.from(document.querySelectorAll('#candidatesTable tbody tr'));
  if (!rows.length) return;
  const bodyRows = rows
    .map((row) => {
      const cells = row.querySelectorAll('td');
      return `<tr><td>${cells[0].textContent}</td><td>${cells[1].textContent}</td><td>${cells[2].textContent}</td><td>${cells[3].textContent}</td><td>${cells[4].textContent}</td></tr>`;
    })
    .join('');
  const html = `
    <html>
      <head>
        <title>Liste des candidats</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; }
          h1 { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f3f3f3; }
        </style>
      </head>
      <body>
        <h1>Liste des candidats — Quiz Islamique 2026</h1>
        <table>
          <thead><tr><th>ID</th><th>Nom</th><th>WhatsApp</th><th>Commune</th><th>Statut</th></tr></thead>
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

exportFullPdf?.addEventListener('click', () => {
  const statsCandidates = document.getElementById('statCandidates')?.textContent || '0';
  const statsVotes = document.getElementById('statVotes')?.textContent || '0';
  const statsScores = document.getElementById('statScores')?.textContent || '0';
  const candidateRows = Array.from(document.querySelectorAll('#candidatesTable tbody tr'))
    .map((row) => {
      const cells = row.querySelectorAll('td');
      return `<tr><td>${cells[0].textContent}</td><td>${cells[1].textContent}</td><td>${cells[2].textContent}</td><td>${cells[3].textContent}</td><td>${cells[4].textContent}</td></tr>`;
    })
    .join('');
  const rankingRows = Array.from(document.querySelectorAll('#rankingTable tbody tr'))
    .map((row) => {
      const cells = row.querySelectorAll('td');
      return `<tr><td>${cells[0].textContent}</td><td>${cells[1].textContent}</td><td>${cells[2].textContent}</td></tr>`;
    })
    .join('');
  const communeHtml = communeStats?.innerHTML || '';
  const html = `
    <html>
      <head>
        <title>Rapport complet — Quiz Islamique 2026</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; }
          h1 { text-align: center; }
          h2 { margin-top: 24px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f3f3f3; }
        </style>
      </head>
      <body>
        <h1>Rapport complet — Quiz Islamique 2026</h1>
        <h2>Statistiques</h2>
        <p>Candidats inscrits: <strong>${statsCandidates}</strong></p>
        <p>Votes exprimés: <strong>${statsVotes}</strong></p>
        <p>Passages notés: <strong>${statsScores}</strong></p>
        <h2>Statistiques par commune</h2>
        <div>${communeHtml}</div>
        <h2>Liste des candidats</h2>
        <table>
          <thead><tr><th>ID</th><th>Nom</th><th>WhatsApp</th><th>Commune</th><th>Statut</th></tr></thead>
          <tbody>${candidateRows}</tbody>
        </table>
        <h2>Classement</h2>
        <table>
          <thead><tr><th>Candidat</th><th>Moyenne</th><th>Passages</th></tr></thead>
          <tbody>${rankingRows}</tbody>
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
function renderSchedule() {
  if (!eventList) return;
  if (!scheduleCache.length) {
    eventList.textContent = 'Aucun événement';
    return;
  }
  eventList.innerHTML = `
    <table class="table">
      <thead><tr><th>Date</th><th>Heure</th><th>Événement</th><th>Action</th></tr></thead>
      <tbody>
        ${scheduleCache
          .map(
            (e, idx) => `<tr>
              <td>${e.date || ''}</td>
              <td>${e.time || ''}</td>
              <td>${e.title || ''}</td>
              <td><button data-remove="${idx}">Supprimer</button></td>
            </tr>`,
          )
          .join('')}
      </tbody>
    </table>
  `;
}

addEventBtn?.addEventListener('click', () => {
  const date = eventDate?.value || '';
  const time = eventTime?.value || '';
  const title = eventTitle?.value || '';
  if (!date || !title) return;
  scheduleCache.push({ date, time, title });
  if (eventDate) eventDate.value = '';
  if (eventTime) eventTime.value = '';
  if (eventTitle) eventTitle.value = '';
  renderSchedule();
});

eventList?.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-remove]');
  if (!btn) return;
  const idx = Number(btn.dataset.remove);
  scheduleCache.splice(idx, 1);
  renderSchedule();
});
