const resultsGrid = document.getElementById('resultsGrid');
const resultsSearch = document.getElementById('resultsSearch');
const resultStatCandidates = document.getElementById('resultStatCandidates');
const resultStatVotes = document.getElementById('resultStatVotes');
const resultStatCountries = document.getElementById('resultStatCountries');
const resultStatCities = document.getElementById('resultStatCities');

let resultsCache = [];

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
  const list = resultsCache.filter((c) => {
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
          return `
            <article class="candidate-card">
              <div class="photo">${photo}</div>
              <div class="candidate-info">
                <h3>#${idx + 1} ${name}</h3>
                <p>${location}</p>
              </div>
              <button class="vote-btn" type="button" disabled>Votes: ${c.totalVotes}</button>
            </article>
          `;
        })
        .join('')
    : '<div class="empty">Aucun résultat disponible.</div>';
}

async function loadResults() {
  if (!resultsGrid) return;
  const res = await fetch('/api/public-results');
  const data = await res.json();
  resultsCache = Array.isArray(data.candidates) ? data.candidates : [];
  const stats = data.stats || {};
  if (resultStatCandidates) resultStatCandidates.textContent = stats.totalCandidates || 0;
  if (resultStatVotes) resultStatVotes.textContent = stats.totalVotes || 0;
  if (resultStatCountries) resultStatCountries.textContent = stats.countries || 0;
  if (resultStatCities) resultStatCities.textContent = stats.cities || 0;
  renderResults();
}

resultsSearch?.addEventListener('input', renderResults);
loadResults();
