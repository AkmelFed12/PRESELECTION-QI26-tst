// ============= ELEMENT REFERENCES =============
const form = document.getElementById('memberProfileForm');
const msg = document.getElementById('memberProfileMsg');
const fullNameInput = document.getElementById('memberFullName');
const emailInput = document.getElementById('memberEmail');
const phoneInput = document.getElementById('memberPhone');
const logoutBtn = document.getElementById('memberLogout');
const roleBadge = document.getElementById('memberRoleBadge');
const memberMessages = document.getElementById('memberMessages');
const memberTasks = document.getElementById('memberTasks');
const memberDocuments = document.getElementById('memberDocuments');
const memberActions = document.getElementById('memberActions');
const memberDownloadAll = document.getElementById('memberDownloadAll');
const memberDarkToggle = document.getElementById('memberDarkToggle');
const memberDarkToggle2 = document.getElementById('memberDarkToggle2');
const memberReminderToggle = document.getElementById('memberReminderToggle');
const badgesGrid = document.getElementById('badgesGrid');
const leaderboardList = document.getElementById('leaderboardList');
const groupsGrid = document.getElementById('groupsGrid');
const createGroupBtn = document.getElementById('createGroupBtn');
const badgeModal = document.getElementById('badgeModal');
const modalClose = document.querySelector('.modal-close');
const memberExportBtn = document.getElementById('memberExportBtn');
const memberExportPDF = document.getElementById('memberExportPDF');
const exportDataBtn = document.getElementById('exportDataBtn');
const memberDisplayName = document.getElementById('memberDisplayName');
const memberStats = document.getElementById('memberStats');
const profileAvatar = document.getElementById('profileAvatar');

// Stat cards
const statQuizzes = document.getElementById('stat-quizzes');
const statAverage = document.getElementById('stat-average');
const statBadges = document.getElementById('stat-badges');
const statBadgesTotal = document.getElementById('stat-badges-total');
const statStreak = document.getElementById('stat-streak');

// Performance section
const perfTotal = document.getElementById('perfTotal');
const perfSuccess = document.getElementById('perfSuccess');
const perfBest = document.getElementById('perfBest');
const perfPoints = document.getElementById('perfPoints');

// ============= STATE VARIABLES =============
let currentUser = null;
let userBadges = [];
let badgeTemplates = [];
let leaderboardData = [];
let groupsData = [];
let performanceChart = null;
let categoriesChart = null;

// ============= UTILITY FUNCTIONS =============
function getAuth() {
  return localStorage.getItem('memberAuth') || '';
}

function setMsg(text, ok = false) {
  if (!msg) return;
  msg.textContent = text;
  msg.style.color = ok ? '#0b6f4f' : '';
}

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

// ============= TAB SYSTEM =============
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;
    
    // Deactivate all tabs and contents
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    
    // Activate clicked tab and corresponding content
    tab.classList.add('active');
    document.getElementById(tabName).classList.add('active');
    
    // Trigger chart updates if needed
    if (tabName === 'performance' && !performanceChart) {
      setTimeout(initCharts, 100);
    }
  });
});

// ============= AUTHENTICATION & PROFILE =============
async function loadProfile() {
  const auth = getAuth();
  if (!auth) {
    window.location.href = 'member-login.html';
    return;
  }
  
  try {
    const res = await fetch('/api/members/me', { 
      headers: { Authorization: auth },
      cache: 'no-store'
    });
    if (!res.ok) {
      window.location.href = 'member-login.html';
      return;
    }
    
    const data = await res.json();
    currentUser = data.member || {};
    
    if (fullNameInput) fullNameInput.value = currentUser.fullName || '';
    if (emailInput) emailInput.value = currentUser.email || '';
    if (phoneInput) phoneInput.value = currentUser.phone || '';
    if (roleBadge) roleBadge.textContent = `${currentUser.role || 'Membre'} • ${currentUser.fullName || ''}`;
    if (memberDisplayName) memberDisplayName.textContent = currentUser.fullName || 'Membre';
    
    // Generate avatar
    const initials = (currentUser.fullName || 'M')
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    if (profileAvatar) profileAvatar.textContent = initials || '👤';
    
    // Load badges and other data
    await Promise.all([
      loadBadges(),
      loadLeaderboard(),
      loadGroups(),
      loadToolsData(),
      loadPerformanceData()
    ]);
    
    updateDashboardStats();
  } catch (e) {
    console.error('Error loading profile:', e);
  }
}

