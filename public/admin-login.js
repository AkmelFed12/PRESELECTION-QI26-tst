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

  const renderCandidatesTable = (candidates) => {
    const tableBody = document.querySelector('#adminCandidatesTable tbody');
    if (!tableBody) return;
    if (!Array.isArray(candidates) || candidates.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="11" class="empty">Aucun candidat</td></tr>';
      return;
    }
    tableBody.innerHTML = candidates
      .map((c) => `
        <tr>
          <td>${c.photoUrl ? `<img src="${c.photoUrl}" class="mini-photo" alt="${c.fullName || ''}"/>` : '-'}</td>
          <td>${c.candidateCode || '-'}</td>
          <td>${c.fullName || 'Inconnu'}</td>
          <td>${c.city || ''}</td>
          <td>${c.country || ''}</td>
          <td>${c.email || ''}</td>
          <td>${c.phone || ''}</td>
          <td>${c.status || 'pending'}</td>
          <td>-</td>
          <td>${c.whatsapp || ''}</td>
          <td>-</td>
        </tr>
      `).join('');
  };

  const updateStats = (data, candidates) => {
    const stats = data?.stats || {};
    const statCandidates = document.getElementById('statCandidates');
    const statVotes = document.getElementById('statVotes');
    const statScores = document.getElementById('statScores');
    const statContacts = document.getElementById('statContacts');
    const statDonationsPending = document.getElementById('statDonationsPending');
    if (statCandidates) statCandidates.textContent = stats.candidates ?? (candidates?.length || 0);
    if (statVotes) {
      const totalVotes = Array.isArray(data?.votes)
        ? data.votes.reduce((sum, v) => sum + Number(v.totalVotes || 0), 0)
        : 0;
      statVotes.textContent = totalVotes;
    }
    if (statScores) {
      const totalScores = Array.isArray(data?.ranking)
        ? data.ranking.reduce((sum, r) => sum + Number(r.passages || 0), 0)
        : 0;
      statScores.textContent = totalScores;
    }
    if (statContacts) statContacts.textContent = stats.contacts ?? (data?.contacts?.length || 0);
    if (statDonationsPending) statDonationsPending.textContent = stats.donationsPending ?? 0;
  };

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
        let candidates = [];
        if (dashRes.ok) {
          const data = await dashRes.json();
          candidates = Array.isArray(data.candidates) ? data.candidates : [];
          updateStats(data, candidates);
          renderCandidatesTable(candidates);
        }

        if (!candidates.length) {
          const candRes = await fetch('/api/admin/candidates', {
            headers: { Authorization: token },
          });
          if (candRes.ok) {
            const candData = await candRes.json();
            renderCandidatesTable(Array.isArray(candData) ? candData : []);
          }
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
