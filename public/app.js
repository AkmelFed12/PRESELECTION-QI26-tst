const registrationForm = document.getElementById('registrationForm');
const registerMsg = document.getElementById('registerMsg');
const voterInfoForm = document.getElementById('voterInfoForm');
const voteMsg = document.getElementById('voteMsg');
const voteStatus = document.getElementById('voteStatus');
const candidatesGrid = document.getElementById('candidatesGrid');
const voteStatusBadge = document.getElementById('voteStatusBadge');

registrationForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = Object.fromEntries(new FormData(registrationForm).entries());
  if (formData.whatsapp && !/^\+?\d{6,20}$/.test(formData.whatsapp.trim())) {
    registerMsg.textContent = "Numéro WhatsApp invalide. Utilisez uniquement chiffres et signe +.";
    return;
  }

  const res = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });

  const data = await res.json();
  if (!res.ok) {
    registerMsg.textContent = data.message || 'Erreur lors de l’inscription.';
    return;
  }

  registerMsg.textContent = `${data.message} Redirection WhatsApp en cours...`;
  registrationForm.reset();
  setTimeout(() => {
    window.location.href = data.whatsappRedirect;
  }, 1000);
});

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

async function loadPublicCandidates() {
  if (!candidatesGrid) return;
  const [settingsRes, candidatesRes] = await Promise.all([
    fetch('/api/public-settings'),
    fetch('/api/public-candidates'),
  ]);

  const settings = await settingsRes.json();
  const candidates = await candidatesRes.json();

  if (!settings.votingEnabled) {
    if (voteStatusBadge) {
      voteStatusBadge.textContent = 'Votes fermés';
      voteStatusBadge.classList.remove('open');
    }
    voteStatus.textContent = 'Les votes seront ouverts prochainement.';
    candidatesGrid.innerHTML = '';
    return;
  }

  if (voteStatusBadge) {
    voteStatusBadge.textContent = 'Votes ouverts';
    voteStatusBadge.classList.add('open');
  }
  voteStatus.textContent = '';
  if (!Array.isArray(candidates) || candidates.length === 0) {
    candidatesGrid.innerHTML = '<div class="empty">Aucun candidat disponible.</div>';
    return;
  }

  candidatesGrid.innerHTML = candidates
    .map((c) => {
      const initials = getInitials(c.fullName);
      const photo = c.photoUrl
        ? `<img src="${c.photoUrl}" alt="${c.fullName}" />`
        : `<div class="placeholder">${initials || 'QI'}</div>`;
      return `
        <article class="candidate-card">
          <div class="photo">${photo}</div>
          <div class="candidate-info">
            <h3>${c.fullName}</h3>
            <p>${c.country || ''}</p>
          </div>
          <button class="vote-btn" data-id="${c.id}" data-name="${c.fullName}">Voter</button>
        </article>
      `;
    })
    .join('');
}

candidatesGrid?.addEventListener('click', async (e) => {
  const button = e.target.closest('.vote-btn');
  if (!button) return;
  const candidateId = Number(button.dataset.id);
  const voterInfo = Object.fromEntries(new FormData(voterInfoForm).entries());

  const res = await fetch('/api/votes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      candidateId,
      voterName: voterInfo.voterName,
      voterContact: voterInfo.voterContact,
    }),
  });
  const data = await res.json();
  voteMsg.textContent = data.message || 'Vote enregistré.';
  if (res.ok) {
    voterInfoForm.reset();
    button.textContent = 'Merci !';
    button.disabled = true;
  }
});

loadPublicCandidates();