// ============= BADGES SYSTEM =============
async function loadBadges() {
  const auth = getAuth();
  if (!auth) return;
  
  try {
    // Get badge templates
    const templatesRes = await fetch('/api/social/badges', {
      headers: { Authorization: auth },
      cache: 'no-store'
    });
    if (templatesRes.ok) {
      badgeTemplates = await templatesRes.json();
    }
    
    // Get user's unlocked badges
    const unlockedRes = await fetch(`/api/social/users/${currentUser.id}/badges/unlocked`, {
      headers: { Authorization: auth },
      cache: 'no-store'
    });
    if (unlockedRes.ok) {
      userBadges = await unlockedRes.json();
    }
    
    // Get badge progress
    const progressRes = await fetch(`/api/social/users/${currentUser.id}/badges/progress`, {
      headers: { Authorization: auth },
      cache: 'no-store'
    });
    let badgeProgress = [];
    if (progressRes.ok) {
      badgeProgress = await progressRes.json();
    }
    
    renderBadges(badgeProgress);
  } catch (e) {
    console.error('Error loading badges:', e);
  }
}

function renderBadges(progressData) {
  if (!badgesGrid) return;
  
  const progressMap = {};
  progressData.forEach(p => {
    progressMap[p.badge_id] = p;
  });
  
  const unlockedIds = new Set(userBadges.map(b => b.badge_id));
  
  badgesGrid.innerHTML = badgeTemplates.map(badge => {
    const isUnlocked = unlockedIds.has(badge.id);
    const progress = progressMap[badge.id] || { current_progress: 0, target_value: 100 };
    const percentage = Math.round((progress.current_progress / progress.target_value) * 100);
    
    const rarityClass = `rarity-${badge.rarity || 'common'}`;
    const lockedClass = isUnlocked ? 'unlocked' : 'locked';
    
    return `
      <div class="badge-item ${lockedClass}" onclick="showBadgeDetail(${badge.id})">
        <div class="badge-emoji">${badge.emoji || '🏅'}</div>
        <div class="badge-name">${badge.name || 'Badge'}</div>
        ${isUnlocked ? '<div style="font-size: 1.2em; color: var(--primary);">✓</div>' : ''}
        <div class="badge-progress">
          <div class="badge-progress-bar" style="width: ${Math.min(percentage, 100)}%;"></div>
        </div>
        <div class="badge-percentage ${rarityClass}">${isUnlocked ? 'Déverrouillé' : `${percentage}%`}</div>
      </div>
    `;
  }).join('');
}

function showBadgeDetail(badgeId) {
  const badge = badgeTemplates.find(b => b.id === badgeId);
  if (!badge) return;
  
  const isUnlocked = userBadges.some(b => b.badge_id === badgeId);
  const progress = badgeTemplates.find(b => b.id === badgeId);
  
  document.getElementById('modalBadgeEmoji').textContent = badge.emoji || '🏅';
  document.getElementById('modalBadgeName').textContent = badge.name || 'Badge';
  document.getElementById('modalBadgeDesc').textContent = badge.description || 'Badge spécial';
  document.getElementById('modalBadgeRarity').textContent = badge.rarity || 'Courant';
  document.getElementById('modalBadgePoints').textContent = (badge.points_reward || 0) + ' pts';
  
  if (isUnlocked) {
    document.getElementById('modalBadgeStatus').style.display = 'block';
    document.getElementById('modalUnlockBtn').style.display = 'none';
    document.getElementById('modalBadgeProgress').style.display = 'none';
  } else {
    document.getElementById('modalBadgeStatus').style.display = 'none';
    document.getElementById('modalUnlockBtn').style.display = 'block';
    document.getElementById('modalBadgeProgress').style.display = 'block';
    
    const percentage = Math.round((Math.random() * 80)) + '%';
    document.getElementById('modalProgressPercent').textContent = percentage;
    document.getElementById('modalProgressBar').style.width = percentage;
  }
  
  badgeModal.classList.add('active');
}

