const form = document.getElementById('memberProfileForm');
const msg = document.getElementById('memberProfileMsg');
const fullNameInput = document.getElementById('memberFullName');
const emailInput = document.getElementById('memberEmail');
const phoneInput = document.getElementById('memberPhone');
const logoutBtn = document.getElementById('memberLogout');
const roleBadge = document.getElementById('memberRoleBadge');
const memberMessages = document.getElementById('memberMessages');
const memberTasks = document.getElementById('memberTasks');
const memberDocuments = document.getElementById('memberDocuments');
const memberActions = document.getElementById('memberActions');
const memberStatsMessages = document.getElementById('memberStatsMessages');
const memberStatsTasks = document.getElementById('memberStatsTasks');
const memberStatsDocs = document.getElementById('memberStatsDocs');
const memberStatsActions = document.getElementById('memberStatsActions');
const memberQuickDownloads = document.getElementById('memberQuickDownloads');
const memberSearchInput = document.getElementById('memberSearchInput');
const memberQuickMode = document.getElementById('memberQuickMode');
const memberCalendar = document.getElementById('memberCalendar');
const memberDownloadHistory = document.getElementById('memberDownloadHistory');
const memberPriorities = document.getElementById('memberPriorities');
const memberDownloadAll = document.getElementById('memberDownloadAll');
const memberDarkToggle = document.getElementById('memberDarkToggle');
const memberReminderToggle = document.getElementById('memberReminderToggle');
const memberPerformance = document.getElementById('memberPerformance');
const memberLoginHistory = document.getElementById('memberLoginHistory');
const memberPresenceBtn = document.getElementById('memberPresenceBtn');
const memberPresenceStatus = document.getElementById('memberPresenceStatus');
const memberWhatsappReminder = document.getElementById('memberWhatsappReminder');

let toolsCache = { messages: [], tasks: [], documents: [] };
let actionsCache = [];
let quickMode = false;
let remindersEnabled = localStorage.getItem('memberReminders') === '1';
let nextEventText = '';

function setMsg(text, ok = false) {
  if (!msg) return;
  msg.textContent = text;
  msg.style.color = ok ? '#0b6f4f' : '';
}

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function filterByQuery(list, query, fields) {
  if (!query) return list;
  return list.filter((item) => {
    const hay = fields.map((f) => normalizeText(item[f])).join(' ');
    return hay.includes(query);
  });
}

function renderMessages(list) {
  if (!memberMessages) return;
  memberMessages.innerHTML = list.length
    ? list
        .map((m) => {
          const isUrgent = /urgent/i.test(m.title || '') || /urgent/i.test(m.body || '');
          const badge = isUrgent ? '<span class="pill pill-danger">Urgent</span>' : '<span class="pill pill-success">Info</span>';
          return `<div class="status" style="margin-bottom:8px;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
              ${badge}
              <strong>${m.title || 'Message'}</strong>
            </div>
            <span>${m.body || ''}</span>
          </div>`;
        })
        .join('')
    : 'Aucun message.';
}

function renderTasks(list) {
  if (!memberTasks) return;
  memberTasks.innerHTML = list.length
    ? `<ul>${list
        .map(
          (t) =>
            `<li><strong>${t.title}</strong> — ${t.status || 'En cours'} ${
              t.dueDate ? `· Échéance: ${t.dueDate}` : ''
            }</li>`
        )
        .join('')}</ul>`
    : 'Aucune tâche.';
}

