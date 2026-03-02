const rankingWrap = document.getElementById('rankingWrap');

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
              <td>${c.fullName || 'Inconnu'}</td>
              <td>${c.city || ''}</td>
              <td>${c.totalVotes || 0}</td>
              <td>${c.averageScore || 0}</td>
            </tr>`,
            )
            .join('')}
        </tbody>
      </table>
    `;
  } catch (e) {
    rankingWrap.textContent = 'Impossible de charger les résultats.';
  }
}

loadRanking();
