const rankingWrap = document.getElementById('rankingWrap');
const refreshSelect = document.getElementById('refreshSelect');
const refreshNow = document.getElementById('refreshNow');
const lastUpdate = document.getElementById('lastUpdate');
let refreshTimer = null;

async function loadRanking() {
  if (!rankingWrap) return;
  rankingWrap.textContent = 'Chargement...';
  try {
    const res = await fetch('/api/public-results');
    const data = await res.json();
    const list = data.candidates || [];
    if (!list.length) {
      rankingWrap.textContent = 'Aucun résultat publié pour le moment.';
      return;
    }
    rankingWrap.innerHTML = `
      <table class="table">
        <thead>
          <tr><th>Rang</th><th>Candidat</th><th>Commune</th><th>Votes</th><th>Moyenne</th></tr>
        </thead>
        <tbody>
          ${list
            .map(
              (c, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td>${c.fullName || c.fullname || 'Inconnu'}</td>
              <td>${c.city || ''}</td>
              <td>${c.totalVotes || 0}</td>
              <td>${c.averageScore || 0}</td>
            </tr>`,
            )
            .join('')}
        </tbody>
      </table>
    `;
    if (lastUpdate) lastUpdate.textContent = new Date().toLocaleTimeString('fr-FR');
  } catch (e) {
    rankingWrap.textContent = 'Impossible de charger les résultats.';
  }
}

function startAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
  const delay = Number(refreshSelect?.value || 0);
  if (delay > 0) {
    refreshTimer = setInterval(loadRanking, delay);
  }
}

loadRanking();
startAutoRefresh();

refreshSelect?.addEventListener('change', startAutoRefresh);
refreshNow?.addEventListener('click', loadRanking);
