const registrationForm = document.getElementById('registrationForm');
const registerMsg = document.getElementById('registerMsg');
const voterInfoForm = document.getElementById('voterInfoForm');
const voteMsg = document.getElementById('voteMsg');
const voteStatus = document.getElementById('voteStatus');
const candidatesGrid = document.getElementById('candidatesGrid');
const voteStatusBadge = document.getElementById('voteStatusBadge');
const registerStatusBadge = document.getElementById('registerStatusBadge');
const announcementCard = document.getElementById('announcementCard');
const announcementText = document.getElementById('announcementText');
const qrCode = document.getElementById('qrCode');
const scheduleList = document.getElementById('scheduleList');
const publicCandidatesGrid = document.getElementById('publicCandidatesGrid');
const candidateSearchPublic = document.getElementById('candidateSearchPublic');
const candidateCountryFilter = document.getElementById('candidateCountryFilter');
const candidateCityFilter = document.getElementById('candidateCityFilter');
const publicStatCandidates = document.getElementById('publicStatCandidates');
const publicStatCountries = document.getElementById('publicStatCountries');
const publicStatCities = document.getElementById('publicStatCities');

let cachedCandidates = [];

registrationForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = registrationForm.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;
  const formData = Object.fromEntries(new FormData(registrationForm).entries());
  if (formData.whatsapp && !/^\+?\d{6,20}$/.test(formData.whatsapp.trim())) {
    registerMsg.textContent = "Numéro WhatsApp invalide. Utilisez uniquement chiffres et signe +.";
    if (submitBtn) submitBtn.disabled = false;
    return;
  }

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const data = await res.json();
    if (!res.ok) {
      registerMsg.textContent = data.message || 'Erreur lors de l’inscription.';
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    registerMsg.textContent = `${data.message} Redirection WhatsApp en cours...`;
    registrationForm.reset();
    setTimeout(() => {
      window.location.href = data.whatsappRedirect;
    }, 1000);
  } catch (err) {
    registerMsg.textContent = 'Erreur réseau. Réessayez.';
    if (submitBtn) submitBtn.disabled = false;
  }
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
  let settings;
  let candidates;
  try {
    const [settingsRes, candidatesRes] = await Promise.all([
      fetch('/api/public-settings'),
      fetch('/api/public-candidates'),
    ]);
    if (!settingsRes.ok || !candidatesRes.ok) {
      throw new Error('Erreur lors du chargement des données publiques.');
    }
    settings = await settingsRes.json();
    candidates = await candidatesRes.json();
  } catch (error) {
    voteStatus.textContent = 'Impossible de charger les données pour le moment.';
    return;
  }

  if (registerStatusBadge) {
    const locked = Number(settings.registrationLocked || 0) === 1;
    const closed = Number(settings.competitionClosed || 0) === 1;
    const statusText = closed ? 'Compétition clôturée' : locked ? 'Inscriptions fermées' : 'Inscriptions ouvertes';
    registerStatusBadge.textContent = statusText;
    registerStatusBadge.classList.toggle('open', !locked && !closed);
  }

  if (announcementCard && announcementText) {
    const text = (settings.announcementText || '').trim();
    if (text) {
      announcementText.textContent = text;
      announcementCard.classList.remove('hidden');
    } else {
      announcementCard.classList.add('hidden');
    }
  }

  if (scheduleList) {
    let items = [];
    try {
      items = JSON.parse(settings.scheduleJson || '[]');
    } catch {
      items = [];
    }
    scheduleList.innerHTML = Array.isArray(items) && items.length
      ? items
          .map(
            (item) => `
              <div class="schedule-item">
                <strong>${escapeHtml(item.title || 'Événement')}</strong>
                <span>${escapeHtml(`${item.date || ''} ${item.time || ''}`.trim())}</span>
                <span>${escapeHtml(item.place || '')}</span>
              </div>
            `,
          )
          .join('')
      : '<div class="empty">Calendrier à venir.</div>';
  }

  if ((Number(settings.registrationLocked || 0) === 1 || Number(settings.competitionClosed || 0) === 1) && registrationForm) {
    registrationForm.querySelectorAll('input, select, textarea, button').forEach((el) => {
      el.disabled = true;
    });
    registerMsg.textContent = Number(settings.competitionClosed || 0) === 1
      ? 'Compétition clôturée.'
      : 'Inscriptions temporairement fermées.';
  } else if (registrationForm) {
    registrationForm.querySelectorAll('input, select, textarea, button').forEach((el) => {
      el.disabled = false;
    });
  }

  cachedCandidates = Array.isArray(candidates) ? candidates : [];
  updatePublicStats();
  renderPublicCandidatesList();

  if (!settings.votingEnabled || Number(settings.competitionClosed || 0) === 1) {
    if (voteStatusBadge) {
      voteStatusBadge.textContent = Number(settings.competitionClosed || 0) === 1 ? 'Compétition clôturée' : 'Votes fermés';
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
            <h3>${name}</h3>
            <p>${location}</p>
          </div>
          <button class="vote-btn" data-id="${c.id}" data-name="${name}">Voter</button>
        </article>
      `;
    })
    .join('');
}

function renderPublicCandidatesList() {
  if (!publicCandidatesGrid) return;
  const searchTerm = (candidateSearchPublic?.value || '').trim().toLowerCase();
  const country = (candidateCountryFilter?.value || '').toLowerCase();
  const city = (candidateCityFilter?.value || '').toLowerCase();

  const filtered = cachedCandidates.filter((candidate) => {
    const haystack = `${candidate.fullName || ''} ${candidate.city || ''} ${candidate.country || ''}`.toLowerCase();
    const matchesSearch = !searchTerm || haystack.includes(searchTerm);
    const matchesCountry = !country || (candidate.country || '').toLowerCase() === country;
    const matchesCity = !city || (candidate.city || '').toLowerCase() === city;
    return matchesSearch && matchesCountry && matchesCity;
  });

  hydratePublicFilters();

  publicCandidatesGrid.innerHTML = filtered.length
    ? filtered
        .map((c) => {
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
                <h3>${name}</h3>
                <p>${location}</p>
              </div>
            </article>
          `;
        })
        .join('')
    : '<div class="empty">Aucun candidat ne correspond à ces filtres.</div>';
}