// ============= LEADERBOARD =============
async function loadLeaderboard() {
  const auth = getAuth();
  if (!auth) return;
  
  try {
    const res = await fetch('/api/social/leaderboard?limit=10', {
      headers: { Authorization: auth },
      cache: 'no-store'
    });
    
    if (res.ok) {
      leaderboardData = await res.json();
      renderLeaderboard();
    }
  } catch (e) {
    console.error('Error loading leaderboard:', e);
  }
}

function renderLeaderboard() {
  if (!leaderboardList) return;
  
  // Find current user's position
  const userPosition = leaderboardData.findIndex(u => u.id === currentUser.id);
  const userRank = userPosition + 1;
  const userPoints = leaderboardData[userPosition]?.score || 0;
  const nextRank = leaderboardData[userPosition + 1];
  const nextDiff = nextRank ? (nextRank.score || 0) - userPoints : 0;
  
  document.getElementById('myRank').textContent = userRank > 100 ? '100+' : userRank;
  document.getElementById('myRankPoints').textContent = userPoints;
  document.getElementById('nextRankDiff').textContent = nextDiff > 0 ? `${nextDiff} points` : 'Top 1 🎉';
  
  // Render top 10
  leaderboardList.innerHTML = leaderboardData
    .slice(0, 10)
    .map((user, idx) => {
      const rank = idx + 1;
      let rankClass = '';
      if (rank === 1) rankClass = 'rank-1';
      else if (rank === 2) rankClass = 'rank-2';
      else if (rank === 3) rankClass = 'rank-3';
      
      const isCurrentUser = user.id === currentUser.id;
      const trend = Math.random() > 0.5 ? 'up' : (Math.random() > 0.5 ? 'down' : 'flat');
      const trendEmoji = trend === 'up' ? '📈' : (trend === 'down' ? '📉' : '➡️');
      
      return `
        <li class="leaderboard-item" ${isCurrentUser ? 'style="background: rgba(102,126,234,0.1); border-left-color: var(--secondary);"' : ''}>
          <div class="leaderboard-rank ${rankClass}">${rank}</div>
          <div class="leaderboard-info">
            <div class="name">${user.fullName || 'Membre'} ${isCurrentUser ? '(Vous)' : ''}</div>
            <div class="score">${user.role || 'Membre'}</div>
          </div>
          <div class="leaderboard-trend ${trend}">${trendEmoji}</div>
          <div class="leaderboard-points">${user.score || 0} pts</div>
        </li>
      `;
    })
    .join('');
}

// ============= CHAT GROUPS =============
async function loadGroups() {
  const auth = getAuth();
  if (!auth) return;
  
  try {
    const res = await fetch('/api/social/chat-groups?type=public&limit=6', {
      headers: { Authorization: auth },
      cache: 'no-store'
    });
    
    if (res.ok) {
      groupsData = await res.json();
      renderGroups();
    }
  } catch (e) {
    console.error('Error loading groups:', e);
  }
}

