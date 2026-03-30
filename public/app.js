const form = document.getElementById('registrationForm');
const msg = document.getElementById('registerMsg');
const publicCandidates = document.getElementById('publicCandidates');
const calendarList = document.getElementById('calendarList');
const registrationBadge = document.getElementById('registrationBadge');
const votingBadge = document.getElementById('votingBadge');
const statPublicCandidates = document.getElementById('statPublicCandidates');
const statPublicCities = document.getElementById('statPublicCities');
const statPublicVotes = document.getElementById('statPublicVotes');
const progressCurrent = document.getElementById('progressCurrent');
const progressMax = document.getElementById('progressMax');
const progressBar = document.getElementById('progressBar');
const publicRanking = document.getElementById('publicRanking');
const communeStats = document.getElementById('communeStats');
const communeChart = document.getElementById('communeChart');
const announcementCard = document.getElementById('announcementCard');
const announcementText = document.getElementById('announcementText');
const announcementBanner = document.getElementById('announcementBanner');
const announcementBannerText = document.getElementById('announcementBannerText');
const latestCommunique = document.getElementById('latestCommunique');
const nextEvent = document.getElementById('nextEvent');
const nextEventBar = document.getElementById('nextEventBar');
const donationForm = document.getElementById('donationForm');
const donationMsg = document.getElementById('donationMsg');
const sponsorTrack = document.getElementById('sponsorTrack');
const programDay = document.getElementById('programDay');
const liveCountBadge = document.getElementById('liveCountBadge');
const quickModeToggle = document.getElementById('quickModeToggle');
const focusModeToggle = document.getElementById('focusModeToggle');
const focusExitBtn = document.getElementById('focusExitBtn');
const qrSignup = document.getElementById('qrSignup');
const registrationClosedNote = document.getElementById('registrationClosedNote');
const waitlistSection = document.getElementById('waitlistSection');
const waitlistForm = document.getElementById('waitlistForm');
const waitlistMsg = document.getElementById('waitlistMsg');
const programmeSummary = document.getElementById('programmeSummary');
const publicCommuneFilter = document.getElementById('publicCommuneFilter');
const publicSearch = document.getElementById('publicSearch');
const shareWhatsapp = document.getElementById('shareWhatsapp');
const shareFacebook = document.getElementById('shareFacebook');
const shareCopy = document.getElementById('shareCopy');
const registerToast = document.getElementById('registerToast');
const scrollTopBtn = document.getElementById('scrollTopBtn');
const publicPrintNordSheet = document.getElementById('publicPrintNordSheet');
const publicPrintSudSheet = document.getElementById('publicPrintSudSheet');
const notationPhase = document.getElementById('notationPhase');
const phaseTitle = document.getElementById('phaseTitle');
const phaseBody = document.getElementById('phaseBody');
const phaseDates = document.getElementById('phaseDates');

let publicCandidatesCache = [];
let publicCount = 0;
let maxCandidatesValue = null;
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
  "2250584233531": "OUATTARA FAOUZIYA",
  "2250596267323": "KONE FATIM",
  "2250575661660": "BADIEL MOHAMED",
  "2250566584580": "DIABATE OUMAR",
  "2250151723646": "OUATTARA DIGATA KHADIJA",
  "2250150612819": "ZEBA SAMIRA",
  "2250585963082": "YEO SALIMATA",
  "2250718906238": "KOUYATE FATOUMATA RAMADAN",
  "2250160827840": "MARANE CHEICK SAÏB",
  "2250544511910": "DEMBELE MAIMOUNA",
  "2250748369772": "DOSSO MOHAMED LAMINE",
  "2250172323549": "MEITE IBRAHIM SORY",
  "2250574958887": "SERE ABOUBACAR SIDIK",
  "2250585085947": "DABRE SALIFATOU",
  "2250503173898": "SANGARE MOHAMED",
  "2250767281192": "BOSSE YAHAYA SAMUEL",
  "2250757275876": "CISSE ABOUBACAR SIDIK",
  "2250787627184": "SIB ABDOULAYE",
  "2250554594135": "SIDIBE AROUNA"
};

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function resolveName(candidate) {
  const current = candidate.fullName || candidate.fullname || candidate.name || '';
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
  if (publicCandidates) {
    publicCandidates.textContent = 'Chargement...';
  }
  try {
    const res = await fetch(`/api/public-candidates?ts=${Date.now()}`, { cache: 'no-store' });
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      if (publicCandidates) {
        publicCandidates.textContent = 'Aucun candidat inscrit pour le moment.';
      }
      return;
    }
    publicCandidatesCache = data;
    renderPublicCandidates();
    publicCount = data.length;
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
    updateProgressBar();

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
      renderCommuneChart(counts);
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

function updateProgressBar() {
  if (!progressCurrent || !progressMax || !progressBar) return;
  progressCurrent.textContent = String(publicCount || 0);
  if (!maxCandidatesValue || Number(maxCandidatesValue) <= 0) {
    progressMax.textContent = 'Illimité';
    progressBar.style.width = '100%';
    return;
  }
  progressMax.textContent = String(maxCandidatesValue);
  const ratio = Math.min(1, (publicCount || 0) / Number(maxCandidatesValue));
  progressBar.style.width = `${Math.round(ratio * 100)}%`;
}

function isNewCandidate(createdAt) {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  const diff = Date.now() - created;
  return diff <= 48 * 60 * 60 * 1000;
}

function renderCommuneChart(counts) {
  if (!communeChart) return;
  const entries = Object.entries(counts || {}).sort((a, b) => b[1] - a[1]);
  if (!entries.length) {
    communeChart.textContent = 'Aucune donnée.';
    return;
  }
  const max = Math.max(...entries.map(([, count]) => count));
  communeChart.innerHTML = entries
    .map(([name, count]) => {
      const pct = max ? Math.round((count / max) * 100) : 0;
      return `
        <div class="chart-row">
          <span class="chart-label">${name}</span>
          <div class="chart-bar"><div class="chart-fill" style="width:${pct}%"></div></div>
          <strong class="chart-count">${count}</strong>
        </div>
      `;
    })
    .join('');
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
    showToast('Inscription réussie ✅');
    form.reset();
    await loadCandidates();
    if (data.whatsappRedirect) {
      window.open(data.whatsappRedirect, '_blank');
    }
  } catch (e) {
    msg.textContent = 'Erreur réseau, réessayez.';
  }
});

waitlistForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (waitlistMsg) waitlistMsg.textContent = 'Enregistrement en cours...';
  const payload = Object.fromEntries(new FormData(waitlistForm).entries());
  payload.city = toUpper(payload.city);
  try {
    const res = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      if (waitlistMsg) waitlistMsg.textContent = data.message || 'Erreur lors de l’enregistrement.';
      return;
    }
    if (waitlistMsg) waitlistMsg.textContent = data.message || 'Ajouté en liste d’attente.';
    waitlistForm.reset();
  } catch {
    if (waitlistMsg) waitlistMsg.textContent = 'Erreur réseau, réessayez.';
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
    const res = await fetch(`/api/public-sponsors?ts=${Date.now()}`, { cache: 'no-store' });
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

async function loadPublicResults() {
  if (!publicRanking) return;
  try {
    const res = await fetch(`/api/public-results?ts=${Date.now()}`, { cache: 'no-store' });
    const data = await res.json();
    const list = Array.isArray(data.candidates) ? data.candidates : [];
    if (!list.length) {
      publicRanking.textContent = 'Aucun classement disponible.';
      return;
    }
    const sorted = list
      .slice()
      .sort((a, b) => {
        const aScore = Number(a.totalScore ?? a.totalscore ?? a.averageScore ?? 0);
        const bScore = Number(b.totalScore ?? b.totalscore ?? b.averageScore ?? 0);
        if (bScore !== aScore) return bScore - aScore;
        return Number(b.totalVotes || 0) - Number(a.totalVotes || 0);
      })
      .slice(0, 10);
    publicRanking.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Nom</th>
            <th>Total</th>
            <th>Votes</th>
          </tr>
        </thead>
        <tbody>
          ${sorted
            .map(
              (c, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${c.fullName || c.name || 'Inconnu'}</td>
                <td>${Number(c.totalScore ?? c.totalscore ?? c.averageScore ?? 0).toFixed(2)}</td>
                <td>${c.totalVotes || 0}</td>
              </tr>
            `,
            )
            .join('')}
        </tbody>
      </table>
    `;
  } catch {
    publicRanking.textContent = 'Impossible de charger le classement.';
  }
}

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

function applyFocusMode(enabled) {
  document.body.classList.toggle('focus-mode', enabled);
  if (focusModeToggle) {
    focusModeToggle.textContent = enabled ? 'Quitter focus' : 'Mode focus inscription';
  }
  if (focusExitBtn) {
    focusExitBtn.style.display = enabled ? 'inline-flex' : 'none';
  }
  if (enabled) {
    document.getElementById('inscription')?.scrollIntoView({ behavior: 'smooth' });
  }
}

focusModeToggle?.addEventListener('click', () => {
  const enabled = !document.body.classList.contains('focus-mode');
  applyFocusMode(enabled);
});
focusExitBtn?.addEventListener('click', () => applyFocusMode(false));

if (qrSignup) {
  const url = `${window.location.origin}/#inscription`;
  qrSignup.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`;
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

function showToast(text) {
  if (!registerToast) return;
  registerToast.textContent = text;
  registerToast.classList.add('show');
  setTimeout(() => registerToast.classList.remove('show'), 2000);
}

async function fetchPublicCandidates() {
  const res = await fetch('/api/public-candidates');
  if (!res.ok) return [];
  const data = await res.json().catch(() => []);
  return Array.isArray(data) ? data : [];
}

function buildPublicSheetHtml(title, dateLabel, list) {
  const rows = list
    .map(
      (c, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${c.id || ''}</td>
          <td>${c.fullName || ''}</td>
          <td>${c.city || ''}</td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      `,
    )
    .join('');
  return `
    <html>
      <head>
        <title>${title} — Fiche notation</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; }
          h1 { text-align: center; margin-bottom: 6px; }
          h2 { text-align: center; margin: 0; font-size: 16px; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f3f3f3; }
          .small { font-size: 12px; color: #444; text-align: center; }
        </style>
      </head>
      <body>
        <h1>${title} — Fiche notation</h1>
        <h2>Date : ${dateLabel}</h2>
        <p class="small">Notation : Questions‑Réponses /30 • Pont As Sirat /25 • Reconnaissance de Verset /5</p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>ID</th>
              <th>Nom</th>
              <th>Commune</th>
              <th>Questions‑Réponses /30</th>
              <th>Pont As Sirat /25</th>
              <th>Reconnaissance de Verset /5</th>
              <th>TOTAL /60</th>
              <th>Signature</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>`;
}

async function printPublicSheetByZone(title, dateLabel, communes) {
  const list = await fetchPublicCandidates();
  const communeSet = new Set(communes.map((c) => c.toUpperCase()));
  const filtered = list.filter((c) => communeSet.has(String(c.city || '').toUpperCase()));
  if (!filtered.length) {
    alert('Aucun candidat dans cette zone.');
    return;
  }
  const html = buildPublicSheetHtml(title, dateLabel, filtered);
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

publicPrintNordSheet?.addEventListener('click', () => {
  printPublicSheetByZone(
    'Abidjan Nord',
    'DIMANCHE 19 AVRIL 2026',
    ['COCODY', 'ADJAME', 'ADJAMÉ', 'ABOBO', 'ANYAMA', 'YOPOUGON', 'BINGERVILLE', 'ATTECOUBE']
  );
});

publicPrintSudSheet?.addEventListener('click', () => {
  printPublicSheetByZone(
    'Abidjan Sud',
    'DIMANCHE 12 AVRIL 2026',
    ['PLATEAU', 'TREICHVILLE', 'MARCORY', 'KOUMASSI', 'PORT-BOUET']
  );
});

window.addEventListener('scroll', () => {
  if (!scrollTopBtn) return;
  scrollTopBtn.classList.toggle('show', window.scrollY > 400);
});

scrollTopBtn?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

if (homeContent) homeContent.style.display = 'block';

async function loadPublicSettings() {
  try {
    const res = await fetch(`/api/public-settings?ts=${Date.now()}`, { cache: 'no-store' });
    const data = await res.json();
    let schedule = [];
    try {
      schedule = Array.isArray(JSON.parse(data.scheduleJson || '[]')) ? JSON.parse(data.scheduleJson || '[]') : [];
    } catch {
      schedule = [];
    }
    maxCandidatesValue = Number(data.maxCandidates || data.maxcandidates || 0) || null;
    updateProgressBar();
    if (registrationBadge) {
      registrationBadge.textContent = data.registrationLocked ? 'Inscriptions: fermées' : 'Inscriptions: ouvertes';
    }
    if (data.registrationLocked) {
      document.body.classList.add('registration-closed');
      if (registrationClosedNote) registrationClosedNote.style.display = 'block';
      if (waitlistSection) waitlistSection.style.display = 'block';
      if (form) {
        Array.from(form.elements).forEach((el) => {
          if (el.tagName === 'BUTTON') return;
          el.disabled = true;
        });
      }
      if (msg) msg.textContent = 'Les inscriptions sont fermées.';
    } else {
      document.body.classList.remove('registration-closed');
      if (registrationClosedNote) registrationClosedNote.style.display = 'none';
      if (waitlistSection) waitlistSection.style.display = 'none';
      if (waitlistMsg) waitlistMsg.textContent = '';
      if (form) {
        Array.from(form.elements).forEach((el) => {
          el.disabled = false;
        });
      }
    }
    if (votingBadge) {
      votingBadge.textContent = data.votingEnabled ? 'Votes: ouverts' : 'Votes: fermés';
    }
    if (calendarList) {
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
      if (programmeSummary) {
        const preview = schedule.slice(0, 5);
        programmeSummary.innerHTML = preview.length
          ? `<ul class="list-steps">${preview
              .map((s) => `<li><strong>${s.date || ''}</strong> ${s.time ? `(${s.time})` : ''} — ${s.title || ''}</li>`)
              .join('')}</ul>`
          : 'Aucun programme disponible.';
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

    if (nextEvent) {
      if (!schedule.length) {
        nextEvent.textContent = 'Aucun événement annoncé pour le moment.';
      } else {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        const normalized = schedule
          .map((s) => ({
            ...s,
            date: s.date || '',
            time: s.time || '00:00'
          }))
          .filter((s) => s.date);
        const upcoming = normalized
          .filter((s) => s.date >= todayStr)
          .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
        const picked = upcoming[0] || normalized.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0];
        if (!picked) {
          nextEvent.textContent = 'Aucun événement annoncé pour le moment.';
        } else {
          nextEvent.innerHTML = `<strong>${picked.date}</strong> ${picked.time ? `(${picked.time})` : ''} — ${picked.title || 'Événement ASAA'}`;
        }
      }
    }
    if (nextEventBar) {
      if (!schedule.length) {
        nextEventBar.style.display = 'none';
      } else {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        const normalized = schedule
          .map((s) => ({
            ...s,
            date: s.date || '',
            time: s.time || '00:00'
          }))
          .filter((s) => s.date);
        const upcoming = normalized
          .filter((s) => s.date >= todayStr)
          .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
        const picked = upcoming[0] || normalized.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0];
        if (!picked) {
          nextEventBar.style.display = 'none';
        } else {
          nextEventBar.textContent = `Prochain événement : ${picked.date}${picked.time ? ` (${picked.time})` : ''} — ${picked.title || 'Événement ASAA'}`;
          nextEventBar.style.display = 'block';
        }
      }
    }
  } catch {
    if (calendarList) calendarList.textContent = 'Calendrier indisponible.';
  }
}

async function loadPublicSiteContent() {
  try {
    const res = await fetch('/api/public/site-content?ts=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    if (notationPhase) {
      const phase = data.phase || {};
      const enabled = phase.enabled !== false;
      notationPhase.style.display = enabled ? 'block' : 'none';
      if (phaseTitle) phaseTitle.textContent = phase.title || 'Phase de notation';
      if (phaseBody) phaseBody.textContent = phase.body || '';
      if (phaseDates) {
        const north = phase.northDate || '';
        const south = phase.southDate || '';
        phaseDates.textContent =
          north || south ? `Abidjan Nord : ${north} — Abidjan Sud : ${south}` : '';
      }
    }
  } catch {}
}

async function loadLatestCommunique() {
  if (!latestCommunique) return;
  latestCommunique.textContent = 'Chargement...';
  try {
    const res = await fetch(`/api/public/site-content?ts=${Date.now()}`, { cache: 'no-store' });
    const data = await res.json();
    const items = Array.isArray(data?.communiques?.items) ? data.communiques.items : [];
    if (!items.length) {
      latestCommunique.textContent = 'Aucun communiqué publié pour le moment.';
      return;
    }
    const parseDate = (value) => {
      if (!value) return 0;
      const direct = Date.parse(value);
      if (!Number.isNaN(direct)) return direct;
      const cleaned = value.replace(/[^\d]/g, '');
      if (cleaned.length === 8) {
        const guess = Date.parse(`${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`);
        return Number.isNaN(guess) ? 0 : guess;
      }
      return 0;
    };
    const latest = items
      .slice()
      .sort((a, b) => parseDate(b.date) - parseDate(a.date))
      .find((item) => item.title || item.body) || items[0];
    const dateLabel = latest.date ? `<span class="muted">${latest.date}</span>` : '';
    const signed = latest.signedBy ? `<div class="muted">Signé: ${latest.signedBy}</div>` : '';
    const body = latest.body ? `<div>${latest.body}</div>` : '';
    latestCommunique.innerHTML = `<strong>${latest.title || 'Communiqué officiel'}</strong> ${dateLabel}${body}${signed}`;
  } catch {
    latestCommunique.textContent = 'Communiqué indisponible.';
  }
}

loadPublicSettings();
loadPublicSiteContent();
loadLatestCommunique();
loadPublicResults();
setInterval(() => {
  loadCandidates();
  loadPublicSettings();
  loadPublicSiteContent();
  loadLatestCommunique();
  loadPublicResults();
}, 60000);

const darkToggle = document.getElementById('darkToggle');
const isDark = localStorage.getItem('theme') === 'dark';
if (isDark) document.body.classList.add('dark');
darkToggle?.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
});
