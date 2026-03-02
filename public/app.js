const form = document.getElementById('registrationForm');
const msg = document.getElementById('registerMsg');
const publicCandidates = document.getElementById('publicCandidates');

const toUpper = (value) => (value || '').trim().toUpperCase();

async function loadCandidates() {
  if (!publicCandidates) return;
  publicCandidates.textContent = 'Chargement...';
  try {
    const res = await fetch('/api/public-candidates');
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      publicCandidates.textContent = 'Aucun candidat inscrit pour le moment.';
      return;
    }
    publicCandidates.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nom</th>
            <th>WhatsApp</th>
            <th>Commune</th>
          </tr>
        </thead>
        <tbody>
          ${data
            .map(
              (c) => `
              <tr>
                <td>${c.id}</td>
                <td>${c.fullName || 'Inconnu'}</td>
                <td>${c.whatsapp || ''}</td>
                <td>${c.city || ''}</td>
              </tr>
          `,
            )
            .join('')}
        </tbody>
      </table>
    `;
  } catch (e) {
    publicCandidates.textContent = 'Impossible de charger la liste.';
  }
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.textContent = 'Enregistrement en cours...';
  const payload = Object.fromEntries(new FormData(form).entries());
  payload.city = toUpper(payload.city);

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      msg.textContent = data.message || 'Erreur lors de l’inscription.';
      return;
    }
    msg.textContent = data.message || 'Inscription réussie.';
    form.reset();
    await loadCandidates();
    if (data.whatsappRedirect) {
      window.open(data.whatsappRedirect, '_blank');
    }
  } catch (e) {
    msg.textContent = 'Erreur réseau, réessayez.';
  }
});

loadCandidates();