function hydratePublicFilters() {
  if (!candidateCountryFilter || !candidateCityFilter) return;
  const countries = Array.from(
    new Set(cachedCandidates.map((c) => (c.country || '').trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, 'fr'));
  const cities = Array.from(
    new Set(cachedCandidates.map((c) => (c.city || '').trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, 'fr'));

  const currentCountry = candidateCountryFilter.value;
  const currentCity = candidateCityFilter.value;

  candidateCountryFilter.innerHTML = '<option value="">Tous les pays</option>';
  countries.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    candidateCountryFilter.appendChild(option);
  });
  candidateCountryFilter.value = currentCountry;

  candidateCityFilter.innerHTML = '<option value="">Toutes les villes</option>';
  cities.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    candidateCityFilter.appendChild(option);
  });
  candidateCityFilter.value = currentCity;
}

function updatePublicStats() {
  if (!publicStatCandidates) return;
  const countries = new Set();
  const cities = new Set();
  cachedCandidates.forEach((c) => {
    if (c.country) countries.add(c.country.trim().toLowerCase());
    if (c.city) cities.add(c.city.trim().toLowerCase());
  });
  publicStatCandidates.textContent = cachedCandidates.length;
  if (publicStatCountries) publicStatCountries.textContent = countries.size;
  if (publicStatCities) publicStatCities.textContent = cities.size;
}

candidatesGrid?.addEventListener('click', async (e) => {
  const button = e.target.closest('.vote-btn');
  if (!button) return;
  button.disabled = true;
  const candidateId = Number(button.dataset.id);
  const voterInfo = Object.fromEntries(new FormData(voterInfoForm).entries());

  try {
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
      return;
    }
  } catch (err) {
    voteMsg.textContent = 'Erreur réseau. Réessayez.';
  }
  button.disabled = false;
});

candidateSearchPublic?.addEventListener('input', renderPublicCandidatesList);
candidateCountryFilter?.addEventListener('change', renderPublicCandidatesList);
candidateCityFilter?.addEventListener('change', renderPublicCandidatesList);

if (qrCode && window.QRCode) {
  const url = `${window.location.origin}/`;
  window.QRCode.toCanvas(url, { width: 180, margin: 1 }, (err, canvas) => {
    if (err) return;
    qrCode.innerHTML = '';
    qrCode.appendChild(canvas);
  });
}

loadPublicCandidates();
setInterval(loadPublicCandidates, 30000);
