const mapEl = document.getElementById('communeMap');
const listEl = document.getElementById('communeList');
const totalEl = document.getElementById('communeTotal');
const activeEl = document.getElementById('communeActive');

const COMMUNES = [
  { name: 'COCODY', group: 'Nord' },
  { name: 'ADJAMÉ', group: 'Nord' },
  { name: 'ABOBO', group: 'Nord' },
  { name: 'ANYAMA', group: 'Nord' },
  { name: 'YOPOUGON', group: 'Nord' },
  { name: 'BINGERVILLE', group: 'Nord' },
  { name: 'ATTECOUBE', group: 'Nord' },
  { name: 'PLATEAU', group: 'Sud' },
  { name: 'TREICHVILLE', group: 'Sud' },
  { name: 'MARCORY', group: 'Sud' },
  { name: 'KOUMASSI', group: 'Sud' },
  { name: 'PORT-BOUET', group: 'Sud' },
  { name: 'SONGON', group: 'Autres' }
];

function normalize(name) {
  return String(name || '').toUpperCase().trim();
}

async function loadCommuneStats() {
  if (!mapEl || !listEl) return;
  mapEl.textContent = 'Chargement...';
  listEl.textContent = 'Chargement...';
  try {
    const res = await fetch('/api/public-candidates?ts=' + Date.now(), { cache: 'no-store' });
    const data = await res.json();
    const counts = {};
    (Array.isArray(data) ? data : []).forEach((c) => {
      const key = normalize(c.city || '');
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });

    const total = Object.values(counts).reduce((sum, v) => sum + v, 0);
    const active = Object.keys(counts).length;
    if (totalEl) totalEl.textContent = total;
    if (activeEl) activeEl.textContent = active;

    const max = Math.max(1, ...Object.values(counts));
    const byGroup = COMMUNES.reduce((acc, item) => {
      acc[item.group] = acc[item.group] || [];
      acc[item.group].push(item);
      return acc;
    }, {});

    mapEl.innerHTML = Object.entries(byGroup)
      .map(([group, items]) => {
        return `
          <div class="commune-group">
            <div class="commune-group-title">${group}</div>
            <div class="commune-grid">
              ${items
                .map((c) => {
                  const count = counts[normalize(c.name)] || 0;
                  const level = Math.max(0.12, count / max);
                  return `
                    <div class="commune-card" style="--level:${level}">
                      <div class="commune-name">${c.name}</div>
                      <div class="commune-count">${count} candidat(s)</div>
                    </div>
                  `;
                })
                .join('')}
            </div>
          </div>
        `;
      })
      .join('');

    const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    listEl.innerHTML = rows.length
      ? `<table class="table">
          <thead><tr><th>Commune</th><th>Nombre</th></tr></thead>
          <tbody>
            ${rows.map(([name, value]) => `<tr><td>${name}</td><td>${value}</td></tr>`).join('')}
          </tbody>
        </table>`
      : 'Aucune donnée disponible.';
  } catch (e) {
    mapEl.textContent = 'Impossible de charger les communes.';
    listEl.textContent = 'Impossible de charger les communes.';
  }
}

loadCommuneStats();
