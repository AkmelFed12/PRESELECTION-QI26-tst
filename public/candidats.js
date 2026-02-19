const candidateSearch = document.getElementById('candidateSearch');
const countryFilter = document.getElementById('countryFilter');
const levelFilter = document.getElementById('levelFilter');
const sortFilter = document.getElementById('sortFilter');
const photoFilter = document.getElementById('photoFilter');
const topFilter = document.getElementById('topFilter');
const resetFilters = document.getElementById('resetFilters');
const candidatesGrid = document.getElementById('candidatesGrid');
const candidatesCount = document.getElementById('candidatesCount');
const candidatesTitle = document.getElementById('candidatesTitle');
const voteModal = document.getElementById('voteModal');
const voteModalClose = document.getElementById('voteModalClose');
const voteForm = document.getElementById('voteForm');
const voteMsg = document.getElementById('voteMsg');
const voterName = document.getElementById('voterName');
const voterContact = document.getElementById('voterContact');
const voteModalTitle = document.getElementById('voteModalTitle');
const voteModalMessage = document.getElementById('voteModalMessage');

let candidatesCache = [];
let settings = {};
let selectedCandidateId = null;

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

function renderCandidates() {
  const query = (candidateSearch?.value || '').trim().toLowerCase();
  const country = countryFilter?.value || '';
  const level = levelFilter?.value || '';
  const photo = photoFilter?.value || '';
  const top = topFilter?.value || '';
  const sort = sortFilter?.value || 'name';

  let filtered = candidatesCache.filter(c => {
    // Filtre texte
    if (query) {
      const target = `${c.fullName || ''} ${c.city || ''} ${c.country || ''}`.toLowerCase();
      if (!target.includes(query)) return false;
    }
    // Filtre pays
    if (country && (c.country || '') !== country) return false;
    // Filtre niveau
    if (level && (c.quranLevel || '') !== level) return false;
    if (photo === 'with' && !safeUrl(c.photoUrl)) return false;
    if (photo === 'without' && safeUrl(c.photoUrl)) return false;
    return true;
  });

  if (top === 'top10') {
    filtered = filtered
      .slice()
      .sort((a, b) => Number(b.totalVotes || 0) - Number(a.totalVotes || 0))
      .slice(0, 10);
  }

  // Tri
  if (sort === 'votes-desc') {
    filtered.sort((a, b) => Number(b.totalVotes || 0) - Number(a.totalVotes || 0));
  } else if (sort === 'votes-asc') {
    filtered.sort((a, b) => Number(a.totalVotes || 0) - Number(b.totalVotes || 0));
  } else if (sort === 'recent') {
    filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  } else {
    filtered.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
  }

  // Compter
  candidatesCount.textContent = `${filtered.length} candidat${filtered.length !== 1 ? 's' : ''} trouvé${filtered.length !== 1 ? 's' : ''}`;

  // Rendu
  candidatesGrid.innerHTML = filtered
    .map((c) => {
      const initials = getInitials(c.fullName);
      const photoUrl = safeUrl(c.photoUrl);
      const name = escapeHtml(c.fullName);
      const location = escapeHtml(`${c.city ? `${c.city}, ` : ''}${c.country || ''}`.trim());
      const level = escapeHtml(c.quranLevel || '-');
      const photo = photoUrl
        ? `<img src="${photoUrl}" alt="${name}" loading="lazy" decoding="async" />`
        : `<div class="placeholder">${initials || 'QI'}</div>`;
      const votingEnabled = Number(settings.votingEnabled || 0) === 1;
      const voteBtn = votingEnabled
        ? `<button class="vote-btn" data-candidate-id="${c.id}" type="button">Voter</button>`
        : `<button class="vote-btn" disabled type="button">Votes: ${c.totalVotes || 0}</button>`;

      const rankBadge = top === 'top10' ? `<span class="badge">Top</span>` : '';
      return `
        <article class="candidate-card">
          <div class="photo">${photo}</div>
          <div class="candidate-info">
            <h3>${name}</h3>
            <p class="location">${location}</p>
            <p class="level">Niveau: ${level}</p>
            ${rankBadge}
            ${c.motivation ? `<p class="motivation">"${escapeHtml(c.motivation).substring(0, 100)}..."</p>` : ''}
          </div>
          <div class="vote-stats">
            <strong>${c.totalVotes || 0}</strong>
            <span>vote${c.totalVotes !== 1 ? 's' : ''}</span>
          </div>
          ${voteBtn}
        </article>
      `;
    })
    .join('');

  // Event listeners pour les votes
  if (settings.votingEnabled) {
    document.querySelectorAll('.vote-btn[data-candidate-id]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        selectedCandidateId = Number(btn.dataset.candidateId);
        const candidate = candidatesCache.find(c => c.id === selectedCandidateId);
        if (candidate) {
          voteModalTitle.textContent = `Voter pour ${escapeHtml(candidate.fullName)}`;
          voteModalMessage.textContent = `Êtes-vous sûr de vouloir voter pour ${escapeHtml(candidate.fullName)} de ${escapeHtml(candidate.country || '')} ?`;
          voteModal.classList.remove('hidden');
          voterName.focus();
        }
      });
    });
  }
}

