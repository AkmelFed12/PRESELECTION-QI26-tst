const loginForm = document.getElementById('loginForm');
const loginMsg = document.getElementById('loginMsg');
const loginCard = document.getElementById('loginCard');
const dashboard = document.getElementById('dashboard');
const settingsSection = document.getElementById('settingsSection');
const candidatesSection = document.getElementById('candidatesSection');
const scoresSection = document.getElementById('scoresSection');

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

const scoreForm = document.getElementById('scoreForm');
const scoreMsg = document.getElementById('scoreMsg');
const rankingTable = document.querySelector('#rankingTable tbody');
const exportCandidatesCsv = document.getElementById('exportCandidatesCsv');
const exportRankingCsv = document.getElementById('exportRankingCsv');
const exportRankingPdf = document.getElementById('exportRankingPdf');
const exportCandidatesPdf = document.getElementById('exportCandidatesPdf');
const newsSection = document.getElementById('newsSection');
const newsForm = document.getElementById('newsForm');
const newsMsg = document.getElementById('newsMsg');
const newsTable = document.querySelector('#newsTable tbody');

let authHeader = '';
let scheduleCache = [];

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
}

function hideAdmin() {
  dashboard.classList.add('admin-hidden');
  settingsSection.classList.add('admin-hidden');
  candidatesSection.classList.add('admin-hidden');
  scoresSection.classList.add('admin-hidden');
  newsSection?.classList.add('admin-hidden');
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
  scheduleCache = [];
  try {
    scheduleCache = JSON.parse(settings.scheduleJson || '[]') || [];
  } catch {}
  renderSchedule();

  // candidates
  renderCandidates(data.candidates || []);

  // ranking
  renderRanking(data.ranking || []);

  // news
  await loadNewsAdmin();
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

function renderRanking(list) {
  if (!rankingTable) return;
  rankingTable.innerHTML = list
    .map((r) => `<tr><td>${r.fullName || 'Inconnu'}</td><td>${r.averageScore ?? '-'}</td><td>${r.passages}</td></tr>`)
    .join('');
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('fr-FR');
}

function renderNews(list) {
  if (!newsTable) return;
  newsTable.innerHTML = list
    .map(
      (n) => `
      <tr>
        <td>${n.id}</td>
        <td>${n.title || ''}</td>
        <td>${n.status || 'draft'}</td>
        <td>${formatDate(n.createdAt)}</td>
        <td>
          <button data-edit-news="${n.id}">Modifier</button>
          <button data-delete-news="${n.id}">Supprimer</button>
        </td>
      </tr>
    `,
    )
    .join('');
}

async function loadNewsAdmin() {
  const res = await authedFetch('/api/admin/news');
  if (!res.ok) return;
  const data = await res.json();
  const items = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
  renderNews(items);
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
  }
  await loadNewsAdmin();
});

newsTable?.addEventListener('click', async (e) => {
  const editBtn = e.target.closest('button[data-edit-news]');
  const deleteBtn = e.target.closest('button[data-delete-news]');
  if (editBtn) {
    const row = editBtn.closest('tr');
    const cells = row.querySelectorAll('td');
    newsForm.querySelector('#newsId').value = cells[0].textContent;
    newsForm.querySelector('#newsTitle').value = cells[1].textContent;
    newsForm.querySelector('#newsStatus').value = cells[2].textContent || 'draft';
    const res = await authedFetch(`/api/admin/news`);
    if (res.ok) {
      const data = await res.json();
      const items = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
      const item = items.find((n) => String(n.id) === String(cells[0].textContent));
      if (item) {
        newsForm.querySelector('#newsBody').value = item.body || '';
      }
    }
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
