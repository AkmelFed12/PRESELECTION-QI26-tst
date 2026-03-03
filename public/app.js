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
                <td>${resolveName(c)}</td>
                <td>${c.whatsapp || ''}</td>
                <td>${c.city || ''}</td>
              </tr>
          `,
            )
            .join('')}
        </tbody>
      </table>
    `;
    const cities = new Set(data.map((c) => (c.city || '').toUpperCase()).filter(Boolean));
    const totalVotes = data.reduce((sum, c) => sum + Number(c.totalVotes || 0), 0);
    if (statPublicCandidates) statPublicCandidates.textContent = data.length;
    if (statPublicCities) statPublicCities.textContent = cities.size;
    if (statPublicVotes) statPublicVotes.textContent = totalVotes;

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
          <table class="table">
            <thead><tr><th>Date</th><th>Heure</th><th>Événement</th></tr></thead>
            <tbody>
              ${schedule.map((s) => `<tr><td>${s.date || ''}</td><td>${s.time || ''}</td><td>${s.title || ''}</td></tr>`).join('')}
            </tbody>
          </table>
        `;
      }
    }

    if (announcementCard && announcementText) {
      const text = (data.announcementText || '').trim();
      if (text) {
        announcementText.textContent = text;
        announcementCard.style.display = 'block';
      } else {
        announcementCard.style.display = 'none';
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
