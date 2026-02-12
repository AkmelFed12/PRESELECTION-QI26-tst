const dashCandidates = document.getElementById('dashCandidates');
const dashVotes = document.getElementById('dashVotes');
const dashScores = document.getElementById('dashScores');
const dashCountries = document.getElementById('dashCountries');
const topCandidatesList = document.getElementById('topCandidatesList');

let topCandidatesChart = null;
let countryVotesChart = null;
let candidatesProgressChart = null;
let statsCache = {};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function loadDashboardStats() {
  try {
    const res = await fetch('/api/public-results');
    if (!res.ok) throw new Error('Erreur lors du chargement des statistiques');
    
    const data = await res.json();
    const candidates = data.candidates || [];
    const stats = data.stats || {};

    // Mettre à jour les stat cards
    dashCandidates.textContent = stats.totalCandidates || 0;
    dashVotes.textContent = stats.totalVotes || 0;
    dashCountries.textContent = stats.countries || 0;
    
    // Compter les passages notés
    const scoredCandidates = candidates.filter(c => c.passages && Number(c.passages) > 0).length;
    dashScores.textContent = scoredCandidates;

    // Mettre à jour les graphiques
    updateTopCandidatesChart(candidates);
    updateCountryVotesChart(candidates);
    updateCandidatesProgressChart(candidates);
    updateTopCandidatesList(candidates);
  } catch (error) {
    console.error('Error loading dashboard stats:', error);
    showToast('Erreur lors du chargement du tableau de bord', 'error');
  }
}

function updateTopCandidatesChart(candidates) {
  const top10 = candidates.slice(0, 10);
  const ctx = document.getElementById('topCandidatesChart');
  if (!ctx) return;

  if (topCandidatesChart) {
    topCandidatesChart.destroy();
  }

  topCandidatesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: top10.map((c, i) => `${i + 1}. ${escapeHtml(c.fullName).substring(0, 20)}`),
      datasets: [
        {
          label: 'Votes',
          data: top10.map(c => Number(c.totalVotes || 0)),
          backgroundColor: '#c59b3f',
          borderColor: '#a8781a',
          borderWidth: 1,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
      },
    },
  });
}

function updateCountryVotesChart(candidates) {
  // Compter les candidats par pays
  const countryMap = {};
  candidates.forEach(c => {
    const country = c.country || 'Inconnu';
    countryMap[country] = (countryMap[country] || 0) + Number(c.totalVotes || 0);
  });

  const sorted = Object.entries(countryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const ctx = document.getElementById('countryVotesChart');
  if (!ctx) return;

  if (countryVotesChart) {
    countryVotesChart.destroy();
  }

  const colors = ['#c59b3f', '#a8781a', '#d6efe4', '#4caf50', '#ff9800', '#2196F3', '#9c27b0', '#f44336'];

  countryVotesChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: sorted.map(([country]) => escapeHtml(country)),
      datasets: [
        {
          data: sorted.map(([, votes]) => votes),
          backgroundColor: colors,
          borderColor: '#fff',
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'right',
        },
      },
    },
  });
}

function updateCandidatesProgressChart(candidates) {
  const ctx = document.getElementById('candidatesProgressChart');
  if (!ctx) return;

  // Créer des données cumulatives
  const sorted = [...candidates]
    .sort((a, b) => Number(b.totalVotes || 0) - Number(a.totalVotes || 0))
    .slice(0, 20);

  let cumulative = 0;
  const labels = sorted.map((c, i) => `${i + 1}`);
  const votes = sorted.map(c => {
    cumulative += Number(c.totalVotes || 0);
    return cumulative;
  });

  if (candidatesProgressChart) {
    candidatesProgressChart.destroy();
  }

  candidatesProgressChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Votes cumulatifs',
          data: votes,
          borderColor: '#c59b3f',
          backgroundColor: 'rgba(197, 155, 63, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

function updateTopCandidatesList(candidates) {
  const top5 = candidates.slice(0, 5);
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

  topCandidatesList.innerHTML = top5
    .map((c, i) => {
      const name = escapeHtml(c.fullName);
      const country = escapeHtml(c.country || '?');
      const votes = c.totalVotes || 0;
      const score = c.averageScore ? Number(c.averageScore).toFixed(1) : '-';
      return `
        <div class="top-item">
          <div class="rank">${medals[i]}</div>
          <div class="info">
            <div class="name">${name}</div>
            <div class="location">${country}</div>
          </div>
          <div class="stats">
            <span class="votes">Votes: ${votes}</span>
            <span class="score">Note: ${score}/15</span>
          </div>
        </div>
      `;
    })
    .join('');
}

// Charger au démarrage
loadDashboardStats();

// Rafraîchir toutes les 30 secondes
setInterval(loadDashboardStats, 30000);
