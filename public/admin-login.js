(() => {
  const loginForm = document.getElementById('loginForm');
  const loginMsg = document.getElementById('loginMsg');

  const setMsg = (text) => {
    if (loginMsg) loginMsg.textContent = text || '';
  };

  const setLoading = (loading) => {
    if (!loginForm) return;
    loginForm.querySelectorAll('input, button').forEach((el) => {
      el.disabled = !!loading;
    });
  };

  if (!loginForm) return;
  setMsg('Prêt à se connecter.');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const { username, password } = Object.fromEntries(new FormData(loginForm).entries());
      if (!username || !password) {
        setMsg('Identifiant et mot de passe requis.');
        return;
      }
      setLoading(true);
      setMsg('Connexion en cours...');
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.message || 'Identifiants incorrects.');
        return;
      }
      const token = data.token ? `Bearer ${data.token}` : '';
      if (token) {
        localStorage.setItem('adminAuth', token);
        window.__adminAuth = token;
      }
      setMsg('Connexion réussie.');
      // Fallback: show panels directly even if admin.js failed to load
      const ids = [
        'adminPanel',
        'dashboardPanel',
        'candidatesPanel',
        'scorePanel',
        'tablesPanel',
        'securityPanel',
        'postsPanel',
        'storiesPanel',
        'donationsPanel',
        'mediaPanel'
      ];
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
      });
      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) logoutBtn.classList.remove('hidden');
      window.dispatchEvent(new CustomEvent('admin:authed'));
    } catch (err) {
      setMsg('Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  });

  // prevent duplicate handlers in admin.js
  window.__adminLoginHandled = true;
})();
