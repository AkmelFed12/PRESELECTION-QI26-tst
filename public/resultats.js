const rankingWrap = document.getElementById('rankingWrap');
const refreshSelect = document.getElementById('refreshSelect');
const refreshNow = document.getElementById('refreshNow');
const lastUpdate = document.getElementById('lastUpdate');
let refreshTimer = null;

function formatRank(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '';
  return n === 1 ? '1er' : `${n}e`;
}

function computeRanks(list, getScore) {
  let prevScore = null;
  let prevRank = 0;
  return list.map((item, idx) => {
    const score = Number(getScore(item));
    let rank = 1;
    if (idx > 0) {
      rank = score === prevScore ? prevRank : idx + 1;
    }
    prevScore = score;
    prevRank = rank;
    return rank;
  });
}

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
    const ranks = computeRanks(list, (c) => c.totalScore ?? c.totalscore ?? c.averageScore ?? 0);
    rankingWrap.innerHTML = `
      <table class="table">
        <thead>
          <tr><th>Rang</th><th>Candidat</th><th>Commune</th><th>Votes</th><th>Total</th></tr>
        </thead>
        <tbody>
          ${list
            .map(
              (c, idx) => `
            <tr>
              <td>${formatRank(ranks[idx])}</td>
              <td>${c.fullName || c.fullname || 'Inconnu'}</td>
              <td>${c.city || ''}</td>
              <td>${c.totalVotes || 0}</td>
              <td>${Number(c.totalScore ?? c.totalscore ?? c.averageScore ?? 0).toFixed(2)}</td>
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
