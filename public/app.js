const form = document.getElementById('registrationForm');
const msg = document.getElementById('registerMsg');
const publicCandidates = document.getElementById('publicCandidates');
const calendarList = document.getElementById('calendarList');
const registrationBadge = document.getElementById('registrationBadge');
const votingBadge = document.getElementById('votingBadge');
const statPublicCandidates = document.getElementById('statPublicCandidates');
const statPublicCities = document.getElementById('statPublicCities');
const statPublicVotes = document.getElementById('statPublicVotes');
const communeStats = document.getElementById('communeStats');
const announcementCard = document.getElementById('announcementCard');
const announcementText = document.getElementById('announcementText');
const announcementBanner = document.getElementById('announcementBanner');
const announcementBannerText = document.getElementById('announcementBannerText');
const donationForm = document.getElementById('donationForm');
const donationMsg = document.getElementById('donationMsg');
const sponsorTrack = document.getElementById('sponsorTrack');
const programDay = document.getElementById('programDay');
const liveCountBadge = document.getElementById('liveCountBadge');
const quickModeToggle = document.getElementById('quickModeToggle');
const publicCommuneFilter = document.getElementById('publicCommuneFilter');
const publicSearch = document.getElementById('publicSearch');
const shareWhatsapp = document.getElementById('shareWhatsapp');
const shareFacebook = document.getElementById('shareFacebook');
const shareCopy = document.getElementById('shareCopy');

let publicCandidatesCache = [];
const homeContent = document.getElementById('homeContent');

const toUpper = (value) => (value || '').trim().toUpperCase();

const manualNameMap = {
  "2250564108763": "OUATTARA FATOUMATA",
  "2250501952414": "OUATTARA HAWA",
  "2250103665205": "KONE SIRAH",
  "2250152606015": "KAGONE FATIMA AIDA DJAMELLA",
  "224612694187": "DIALLO IBRAHIM KHALIL",
  "2250554013332": "COULIBALY MIRIAM",
  "2250171715400": "MOHAMED AWWAL",
  "22676035015": "KAMAGATE MATENIN",
  "2250778762501": "SAYORE NASSIRATOU",
  "2250140719281": "KOKORA MOHAMED OUATTARA",
  "2250143513550": "FOFANA SANY",
  "2250105721307": "DIABY AWA",
  "2250140443333": "DIAKHITE IBRAHIM",
  "2250575933452": "SIDIBE MOHAMED",
  "2250502118573": "DIALLO RAMATOULAYE WALIYA",
  "2250787898322": "BALLO KASSIM",
  "2250779831850": "TARNAGUEDA OUMOU",
  "2250555821712": "BAH KHADIDJA",
  "2250501514168": "DIALLO AICHA",
  "2250594716937": "TRAORE ABDOUL RAOUL",
  "2250720710513": "KABA MARIAM",
  "2250101664229": "TRAORE MOUHAMMAD ABOUBAKR",
  "2250546051686": "BAMBA VASSI SOULEYMANE",
  "2250503525546": "SYLLA ABOUBAKAR SIDIK ABDOUL AZIZ",
  "2250102138333": "KONE MAIMOUNA",
  "2250748375320": "DIABATÉ AWA",
  "2250586403819": "OYEWO FATIATOU OLAMIDE",
  "2250160311520": "DIALLO FATIMA",
  "2250564292128": "KOUYATE AMARA",
  "2250151728966": "TRAORE MOHAMED AMINE",
  "2250502203868": "COULIBALY ROKIA",
  "2250170703125": "KONDA AMSETOU",
  "2250595194172": "BAH MARIAM",
  "2250747964642": "TRAORE ADJARA",
  "2250748745910": "KOUASSI SAHRA LESLIE",
  "2250584233531": "OUATTARA FAOUZIYA"
};

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function resolveName(candidate) {
  const current = candidate.fullName || candidate.name || '';
  if (current && current !== 'Inconnu') return current;
  const digits = digitsOnly(candidate.whatsapp);
  if (manualNameMap[digits]) return manualNameMap[digits];
  if (digits.length >= 8) {
    const last8 = digits.slice(-8);
    const entry = Object.entries(manualNameMap).find(([key]) => key.endsWith(last8));
    if (entry) return entry[1];
  }
  return 'Inconnu';
}

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
    publicCandidatesCache = data;
    renderPublicCandidates();
    const cities = new Set(data.map((c) => (c.city || '').toUpperCase()).filter(Boolean));
    const totalVotes = data.reduce((sum, c) => sum + Number(c.totalVotes || 0), 0);
    if (statPublicCandidates) {
      statPublicCandidates.dataset.count = String(data.length);
      animateCount(statPublicCandidates, data.length);
    }
    if (liveCountBadge) liveCountBadge.textContent = data.length;
    if (statPublicCities) {
      statPublicCities.dataset.count = String(cities.size);
      animateCount(statPublicCities, cities.size);
    }
    if (statPublicVotes) {
      statPublicVotes.dataset.count = String(totalVotes);
      animateCount(statPublicVotes, totalVotes);
    }

    if (publicCommuneFilter) {
      const options = Array.from(cities).sort();
      publicCommuneFilter.innerHTML = `<option value="">Toutes les communes</option>${options
        .map((c) => `<option value="${c}">${c}</option>`)
        .join('')}`;
    }

    if (communeStats) {
      const counts = {};
      data.forEach((c) => {
        const commune = (c.city || '').toUpperCase().trim();
        if (!commune) return;
        counts[commune] = (counts[commune] || 0) + 1;
      });
      const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      communeStats.innerHTML = rows.length
        ? `<table class="table"><thead><tr><th>Commune</th><th>Candidats</th></tr></thead><tbody>${
            rows.map(([name, count]) => `<tr><td>${name}</td><td>${count}</td></tr>`).join('')
          }</tbody></table>`
        : 'Aucune donnée.';
    }
  } catch (e) {
    publicCandidates.textContent = 'Impossible de charger la liste.';
  }
}

