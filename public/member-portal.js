const form = document.getElementById('memberProfileForm');
const msg = document.getElementById('memberProfileMsg');
const fullNameInput = document.getElementById('memberFullName');
const emailInput = document.getElementById('memberEmail');
const phoneInput = document.getElementById('memberPhone');
const logoutBtn = document.getElementById('memberLogout');

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

logoutBtn?.addEventListener('click', () => {
  localStorage.removeItem('memberAuth');
  window.location.href = 'member-login.html';
});