function renderDocuments(list) {
  if (!memberDocuments) return;
  memberDocuments.innerHTML = list.length
    ? `<ul>${list
        .map(
          (d) =>
            `<li><a href="${d.url}" target="_blank" rel="noopener" data-doc-title="${d.title || ''}" data-doc-url="${d.url ||
              ''}">${d.title}</a></li>`
        )
        .join('')}</ul>`
    : 'Aucun document.';
}

function updatePriorities(tasks) {
  if (!memberPriorities) return;
  if (!tasks.length) {
    memberPriorities.textContent = 'Aucune priorité.';
    return;
  }
  const now = new Date();
  const soon = tasks.filter((t) => {
    const status = normalizeText(t.status || '');
    if (status.includes('urgent')) return true;
    if (t.dueDate) {
      const d = new Date(t.dueDate);
      if (!Number.isNaN(d.getTime())) {
        const diff = (d - now) / (1000 * 60 * 60 * 24);
        return diff <= 3;
      }
    }
    return false;
  });
  const list = soon.length ? soon : tasks.slice(0, 5);
  memberPriorities.innerHTML = `<ul>${list
    .map(
      (t) =>
        `<li><strong>${t.title}</strong> — ${t.status || 'En cours'} ${
          t.dueDate ? `· Échéance: ${t.dueDate}` : ''
        }</li>`
    )
    .join('')}</ul>`;
}

function updatePerformanceBadge() {
  if (!memberPerformance) return;
  const actions = actionsCache.length;
  let label = 'Actif';
  if (actions >= 15) label = 'Très actif';
  if (actions >= 30) label = 'Excellent';
  if (actions === 0) label = 'Inactif';
  memberPerformance.textContent = `Performance: ${label}`;
}

function updateLoginHistory() {
  if (!memberLoginHistory) return;
  const logins = actionsCache.filter((a) => a.action === 'login');
  memberLoginHistory.innerHTML = logins.length
    ? `<ul>${logins
        .map((a) => `<li>${new Date(a.createdat || a.createdAt).toLocaleString('fr-FR')}</li>`)
        .join('')}</ul>`
    : 'Aucune connexion récente.';
}

function getAuth() {
  return localStorage.getItem('memberAuth') || '';
}

async function loadProfile() {
  const auth = getAuth();
  if (!auth) {
    window.location.href = 'member-login.html';
    return;
  }
  const res = await fetch('/api/members/me', { headers: { Authorization: auth } });
  if (!res.ok) {
    window.location.href = 'member-login.html';
    return;
  }
  const data = await res.json();
  const member = data.member || {};
  if (fullNameInput) fullNameInput.value = member.fullName || '';
  if (emailInput) emailInput.value = member.email || '';
  if (phoneInput) phoneInput.value = member.phone || '';
  if (roleBadge) {
    roleBadge.textContent = `${member.role || 'Membre'} — ${member.fullName || ''}`;
  }
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const auth = getAuth();
  if (!auth) return;
  setMsg('Mise à jour...');
  const payload = Object.fromEntries(new FormData(form).entries());
  const res = await fetch('/api/members/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    setMsg(data.message || 'Erreur.');
    return;
  }
  setMsg('Profil mis à jour.', true);
});

loadProfile();
loadTools();
loadActions();
loadCalendar();

logoutBtn?.addEventListener('click', () => {
  localStorage.removeItem('memberAuth');
  window.location.href = 'member-login.html';
});

memberSearchInput?.addEventListener('input', () => {
  loadTools();
});

memberQuickMode?.addEventListener('click', () => {
  quickMode = !quickMode;
  document.body.classList.toggle('quick-mode', quickMode);
  memberQuickMode.textContent = quickMode ? 'Mode complet' : 'Mode lecture rapide';
});

memberDownloadAll?.addEventListener('click', () => {
  const docs = toolsCache.documents || [];
  if (!docs.length) {
    alert('Aucun document.');
    return;
  }
  const html = `
    <html>
      <head><meta charset="utf-8" /><title>Pack documents</title></head>
      <body>
        <h2>Documents disponibles</h2>
        <ul>${docs.map((d) => `<li><a href="${d.url}">${d.title}</a></li>`).join('')}</ul>
      </body>
    </html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'documents-pack.html';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

memberDarkToggle?.addEventListener('click', () => {
  document.body.classList.toggle('member-dark');
  localStorage.setItem('memberTheme', document.body.classList.contains('member-dark') ? 'dark' : 'light');
});

memberReminderToggle?.addEventListener('click', () => {
  remindersEnabled = !remindersEnabled;
  localStorage.setItem('memberReminders', remindersEnabled ? '1' : '0');
  memberReminderToggle.textContent = remindersEnabled ? 'Rappels activés' : 'Rappels auto';
  if (remindersEnabled) checkReminders();
});

