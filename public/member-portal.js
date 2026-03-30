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

let toolsCache = { messages: [], tasks: [], documents: [] };
let actionsCache = [];
let quickMode = false;

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
    memberCalendar.innerHTML = `<ul>${schedule
      .map((s) => `<li><strong>${s.date || ''}</strong> ${s.time ? `(${s.time})` : ''} — ${s.title || ''}</li>`)
      .join('')}</ul>`;
  } catch {
    memberCalendar.textContent = 'Calendrier indisponible.';
  }
}

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
}