async function loadCandidates() {
  try {
    const [candidatesRes, settingsRes] = await Promise.all([
      fetch('/api/public-candidates'),
      fetch('/api/public-settings'),
    ]);
    
    if (!candidatesRes.ok || !settingsRes.ok) {
      throw new Error('Erreur lors du chargement des données');
    }
    
    const candidates = await candidatesRes.json();
    settings = await settingsRes.json();

    candidatesCache = Array.isArray(candidates) ? candidates : [];
    
    // Peupler le filtre pays
    const countries = [...new Set(candidatesCache.map(c => c.country).filter(Boolean))].sort();
    const countryOptions = countries
      .map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
      .join('');
    if (countryFilter) {
      countryFilter.innerHTML = `<option value="">Tous les pays</option>${countryOptions}`;
    }

    renderCandidates();
  } catch (error) {
    console.error('Error loading candidates:', error);
    showToast('Erreur lors du chargement des candidats', 'error');
    candidatesGrid.innerHTML = '<div class="empty">Erreur lors du chargement des candidats.</div>';
  }
}

async function submitVote(e) {
  e.preventDefault();
  
  try {
    setFormLoading(voteForm, true);
    
    if (!selectedCandidateId) {
      throw new Error('Veuillez sélectionner un candidat');
    }
    
    const name = (voterName.value || '').trim();
    const contact = (voterContact.value || '').trim();

    if (!name) {
      throw new Error('Veuillez entrer votre nom');
    }

    const response = await fetch('/api/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidateId: selectedCandidateId,
        voterName: name,
        voterContact: contact,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Erreur lors du vote');
    }

    const data = await response.json();
    showToast('✓ Vote enregistré avec succès!', 'success');
    voteForm.reset();
    voteModal.classList.add('hidden');
    await loadCandidates();
  } catch (error) {
    showToast(error.message || 'Erreur lors du vote', 'error');
  } finally {
    setFormLoading(voteForm, false);
  }
}

// Event listeners
candidateSearch?.addEventListener('input', renderCandidates);
countryFilter?.addEventListener('change', renderCandidates);
levelFilter?.addEventListener('change', renderCandidates);
sortFilter?.addEventListener('change', renderCandidates);
photoFilter?.addEventListener('change', renderCandidates);
topFilter?.addEventListener('change', renderCandidates);
resetFilters?.addEventListener('click', () => {
  if (candidateSearch) candidateSearch.value = '';
  if (countryFilter) countryFilter.value = '';
  if (levelFilter) levelFilter.value = '';
  if (photoFilter) photoFilter.value = '';
  if (topFilter) topFilter.value = '';
  if (sortFilter) sortFilter.value = 'name';
  renderCandidates();
});

voteForm?.addEventListener('submit', submitVote);

voteModalClose?.addEventListener('click', () => {
  voteModal.classList.add('hidden');
  voteMsg.textContent = '';
  voteForm.reset();
});

voteModal?.addEventListener('click', (e) => {
  if (e.target === voteModal) {
    voteModal.classList.add('hidden');
    voteMsg.textContent = '';
    voteForm.reset();
  }
});

// Charger au démarrage
loadCandidates();
