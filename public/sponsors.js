const sponsorsList = document.getElementById('sponsorsList');
const sponsorPublicForm = document.getElementById('sponsorPublicForm');
const sponsorPublicMsg = document.getElementById('sponsorPublicMsg');
const sponsorLogoUrl = document.getElementById('sponsorLogoUrl');
const sponsorLogoFile = document.getElementById('sponsorLogoFile');
const sponsorLogoPreview = document.getElementById('sponsorLogoPreview');

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

async function uploadLogo(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/upload/photo', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  return data.url || null;
}

sponsorLogoFile?.addEventListener('change', async () => {
  const file = sponsorLogoFile.files?.[0];
  if (!file) return;
  sponsorPublicMsg.textContent = 'Upload du logo...';
  const url = await uploadLogo(file);
  if (url) {
    if (sponsorLogoUrl) sponsorLogoUrl.value = url;
    if (sponsorLogoPreview) {
      sponsorLogoPreview.innerHTML = `<img src="${url}" alt="Logo" style="max-width:160px; border-radius:8px;" />`;
    }
    sponsorPublicMsg.textContent = 'Logo téléversé.';
  } else {
    sponsorPublicMsg.textContent = 'Erreur upload logo.';
  }
});

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