memberWhatsappReminder?.addEventListener('click', () => {
  if (!nextEventText) {
    alert('Aucun événement à rappeler.');
    return;
  }
  const msg = `Rappel ASAA: ${nextEventText}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
});

memberPresenceBtn?.addEventListener('click', () => {
  const now = new Date().toISOString();
  localStorage.setItem('memberPresence', now);
  if (memberPresenceStatus) {
    memberPresenceStatus.textContent = `Présence confirmée le ${new Date(now).toLocaleString('fr-FR')}`;
  }
});

function syncPresence() {
  if (!memberPresenceStatus) return;
  const last = localStorage.getItem('memberPresence');
  memberPresenceStatus.textContent = last
    ? `Présence confirmée le ${new Date(last).toLocaleString('fr-FR')}`
    : 'Aucune présence confirmée.';
}

function checkReminders() {
  if (!remindersEnabled) return;
  if (!memberCalendar) return;
  const items = memberCalendar.querySelectorAll('li');
  if (!items.length) return;
  const first = items[0].textContent || '';
  if (first && !localStorage.getItem('memberReminderShown')) {
    alert(`Rappel: ${first}`);
    localStorage.setItem('memberReminderShown', '1');
  }
}

async function logMemberEvent(action, details) {
  const auth = getAuth();
  if (!auth) return;
  await fetch('/api/members/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify({ action, details })
  });
}

memberDocuments?.addEventListener('click', (e) => {
  const link = e.target.closest('a[data-doc-url]');
  if (!link) return;
  const title = link.dataset.docTitle || '';
  const url = link.dataset.docUrl || '';
  logMemberEvent('document_download', { title, url });
});

async function loadCalendar() {
  if (!memberCalendar) return;
  try {
    const res = await fetch('/api/public-settings?ts=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) {
      memberCalendar.textContent = 'Calendrier indisponible.';
      return;
    }
    const data = await res.json();
    let schedule = [];
    try {
      schedule = Array.isArray(JSON.parse(data.scheduleJson || '[]')) ? JSON.parse(data.scheduleJson || '[]') : [];
    } catch {
      schedule = [];
    }
    if (!schedule.length) {
      memberCalendar.textContent = 'Aucun événement à venir.';
      return;
    }
    const itemsHtml = schedule
      .map((s) => `<li><strong>${s.date || ''}</strong> ${s.time ? `(${s.time})` : ''} — ${s.title || ''}</li>`)
      .join('');
    memberCalendar.innerHTML = `<ul>${itemsHtml}</ul>`;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    const upcoming = schedule
      .map((s) => ({ ...s, date: s.date || '', time: s.time || '00:00' }))
      .filter((s) => s.date)
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
      .find((s) => s.date >= todayStr);
    nextEventText = upcoming
      ? `${upcoming.date}${upcoming.time ? ` (${upcoming.time})` : ''} — ${upcoming.title || 'Événement ASAA'}`
      : '';
    checkReminders();
  } catch {
    memberCalendar.textContent = 'Calendrier indisponible.';
  }
}

const storedTheme = localStorage.getItem('memberTheme');
if (storedTheme === 'dark') document.body.classList.add('member-dark');
if (memberReminderToggle) {
  memberReminderToggle.textContent = remindersEnabled ? 'Rappels activés' : 'Rappels auto';
}
syncPresence();

async function loadTools() {
  const auth = getAuth();
  if (!auth) return;
  const res = await fetch('/api/members/member-tools', { headers: { Authorization: auth } });
  if (!res.ok) return;
  const data = await res.json();
  const messages = data.messages || [];
  const tasks = data.tasks || [];
  const documents = data.documents || [];
  toolsCache = { messages, tasks, documents };
  if (memberStatsMessages) memberStatsMessages.textContent = String(messages.length);
  if (memberStatsTasks) memberStatsTasks.textContent = String(tasks.length);
  if (memberStatsDocs) memberStatsDocs.textContent = String(documents.length);
  const query = normalizeText(memberSearchInput?.value || '');
  renderMessages(filterByQuery(messages, query, ['title', 'body']));
  renderTasks(filterByQuery(tasks, query, ['title', 'status', 'dueDate']));
  renderDocuments(filterByQuery(documents, query, ['title', 'url']));
  updatePriorities(tasks);
  if (memberQuickDownloads) {
    if (!documents.length) {
      memberQuickDownloads.innerHTML = '<span class="muted">Aucun document.</span>';
    } else {
      memberQuickDownloads.innerHTML = documents
        .slice(0, 4)
        .map(
          (d) =>
            `<a class="btn outline" href="${d.url}" target="_blank" rel="noopener">${d.title}</a>`
        )
        .join('');
    }
  }
}

async function loadActions() {
  const auth = getAuth();
  if (!auth) return;
  const res = await fetch('/api/members/actions', { headers: { Authorization: auth } });
  if (!res.ok) return;
  const data = await res.json();
  const actions = data.actions || [];
  actionsCache = actions;
  if (memberStatsActions) memberStatsActions.textContent = String(actions.length);
  if (memberActions) {
    memberActions.innerHTML = actions.length
      ? `<ul>${actions
          .map(
            (a) =>
              `<li>${new Date(a.createdat || a.createdAt).toLocaleString('fr-FR')} — ${
                a.action || 'action'
              }</li>`
          )
          .join('')}</ul>`
      : 'Aucune activité récente.';
  }

  if (memberDownloadHistory) {
    const downloads = actions.filter((a) => a.action === 'document_download');
    memberDownloadHistory.innerHTML = downloads.length
      ? `<ul>${downloads
          .map(
            (d) =>
              `<li>${new Date(d.createdat || d.createdAt).toLocaleString('fr-FR')} — ${d.details?.title ||
                d.payload?.title ||
                'Document'}</li>`
          )
          .join('')}</ul>`
      : 'Aucun téléchargement.';
  }
  updatePerformanceBadge();
  updateLoginHistory();
}