function renderPublicCandidates() {
  if (!publicCandidates) return;
  let list = publicCandidatesCache.slice();
  const commune = (publicCommuneFilter?.value || '').toUpperCase().trim();
  const query = (publicSearch?.value || '').trim().toLowerCase();
  if (commune) {
    list = list.filter((c) => (c.city || '').toUpperCase().trim() === commune);
  }
  if (query) {
    list = list.filter((c) => {
      const name = resolveName(c).toLowerCase();
      const phone = (c.whatsapp || '').toLowerCase();
      return name.includes(query) || phone.includes(query);
    });
  }
  if (!list.length) {
    publicCandidates.textContent = 'Aucun candidat trouvé.';
    return;
  }
  publicCandidates.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Nom</th>
          <th>Nouveau</th>
          <th>WhatsApp</th>
          <th>Commune</th>
        </tr>
      </thead>
      <tbody>
        ${list
          .map(
            (c) => `
            <tr>
              <td>${c.id}</td>
              <td>${resolveName(c)}</td>
              <td>${isNewCandidate(c.createdAt) ? '<span class="badge-new">Nouveau</span>' : ''}</td>
              <td>${c.whatsapp || ''}</td>
              <td>${c.city || ''}</td>
            </tr>
        `,
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function animateCount(el, target) {
  if (!el) return;
  const start = Number(el.textContent || 0);
  const end = Number(target || 0);
  if (start === end) return;
  const duration = 700;
  const startTime = performance.now();
  function tick(now) {
    const progress = Math.min(1, (now - startTime) / duration);
    const value = Math.floor(start + (end - start) * progress);
    el.textContent = value;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function isNewCandidate(createdAt) {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  const diff = Date.now() - created;
  return diff <= 48 * 60 * 60 * 1000;
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

publicCommuneFilter?.addEventListener('change', renderPublicCandidates);
publicSearch?.addEventListener('input', renderPublicCandidates);

donationForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  if (donationMsg) {
    donationMsg.textContent = 'Redirection vers le paiement...';
  }
  window.open('https://pay.djamo.com/yga5x', '_blank');
});



async function loadSponsorCarousel() {
  if (!sponsorTrack) return;
  try {
    const res = await fetch('/api/public-sponsors');
    const data = await res.json();
    const items = Array.isArray(data) ? data : [];
    if (!items.length) {
      sponsorTrack.textContent = 'Aucun sponsor pour le moment.';
      return;
    }
    const markup = items
      .map((s) => {
        const logo = s.logourl || s.logoUrl;
        const website = s.website || '#';
        return `
          <a class="sponsor-item" href="${website}" target="_blank" rel="noopener">
            ${logo ? `<img src="${logo}" alt="${s.name || 'Sponsor'}" />` : ''}
            <strong>${s.name || ''}</strong>
          </a>`;
      })
      .join('');
    // Duplicate for seamless scroll
    sponsorTrack.innerHTML = `${markup}${markup}`;
  } catch {
    sponsorTrack.textContent = 'Impossible de charger les sponsors.';
  }
}

loadSponsorCarousel();

function applyQuickMode(enabled) {
  document.body.classList.toggle('quick-mode', enabled);
  if (quickModeToggle) {
    quickModeToggle.textContent = enabled ? 'Mode normal' : 'Mode rapide';
  }
  try {
    localStorage.setItem('quickMode', enabled ? '1' : '0');
  } catch {}
}

if (quickModeToggle) {
  const saved = localStorage.getItem('quickMode') === '1';
  applyQuickMode(saved);
  quickModeToggle.addEventListener('click', () => {
    const enabled = !document.body.classList.contains('quick-mode');
    applyQuickMode(enabled);
  });
}

const shareUrl = 'https://preselectionqi26.vercel.app';
const shareText = 'Quiz Islamique 2026 — Inscrivez-vous et suivez les présélections.';
if (shareWhatsapp) {
  shareWhatsapp.href = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
}
if (shareFacebook) {
  shareFacebook.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
}
shareCopy?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(shareUrl);
    shareCopy.textContent = 'Lien copié';
    setTimeout(() => (shareCopy.textContent = 'Copier le lien'), 1500);
  } catch {
    alert('Copie impossible. Voici le lien : ' + shareUrl);
  }
});

if (homeContent) homeContent.style.display = 'block';

async function loadPublicSettings() {
  try {
    const res = await fetch('/api/public-settings');
    const data = await res.json();
    if (registrationBadge) {
      registrationBadge.textContent = data.registrationLocked ? 'Inscriptions: fermées' : 'Inscriptions: ouvertes';
    }
    if (votingBadge) {
      votingBadge.textContent = data.votingEnabled ? 'Votes: ouverts' : 'Votes: fermés';
    }
    if (calendarList) {
      const schedule = Array.isArray(JSON.parse(data.scheduleJson || '[]')) ? JSON.parse(data.scheduleJson || '[]') : [];
      if (!schedule.length) {
        calendarList.textContent = 'Calendrier en cours de préparation.';
      } else {
        calendarList.innerHTML = `
          <div class="timeline">
            ${schedule
              .map(
                (s) => `
                <div style="margin-bottom:12px;">
                  <strong>${s.date || ''} ${s.time || ''}</strong>
                  <div class="muted">${s.title || ''}</div>
                </div>
              `,
              )
              .join('')}
          </div>
        `;
      }
      if (programDay) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        const normalized = schedule.map((s) => ({
          ...s,
          date: s.date || '',
          time: s.time || '00:00'
        }));
        const todays = normalized.filter((s) => s.date === todayStr);
        const upcoming = normalized
          .filter((s) => s.date >= todayStr)
          .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
          .slice(0, 3);
        const list = todays.length ? todays : upcoming;
        programDay.innerHTML = list.length
          ? `<ul class="list-steps">${list
              .map((s) => `<li><strong>${s.time || ''}</strong> — ${s.title || ''}</li>`)
              .join('')}</ul>`
          : 'Aucun programme disponible.';
      }
    }

    if (announcementCard && announcementText) {
      const text = (data.announcementText || '').trim();
      if (text) {
        announcementText.textContent = text;
        announcementCard.style.display = 'block';
        if (announcementBanner && announcementBannerText) {
          announcementBannerText.textContent = text;
          announcementBanner.style.display = 'block';
        }
      } else {
        announcementCard.style.display = 'none';
        if (announcementBanner) announcementBanner.style.display = 'none';
      }
    }
  } catch {
    if (calendarList) calendarList.textContent = 'Calendrier indisponible.';
  }
}

loadPublicSettings();

const darkToggle = document.getElementById('darkToggle');
const isDark = localStorage.getItem('theme') === 'dark';
if (isDark) document.body.classList.add('dark');
darkToggle?.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
});
