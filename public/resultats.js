const rankingWrap = document.getElementById('rankingWrap');
const refreshSelect = document.getElementById('refreshSelect');
const refreshNow = document.getElementById('refreshNow');
const lastUpdate = document.getElementById('lastUpdate');
const rankingSearch = document.getElementById('rankingSearch');
const rankingCommune = document.getElementById('rankingCommune');
const rankingClear = document.getElementById('rankingClear');
const statPublicCandidates = document.getElementById('statPublicCandidates');
const statPublicVotes = document.getElementById('statPublicVotes');
const statPublicCities = document.getElementById('statPublicCities');
const statPublicCountries = document.getElementById('statPublicCountries');
let refreshTimer = null;
let rankingCache = [];

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

function renderSkeleton() {
  if (!rankingWrap) return;
  rankingWrap.innerHTML = `
    <table class="table">
      <thead>
        <tr><th>Rang</th><th>Candidat</th><th>Commune</th><th>Votes</th><th>Total</th></tr>
      </thead>
      <tbody>
        ${Array.from({ length: 6 })
          .map(
            () => `
          <tr class="skeleton-row">
            <td><span class="skeleton-line"></span></td>
            <td><span class="skeleton-line"></span></td>
            <td><span class="skeleton-line"></span></td>
            <td><span class="skeleton-line"></span></td>
            <td><span class="skeleton-line"></span></td>
          </tr>`,
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function renderRankingTable(list) {
  if (!rankingWrap) return;
  const ranks = computeRanks(list, (c) => c.totalScore ?? c.totalscore ?? c.averageScore ?? 0);
  rankingWrap.innerHTML = `
    <table class="table">
      <thead>
        <tr><th>Rang</th><th>Candidat</th><th>Commune</th><th>Votes</th><th>Total</th></tr>
      </thead>
      <tbody>
        ${list
          .map((c, idx) => {
            const rankValue = ranks[idx];
            const isTie = idx > 0 && rankValue === ranks[idx - 1];
            const total = Number(c.totalScore ?? c.totalscore ?? c.averageScore ?? 0).toFixed(2);
            return `
              <tr>
                <td>${formatRank(rankValue)}${isTie ? ' <span class="rank-tie">ex-aequo</span>' : ''}</td>
                <td>${c.fullName || c.fullname || 'Inconnu'}</td>
                <td>${c.city || ''}</td>
                <td>${c.totalVotes || 0}</td>
                <td><span class="score-badge">${total}</span></td>
              </tr>`;
          })
          .join('')}
      </tbody>
    </table>
  `;
}

function applyRankingFilters() {
  const query = (rankingSearch?.value || '').trim().toLowerCase();
  const commune = (rankingCommune?.value || '').trim().toLowerCase();
  const filtered = rankingCache.filter((c) => {
    const name = (c.fullName || c.fullname || '').toLowerCase();
    const city = (c.city || '').toLowerCase();
    const matchQuery = !query || name.includes(query);
    const matchCommune = !commune || city === commune;
    return matchQuery && matchCommune;
  });
  renderRankingTable(filtered);
}

function renderCommuneOptions(list) {
  if (!rankingCommune) return;
  const communes = Array.from(new Set(list.map((c) => (c.city || '').toUpperCase()).filter(Boolean))).sort();
  rankingCommune.innerHTML = `<option value="">Toutes les communes</option>${communes
    .map((c) => `<option value="${c.toLowerCase()}">${c}</option>`)
    .join('')}`;
}

async function loadRanking() {
  if (!rankingWrap) return;
  renderSkeleton();
  try {
    const res = await fetch('/api/public-results');
    const data = await res.json();
    const list = data.candidates || [];
    if (!list.length) {
      rankingWrap.textContent = 'Aucun résultat publié pour le moment.';
      return;
    }
    rankingCache = list;
    if (statPublicCandidates) statPublicCandidates.textContent = data.stats?.totalCandidates ?? list.length;
    if (statPublicVotes) statPublicVotes.textContent = data.stats?.totalVotes ?? 0;
    if (statPublicCities) statPublicCities.textContent = data.stats?.cities ?? 0;
    if (statPublicCountries) statPublicCountries.textContent = data.stats?.countries ?? 0;
    renderCommuneOptions(list);
    applyRankingFilters();
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
rankingSearch?.addEventListener('input', applyRankingFilters);
rankingCommune?.addEventListener('change', applyRankingFilters);
rankingClear?.addEventListener('click', () => {
  if (rankingSearch) rankingSearch.value = '';
  if (rankingCommune) rankingCommune.value = '';
  applyRankingFilters();
});
