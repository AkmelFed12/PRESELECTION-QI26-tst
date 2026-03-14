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

function setMsg(text, ok = false) {
  if (!msg) return;
  msg.textContent = text;
  msg.style.color = ok ? '#0b6f4f' : '';
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

logoutBtn?.addEventListener('click', () => {
  localStorage.removeItem('memberAuth');
  window.location.href = 'member-login.html';
});

async function loadTools() {
  const auth = getAuth();
  if (!auth) return;
  const res = await fetch('/api/members/member-tools', { headers: { Authorization: auth } });
  if (!res.ok) return;
  const data = await res.json();
  const messages = data.messages || [];
  const tasks = data.tasks || [];
  const documents = data.documents || [];
  if (memberMessages) {
    memberMessages.innerHTML = messages.length
      ? messages
          .map(
            (m) =>
              `<div class="status" style="margin-bottom:8px;">
                <strong>${m.title}</strong><br/>
                <span>${m.body}</span>
              </div>`
          )
          .join('')
      : 'Aucun message.';
  }
  if (memberTasks) {
    memberTasks.innerHTML = tasks.length
      ? `<ul>${tasks
          .map(
            (t) =>
              `<li><strong>${t.title}</strong> — ${t.status || 'En cours'} ${
                t.dueDate ? `· Échéance: ${t.dueDate}` : ''
              }</li>`
          )
          .join('')}</ul>`
      : 'Aucune tâche.';
  }
  if (memberDocuments) {
    memberDocuments.innerHTML = documents.length
      ? `<ul>${documents
          .map((d) => `<li><a href="${d.url}" target="_blank" rel="noopener">${d.title}</a></li>`)
          .join('')}</ul>`
      : 'Aucun document.';
  }
}

async function loadActions() {
  const auth = getAuth();
  if (!auth) return;
  const res = await fetch('/api/members/actions', { headers: { Authorization: auth } });
  if (!res.ok) return;
  const data = await res.json();
  const actions = data.actions || [];
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
}