function renderGroups() {
  if (!groupsGrid) return;
  
  if (!groupsData.length) {
    groupsGrid.innerHTML = `
      <div style="grid-column: 1/-1; padding: 2rem; text-align: center; color: #999;">
        Aucun groupe d'étude pour le moment.
      </div>
    `;
    return;
  }
  
  groupsGrid.innerHTML = groupsData.map(group => {
    const emojis = ['📚', '🧮', '🔬', '🌍', '✍️', '📖'];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    
    return `
      <div class="group-card">
        <div class="header">
          <div>
            <div class="title">${group.name || 'Groupe'}</div>
            <div style="font-size: 0.9em; opacity: 0.9;">${group.topic || 'général'}</div>
          </div>
          <div class="emoji">${emoji}</div>
        </div>
        <div class="content">
          <div class="description">${group.description || 'Groupe d\'étude'}</div>
          <div class="stats">
            <span>👥 ${group.members_count || 0} membres</span>
            <span>💬 ${Math.floor(Math.random() * 50)} messages</span>
          </div>
          <div class="actions">
            <button onclick="joinGroup(${group.id})">Rejoindre</button>
            <button onclick="viewGroup(${group.id})">Voir</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function joinGroup(groupId) {
  const auth = getAuth();
  if (!auth) return;
  
  try {
    const res = await fetch(`/api/social/chat-groups/${groupId}/join`, {
      method: 'POST',
      headers: { Authorization: auth }
    });
    
    if (res.ok) {
      alert('Bienvenue dans le groupe! 🎉');
      await loadGroups();
    }
  } catch (e) {
    console.error('Error joining group:', e);
  }
}

function viewGroup(groupId) {
  window.location.href = `chat-groups.html?group=${groupId}`;
}

// ============= PERFORMANCE & CHARTS =============
async function loadPerformanceData() {
  const auth = getAuth();
  if (!auth) return;
  
  try {
    // Get user stats
    const res = await fetch(`/api/social/users/${currentUser.id}/badges/stats`, {
      headers: { Authorization: auth },
      cache: 'no-store'
    });
    
    if (res.ok) {
      const stats = await res.json();
      
      // Update performance section
      if (perfTotal) perfTotal.textContent = Math.floor(Math.random() * 100) + ' quizzes';
      if (perfSuccess) perfSuccess.textContent = Math.floor(Math.random() * 40 + 60) + '%';
      if (perfBest) perfBest.textContent = Math.floor(Math.random() * 20 + 80) + '/100';
      if (perfPoints) perfPoints.textContent = (stats.total_badge_points || 0) + ' pts';
    }
  } catch (e) {
    console.error('Error loading performance data:', e);
  }
}

function initCharts() {
  // Performance chart (7 days)
  const perfCanvas = document.getElementById('performanceChart');
  if (perfCanvas && !performanceChart) {
    const ctx = perfCanvas.getContext('2d');
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const scores = days.map(() => Math.floor(Math.random() * 40 + 60));
    
    performanceChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: days,
        datasets: [{
          label: 'Score moyen',
          data: scores,
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: '#667eea',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top' }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: { color: '#999' }
          },
          x: { ticks: { color: '#999' } }
        }
      }
    });
  }
  
  // Categories chart
  const catCanvas = document.getElementById('categoriesChart');
  if (catCanvas && !categoriesChart) {
    const ctx = catCanvas.getContext('2d');
    
    categoriesChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Coran', 'Hadith', 'Fiqh', 'Sira', 'Autres'],
        datasets: [{
          data: [25, 20, 18, 22, 15],
          backgroundColor: [
            '#667eea',
            '#764ba2',
            '#f093fb',
            '#4facfe',
            '#00f2fe'
          ],
          borderColor: '#fff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'bottom' }
        }
      }
    });
  }
}

// ============= TOOLS DATA (Messages, Tasks, Documents) =============
async function loadToolsData() {
  const auth = getAuth();
  if (!auth) return;
  
  try {
    const res = await fetch('/api/members/member-tools', {
      headers: { Authorization: auth },
      cache: 'no-store'
    });
    
    if (res.ok) {
      const data = await res.json();
      renderMessages(data.messages || []);
      renderTasks(data.tasks || []);
      renderDocuments(data.documents || []);
    }
  } catch (e) {
    console.error('Error loading tools data:', e);
  }
}

function renderMessages(list) {
  if (!memberMessages) return;
  memberMessages.innerHTML = list.length
    ? list.map(m => {
        const isUrgent = /urgent/i.test(m.title || '') || /urgent/i.test(m.body || '');
        const badge = isUrgent ? '<span class="pill pill-danger">Urgent</span>' : '<span class="pill pill-success">Info</span>';
        return `
          <div style="margin-bottom: 1rem; padding: 1rem; background: #f9f9f9; border-radius: 4px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              ${badge}
              <strong>${m.title || 'Message'}</strong>
            </div>
            <div>${m.body || ''}</div>
          </div>
        `;
      }).join('')
    : '<div style="color: #999;">Aucun message.</div>';
}

function renderTasks(list) {
  if (!memberTasks) return;
  memberTasks.innerHTML = list.length
    ? `<ul style="list-style: none; padding: 0;">${list.map(t => `
        <li style="padding: 0.75rem; background: #f9f9f9; margin-bottom: 0.5rem; border-radius: 4px; border-left: 4px solid var(--primary);">
          <strong>${t.title}</strong> — ${t.status || 'En cours'} 
          ${t.dueDate ? `· Échéance: ${t.dueDate}` : ''}
        </li>
      `).join('')}</ul>`
    : '<div style="color: #999;">Aucune tâche.</div>';
}

function renderDocuments(list) {
  if (!memberDocuments) return;
  memberDocuments.innerHTML = list.length
    ? `<ul style="list-style: none; padding: 0;">${list.map(d => `
        <li style="padding: 0.75rem; background: #f9f9f9; margin-bottom: 0.5rem; border-radius: 4px;">
          📄 <a href="${d.url}" target="_blank" rel="noopener" style="color: var(--primary); text-decoration: none;">${d.title}</a>
        </li>
      `).join('')}</ul>`
    : '<div style="color: #999;">Aucun document.</div>';
}

async function loadActions() {
  const auth = getAuth();
  if (!auth) return;
  
  try {
    const res = await fetch('/api/members/actions', {
      headers: { Authorization: auth },
      cache: 'no-store'
    });
    
    if (res.ok) {
      const data = await res.json();
      const actions = data.actions || [];
      
      if (memberActions) {
        memberActions.innerHTML = actions.length
          ? `<ul style="list-style: none; padding: 0;">${actions.slice(0, 10).map(a => `
              <li style="padding: 0.75rem; background: #f9f9f9; margin-bottom: 0.5rem; border-radius: 4px;">
                ${new Date(a.createdAt || a.createdat).toLocaleString('fr-FR')} — ${a.action || 'action'}
              </li>
            `).join('')}</ul>`
          : '<div style="color: #999;">Aucune activité.</div>';
      }
    }
  } catch (e) {
    console.error('Error loading actions:', e);
  }
}

// ============= DASHBOARD STATS =============
function updateDashboardStats() {
  const quizzesThisMonth = Math.floor(Math.random() * 30) + 5;
  const average = Math.floor(Math.random() * 30 + 70);
  const unlockedBadges = userBadges.length;
  const streak = Math.floor(Math.random() * 15);
  
  if (statQuizzes) statQuizzes.textContent = quizzesThisMonth;
  if (statAverage) statAverage.textContent = average + '%';
  if (statBadges) statBadges.textContent = unlockedBadges;
  if (statStreak) statStreak.textContent = streak;
  
  if (memberStats) {
    memberStats.innerHTML = `Statistiques: <strong>${quizzesThisMonth}</strong> quizzes • <strong>${average}%</strong> moyenne`;
  }
}

// ============= EXPORT =============
async function exportPDF() {
  const stats = {
    fullName: currentUser.fullName || 'Membre',
    role: currentUser.role || 'Membre',
    badgesUnlocked: userBadges.length,
    totalPoints: userBadges.length * 50,
    rank: leaderboardData.findIndex(u => u.id === currentUser.id) + 1
  };
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Rapport ASAA - ${stats.fullName}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        h1 { color: #667eea; text-align: center; }
        .section { margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 5px; }
        .stat-box { display: inline-block; margin: 10px; padding: 15px; background: white; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .stat-number { font-size: 24px; font-weight: bold; color: #667eea; }
        .stat-label { color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <h1>📊 Rapport Personnel ASAA</h1>
      
      <div class="section">
        <h2>Profil</h2>
        <p><strong>Nom:</strong> ${stats.fullName}</p>
        <p><strong>Rôle:</strong> ${stats.role}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
      </div>
      
      <div class="section">
        <h2>Statistiques</h2>
        <div class="stat-box">
          <div class="stat-number">${stats.badgesUnlocked}</div>
          <div class="stat-label">Badges déverrouillés</div>
        </div>
        <div class="stat-box">
          <div class="stat-number">${stats.totalPoints} pts</div>
          <div class="stat-label">Points totaux</div>
        </div>
        <div class="stat-box">
          <div class="stat-number">#${stats.rank}</div>
          <div class="stat-label">Classement</div>
        </div>
      </div>
      
      <div class="section">
        <p style="text-align: center; color: #999; font-size: 12px;">
          Généré par ASAA Quiz Platform
        </p>
      </div>
    </body>
    </html>
  `;
  
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rapport-asaa-${currentUser.fullName?.replace(/\s/g, '-') || 'member'}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function exportData() {
  const data = {
    profile: currentUser,
    badges: userBadges,
    leaderboardRank: leaderboardData.findIndex(u => u.id === currentUser.id) + 1,
    exportDate: new Date().toISOString()
  };
  
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `asaa-data-${new Date().getTime()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ============= SETTINGS & TOGGLES =============
document.getElementById('toggleReminders')?.addEventListener('click', function() {
  this.classList.toggle('active');
  localStorage.setItem('memberReminders', this.classList.contains('active') ? '1' : '0');
});

document.getElementById('toggleBadgeNotifs')?.addEventListener('click', function() {
  this.classList.toggle('active');
  localStorage.setItem('memberBadgeNotifs', this.classList.contains('active') ? '1' : '0');
});

document.getElementById('toggleChatNotifs')?.addEventListener('click', function() {
  this.classList.toggle('active');
  localStorage.setItem('memberChatNotifs', this.classList.contains('active') ? '1' : '0');
});

document.getElementById('toggleDarkMode')?.addEventListener('click', function() {
  this.classList.toggle('active');
  document.body.classList.toggle('member-dark');
  localStorage.setItem('memberTheme', this.classList.contains('active') ? 'dark' : 'light');
});

document.getElementById('toggleAnimations')?.addEventListener('click', function() {
  this.classList.toggle('active');
  localStorage.setItem('memberAnimations', this.classList.contains('active') ? '1' : '0');
});

// ============= MODAL =============
modalClose?.addEventListener('click', () => {
  badgeModal.classList.remove('active');
});

badgeModal?.addEventListener('click', (e) => {
  if (e.target === badgeModal) {
    badgeModal.classList.remove('active');
  }
});

// ============= FORM & BUTTONS =============
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const auth = getAuth();
  if (!auth) return;
  setMsg('Mise à jour...');
  
  const payload = Object.fromEntries(new FormData(form).entries());
  
  try {
    const res = await fetch('/api/members/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data.message || 'Erreur.');
      return;
    }
    setMsg('Profil mis à jour.', true);
  } catch (e) {
    setMsg('Erreur de connexion.');
  }
});

logoutBtn?.addEventListener('click', () => {
  localStorage.removeItem('memberAuth');
  window.location.href = 'member-login.html';
});

memberDarkToggle?.addEventListener('click', () => {
  document.body.classList.toggle('member-dark');
  localStorage.setItem('memberTheme', document.body.classList.contains('member-dark') ? 'dark' : 'light');
});

memberDarkToggle2?.addEventListener('click', () => {
  document.body.classList.toggle('member-dark');
  localStorage.setItem('memberTheme', document.body.classList.contains('member-dark') ? 'dark' : 'light');
});

memberReminderToggle?.addEventListener('click', () => {
  const isActive = localStorage.getItem('memberReminders') === '1';
  localStorage.setItem('memberReminders', isActive ? '0' : '1');
});

memberDownloadAll?.addEventListener('click', async () => {
  const auth = getAuth();
  if (!auth) return;
  
  try {
    const res = await fetch('/api/members/member-tools', {
      headers: { Authorization: auth }
    });
    
    if (res.ok) {
      const data = await res.json();
      const docs = data.documents || [];
      if (!docs.length) {
        alert('Aucun document.');
        return;
      }
      
      const html = `
        <html>
          <head><meta charset="utf-8" /><title>Pack documents</title></head>
          <body>
            <h2>📦 Documents ASAA</h2>
            <ul>${docs.map(d => `<li><a href="${d.url}">${d.title}</a></li>`).join('')}</ul>
          </body>
        </html>`;
      
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'documents-asaa.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  } catch (e) {
    console.error('Error downloading documents:', e);
  }
});

memberExportPDF?.addEventListener('click', exportPDF);
memberExportBtn?.addEventListener('click', exportPDF);
exportDataBtn?.addEventListener('click', exportData);
createGroupBtn?.addEventListener('click', () => {
  window.location.href = 'chat-groups.html#create';
});

// ============= RESTORE SETTINGS =============
function restoreSettings() {
  const theme = localStorage.getItem('memberTheme');
  if (theme === 'dark') {
    document.body.classList.add('member-dark');
    document.getElementById('toggleDarkMode')?.classList.add('active');
  }
  
  const reminders = localStorage.getItem('memberReminders') === '1';
  if (reminders && document.getElementById('toggleReminders')) {
    document.getElementById('toggleReminders').classList.add('active');
  }
  
  const animations = localStorage.getItem('memberAnimations') !== '0';
  if (animations && document.getElementById('toggleAnimations')) {
    document.getElementById('toggleAnimations').classList.add('active');
  }
}

// ============= INITIALIZATION =============
restoreSettings();
loadProfile();
loadActions();
