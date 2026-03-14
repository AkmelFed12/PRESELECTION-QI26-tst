const form = document.getElementById('memberLoginForm');
const msg = document.getElementById('memberLoginMsg');

function setMsg(text, ok = false) {
  if (!msg) return;
  msg.textContent = text;
  msg.style.color = ok ? '#0b6f4f' : '';
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  setMsg('Connexion...');
  const payload = Object.fromEntries(new FormData(form).entries());
  try {
    const res = await fetch('/api/members/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data.message || 'Identifiants incorrects.');
      return;
    }
    localStorage.setItem('memberAuth', `Bearer ${data.token}`);
    setMsg('Connexion réussie.', true);
    window.location.href = 'member-portal.html';
  } catch {
    setMsg('Erreur réseau.');
  }
});
