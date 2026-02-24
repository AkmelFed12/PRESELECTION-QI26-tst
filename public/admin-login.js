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

      // Fallback: populate basic dashboard stats if admin.js is not running
      try {
        const dashRes = await fetch('/api/admin/dashboard', {
          headers: { Authorization: token },
        });
        if (dashRes.ok) {
          const data = await dashRes.json();
          const stats = data.stats || {};
          const statCandidates = document.getElementById('statCandidates');
          const statVotes = document.getElementById('statVotes');
          const statScores = document.getElementById('statScores');
          const statContacts = document.getElementById('statContacts');
          const statDonationsPending = document.getElementById('statDonationsPending');
          if (statCandidates) statCandidates.textContent = stats.candidates ?? (data.candidates?.length || 0);
          if (statVotes) {
            const totalVotes = Array.isArray(data.votes)
              ? data.votes.reduce((sum, v) => sum + Number(v.totalVotes || 0), 0)
              : 0;
            statVotes.textContent = totalVotes;
          }
          if (statScores) {
            const totalScores = Array.isArray(data.ranking)
              ? data.ranking.reduce((sum, r) => sum + Number(r.passages || 0), 0)
              : 0;
            statScores.textContent = totalScores;
          }
          if (statContacts) statContacts.textContent = stats.contacts ?? (data.contacts?.length || 0);
          if (statDonationsPending) statDonationsPending.textContent = stats.donationsPending ?? 0;
        }
      } catch {
        // ignore
      }
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
