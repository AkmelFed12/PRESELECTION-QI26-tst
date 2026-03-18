const rankingWrap = document.getElementById('presentationRanking');
const lastUpdate = document.getElementById('presentationLastUpdate');
const refreshLabel = document.getElementById('presentationRefreshLabel');
const fullscreenBtn = document.getElementById('presentationFullscreen');

let refreshMs = 10000;
let refreshTimer = null;

async function loadRanking() {
  if (!rankingWrap) return;
  rankingWrap.textContent = 'Chargement...';
  try {
    const res = await fetch('/api/public-results?ts=' + Date.now(), { cache: 'no-store' });
    const data = await res.json();
    const list = data.candidates || [];
    if (!list.length) {
      rankingWrap.textContent = 'Aucun résultat publié pour le moment.';
      return;
    }
    rankingWrap.innerHTML = `
      <table>
        <thead>
          <tr><th>Rang</th><th>Candidat</th><th>Commune</th><th>Votes</th><th>Total</th></tr>
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
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(loadRanking, refreshMs);
  if (refreshLabel) refreshLabel.textContent = `${Math.round(refreshMs / 1000)}s`;
}

fullscreenBtn?.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
});

loadRanking();
startAutoRefresh();
