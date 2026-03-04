const sponsorsList = document.getElementById('sponsorsList');
const sponsorPublicForm = document.getElementById('sponsorPublicForm');
const sponsorPublicMsg = document.getElementById('sponsorPublicMsg');

async function loadSponsors() {
  try {
    const res = await fetch('/api/public-sponsors');
    const data = await res.json();
    const items = Array.isArray(data) ? data : [];
    if (!items.length) {
      sponsorsList.textContent = 'Aucun sponsor pour le moment.';
      return;
    }
    sponsorsList.innerHTML = items
      .map((s) => {
        const logo = s.logourl || s.logoUrl;
        const website = s.website ? `<a class="btn outline" href="${s.website}" target="_blank" rel="noopener">Site web</a>` : '';
        const amount = s.amount ? `<div class="muted">Contribution: ${s.amount} XOF</div>` : '';
        return `
          <div class="card" style="background:#fff;">
            ${logo ? `<img src="${logo}" alt="${s.name}" style="max-width:120px; margin-bottom:8px;" />` : ''}
            <h3>${s.name || ''}</h3>
            ${amount}
            ${website}
          </div>
        `;
      })
      .join('');
  } catch {
    sponsorsList.textContent = 'Impossible de charger les sponsors.';
  }
}

loadSponsors();

sponsorPublicForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  sponsorPublicMsg.textContent = 'Envoi en cours...';
  const payload = Object.fromEntries(new FormData(sponsorPublicForm).entries());
  const res = await fetch('/api/public-sponsors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  sponsorPublicMsg.textContent = data.message || (res.ok ? 'Demande envoyée.' : 'Erreur.');
  if (res.ok) {
    sponsorPublicForm.reset();
  }
});
