const resultsGrid = document.getElementById('resultsGrid');
const resultsSearch = document.getElementById('resultsSearch');
const resultFilter = document.getElementById('resultFilter');
const resultStatCandidates = document.getElementById('resultStatCandidates');
const resultStatVotes = document.getElementById('resultStatVotes');
const resultStatCountries = document.getElementById('resultStatCountries');
const resultStatCities = document.getElementById('resultStatCities');

let resultsCache = [];
let qualifiedIds = new Set();

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeUrl(value) {
  const url = String(value ?? '').trim();
  if (!url) return '';
  return /^https?:\/\//i.test(url) ? url : '';
}

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

function renderResults() {
  if (!resultsGrid) return;
  const query = (resultsSearch?.value || '').trim().toLowerCase();
  const filter = resultFilter?.value || 'all';
  
  let list = resultsCache.filter((c) => {
    if (filter === 'qualified') return qualifiedIds.has(c.id);
    if (filter === 'unqualified') return !qualifiedIds.has(c.id);
    return true;
  }).filter((c) => {
    if (!query) return true;
    const target = `${c.fullName || ''} ${c.city || ''} ${c.country || ''}`.toLowerCase();
    return target.includes(query);
  });

  resultsGrid.innerHTML = list.length
    ? list
        .map((c, idx) => {
          const initials = getInitials(c.fullName);
          const photoUrl = safeUrl(c.photoUrl);
          const name = escapeHtml(c.fullName);
          const location = escapeHtml(`${c.city ? `${c.city}, ` : ''}${c.country || ''}`.trim());
          const photo = photoUrl
            ? `<img src="${photoUrl}" alt="${name}" loading="lazy" decoding="async" />`
            : `<div class="placeholder">${initials || 'QI'}</div>`;
          
          // Médailles pour top 3
          let medal = '';
          if (idx === 0) medal = '🥇 ';
          else if (idx === 1) medal = '🥈 ';
          else if (idx === 2) medal = '🥉 ';
          
          // Badge qualification
          const qualBadge = qualifiedIds.has(c.id) ? '<span class="badge qualified">✓ Qualifié</span>' : '';
          const avgScore = c.averageScore ? `<p class="score">Note moy.: ${Number(c.averageScore).toFixed(2)}/15</p>` : '';
          
          return `
            <article class="candidate-card ${qualifiedIds.has(c.id) ? 'qualified' : ''}">
              <div class="photo">${photo}</div>
              <div class="candidate-info">
                <h3>#${idx + 1} ${medal}${name}</h3>
                <p>${location}</p>
                ${avgScore}
              </div>
              <div class="vote-stats">
                <strong>Votes: ${c.totalVotes || 0}</strong>
                ${qualBadge}
              </div>
            </article>
          `;
        })
        .join('')
    : '<div class="empty">Aucun résultat disponible.</div>';
}

async function loadResults() {
  if (!resultsGrid) return;
  try {
    const res = await fetch('/api/public-results');
    if (!res.ok) throw new Error('Erreur lors du chargement des résultats');
    
    const data = await res.json();
    resultsCache = Array.isArray(data.candidates) ? data.candidates : [];
    const stats = data.stats || {};
    
    // Charger les qualifiés
    try {
      const qualRes = await fetch('/api/public-results/qualified');
      if (qualRes.ok) {
        const qualData = await qualRes.json();
        if (qualData.qualifiedIds) {
          qualifiedIds = new Set(qualData.qualifiedIds);
        }
      }
    } catch (e) {
      console.warn('Qualification endpoint not available:', e);
    }
    
    if (resultStatCandidates) resultStatCandidates.textContent = stats.totalCandidates || 0;
    if (resultStatVotes) resultStatVotes.textContent = stats.totalVotes || 0;
    if (resultStatCountries) resultStatCountries.textContent = stats.countries || 0;
    if (resultStatCities) resultStatCities.textContent = stats.cities || 0;
    renderResults();
  } catch (error) {
    console.error('Error loading results:', error);
    showToast('Erreur lors du chargement des résultats', 'error');
    if (resultsGrid) {
      resultsGrid.innerHTML = '<div class="empty">Erreur lors du chargement des résultats.</div>';
    }
  }
}

resultsSearch?.addEventListener('input', renderResults);
resultFilter?.addEventListener('change', renderResults);
loadResults();
