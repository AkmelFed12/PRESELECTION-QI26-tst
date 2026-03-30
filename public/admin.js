window.__adminLoaded = true;
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const toggleAdminPassword = document.getElementById('toggleAdminPassword');
const loginMsg = document.getElementById('loginMsg');
const loginCard = document.getElementById('loginCard');
const dashboard = document.getElementById('dashboard');
const settingsSection = document.getElementById('settingsSection');
const maintenanceSection = document.getElementById('maintenanceSection');
const phaseTimelineSection = document.getElementById('phaseTimelineSection');
const candidatesSection = document.getElementById('candidatesSection');
const scoresSection = document.getElementById('scoresSection');
const communeStats = document.getElementById('communeStats');
const communeMap = document.getElementById('communeMap');
const anomaliesList = document.getElementById('anomaliesList');
const superAdminStatus = document.getElementById('superAdminStatus');
const superAdminUnlockBtn = document.getElementById('superAdminUnlockBtn');
const superAdminLockBtn = document.getElementById('superAdminLockBtn');
const offlineBanner = document.getElementById('offlineBanner');
const globalSearchSection = document.getElementById('globalSearchSection');
const globalSearchInput = document.getElementById('globalSearchInput');
const globalSearchResults = document.getElementById('globalSearchResults');
const phaseTimelineList = document.getElementById('phaseTimelineList');
const juryModeToggle = document.getElementById('juryModeToggle');
const scoreboardList = document.getElementById('scoreboardList');
const convocationDateInput = document.getElementById('convocationDate');
const convocationTimeInput = document.getElementById('convocationTime');
const convocationPlaceInput = document.getElementById('convocationPlace');
const adminLogoutBtn = document.getElementById('adminLogoutBtn');

const DEFAULT_ADMIN_USERNAME = 'asaa2026';

if (usernameInput && !usernameInput.value) {
  usernameInput.value = DEFAULT_ADMIN_USERNAME;
}

let candidateView = 'all';

const settingsForm = document.getElementById('settingsForm');
const settingsMsg = document.getElementById('settingsMsg');
const eventDate = document.getElementById('eventDate');
const eventTime = document.getElementById('eventTime');
const eventTitle = document.getElementById('eventTitle');
const addEventBtn = document.getElementById('addEventBtn');
const eventList = document.getElementById('eventList');

const candidateForm = document.getElementById('candidateForm');
const candidateMsg = document.getElementById('candidateMsg');
const candidatesTable = document.querySelector('#candidatesTable tbody');
const candidateSearch = document.getElementById('candidateSearch');
const printAttendanceBtn = document.getElementById('printAttendanceBtn');
const candidateCommuneFilter = document.getElementById('candidateCommuneFilter');
const downloadAttendanceDoc = document.getElementById('downloadAttendanceDoc');
const printAbidjanNord = document.getElementById('printAbidjanNord');
const printAbidjanSud = document.getElementById('printAbidjanSud');
const printAbidjanNordOnline = document.getElementById('printAbidjanNordOnline');
const printAbidjanSudOnline = document.getElementById('printAbidjanSudOnline');
const showAllCandidates = document.getElementById('showAllCandidates');
const showOnlineCandidates = document.getElementById('showOnlineCandidates');
const showEliminatedCandidates = document.getElementById('showEliminatedCandidates');
const bulkSelectionInfo = document.getElementById('bulkSelectionInfo');
const bulkApproveBtn = document.getElementById('bulkApproveBtn');
const bulkEliminateBtn = document.getElementById('bulkEliminateBtn');
const bulkCompareBtn = document.getElementById('bulkCompareBtn');
const bulkClearSelection = document.getElementById('bulkClearSelection');
const selectAllCandidates = document.getElementById('selectAllCandidates');
const eliminatedTable = document.querySelector('#eliminatedTable tbody');
const eliminatedTableWrap = document.getElementById('eliminatedTable');
const eliminatedTitle = document.getElementById('eliminatedTitle');
const candidateModal = document.getElementById('candidateModal');
const candidateModalClose = document.getElementById('candidateModalClose');
const candidateModalForm = document.getElementById('candidateModalForm');
const candidateModalMsg = document.getElementById('candidateModalMsg');
const candidateModalDelete = document.getElementById('candidateModalDelete');
const candidateModalWhatsapp = document.getElementById('candidateModalWhatsapp');
const candidateModalScores = document.getElementById('candidateModalScores');
const candidateModalPdf = document.getElementById('candidateModalPdf');
const modalCandidateId = document.getElementById('modalCandidateId');
const modalCandidateName = document.getElementById('modalCandidateName');
const modalCandidateCity = document.getElementById('modalCandidateCity');
const modalCandidateWhatsapp = document.getElementById('modalCandidateWhatsapp');
const modalCandidatePhone = document.getElementById('modalCandidatePhone');
const modalCandidateEmail = document.getElementById('modalCandidateEmail');
const modalCandidateStatus = document.getElementById('modalCandidateStatus');
const candidateStatusHistory = document.getElementById('candidateStatusHistory');
const compareModal = document.getElementById('compareModal');
const compareModalClose = document.getElementById('compareModalClose');
const compareBody = document.getElementById('compareBody');
const convocationModal = document.getElementById('convocationModal');
const convocationModalClose = document.getElementById('convocationModalClose');
const convocationBody = document.getElementById('convocationBody');

const scoreForm = document.getElementById('scoreForm');
const scoreQuickForm = document.getElementById('scoreQuickForm');
const scoreMsg = document.getElementById('scoreMsg');
const scoreLiveMsg = document.getElementById('scoreLiveMsg');
const candidateName = document.getElementById('candidateName');
const rankingTable = document.querySelector('#rankingTable tbody');
const scoresTable = document.querySelector('#scoresTable tbody');
const scoresJudgeFilter = document.getElementById('scoresJudgeFilter');
const scoresDateFrom = document.getElementById('scoresDateFrom');
const scoresDateTo = document.getElementById('scoresDateTo');
const scoresFilterClear = document.getElementById('scoresFilterClear');
const scoresFilterInfo = document.getElementById('scoresFilterInfo');
const exportCandidatesCsv = document.getElementById('exportCandidatesCsv');
const exportRankingCsv = document.getElementById('exportRankingCsv');
const exportRankingPdf = document.getElementById('exportRankingPdf');
const exportRankingOfficialPdf = document.getElementById('exportRankingOfficialPdf');
const exportCandidatesPdf = document.getElementById('exportCandidatesPdf');
const exportFullPdf = document.getElementById('exportFullPdf');
const generateGroupsBtn = document.getElementById('generateGroupsBtn');
const exportGroupsPdfBtn = document.getElementById('exportGroupsPdfBtn');
const groupsPreview = document.getElementById('groupsPreview');
const exportConvocationsPdfBtn = document.getElementById('exportConvocationsPdfBtn');
const openConvocationsModalBtn = document.getElementById('openConvocationsModalBtn');
const seasonLabelInput = document.getElementById('seasonLabelInput');
const archiveSeasonBtn = document.getElementById('archiveSeasonBtn');
const unarchiveSeasonBtn = document.getElementById('unarchiveSeasonBtn');
const archiveStatusMsg = document.getElementById('archiveStatusMsg');
const compactToggleBtn = document.getElementById('compactToggleBtn');
const newsSection = document.getElementById('newsSection');
const newsForm = document.getElementById('newsForm');
const newsMsg = document.getElementById('newsMsg');
const newsTable = document.querySelector('#newsTable tbody');
const newsFeatured = document.getElementById('newsFeatured');
const newsCategory = document.getElementById('newsCategory');
const newsPublishAt = document.getElementById('newsPublishAt');
const newsImageUrl = document.getElementById('newsImageUrl');
const newsImageFile = document.getElementById('newsImageFile');
const newsImagePreview = document.getElementById('newsImagePreview');
const newsImagesList = document.getElementById('newsImagesList');
const newsImagesClear = document.getElementById('newsImagesClear');

const sponsorsSection = document.getElementById('sponsorsSection');
const sponsorForm = document.getElementById('sponsorForm');
const sponsorMsg = document.getElementById('sponsorMsg');
const sponsorsTable = document.querySelector('#sponsorsTable tbody');
const sponsorLogoUrl = document.getElementById('sponsorLogoUrl');
const sponsorFilesList = document.getElementById('sponsorFilesList');
const sponsorLogoFile = document.getElementById('sponsorLogoFile');
const sponsorLogoPreview = document.getElementById('sponsorLogoPreview');
const sponsorLogoReplace = document.getElementById('sponsorLogoReplace');
const sponsorLogoRemove = document.getElementById('sponsorLogoRemove');

const financeSection = document.getElementById('financeSection');
const donationsTable = document.querySelector('#donationsTable tbody');
const donationCount = document.getElementById('donationCount');
const donationTotal = document.getElementById('donationTotal');
const sponsorApprovedCount = document.getElementById('sponsorApprovedCount');
const sponsorPendingCount = document.getElementById('sponsorPendingCount');
const donationChart = document.getElementById('donationChart');
const registrationChart = document.getElementById('registrationChart');

const pollSection = document.getElementById('pollSection');
const pollForm = document.getElementById('pollForm');
const pollMsg = document.getElementById('pollMsg');
const pollQuestionInput = document.getElementById('pollQuestionInput');
const pollOptionsInput = document.getElementById('pollOptionsInput');
const pollActive = document.getElementById('pollActive');

const adminRegistrationStatus = document.getElementById('adminRegistrationStatus');
const openRegistrationBtn = document.getElementById('openRegistrationBtn');
const closeRegistrationBtn = document.getElementById('closeRegistrationBtn');

const siteContentSection = document.getElementById('siteContentSection');
const siteContentForm = document.getElementById('siteContentForm');
const siteContentMsg = document.getElementById('siteContentMsg');
const aboutTitleInput = document.getElementById('aboutTitleInput');
const aboutSubtitleInput = document.getElementById('aboutSubtitleInput');
const aboutBodyInput = document.getElementById('aboutBodyInput');
const committeeInput = document.getElementById('committeeInput');
const leadersInput = document.getElementById('leadersInput');
const programsInput = document.getElementById('programsInput');
const valuesTitleInput = document.getElementById('valuesTitleInput');
const valuesBodyInput = document.getElementById('valuesBodyInput');
const valuesBulletsInput = document.getElementById('valuesBulletsInput');
const communiquesInput = document.getElementById('communiquesInput');
const documentsInput = document.getElementById('documentsInput');
const documentsSummaryInput = document.getElementById('documentsSummaryInput');
const memberAccountsSection = document.getElementById('memberAccountsSection');
const memberForm = document.getElementById('memberForm');
const memberMsg = document.getElementById('memberMsg');
const memberIdInput = document.getElementById('memberId');
const memberUsernameInput = document.getElementById('memberUsername');
const memberFullNameInput = document.getElementById('memberFullName');
const memberRoleInput = document.getElementById('memberRole');
const memberEmailInput = document.getElementById('memberEmail');
const memberPhoneInput = document.getElementById('memberPhone');
const memberPasswordInput = document.getElementById('memberPassword');
const memberActiveInput = document.getElementById('memberActive');
const membersTableBody = document.querySelector('#membersTable tbody');
const memberAuditSection = document.getElementById('memberAuditSection');
const memberAuditList = document.getElementById('memberAuditList');
const resetAllMembersPwd = document.getElementById('resetAllMembersPwd');
const memberDefaultPasswordInput = document.getElementById('memberDefaultPassword');
const updateDefaultMemberPwd = document.getElementById('updateDefaultMemberPwd');
const memberToolsSection = document.getElementById('memberToolsSection');
const memberToolsForm = document.getElementById('memberToolsForm');
const memberMessagesInput = document.getElementById('memberMessagesInput');
const memberTasksInput = document.getElementById('memberTasksInput');
const memberDocsInput = document.getElementById('memberDocsInput');
const memberToolsMsg = document.getElementById('memberToolsMsg');
const dailyQuizSection = document.getElementById('dailyQuizSection');
const dailyQuizForm = document.getElementById('dailyQuizForm');
const dailyQuizTitle = document.getElementById('dailyQuizTitle');
const dailyQuizQuestions = document.getElementById('dailyQuizQuestions');
const dailyQuizMsg = document.getElementById('dailyQuizMsg');
const transparencyBodyInput = document.getElementById('transparencyBodyInput');
const transparencyStatsInput = document.getElementById('transparencyStatsInput');
const transparencyReportsInput = document.getElementById('transparencyReportsInput');
const membershipOpenInput = document.getElementById('membershipOpenInput');
const membershipInfoInput = document.getElementById('membershipInfoInput');
const footerAddressInput = document.getElementById('footerAddressInput');
const footerPhoneInput = document.getElementById('footerPhoneInput');
const footerEmailInput = document.getElementById('footerEmailInput');
const footerHoursInput = document.getElementById('footerHoursInput');

let authHeader = '';
let scheduleCache = [];
let membersCache = [];
let candidatesCache = [];
let rankingCache = [];
let groupsCache = [];
let archiveLocked = false;
const selectedCandidateIds = new Set();
let superAdminUnlocked = false;
let scoresCache = [];
let settingsCache = {};
let newsCache = [];
let sponsorsCache = [];
let newsImages = [];
let isEditing = false;
let lastEditAt = 0;

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

function openWhatsappChat(number, name) {
  const digits = digitsOnly(number);
  if (!digits) {
    alert('Numéro WhatsApp indisponible.');
    return;
  }
  const safeName = (name || '').trim();
  const message = safeName
    ? `Bonjour ${safeName}, votre inscription au Quiz Islamique 2026 est bien enregistrée.`
    : "Bonjour, votre inscription au Quiz Islamique 2026 est bien enregistrée.";
  const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener');
}

function buildConvocationMessage({ name, date, time, place, groupName }) {
  const safeName = (name || '').trim();
  const who = safeName ? `Bonjour ${safeName},` : 'Bonjour,';
  const when = date ? `Date: ${date}${time ? ` à ${time}` : ''}.` : 'Date à préciser.';
  const where = place ? `Lieu: ${place}.` : '';
  const group = groupName ? `Groupe: ${groupName}.` : '';
  return `${who} vous êtes convoqué(e) pour le Quiz Islamique 2026. ${when} ${where} ${group} Merci de vous présenter 30 minutes avant.`;
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

function showAdmin() {
  loginCard.classList.add('admin-hidden');
  dashboard.classList.remove('admin-hidden');
  settingsSection.classList.remove('admin-hidden');
  maintenanceSection?.classList.remove('admin-hidden');
  phaseTimelineSection?.classList.remove('admin-hidden');
  siteContentSection?.classList.remove('admin-hidden');
  candidatesSection.classList.remove('admin-hidden');
  scoresSection.classList.remove('admin-hidden');
  newsSection?.classList.remove('admin-hidden');
  sponsorsSection?.classList.remove('admin-hidden');
  globalSearchSection?.classList.remove('admin-hidden');
  financeSection?.classList.remove('admin-hidden');
  pollSection?.classList.remove('admin-hidden');
}

function hideAdmin() {
  dashboard.classList.add('admin-hidden');
  settingsSection.classList.add('admin-hidden');
  maintenanceSection?.classList.add('admin-hidden');
  phaseTimelineSection?.classList.add('admin-hidden');
  siteContentSection?.classList.add('admin-hidden');
  candidatesSection.classList.add('admin-hidden');
  scoresSection.classList.add('admin-hidden');
  newsSection?.classList.add('admin-hidden');
  sponsorsSection?.classList.add('admin-hidden');
  globalSearchSection?.classList.add('admin-hidden');
  financeSection?.classList.add('admin-hidden');
  pollSection?.classList.add('admin-hidden');
  loginCard.classList.remove('admin-hidden');
}

function applySuperAdminUI() {
  document.body.classList.toggle('super-admin-locked', !superAdminUnlocked);
  if (superAdminStatus) {
    superAdminStatus.textContent = superAdminUnlocked ? 'Accès complet.' : 'Accès limité.';
  }
  if (superAdminUnlockBtn) superAdminUnlockBtn.disabled = superAdminUnlocked;
  if (superAdminLockBtn) superAdminLockBtn.disabled = !superAdminUnlocked;
}

async function unlockSuperAdmin() {
  const pwd = prompt('Mot de passe administrateur :');
  if (!pwd) return;
  const res = await authedFetch('/api/admin/verify-password', {
    method: 'POST',
    body: JSON.stringify({ password: pwd })
  });
  if (!res.ok) {
    alert('Mot de passe incorrect.');
    return;
  }
  superAdminUnlocked = true;
  localStorage.setItem('superAdminUnlocked', '1');
  applySuperAdminUI();
}

function lockSuperAdmin() {
  superAdminUnlocked = false;
  localStorage.removeItem('superAdminUnlocked');
  applySuperAdminUI();
}

function setStatus(el, text) {
  if (el) el.textContent = text || '';
}

function initThemeToggle() {
  if (document.querySelector('.theme-toggle')) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'theme-toggle';
  const btn = document.createElement('button');
  btn.id = 'themeToggleBtn';
  const paletteBtn = document.createElement('button');
  paletteBtn.id = 'paletteToggleBtn';
  wrapper.appendChild(btn);
  wrapper.appendChild(paletteBtn);
  document.body.appendChild(wrapper);

  const stored = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = stored || (prefersDark ? 'dark' : 'light');
  applyTheme(initial);
  const storedPalette = localStorage.getItem('palette');
  applyPalette(storedPalette === 'premium' ? 'premium' : 'classic');

  btn.addEventListener('click', () => {
    const next = document.body.classList.contains('dark') ? 'light' : 'dark';
    applyTheme(next);
  });

  paletteBtn.addEventListener('click', () => {
    const next = document.body.classList.contains('premium') ? 'classic' : 'premium';
    applyPalette(next);
  });
}

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.body.classList.toggle('dark', isDark);
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  const btn = document.querySelector('#themeToggleBtn');
  if (btn) btn.textContent = isDark ? 'Mode clair' : 'Mode sombre';
}

function applyPalette(palette) {
  const premium = palette === 'premium';
  document.body.classList.toggle('premium', premium);
  localStorage.setItem('palette', premium ? 'premium' : 'classic');
  const btn = document.querySelector('#paletteToggleBtn');
  if (btn) btn.textContent = premium ? 'Palette classique' : 'Palette premium';
}

function markEditing() {
  isEditing = true;
  lastEditAt = Date.now();
}

function bindEditListeners() {
  const forms = [
    settingsForm,
    candidateForm,
    scoreForm,
    newsForm,
    sponsorForm,
    pollForm,
    siteContentForm,
    memberForm,
    dailyQuizForm
  ].filter(Boolean);

  forms.forEach((form) => {
    form.addEventListener('input', () => {
      markEditing();
    });
    form.addEventListener('change', () => {
      markEditing();
    });
    form.addEventListener('submit', () => {
      isEditing = false;
    });
  });

  document.addEventListener('focusin', (event) => {
    const target = event.target;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable)
    ) {
      markEditing();
    }
  });
}

function toggleEliminated(showEliminated) {
  if (eliminatedTableWrap) eliminatedTableWrap.style.display = showEliminated ? 'table' : 'none';
  if (eliminatedTitle) eliminatedTitle.style.display = showEliminated ? 'block' : 'none';
  if (candidatesTable) {
    const wrap = candidatesTable.closest('table');
    if (wrap) wrap.style.display = showEliminated ? 'none' : 'table';
  }
}

function getBaseCandidatesList() {
  const list = Array.isArray(candidatesCache) ? candidatesCache.slice() : [];
  if (candidateView === 'eliminated') {
    return list.filter((c) => String(c.status || '') === 'eliminated');
  }
  let filtered = list.filter((c) => String(c.status || '') !== 'eliminated');
  if (candidateView === 'online') {
    filtered = filtered.filter((c) => String(c.status || '') === 'approved');
  }
  return filtered;
}

function updateSelectionInfo() {
  if (bulkSelectionInfo) {
    bulkSelectionInfo.textContent = `${selectedCandidateIds.size} sélectionné${selectedCandidateIds.size > 1 ? 's' : ''}`;
  }
  const canBulk = selectedCandidateIds.size > 0 && !archiveLocked;
  if (bulkApproveBtn) bulkApproveBtn.disabled = !canBulk;
  if (bulkEliminateBtn) bulkEliminateBtn.disabled = !canBulk;
  if (bulkCompareBtn) bulkCompareBtn.disabled = selectedCandidateIds.size !== 2;
  if (bulkClearSelection) bulkClearSelection.disabled = selectedCandidateIds.size === 0;
  if (selectAllCandidates) {
    const boxes = Array.from(document.querySelectorAll('input.candidate-select'));
    selectAllCandidates.checked = boxes.length > 0 && boxes.every((b) => b.checked);
  }
}

function getSelectedCandidateIds() {
  return Array.from(selectedCandidateIds).map((id) => Number(id)).filter(Boolean);
}

function applyArchiveUI() {
  const disabled = archiveLocked;
  if (candidateForm) {
    Array.from(candidateForm.elements).forEach((el) => {
      el.disabled = disabled;
    });
  }
  if (candidateModalForm) {
    Array.from(candidateModalForm.elements).forEach((el) => {
      if (el.id === 'modalCandidateId') return;
      el.disabled = disabled;
    });
  }
  if (candidateModalDelete) candidateModalDelete.disabled = disabled;
  if (scoreForm) {
    Array.from(scoreForm.elements).forEach((el) => {
      el.disabled = disabled;
    });
  }
  if (scoreQuickForm) {
    Array.from(scoreQuickForm.elements).forEach((el) => {
      el.disabled = disabled;
    });
  }
}

async function loadArchiveStatus() {
  if (!archiveStatusMsg) return;
  const res = await authedFetch('/api/admin/archive-status');
  if (!res.ok) {
    archiveStatusMsg.textContent = 'Statut saison indisponible.';
    archiveLocked = false;
    return;
  }
  const data = await res.json();
  archiveLocked = !!data.archived;
  if (seasonLabelInput) seasonLabelInput.value = data.label || '';
  if (archiveLocked) {
    archiveStatusMsg.textContent = `Saison archivée${data.label ? ` (${data.label})` : ''}. Modifications bloquées.`;
  } else {
    archiveStatusMsg.textContent = `Saison active${data.label ? ` (${data.label})` : ''}.`;
  }
  applyArchiveUI();
  updateSelectionInfo();
}

function parsePipeLines(text, expectedParts) {
  return (text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split('|').map((p) => p.trim()))
    .map((parts) => {
      const obj = {};
      expectedParts.forEach((key, idx) => {
        obj[key] = parts[idx] || '';
      });
      return obj;
    });
}

function joinPipeLines(items, keys) {
  if (!Array.isArray(items)) return '';
  return items
    .map((item) => keys.map((k) => (item?.[k] || '').toString().trim()).join(' | '))
    .filter((line) => line.replace(/\|/g, '').trim())
    .join('\n');
}

async function loadMemberTools() {
  if (!memberToolsSection) return;
  memberToolsSection.classList.remove('admin-hidden');
  const res = await authedFetch('/api/admin/member-tools');
  if (!res.ok) return;
  const data = await res.json();
  if (memberMessagesInput) {
    memberMessagesInput.value = joinPipeLines(data.messages || [], ['scope', 'title', 'body']);
  }
  if (memberTasksInput) {
    memberTasksInput.value = joinPipeLines(data.tasks || [], ['assignee', 'title', 'dueDate', 'status']);
  }
  if (memberDocsInput) {
    memberDocsInput.value = joinPipeLines(data.documents || [], ['title', 'url']);
  }
}

async function authedFetch(url, options = {}) {
  if (!authHeader) {
    const stored = localStorage.getItem('adminAuth');
    if (stored) authHeader = stored;
  }
  const isFormData = options.body instanceof FormData;
  const method = (options.method || 'GET').toUpperCase();
  const finalUrl =
    method === 'GET' ? `${url}${url.includes('?') ? '&' : '?'}ts=${Date.now()}` : url;
  return fetch(finalUrl, {
    ...options,
    cache: 'no-store',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      Authorization: authHeader,
      'Cache-Control': 'no-store',
      ...(options.headers || {})
    }
  });
}

async function loadDashboard() {
  const res = await authedFetch('/api/admin/dashboard');
  if (!res.ok) {
    setStatus(loginMsg, 'Erreur chargement admin.');
    const cached = localStorage.getItem('adminCache');
    if (cached) {
      try {
        const data = JSON.parse(cached);
        renderFromCache(data);
        if (offlineBanner) offlineBanner.style.display = 'block';
      } catch {}
    }
    return;
  }
  const data = await res.json();
  localStorage.setItem('adminCache', JSON.stringify(data));
  if (offlineBanner) offlineBanner.style.display = 'none';
  document.getElementById('statCandidates').textContent = data.stats?.candidates ?? 0;
  document.getElementById('statVotes').textContent = Array.isArray(data.votes)
    ? data.votes.reduce((sum, v) => sum + Number(v.totalVotes || 0), 0)
    : 0;
  document.getElementById('statScores').textContent = Array.isArray(data.ranking)
    ? data.ranking.reduce((sum, r) => sum + Number(r.passages || 0), 0)
    : 0;

  // settings
  const settings = data.settings || {};
  settingsCache = settings;
  Array.from(settingsForm.elements).forEach((el) => {
    if (!el.name) return;
    el.value = settings[el.name] ?? '';
  });
  if (convocationDateInput) convocationDateInput.value = settings.convocationDate || '';
  if (convocationTimeInput) convocationTimeInput.value = settings.convocationTime || '';
  if (convocationPlaceInput) convocationPlaceInput.value = settings.convocationPlace || '';
  scheduleCache = [];
  try {
    scheduleCache = JSON.parse(settings.scheduleJson || '[]') || [];
  } catch {}
  renderSchedule();
  renderPhaseTimeline();

  // candidates
  candidatesCache = data.candidates || [];
  candidateView = candidateView || 'all';
  toggleEliminated(candidateView === 'eliminated');
  filterCandidates();
  renderEliminated(candidatesCache.filter((c) => String(c.status || '') === 'eliminated'));
  renderCommuneStats(candidatesCache);
  renderCommuneMap(candidatesCache);
  renderCommuneFilter(candidatesCache);

  // ranking
  rankingCache = data.ranking || [];
  renderRanking(rankingCache);
  renderScoreboard();
  await loadScoresTable();
  renderAnomalies();
  updateLiveScoreValidation();

  // news
  await loadNewsAdmin();

  // sponsors
  await loadSponsors();
  await loadMembers();
  await loadMemberAudit();
  await loadMemberTools();
  await loadDailyQuizAdmin();

  renderGlobalSearch();
  await loadFinances();
  await loadPollAdmin();
  await loadSiteContentAdmin();
  updateAdminRegistrationStatus();
  await loadArchiveStatus();
}

function renderFromCache(data) {
  document.getElementById('statCandidates').textContent = data.stats?.candidates ?? 0;
  document.getElementById('statVotes').textContent = Array.isArray(data.votes)
    ? data.votes.reduce((sum, v) => sum + Number(v.totalVotes || 0), 0)
    : 0;
  document.getElementById('statScores').textContent = Array.isArray(data.ranking)
    ? data.ranking.reduce((sum, r) => sum + Number(r.passages || 0), 0)
    : 0;
  const settings = data.settings || {};
  settingsCache = settings;
  Array.from(settingsForm.elements).forEach((el) => {
    if (!el.name) return;
    el.value = settings[el.name] ?? '';
  });
  if (convocationDateInput) convocationDateInput.value = settings.convocationDate || '';
  if (convocationTimeInput) convocationTimeInput.value = settings.convocationTime || '';
  if (convocationPlaceInput) convocationPlaceInput.value = settings.convocationPlace || '';
  scheduleCache = [];
  try {
    scheduleCache = JSON.parse(settings.scheduleJson || '[]') || [];
  } catch {}
  renderSchedule();
  renderPhaseTimeline();
  candidatesCache = data.candidates || [];
  renderCandidates(candidatesCache);
  renderEliminated(candidatesCache.filter((c) => String(c.status || '') === 'eliminated'));
  renderCommuneStats(candidatesCache);
  renderCommuneMap(candidatesCache);
  renderCommuneFilter(candidatesCache);
  renderAnomalies();
  rankingCache = data.ranking || [];
  renderRanking(rankingCache);
  renderScoreboard();
  renderGlobalSearch();
  updateAdminRegistrationStatus();
}

function renderCandidates(list) {
  if (!candidatesTable) return;
  candidatesTable.innerHTML = list
    .map(
      (c) => `
      <tr>
        <td>
          <input type="checkbox" class="candidate-select" data-id="${c.id}" ${
            selectedCandidateIds.has(String(c.id)) ? 'checked' : ''
          } />
        </td>
        <td>${c.id}</td>
        <td>${resolveName(c)}</td>
        <td>${c.whatsapp || ''}</td>
        <td>${c.city || ''}</td>
        <td>${renderStatusBadge(c.status || 'pending')}</td>
        <td>
          <button data-edit="${c.id}">Modifier</button>
          <button data-whatsapp="${c.id}">WhatsApp</button>
          <button data-pdf="${c.id}">Fiche PDF</button>
          <button data-cert="${c.id}">Certificat</button>
          <button data-delete="${c.id}">Supprimer</button>
        </td>
      </tr>
    `,
    )
    .join('');
  updateSelectionInfo();
}

function renderEliminated(list) {
  if (!eliminatedTable) return;
  eliminatedTable.innerHTML = list
    .map(
      (c) => `
      <tr>
        <td>${c.id}</td>
        <td>${resolveName(c)}</td>
        <td>${c.whatsapp || ''}</td>
        <td>${c.city || ''}</td>
        <td>${renderStatusBadge(c.status || 'eliminated')}</td>
        <td><button data-edit="${c.id}">Modifier</button></td>
      </tr>
    `,
    )
    .join('');
}

function renderStatusBadge(status) {
  const key = String(status || '').toLowerCase();
  const label =
    key === 'approved' ? 'Validé' : key === 'eliminated' ? 'Éliminé' : key === 'pending' ? 'En attente' : status;
  const cls =
    key === 'approved' ? 'status-approved' : key === 'eliminated' ? 'status-eliminated' : 'status-pending';
  return `<span class="status-pill ${cls}">${label}</span>`;
}

async function loadScoreSummary(candidateId) {
  const res = await authedFetch(`/api/admin/candidates/${candidateId}/scores`);
  if (!res.ok) return { passages: 0, average: 0, total: 0 };
  const data = await res.json().catch(() => ({}));
  const rows = Array.isArray(data.items) ? data.items : [];
  if (!rows.length) return { passages: 0, average: 0, total: 0 };
  const totals = rows.map((s) => {
    const theme = Number(s.themeScore || s.themescore || 0);
    const pont = Number(s.pontAsSiratScore || s.pontassiratscore || 0);
    const recognition = Number(s.recognitionScore || s.recognitionscore || 0);
    return theme + pont + recognition;
  });
  const sum = totals.reduce((acc, v) => acc + v, 0);
  return { passages: rows.length, average: sum / totals.length, total: sum };
}

async function openCompareModal(ids) {
  if (!compareModal || !compareBody) return;
  if (!Array.isArray(ids) || ids.length !== 2) return;
  const [idA, idB] = ids;
  const candA = candidatesCache.find((c) => String(c.id) === String(idA));
  const candB = candidatesCache.find((c) => String(c.id) === String(idB));
  if (!candA || !candB) return;
  compareBody.textContent = 'Chargement...';
  const [sumA, sumB] = await Promise.all([loadScoreSummary(idA), loadScoreSummary(idB)]);
  const nameA = resolveName(candA);
  const nameB = resolveName(candB);
  compareBody.innerHTML = `
    <div class="form-grid" style="grid-template-columns: repeat(2, minmax(0,1fr)); gap:16px;">
      <div class="card" style="padding:12px;">
        <h4>${nameA}</h4>
        <p>ID: <strong>${candA.id}</strong></p>
        <p>Commune: <strong>${candA.city || '-'}</strong></p>
        <p>WhatsApp: <strong>${candA.whatsapp || '-'}</strong></p>
        <p>Statut: <strong>${candA.status || 'pending'}</strong></p>
        <p>Passages: <strong>${sumA.passages}</strong></p>
        <p>Moyenne: <strong>${sumA.average.toFixed(2)}</strong></p>
      </div>
      <div class="card" style="padding:12px;">
        <h4>${nameB}</h4>
        <p>ID: <strong>${candB.id}</strong></p>
        <p>Commune: <strong>${candB.city || '-'}</strong></p>
        <p>WhatsApp: <strong>${candB.whatsapp || '-'}</strong></p>
        <p>Statut: <strong>${candB.status || 'pending'}</strong></p>
        <p>Passages: <strong>${sumB.passages}</strong></p>
        <p>Moyenne: <strong>${sumB.average.toFixed(2)}</strong></p>
      </div>
    </div>
  `;
  compareModal.style.display = 'flex';
}

function closeCompareModal() {
  if (!compareModal) return;
  compareModal.style.display = 'none';
}

function openCandidateModal(candidate) {
  if (!candidateModal) return;
  modalCandidateId.value = candidate.id || '';
  modalCandidateName.value = resolveName(candidate) || '';
  modalCandidateCity.value = candidate.city || '';
  modalCandidateWhatsapp.value = candidate.whatsapp || '';
  modalCandidatePhone.value = candidate.phone || '';
  modalCandidateEmail.value = candidate.email || '';
  modalCandidateStatus.value = candidate.status || 'approved';
  if (candidateModalMsg) candidateModalMsg.textContent = '';
  loadCandidateScores(candidate.id);
  loadCandidateStatusHistory(candidate.id);
  candidateModal.style.display = 'flex';
}

function closeCandidateModal() {
  if (!candidateModal) return;
  candidateModal.style.display = 'none';
}

async function loadCandidateScores(candidateId) {
  if (!candidateModalScores) return;
  if (!candidateId) {
    candidateModalScores.textContent = 'Aucune note.';
    return;
  }
  candidateModalScores.textContent = 'Chargement...';
  const res = await authedFetch(`/api/admin/candidates/${candidateId}/scores`);
  if (!res.ok) {
    candidateModalScores.textContent = 'Aucune note.';
    return;
  }
  const data = await res.json();
  const rows = Array.isArray(data.items) ? data.items : [];
  if (!rows.length) {
    candidateModalScores.textContent = 'Aucune note.';
    return;
  }
  const totals = rows.map((s) => {
    const theme = Number(s.themeScore || 0);
    const pont = Number(s.pontAsSiratScore || 0);
    const recognition = Number(s.recognitionScore || s.recognitionscore || 0);
    return theme + pont + recognition;
  });
  const average = totals.reduce((sum, v) => sum + v, 0) / totals.length;
  candidateModalScores.innerHTML = `
    <div class="status">Passages: ${rows.length} | Moyenne: ${average.toFixed(2)}</div>
    <table class="table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Juge</th>
          <th>Thèmes /30</th>
          <th>Pont As Sirat /25</th>
          <th>Reconnaissance de Verset /5</th>
          <th>Total</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map((s) => {
            const theme = Number(s.themeScore || 0);
            const pont = Number(s.pontAsSiratScore || 0);
            const recognition = Number(s.recognitionScore || s.recognitionscore || 0);
            const total = theme + pont + recognition;
            const date = s.createdAt ? new Date(s.createdAt).toLocaleString('fr-FR') : '';
            return `
              <tr>
                <td>${date}</td>
                <td>${s.judgeName || ''}</td>
                <td>${theme}</td>
                <td>${pont}</td>
                <td>${recognition}</td>
                <td>${total}</td>
                <td>${s.notes || ''}</td>
              </tr>
            `;
          })
          .join('')}
      </tbody>
    </table>
  `;
}

async function loadCandidateStatusHistory(candidateId) {
  if (!candidateStatusHistory) return;
  if (!candidateId) {
    candidateStatusHistory.textContent = 'Aucun historique.';
    return;
  }
  candidateStatusHistory.textContent = 'Chargement...';
  const res = await authedFetch(`/api/admin/candidates/${candidateId}/status-history`);
  if (!res.ok) {
    candidateStatusHistory.textContent = 'Aucun historique.';
    return;
  }
  const data = await res.json().catch(() => ({}));
  const rows = Array.isArray(data.items) ? data.items : [];
  if (!rows.length) {
    candidateStatusHistory.textContent = 'Aucun historique.';
    return;
  }
  const body = rows
    .map((r) => {
      const date = r.changedAt ? new Date(r.changedAt).toLocaleString('fr-FR') : '';
      const oldStatus = r.oldStatus || '—';
      const newStatus = r.newStatus || '—';
      return `<tr><td>${date}</td><td>${oldStatus}</td><td>${newStatus}</td><td>${r.ip || ''}</td></tr>`;
    })
    .join('');
  candidateStatusHistory.innerHTML = `
    <table class="table">
      <thead><tr><th>Date</th><th>Ancien</th><th>Nouveau</th><th>IP</th></tr></thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

function printAttendanceList() {
  const list = Array.isArray(candidatesCache) ? candidatesCache.filter((c) => String(c.status || '') !== 'eliminated') : [];
  if (!list.length) {
    alert('Aucun candidat à imprimer.');
    return;
  }
  const today = new Date().toLocaleDateString('fr-FR');
  const sorted = list.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
  const rows = sorted
    .map(
      (c, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${c.id || ''}</td>
          <td>${resolveName(c)}</td>
          <td>${c.whatsapp || ''}</td>
          <td>${c.city || ''}</td>
          <td style="height:26px;"></td>
          <td style="height:26px;"></td>
          <td style="height:26px;"></td>
          <td style="height:26px;"></td>
        </tr>
      `,
    )
    .join('');
  const html = `
    <html>
      <head>
        <title>Liste d'appel — Quiz Islamique 2026</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; }
          h1 { text-align: center; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f3f3f3; }
        </style>
      </head>
      <body>
        <h1>Liste d'appel — Quiz Islamique 2026</h1>
        <p>Date : ${today}</p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>ID</th>
              <th>Nom</th>
              <th>WhatsApp</th>
              <th>Commune</th>
      <th>Phase</th>
      <th>Notes phase</th>
      <th>Présent</th>
      <th>Signature</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>`;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

function printAttendanceListForCommunes(title, communes, statusFilter = '') {
  let list = Array.isArray(candidatesCache) ? candidatesCache.slice() : [];
  if (statusFilter) {
    list = list.filter((c) => String(c.status || '') === statusFilter);
  } else {
    list = list.filter((c) => String(c.status || '') !== 'eliminated');
  }
  const communeSet = new Set(communes.map((c) => c.toUpperCase()));
  const filtered = list.filter((c) => communeSet.has((c.city || '').toUpperCase()));
  if (!filtered.length) {
    alert('Aucun candidat dans ce groupe.');
    return;
  }
  const today = new Date().toLocaleDateString('fr-FR');
  const sorted = filtered.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
  const rows = sorted
    .map(
      (c, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${c.id || ''}</td>
          <td>${resolveName(c)}</td>
          <td>${c.whatsapp || ''}</td>
          <td>${c.city || ''}</td>
          <td style="height:26px;"></td>
          <td style="height:26px;"></td>
        </tr>
      `,
    )
    .join('');
  const html = `
    <html>
      <head>
        <title>${title} — Quiz Islamique 2026</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; }
          h1 { text-align: center; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f3f3f3; }
        </style>
      </head>
      <body>
        <h1>${title} — Liste d'appel</h1>
        <p>Date : ${today}</p>
        <p>Communes: ${communes.join(', ')}</p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>ID</th>
              <th>Nom</th>
              <th>WhatsApp</th>
              <th>Commune</th>
              <th>Présent</th>
              <th>Signature</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>`;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

function filterCandidates() {
  const query = (candidateSearch?.value || '').trim().toLowerCase();
  const commune = (candidateCommuneFilter?.value || '').toLowerCase().trim();
  if (candidateView === 'eliminated') {
    renderEliminated(getBaseCandidatesList());
    return;
  }
  const base = getBaseCandidatesList();
  if (!query && !commune) {
    renderCandidates(base);
    return;
  }
  const filtered = base.filter((c) => {
    const name = resolveName(c).toLowerCase();
    const city = (c.city || '').toLowerCase();
    const phone = (c.whatsapp || '').toLowerCase();
    const matchQuery = !query || name.includes(query) || city.includes(query) || phone.includes(query);
    const matchCommune = !commune || city === commune;
    return matchQuery && matchCommune;
  });
  renderCandidates(filtered);
}

function formatRank(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '';
  return n === 1 ? '1er' : `${n}e`;
}

function computeRanks(list, getScore) {
  let prevScore = null;
  let prevRank = 0;
  return list.map((item, idx) => {
    const score = Number(getScore(item));
    let rank = 1;
    if (idx > 0) {
      rank = score === prevScore ? prevRank : idx + 1;
    }
    prevScore = score;
    prevRank = rank;
    return rank;
  });
}

function renderRanking(list) {
  if (!rankingTable) return;
  const ranks = computeRanks(list, (r) => r.totalScore ?? r.totalscore ?? r.averageScore ?? 0);
  rankingTable.innerHTML = list
    .map((r, idx) => {
      const name = resolveName({ fullName: r.fullName || r.fullname, whatsapp: r.whatsapp });
      const total = r.totalScore ?? r.totalscore ?? r.averageScore ?? 0;
      const rank = formatRank(ranks[idx]);
      return `<tr><td>${rank}</td><td>${name || 'Inconnu'}</td><td>${Number(total).toFixed(2)}</td><td>${r.passages}</td></tr>`;
    })
    .join('');
}

function generateGroupsFromRanking() {
  const groupCount = Number(settingsCache?.groupsCount || 8);
  const groupSize = Number(settingsCache?.candidatesPerGroup || 4);
  const totalNeeded = groupCount * groupSize;
  const sorted = Array.isArray(rankingCache)
    ? rankingCache
        .slice()
        .sort(
          (a, b) =>
            Number(b.totalScore ?? b.totalscore ?? b.averageScore ?? 0) -
            Number(a.totalScore ?? a.totalscore ?? a.averageScore ?? 0)
        )
    : [];
  if (!sorted.length) return [];
  const trimmed = sorted.slice(0, totalNeeded);
  const groups = Array.from({ length: groupCount }, () => []);
  const heads = trimmed.slice(0, groupCount);
  heads.forEach((c, idx) => groups[idx].push(c));
  const remaining = trimmed.slice(groupCount);
  let forward = true;
  let gi = 0;
  remaining.forEach((c) => {
    groups[gi].push(c);
    if (forward) {
      gi += 1;
      if (gi >= groupCount) {
        forward = false;
        gi = groupCount - 1;
      }
    } else {
      gi -= 1;
      if (gi < 0) {
        forward = true;
        gi = 0;
      }
    }
  });
  return groups;
}

function renderGroupsPreview() {
  if (!groupsPreview) return;
  if (!groupsCache.length) {
    groupsPreview.textContent = 'Aucun groupe généré.';
    return;
  }
  const html = groupsCache
    .map((group, idx) => {
      const rows = group
        .map((c, i) => {
          const name = resolveName({ fullName: c.fullName || c.fullname, whatsapp: c.whatsapp });
          const score = Number(c.totalScore ?? c.totalscore ?? c.averageScore ?? 0).toFixed(2);
          return `<tr><td>${i + 1}</td><td>${name || 'Inconnu'}</td><td>${score}</td></tr>`;
        })
        .join('');
      return `
        <div class="card" style="padding:12px; margin-bottom:10px;">
          <strong>Groupe ${idx + 1}</strong>
          <table class="table" style="margin-top:8px;">
            <thead><tr><th>#</th><th>Candidat</th><th>Score</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    })
    .join('');
  groupsPreview.innerHTML = html;
}

function renderScoresTable(list) {
  if (!scoresTable) return;
  const rows = Array.isArray(list) ? list : [];
  scoresTable.innerHTML = rows
    .map((s) => {
      const themeScore = s.themeScore ?? s.themescore ?? 0;
      const pontScore = s.pontAsSiratScore ?? s.pontassiratscore ?? 0;
      const recognitionScore = s.recognitionScore ?? s.recognitionscore ?? 0;
      const total = Number(themeScore || 0) + Number(pontScore || 0) + Number(recognitionScore || 0);
      const created = s.createdAt || s.createdat;
      const date = created ? new Date(created).toLocaleString('fr-FR') : '';
      return `
        <tr>
          <td>${s.id}</td>
          <td>${s.fullName || s.fullname || 'Inconnu'}</td>
          <td>${s.judgeName || s.judgename || ''}</td>
          <td>${themeScore ?? 0}</td>
          <td>${pontScore ?? 0}</td>
          <td>${recognitionScore ?? 0}</td>
          <td>${total}</td>
          <td>${date}</td>
          <td><button data-delete-score="${s.id}">Supprimer</button></td>
        </tr>
      `;
    })
    .join('');
}

function renderScoreboard() {
  if (!scoreboardList) return;
  if (!scoresCache.length) {
    scoreboardList.textContent = 'Aucune donnée.';
    return;
  }
  const byCandidate = new Map();
  scoresCache.forEach((s) => {
    const id = Number(s.candidateId || s.candidateid);
    if (!id) return;
    const theme = Number(s.themeScore || s.themescore || 0);
    const pont = Number(s.pontAsSiratScore || s.pontassiratscore || 0);
    const rec = Number(s.recognitionScore || s.recognitionscore || 0);
    const total = theme + pont + rec;
    const created = new Date(s.createdAt || s.createdat || 0);
    if (!byCandidate.has(id)) byCandidate.set(id, []);
    byCandidate.get(id).push({ total, created, name: s.fullName || s.fullname || '' });
  });

  const rows = [];
  byCandidate.forEach((items, id) => {
    items.sort((a, b) => b.created - a.created);
    const last = items[0];
    const prev = items[1];
    const trend = prev ? last.total - prev.total : 0;
    rows.push({
      id,
      name: last?.name || resolveName({ id }),
      lastScore: last?.total ?? 0,
      trend
    });
  });
  rows.sort((a, b) => b.lastScore - a.lastScore);
  const html = rows
    .slice(0, 20)
    .map((r) => {
      const arrow = r.trend > 0 ? '↑' : r.trend < 0 ? '↓' : '→';
      const cls = r.trend > 0 ? 'trend-up' : r.trend < 0 ? 'trend-down' : 'trend-flat';
      return `
        <tr>
          <td>${r.name || `ID ${r.id}`}</td>
          <td>${Number(r.lastScore).toFixed(2)}</td>
          <td class="${cls}">${arrow} ${r.trend.toFixed(2)}</td>
        </tr>
      `;
    })
    .join('');
  scoreboardList.innerHTML = `
    <table class="table">
      <thead><tr><th>Candidat</th><th>Dernier score</th><th>Tendance</th></tr></thead>
      <tbody>${html}</tbody>
    </table>
  `;
}

function renderCommuneStats(list) {
  if (!communeStats) return;
  if (!list.length) {
    communeStats.textContent = 'Aucune donnée.';
    return;
  }
  const counts = list.reduce((acc, c) => {
    const key = (c.city || 'INCONNU').toUpperCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, v]) => v));
  communeStats.innerHTML = `
    <div class="commune-stats">
      ${entries
        .map(
          ([name, value]) => `
        <div class="commune-row">
          <div class="commune-name">${name}</div>
          <div class="commune-bar">
            <div class="commune-bar-fill" style="width:${Math.round((value / max) * 100)}%;"></div>
          </div>
          <div class="commune-value">${value}</div>
        </div>
      `,
        )
        .join('')}
    </div>
  `;
}

function renderCommuneMap(list) {
  if (!communeMap) return;
  if (!list.length) {
    communeMap.textContent = 'Aucune donnée.';
    return;
  }
  const counts = list.reduce((acc, c) => {
    const key = (c.city || 'INCONNU').toUpperCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, v]) => v));
  const tiles = entries
    .map(([name, value]) => {
      const intensity = Math.max(0.2, value / max);
      return `
        <div class="commune-tile" style="--tile-intensity:${intensity}">
          <div class="commune-tile-name">${name}</div>
          <div class="commune-tile-value">${value}</div>
        </div>
      `;
    })
    .join('');
  communeMap.innerHTML = `<div class="commune-map">${tiles}</div>`;
}

function renderAnomalies() {
  if (!anomaliesList) return;
  const issues = [];
  const seen = new Map();
  candidatesCache.forEach((c) => {
    const digits = digitsOnly(c.whatsapp);
    if (!digits) {
      issues.push(`WhatsApp manquant — ${resolveName(c)} (ID ${c.id})`);
      return;
    }
    if (seen.has(digits)) {
      issues.push(`Doublon WhatsApp — ${resolveName(c)} (ID ${c.id}) et ID ${seen.get(digits)}`);
    } else {
      seen.set(digits, c.id);
    }
  });
  scoresCache.forEach((s) => {
    const theme = Number(s.themeScore || s.themescore || 0);
    const pont = Number(s.pontAsSiratScore || s.pontassiratscore || 0);
    const rec = Number(s.recognitionScore || s.recognitionscore || 0);
    const total = theme + pont + rec;
    if (total > 60 || total < 0) {
      issues.push(`Score anormal (${total}) — ${s.fullName || 'Inconnu'} (note ${s.id})`);
    }
  });
  if (!issues.length) {
    anomaliesList.textContent = 'Aucune anomalie.';
    return;
  }
  anomaliesList.innerHTML = `<ul class="anomaly-list">${issues.map((i) => `<li>${i}</li>`).join('')}</ul>`;
}

function renderCommuneFilter(list) {
  if (!candidateCommuneFilter) return;
  const communes = Array.from(
    new Set(list.map((c) => (c.city || '').toUpperCase()).filter(Boolean)),
  ).sort();
  candidateCommuneFilter.innerHTML = `<option value="">Toutes les communes</option>${communes
    .map((c) => `<option value="${c}">${c}</option>`)
    .join('')}`;
}

async function refreshCandidates() {
  const res = await authedFetch('/api/admin/candidates');
  if (!res.ok) return;
  const data = await res.json().catch(() => []);
  candidatesCache = Array.isArray(data) ? data : [];
  renderCandidates(candidatesCache);
  renderEliminated(candidatesCache.filter((c) => String(c.status || '') === 'eliminated'));
  renderCommuneStats(candidatesCache);
  renderCommuneMap(candidatesCache);
  renderCommuneFilter(candidatesCache);
  renderGlobalSearch();
  renderAnomalies();
  const statCandidatesEl = document.getElementById('statCandidates');
  if (statCandidatesEl) statCandidatesEl.textContent = candidatesCache.length;
}

function updateAdminRegistrationStatus() {
  if (!adminRegistrationStatus) return;
  const closed = Number(settingsCache.registrationLocked || 0) === 1;
  adminRegistrationStatus.textContent = closed ? 'Inscriptions: fermées' : 'Inscriptions: ouvertes';
  adminRegistrationStatus.classList.toggle('pill-danger', closed);
  adminRegistrationStatus.classList.toggle('pill-success', !closed);
}

async function setRegistrationLocked(value) {
  const payload = {
    votingEnabled: Number(settingsCache.votingEnabled || 0),
    registrationLocked: value ? 1 : 0,
    competitionClosed: Number(settingsCache.competitionClosed || 0),
    certificatesEnabled: Number(settingsCache.certificatesEnabled ?? 1),
    announcementText: settingsCache.announcementText || ''
  };
  const res = await authedFetch('/api/tournament-settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    setStatus(settingsMsg, data.message || 'Erreur.');
    return;
  }
  settingsCache.registrationLocked = payload.registrationLocked;
  updateAdminRegistrationStatus();
  setStatus(settingsMsg, 'Paramètres mis à jour.');
}

function updateLiveScoreValidation() {
  const entries = [
    { form: scoreForm, name: 'themeScore', max: 30, label: 'Thèmes /30' },
    { form: scoreForm, name: 'pontAsSiratScore', max: 25, label: 'Pont As Sirat /25' },
    { form: scoreForm, name: 'recognitionScore', max: 5, label: 'Reconnaissance /5' },
    { form: scoreQuickForm, name: 'themeScore', max: 30, label: 'Thèmes /30' },
    { form: scoreQuickForm, name: 'pontAsSiratScore', max: 25, label: 'Pont As Sirat /25' },
    { form: scoreQuickForm, name: 'recognitionScore', max: 5, label: 'Reconnaissance /5' },
  ];

  const exceeded = [];
  entries.forEach(({ form, name, max, label }) => {
    const input = form?.querySelector(`input[name="${name}"]`);
    if (!input) return;
    const value = Number(input.value || 0);
    if (value > max) {
      input.classList.add('input-error');
      exceeded.push(label);
    } else {
      input.classList.remove('input-error');
    }
  });

  if (!scoreLiveMsg) return;
  if (exceeded.length) {
    scoreLiveMsg.classList.remove('status-success');
    scoreLiveMsg.classList.add('status-warning');
    scoreLiveMsg.textContent = `Attention: max dépassé pour ${exceeded.join(', ')}.`;
  } else {
    scoreLiveMsg.classList.remove('status-warning');
    scoreLiveMsg.classList.add('status-success');
    scoreLiveMsg.textContent = 'Saisie OK.';
  }
}

async function loadMembers() {
  if (!memberAccountsSection) return;
  memberAccountsSection.classList.remove('admin-hidden');
  const res = await authedFetch('/api/admin/members');
  if (!res.ok) return;
  const data = await res.json();
  membersCache = data.members || [];
  renderMembers();
}

function renderMembers() {
  if (!membersTableBody) return;
  membersTableBody.innerHTML = membersCache
    .map((m) => `
      <tr>
        <td>${m.id}</td>
        <td>${m.username || ''}</td>
        <td>${m.fullname || m.fullName || ''}</td>
        <td>${m.role || ''}</td>
        <td>${Number(m.active) === 1 ? 'Actif' : 'Inactif'}</td>
        <td>
          <button data-member-edit="${m.id}">Modifier</button>
          <button data-member-delete="${m.id}">Supprimer</button>
        </td>
      </tr>
    `)
    .join('');
}

async function loadDailyQuizAdmin() {
  if (!dailyQuizSection) return;
  dailyQuizSection.classList.remove('admin-hidden');
  const res = await authedFetch('/api/admin/daily-quiz');
  if (!res.ok) return;
  const data = await res.json();
  if (dailyQuizTitle) dailyQuizTitle.value = data.title || '';
  if (dailyQuizQuestions) {
    const lines = (data.questions || []).map((q) => {
      const options = (q.options || []).join(';');
      return `${q.question} | ${options} | ${q.answerIndex}`;
    });
    dailyQuizQuestions.value = lines.join('\n');
  }
}

async function loadMemberAudit() {
  if (!memberAuditSection) return;
  memberAuditSection.classList.remove('admin-hidden');
  if (memberAuditList) memberAuditList.textContent = 'Chargement...';
  const res = await authedFetch('/api/admin/member-audit');
  if (!res.ok) return;
  const data = await res.json();
  const logs = data.logs || [];
  if (!memberAuditList) return;
  memberAuditList.innerHTML = logs.length
    ? `<table class="table">
        <thead><tr><th>Date</th><th>Membre</th><th>Action</th><th>Détails</th></tr></thead>
        <tbody>
          ${logs
            .map((l) => {
              const when = l.createdat || l.createdAt || '';
              const name = l.fullname || l.fullName || l.username || 'Membre';
              const payload = l.payload ? String(l.payload).slice(0, 120) : '';
              return `<tr><td>${when}</td><td>${name}</td><td>${l.action || ''}</td><td>${payload}</td></tr>`;
            })
            .join('')}
        </tbody>
      </table>`
    : 'Aucune activité.';
}

function renderMonthlyBarChart(target, data) {
  if (!target) return;
  if (!data.length) {
    target.textContent = 'Aucune donnée.';
    return;
  }
  const max = Math.max(...data.map((d) => d.value));
  target.innerHTML = data
    .map(
      (d) => `
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
        <div style="min-width:48px;">${d.label}</div>
        <div style="flex:1; background:#efe6d6; border-radius:999px; height:10px;">
          <div style="background:var(--emerald); width:${max ? Math.round((d.value / max) * 100) : 0}%; height:10px; border-radius:999px;"></div>
        </div>
        <div style="width:36px; text-align:right;">${d.value}</div>
      </div>
    `,
    )
    .join('');
}

function buildMonthlySeries(items, dateKey, months = 6) {
  const now = new Date();
  const series = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString('fr-FR', { month: 'short' });
    series.push({ year: d.getFullYear(), month: d.getMonth(), label, value: 0 });
  }
  items.forEach((item) => {
    const raw = item[dateKey] || item[dateKey.toLowerCase()];
    if (!raw) return;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return;
    series.forEach((s) => {
      if (s.year === d.getFullYear() && s.month === d.getMonth()) {
        s.value += 1;
      }
    });
  });
  return series.map(({ label, value }) => ({ label, value }));
}

function renderGlobalSearch() {
  if (!globalSearchResults) return;
  const query = (globalSearchInput?.value || '').trim().toLowerCase();
  if (!query) {
    globalSearchResults.textContent = 'Aucun résultat.';
    return;
  }
  const results = [];
  candidatesCache.forEach((c) => {
    const name = resolveName(c).toLowerCase();
    const city = (c.city || '').toLowerCase();
    const phone = (c.whatsapp || '').toLowerCase();
    if (name.includes(query) || city.includes(query) || phone.includes(query)) {
      results.push(`Candidat: ${resolveName(c)} — ${c.city || ''} — ${c.whatsapp || ''}`);
    }
  });
  newsCache.forEach((n) => {
    const title = (n.title || '').toLowerCase();
    const body = (n.body || '').toLowerCase();
    if (title.includes(query) || body.includes(query)) {
      results.push(`Actualité: ${n.title || ''}`);
    }
  });
  sponsorsCache.forEach((s) => {
    const name = (s.name || '').toLowerCase();
    const contact = (s.contactname || s.contactName || '').toLowerCase();
    if (name.includes(query) || contact.includes(query)) {
      results.push(`Sponsor: ${s.name || ''}`);
    }
  });
  globalSearchResults.innerHTML = results.length
    ? results.map((r) => `<div>${r}</div>`).join('')
    : 'Aucun résultat.';
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('fr-FR');
}

async function uploadNewsImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await authedFetch('/api/upload/photo', {
    method: 'POST',
    headers: {},
    body: formData,
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  return data.url || null;
}

async function uploadSponsorLogo(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await authedFetch('/api/upload/photo', {
    method: 'POST',
    headers: {},
    body: formData,
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  return data.url || null;
}

function renderNews(list) {
  if (!newsTable) return;
  newsTable.innerHTML = list
    .map(
      (n) => `
      <tr>
        <td>${n.id}</td>
        <td>${n.title || ''}</td>
        <td>${n.status || 'draft'}${n.featured ? ' · À la une' : ''}${n.category ? ` · ${n.category}` : ''}</td>
        <td>${formatDate(n.createdAt)}</td>
        <td>
          <button data-edit-news="${n.id}">Modifier</button>
          <button data-toggle-status="${n.id}" data-next-status="${n.status === 'published' ? 'draft' : 'published'}">
            ${n.status === 'published' ? 'Dépublier' : 'Publier'}
          </button>
          <button data-toggle-feature="${n.id}" data-next-feature="${n.featured ? 'false' : 'true'}">
            ${n.featured ? 'Retirer la une' : 'Mettre à la une'}
          </button>
          <button data-delete-news="${n.id}">Supprimer</button>
        </td>
      </tr>
    `,
    )
    .join('');
}

function parseImagesInput(value) {
  if (!value) return [];
  return value
    .split(/[\n,]+/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function renderNewsImagesPreview() {
  if (!newsImagePreview) return;
  if (!newsImages.length) {
    newsImagePreview.textContent = 'Aucun aperçu';
    return;
  }
  newsImagePreview.innerHTML = newsImages
    .map(
      (url) =>
        `<img src="${url}" alt="Aperçu" style="max-width:120px; border-radius:8px; margin:4px;" />`,
    )
    .join('');
}

async function loadNewsAdmin() {
  const res = await authedFetch('/api/admin/news');
  if (!res.ok) return;
  const data = await res.json();
  const items = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
  newsCache = items;
  renderNews(items);
}

function renderSponsors(list) {
  if (!sponsorsTable) return;
  sponsorsTable.innerHTML = list
    .map(
      (s) => `
      <tr>
        <td>${s.id}</td>
        <td>${s.name || ''}</td>
        <td>${s.contactname || s.contactName || ''}</td>
        <td>${s.status || 'pending'}</td>
        <td>
          <button data-edit-sponsor="${s.id}">Modifier</button>
          <button data-approve-sponsor="${s.id}">Approuver</button>
          <button data-pending-sponsor="${s.id}">Mettre en attente</button>
          <button data-delete-sponsor="${s.id}">Supprimer</button>
        </td>
      </tr>
    `,
    )
    .join('');
}

async function loadSponsors() {
  const res = await authedFetch('/api/admin/sponsors');
  if (!res.ok) return;
  const data = await res.json();
  const items = Array.isArray(data) ? data : [];
  sponsorsCache = items;
  renderSponsors(items);
}

async function loadFinances() {
  const res = await authedFetch('/api/admin/donations');
  if (res.ok) {
    const donations = await res.json();
    const list = Array.isArray(donations) ? donations : [];
    const confirmed = list.filter((d) => (d.status || '').toLowerCase() === 'confirmed');
    if (donationCount) donationCount.textContent = confirmed.length;
    if (donationTotal) {
      const total = confirmed.reduce((sum, d) => sum + Number(d.amount || 0), 0);
      donationTotal.textContent = total.toFixed(0);
    }
    if (donationsTable) {
      donationsTable.innerHTML = list
        .slice(0, 20)
        .map(
          (d) => `
          <tr>
            <td>${d.id}</td>
            <td>${d.donorname || d.donorName || ''}</td>
            <td>${d.donoremail || d.donorEmail || ''}</td>
            <td>${d.amount || ''}</td>
            <td>${d.status || ''}</td>
            <td>
              <button data-confirm-donation="${d.id}">Confirmer</button>
            </td>
          </tr>
        `,
        )
        .join('');
    }
    const donationSeries = buildMonthlySeries(list, 'createdAt', 6);
    renderMonthlyBarChart(donationChart, donationSeries);
  }
  const approved = sponsorsCache.filter((s) => (s.status || '').toLowerCase() === 'approved').length;
  const pending = sponsorsCache.filter((s) => (s.status || '').toLowerCase() === 'pending').length;
  if (sponsorApprovedCount) sponsorApprovedCount.textContent = approved;
  if (sponsorPendingCount) sponsorPendingCount.textContent = pending;
  const registrationSeries = buildMonthlySeries(candidatesCache, 'createdAt', 6);
  renderMonthlyBarChart(registrationChart, registrationSeries);
}

async function loadPollAdmin() {
  const res = await authedFetch('/api/admin/poll');
  if (!res.ok) return;
  const data = await res.json();
  if (!data.poll) return;
  if (pollQuestionInput) pollQuestionInput.value = data.poll.question || '';
  if (pollOptionsInput) {
    pollOptionsInput.value = (data.poll.options || []).map((o) => o.label || o).join('\n');
  }
  if (pollActive) pollActive.value = data.poll.active ? '1' : '0';
}

async function loadSiteContentAdmin() {
  if (!siteContentForm) return;
  const res = await authedFetch('/api/admin/site-content');
  if (!res.ok) return;
  const data = await res.json();
  if (aboutTitleInput) aboutTitleInput.value = data.about?.title || '';
  if (aboutSubtitleInput) aboutSubtitleInput.value = data.about?.subtitle || '';
  if (aboutBodyInput) aboutBodyInput.value = data.about?.body || '';
  if (committeeInput) committeeInput.value = joinPipeLines(data.committee?.members, ['role', 'name']);
  if (leadersInput) leadersInput.value = joinPipeLines(data.leaders?.items, ['role', 'name', 'message']);
  if (programsInput) programsInput.value = joinPipeLines(data.programs?.items, ['title', 'description']);
  if (valuesTitleInput) valuesTitleInput.value = data.values?.title || '';
  if (valuesBodyInput) valuesBodyInput.value = data.values?.body || '';
  if (valuesBulletsInput) valuesBulletsInput.value = joinPipeLines(
    (data.values?.bullets || []).map((b) => ({ value: b })),
    ['value']
  );
  if (communiquesInput) communiquesInput.value = joinPipeLines(data.communiques?.items, ['date', 'title', 'body', 'signedBy']);
  if (documentsInput) documentsInput.value = joinPipeLines(data.documents?.items, ['title', 'url']);
  if (documentsSummaryInput) documentsSummaryInput.value = data.documents?.summary || '';
  if (transparencyBodyInput) transparencyBodyInput.value = data.transparency?.body || '';
  if (transparencyStatsInput) transparencyStatsInput.value = joinPipeLines(data.transparency?.stats, ['label', 'value']);
  if (transparencyReportsInput) transparencyReportsInput.value = joinPipeLines(data.transparency?.reports, ['title', 'url']);
  if (membershipOpenInput) membershipOpenInput.value = data.membership?.open ? '1' : '0';
  if (membershipInfoInput) membershipInfoInput.value = data.membership?.info || '';
  if (footerAddressInput) footerAddressInput.value = data.footer?.address || '';
  if (footerPhoneInput) footerPhoneInput.value = data.footer?.phone || '';
  if (footerEmailInput) footerEmailInput.value = data.footer?.email || '';
  if (footerHoursInput) footerHoursInput.value = data.footer?.hours || '';
}

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadBlob(filename, blob) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

async function downloadCertificate(candidateId) {
  const res = await authedFetch(`/api/admin/certificates/${candidateId}`);
  if (!res.ok) {
    alert("Impossible de générer le certificat.");
    return;
  }
  const blob = await res.blob();
  downloadBlob(`certificat-${candidateId}.pdf`, blob);
}

async function doAdminLogin(payload) {
  setStatus(loginMsg, 'Connexion...');
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(loginMsg, 'Identifiant incorrect.');
      if (usernameInput) {
        usernameInput.value = DEFAULT_ADMIN_USERNAME;
      }
      if (passwordInput) {
        passwordInput.value = '';
        passwordInput.focus();
      }
      return;
    }
    authHeader = `Bearer ${data.token}`;
    localStorage.setItem('adminAuth', authHeader);
    showAdmin();
    try {
      await authedFetch('/api/admin/sync-manual-candidates', { method: 'POST' });
    } catch {}
    await loadDashboard();
  } catch (error) {
    setStatus(loginMsg, 'Erreur réseau. Réessaie.');
  }
}

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(loginForm).entries());
  await doAdminLogin(payload);
});

archiveSeasonBtn?.addEventListener('click', async () => {
  const label = (seasonLabelInput?.value || '').trim() || '2026';
  const ok = confirm(`Archiver la saison ${label} ? Les modifications seront bloquées.`);
  if (!ok) return;
  const res = await authedFetch('/api/admin/archive', {
    method: 'POST',
    body: JSON.stringify({ label })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    alert(data.message || 'Archivage impossible.');
    return;
  }
  await loadArchiveStatus();
});

unarchiveSeasonBtn?.addEventListener('click', async () => {
  const ok = confirm('Déverrouiller la saison et réactiver les modifications ?');
  if (!ok) return;
  const res = await authedFetch('/api/admin/unarchive', { method: 'POST' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    alert(data.message || 'Action impossible.');
    return;
  }
  await loadArchiveStatus();
});

adminLogoutBtn?.addEventListener('click', () => {
  authHeader = '';
  localStorage.removeItem('adminAuth');
  hideAdmin();
  setStatus(loginMsg, 'Déconnecté.');
});

// Hard-stop autofill: always clear credentials on load
(() => {
  if (usernameInput) usernameInput.value = '';
  if (passwordInput) passwordInput.value = '';
})();

toggleAdminPassword?.addEventListener('click', () => {
  if (!passwordInput) return;
  const isHidden = passwordInput.type === 'password';
  passwordInput.type = isHidden ? 'text' : 'password';
  toggleAdminPassword.textContent = isHidden ? 'Masquer le mot de passe' : 'Afficher le mot de passe';
});

function setCompactMode(enabled) {
  document.body.classList.toggle('admin-compact', enabled);
  if (compactToggleBtn) {
    compactToggleBtn.textContent = enabled ? 'Mode normal' : 'Mode compact';
  }
  localStorage.setItem('adminCompact', enabled ? '1' : '0');
}

const storedCompact = localStorage.getItem('adminCompact') === '1';
setCompactMode(storedCompact);

compactToggleBtn?.addEventListener('click', () => {
  const enabled = !document.body.classList.contains('admin-compact');
  setCompactMode(enabled);
});

superAdminUnlocked = localStorage.getItem('superAdminUnlocked') === '1';
applySuperAdminUI();
superAdminUnlockBtn?.addEventListener('click', unlockSuperAdmin);
superAdminLockBtn?.addEventListener('click', lockSuperAdmin);

initThemeToggle();
document.body.classList.add('loaded');

function setJuryMode(enabled) {
  document.body.classList.toggle('jury-mode', enabled);
  if (juryModeToggle) {
    juryModeToggle.textContent = enabled ? 'Quitter mode Jury' : 'Mode Jury';
  }
  localStorage.setItem('juryMode', enabled ? '1' : '0');
}

const storedJuryMode = localStorage.getItem('juryMode') === '1';
setJuryMode(storedJuryMode);

juryModeToggle?.addEventListener('click', () => {
  const enabled = !document.body.classList.contains('jury-mode');
  setJuryMode(enabled);
});

settingsForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus(settingsMsg, 'Enregistrement...');
  const payload = Object.fromEntries(new FormData(settingsForm).entries());
  Object.keys(payload).forEach((k) => {
    if (k === 'announcementText') return;
    payload[k] = Number(payload[k]);
  });
  payload.convocationDate = convocationDateInput?.value || '';
  payload.convocationTime = convocationTimeInput?.value || '';
  payload.convocationPlace = convocationPlaceInput?.value || '';
  payload.scheduleJson = JSON.stringify(scheduleCache);
  const res = await authedFetch('/api/tournament-settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  setStatus(settingsMsg, data.message || (res.ok ? 'Mis à jour.' : 'Erreur.'));
  if (res.ok) {
    settingsCache = { ...settingsCache, ...payload };
    updateAdminRegistrationStatus();
  }
});

siteContentForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus(siteContentMsg, 'Enregistrement...');
  const payload = {
    about: {
      title: aboutTitleInput?.value || '',
      subtitle: aboutSubtitleInput?.value || '',
      body: aboutBodyInput?.value || ''
    },
    committee: {
      members: parsePipeLines(committeeInput?.value || '', ['role', 'name'])
    },
    leaders: {
      items: parsePipeLines(leadersInput?.value || '', ['role', 'name', 'message'])
    },
    programs: {
      items: parsePipeLines(programsInput?.value || '', ['title', 'description'])
    },
    values: {
      title: valuesTitleInput?.value || '',
      body: valuesBodyInput?.value || '',
      bullets: parsePipeLines(valuesBulletsInput?.value || '', ['value']).map((v) => v.value)
    },
    communiques: {
      items: parsePipeLines(communiquesInput?.value || '', ['date', 'title', 'body', 'signedBy'])
    },
    documents: {
      summary: documentsSummaryInput?.value || '',
      items: parsePipeLines(documentsInput?.value || '', ['title', 'url'])
    },
    transparency: {
      body: transparencyBodyInput?.value || '',
      stats: parsePipeLines(transparencyStatsInput?.value || '', ['label', 'value']),
      reports: parsePipeLines(transparencyReportsInput?.value || '', ['title', 'url'])
    },
    membership: {
      open: membershipOpenInput?.value === '1',
      info: membershipInfoInput?.value || ''
    },
    footer: {
      address: footerAddressInput?.value || '',
      phone: footerPhoneInput?.value || '',
      email: footerEmailInput?.value || '',
      hours: footerHoursInput?.value || ''
    }
  };
  const res = await authedFetch('/api/admin/site-content', {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  setStatus(siteContentMsg, data.message || (res.ok ? 'Contenus mis à jour.' : 'Erreur.'));
});

candidateForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus(candidateMsg, 'Sauvegarde...');
  const payload = Object.fromEntries(new FormData(candidateForm).entries());
  payload.city = (payload.city || '').toUpperCase();
  const id = payload.id;
  delete payload.id;
  const res = await authedFetch(id ? `/api/admin/candidates/${id}` : '/api/admin/candidates', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  setStatus(candidateMsg, data.message || (res.ok ? 'Sauvegardé.' : 'Erreur.'));
  await refreshCandidates();
});

candidateSearch?.addEventListener('input', () => {
  filterCandidates();
});

candidateCommuneFilter?.addEventListener('change', () => {
  filterCandidates();
});

printAttendanceBtn?.addEventListener('click', printAttendanceList);
printAbidjanNord?.addEventListener('click', () => {
  printAttendanceListForCommunes('Abidjan Nord', [
    'COCODY',
    'ADJAME',
    'ADJAMÉ',
    'ABOBO',
    'ANYAMA',
    'YOPOUGON',
    'BINGERVILLE',
    'ATTECOUBE'
  ]);
});

printAbidjanSud?.addEventListener('click', () => {
  printAttendanceListForCommunes('Abidjan Sud', [
    'PLATEAU',
    'TREICHVILLE',
    'MARCORY',
    'KOUMASSI',
    'PORT-BOUET'
  ]);
});

printAbidjanNordOnline?.addEventListener('click', () => {
  printAttendanceListForCommunes('Abidjan Nord (en ligne)', [
    'COCODY',
    'ADJAME',
    'ADJAMÉ',
    'ABOBO',
    'ANYAMA',
    'YOPOUGON',
    'BINGERVILLE',
    'ATTECOUBE'
  ], 'approved');
});

printAbidjanSudOnline?.addEventListener('click', () => {
  printAttendanceListForCommunes('Abidjan Sud (en ligne)', [
    'PLATEAU',
    'TREICHVILLE',
    'MARCORY',
    'KOUMASSI',
    'PORT-BOUET'
  ], 'approved');
});
downloadAttendanceDoc?.addEventListener('click', () => {
  const list = Array.isArray(candidatesCache) ? candidatesCache.slice() : [];
  if (!list.length) {
    alert('Aucun candidat à exporter.');
    return;
  }
  const today = new Date().toLocaleDateString('fr-FR');
  const sorted = list.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
  const rows = sorted
    .map(
      (c, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${c.id || ''}</td>
          <td>${resolveName(c)}</td>
          <td>${c.whatsapp || ''}</td>
          <td>${c.city || ''}</td>
          <td style="height:24px;"></td>
          <td style="height:24px;"></td>
          <td style="height:24px;"></td>
          <td style="height:24px;"></td>
        </tr>
      `,
    )
    .join('');

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Liste d'appel — Quiz Islamique 2026</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; }
          h1 { text-align: center; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f3f3f3; }
        </style>
      </head>
      <body>
        <h1>Liste d'appel — Quiz Islamique 2026</h1>
        <p>Date : ${today}</p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>ID</th>
              <th>Nom</th>
              <th>WhatsApp</th>
              <th>Commune</th>
              <th>Présent</th>
              <th>Signature</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>`;

  const blob = new Blob([html], { type: 'application/msword' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Liste-presence-Quiz-Islamique-2026-${today.replace(/\//g, '-')}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

candidateModalClose?.addEventListener('click', closeCandidateModal);
candidateModal?.addEventListener('click', (e) => {
  if (e.target === candidateModal) closeCandidateModal();
});

candidateModalForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!modalCandidateId.value) return;
  setStatus(candidateModalMsg, 'Sauvegarde...');
  const payload = Object.fromEntries(new FormData(candidateModalForm).entries());
  payload.city = (payload.city || '').toUpperCase();
  const res = await authedFetch(`/api/admin/candidates/${payload.id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  setStatus(candidateModalMsg, data.message || (res.ok ? 'Mis à jour.' : 'Erreur.'));
  if (res.ok) {
    await refreshCandidates();
    setTimeout(closeCandidateModal, 600);
  }
});

candidateModalWhatsapp?.addEventListener('click', () => {
  const name = modalCandidateName?.value || '';
  const phone = modalCandidateWhatsapp?.value || '';
  openWhatsappChat(phone, name);
});

candidateModalPdf?.addEventListener('click', async () => {
  const id = modalCandidateId?.value;
  if (!id) return;
  const res = await authedFetch(`/api/admin/candidates/${id}/pdf`);
  if (!res.ok) return;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `candidat-${id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

candidateModalDelete?.addEventListener('click', async () => {
  const id = modalCandidateId.value;
  if (!id) return;
  const ok = confirm('Supprimer définitivement ce candidat ?');
  if (!ok) return;
  const res = await authedFetch(`/api/admin/candidates/${id}`, { method: 'DELETE' });
  if (res.ok) {
    await loadDashboard();
    closeCandidateModal();
  } else {
    setStatus(candidateModalMsg, 'Suppression impossible.');
  }
});

globalSearchInput?.addEventListener('input', () => {
  renderGlobalSearch();
});

candidatesTable?.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-edit]');
  if (btn) {
    const id = btn.getAttribute('data-edit');
    const candidate = candidatesCache.find((c) => String(c.id) === String(id));
    if (candidate) {
      openCandidateModal(candidate);
    }
    return;
  }
  const whatsappBtn = e.target.closest('button[data-whatsapp]');
  if (whatsappBtn) {
    const id = whatsappBtn.getAttribute('data-whatsapp');
    const candidate = candidatesCache.find((c) => String(c.id) === String(id));
    if (candidate) {
      openWhatsappChat(candidate.whatsapp, resolveName(candidate));
    } else {
      openWhatsappChat('', '');
    }
    return;
  }
  const pdfBtn = e.target.closest('button[data-pdf]');
  if (pdfBtn) {
    const id = pdfBtn.getAttribute('data-pdf');
    if (!id) return;
    const res = await authedFetch(`/api/admin/candidates/${id}/pdf`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `candidat-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return;
  }
  const certBtn = e.target.closest('button[data-cert]');
  if (certBtn) {
    const id = certBtn.getAttribute('data-cert');
    if (!id) return;
    downloadCertificate(id);
    return;
  }
  const delBtn = e.target.closest('button[data-delete]');
  if (!delBtn) return;
  const id = delBtn.getAttribute('data-delete');
  if (!id) return;
  const ok = confirm('Supprimer définitivement ce candidat ?');
  if (!ok) return;
  authedFetch(`/api/admin/candidates/${id}`, { method: 'DELETE' }).then(async (res) => {
    if (res.ok) {
      await loadDashboard();
    } else {
      alert('Suppression impossible.');
    }
  });
});

candidatesTable?.addEventListener('change', (e) => {
  const box = e.target.closest('input.candidate-select');
  if (!box) return;
  const id = box.dataset.id;
  if (!id) return;
  if (box.checked) {
    selectedCandidateIds.add(String(id));
  } else {
    selectedCandidateIds.delete(String(id));
  }
  updateSelectionInfo();
});

selectAllCandidates?.addEventListener('change', () => {
  if (!selectAllCandidates) return;
  const rows = Array.from(document.querySelectorAll('input.candidate-select'));
  rows.forEach((box) => {
    const id = box.dataset.id;
    if (!id) return;
    box.checked = selectAllCandidates.checked;
    if (selectAllCandidates.checked) {
      selectedCandidateIds.add(String(id));
    } else {
      selectedCandidateIds.delete(String(id));
    }
  });
  updateSelectionInfo();
});

bulkClearSelection?.addEventListener('click', () => {
  selectedCandidateIds.clear();
  const rows = Array.from(document.querySelectorAll('input.candidate-select'));
  rows.forEach((box) => {
    box.checked = false;
  });
  if (selectAllCandidates) selectAllCandidates.checked = false;
  updateSelectionInfo();
});

async function applyBulkStatus(status) {
  const ids = getSelectedCandidateIds();
  if (!ids.length) return;
  const ok = confirm(`Appliquer le statut "${status}" à ${ids.length} candidat(s) ?`);
  if (!ok) return;
  const res = await authedFetch('/api/admin/candidates/bulk-status', {
    method: 'POST',
    body: JSON.stringify({ ids, status })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    alert(data.message || 'Opération impossible.');
    return;
  }
  selectedCandidateIds.clear();
  if (selectAllCandidates) selectAllCandidates.checked = false;
  updateSelectionInfo();
  await refreshCandidates();
}

bulkApproveBtn?.addEventListener('click', () => applyBulkStatus('approved'));
bulkEliminateBtn?.addEventListener('click', () => applyBulkStatus('eliminated'));
bulkCompareBtn?.addEventListener('click', () => openCompareModal(getSelectedCandidateIds()));

compareModalClose?.addEventListener('click', closeCompareModal);
compareModal?.addEventListener('click', (e) => {
  if (e.target === compareModal) closeCompareModal();
});

memberForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus(memberMsg, 'Sauvegarde...');
  const payload = Object.fromEntries(new FormData(memberForm).entries());
  if (payload.active !== undefined) payload.active = Number(payload.active);
  const id = payload.id;
  delete payload.id;
  if (!payload.password) delete payload.password;
  const res = await authedFetch(id ? `/api/admin/members/${id}` : '/api/admin/members', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  setStatus(memberMsg, data.message || (res.ok ? 'Enregistré.' : 'Erreur.'));
  if (res.ok) {
    memberForm.reset();
    await loadMembers();
  }
});

membersTableBody?.addEventListener('click', (e) => {
  const editBtn = e.target.closest('button[data-member-edit]');
  if (editBtn) {
    const id = editBtn.getAttribute('data-member-edit');
    const member = membersCache.find((m) => String(m.id) === String(id));
    if (member) {
      memberIdInput.value = member.id;
      memberUsernameInput.value = member.username || '';
      memberFullNameInput.value = member.fullname || member.fullName || '';
      memberRoleInput.value = member.role || '';
      memberEmailInput.value = member.email || '';
      memberPhoneInput.value = member.phone || '';
      memberActiveInput.value = Number(member.active) === 1 ? '1' : '0';
    }
    return;
  }
  const delBtn = e.target.closest('button[data-member-delete]');
  if (delBtn) {
    const id = delBtn.getAttribute('data-member-delete');
    if (!id) return;
    const ok = confirm('Supprimer ce compte membre ?');
    if (!ok) return;
    authedFetch(`/api/admin/members/${id}`, { method: 'DELETE' }).then(async (res) => {
      if (res.ok) {
        await loadMembers();
      } else {
        alert('Suppression impossible.');
      }
    });
  }
});

resetAllMembersPwd?.addEventListener('click', async () => {
  const ok = confirm('Réinitialiser le mot de passe de TOUS les membres ?');
  if (!ok) return;
  setStatus(memberMsg, 'Réinitialisation...');
  const res = await authedFetch('/api/admin/members/reset-passwords', { method: 'POST' });
  const data = await res.json().catch(() => ({}));
  setStatus(memberMsg, data.message || (res.ok ? 'Mots de passe réinitialisés.' : 'Erreur.'));
});

updateDefaultMemberPwd?.addEventListener('click', async () => {
  const newPwd = (memberDefaultPasswordInput?.value || '').trim();
  if (!newPwd) {
    setStatus(memberMsg, 'Veuillez saisir un mot de passe par défaut.');
    return;
  }
  const ok = confirm('Mettre à jour le mot de passe de TOUS les membres ?');
  if (!ok) return;
  setStatus(memberMsg, 'Réinitialisation...');
  const res = await authedFetch('/api/admin/members/reset-passwords', {
    method: 'POST',
    body: JSON.stringify({ password: newPwd })
  });
  const data = await res.json().catch(() => ({}));
  setStatus(memberMsg, data.message || (res.ok ? 'Mots de passe réinitialisés.' : 'Erreur.'));
  if (res.ok && memberDefaultPasswordInput) {
    memberDefaultPasswordInput.value = '';
  }
});

dailyQuizForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus(dailyQuizMsg, 'Enregistrement...');
  const title = dailyQuizTitle?.value || '';
  const raw = dailyQuizQuestions?.value || '';
  const questions = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [questionPart, optionsPart, answerPart] = line.split('|').map((s) => (s || '').trim());
      const options = (optionsPart || '').split(';').map((s) => s.trim()).filter(Boolean);
      const answerIndex = Number(answerPart);
      return { question: questionPart, options, answerIndex };
    });
  const res = await authedFetch('/api/admin/daily-quiz', {
    method: 'PUT',
    body: JSON.stringify({ title, questions })
  });
  const data = await res.json().catch(() => ({}));
  setStatus(dailyQuizMsg, data.message || (res.ok ? 'Quiz mis à jour.' : 'Erreur.'));
});

function applyScoresFilters() {
  const judgeQuery = (scoresJudgeFilter?.value || '').trim().toLowerCase();
  const fromValue = scoresDateFrom?.value || '';
  const toValue = scoresDateTo?.value || '';
  const fromDate = fromValue ? new Date(`${fromValue}T00:00:00`) : null;
  const toDate = toValue ? new Date(`${toValue}T23:59:59`) : null;

  const filtered = scoresCache.filter((s) => {
    const judge = (s.judgeName || s.judgename || '').toLowerCase();
    if (judgeQuery && !judge.includes(judgeQuery)) return false;
    const createdRaw = s.createdAt || s.createdat;
    if (fromDate || toDate) {
      if (!createdRaw) return false;
      const created = new Date(createdRaw);
      if (fromDate && created < fromDate) return false;
      if (toDate && created > toDate) return false;
    }
    return true;
  });

  if (scoresFilterInfo) {
    const total = scoresCache.length;
    scoresFilterInfo.textContent = `${filtered.length} / ${total} résultats`;
  }
  renderScoresTable(filtered);
}

async function loadScoresTable() {
  if (!scoresTable) return;
  const res = await authedFetch('/api/admin/scores');
  if (!res.ok) return;
  const data = await res.json().catch(() => ({}));
  scoresCache = Array.isArray(data.items)
    ? data.items
    : Array.isArray(data)
      ? data
      : [];
  applyScoresFilters();
  renderScoreboard();
  renderAnomalies();
}

async function deleteScore(scoreId) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) return;
  const res = await authedFetch(`/api/admin/scores/${scoreId}`, { method: 'DELETE' });
  const data = await res.json().catch(() => ({}));
  setStatus(scoreMsg, data.message || 'Note supprimée.');
  await loadScoresTable();
  await loadDashboard();
}

async function loadCandidateName(candidateId) {
  if (!candidateId) {
    if (candidateName) candidateName.textContent = 'À remplir';
    return;
  }
  const res = await authedFetch(`/api/admin/candidates/${candidateId}`);
  const data = await res.json().catch(() => ({}));
  if (candidateName) {
    candidateName.textContent = data.fullName || 'Candidat introuvable';
  }
}

const candidateIdInput = scoreForm?.querySelector('input[name="candidateId"]');
if (candidateIdInput) {
  candidateIdInput.addEventListener('blur', async () => {
    await loadCandidateName(candidateIdInput.value);
  });
  candidateIdInput.addEventListener('change', async () => {
    await loadCandidateName(candidateIdInput.value);
  });
}

scoreForm?.addEventListener('input', updateLiveScoreValidation);
scoreQuickForm?.addEventListener('input', updateLiveScoreValidation);

scoreForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus(scoreMsg, 'Enregistrement...');
  const payload = Object.fromEntries(new FormData(scoreForm).entries());
  if (
    Number(payload.themeScore || 0) > 30 ||
    Number(payload.pontAsSiratScore || 0) > 25 ||
    Number(payload.recognitionScore || 0) > 5
  ) {
    const ok = confirm('Attention: une note dépasse le maximum autorisé. Continuer ?');
    if (!ok) {
      setStatus(scoreMsg, 'Annulé.');
      return;
    }
  }
  const res = await authedFetch('/api/admin/scores', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  setStatus(scoreMsg, data.message || (res.ok ? 'Note enregistrée.' : 'Erreur.'));
  if (res.ok) {
    scoreForm.reset();
    if (candidateName) candidateName.textContent = 'À remplir';
    await loadScoresTable();
  }
  await loadDashboard();
});

scoreQuickForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus(scoreMsg, 'Enregistrement...');
  const payload = Object.fromEntries(new FormData(scoreQuickForm).entries());
  if (
    Number(payload.themeScore || 0) > 30 ||
    Number(payload.pontAsSiratScore || 0) > 25 ||
    Number(payload.recognitionScore || 0) > 5
  ) {
    const ok = confirm('Attention: une note dépasse le maximum autorisé. Continuer ?');
    if (!ok) {
      setStatus(scoreMsg, 'Annulé.');
      return;
    }
  }
  const res = await authedFetch('/api/admin/scores', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  setStatus(scoreMsg, data.message || (res.ok ? 'Note enregistrée.' : 'Erreur.'));
  if (res.ok) {
    scoreQuickForm.reset();
    await loadScoresTable();
  }
  await loadDashboard();
});

setInterval(() => {
  if (isEditing && Date.now() - lastEditAt < 20000) return;
  isEditing = false;
  if (loginCard && loginCard.classList.contains('admin-hidden')) {
    loadDashboard();
  }
}, 30000);

scoresJudgeFilter?.addEventListener('input', applyScoresFilters);
scoresDateFrom?.addEventListener('change', applyScoresFilters);
scoresDateTo?.addEventListener('change', applyScoresFilters);
scoresFilterClear?.addEventListener('click', () => {
  if (scoresJudgeFilter) scoresJudgeFilter.value = '';
  if (scoresDateFrom) scoresDateFrom.value = '';
  if (scoresDateTo) scoresDateTo.value = '';
  applyScoresFilters();
});

openRegistrationBtn?.addEventListener('click', async () => {
  await setRegistrationLocked(false);
});

closeRegistrationBtn?.addEventListener('click', async () => {
  await setRegistrationLocked(true);
});

showAllCandidates?.addEventListener('click', () => {
  candidateView = 'all';
  toggleEliminated(false);
  filterCandidates();
});

showEliminatedCandidates?.addEventListener('click', () => {
  candidateView = 'eliminated';
  toggleEliminated(true);
  filterCandidates();
});

showOnlineCandidates?.addEventListener('click', () => {
  candidateView = 'online';
  toggleEliminated(false);
  filterCandidates();
});

newsForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus(newsMsg, 'Sauvegarde...');
  const payload = Object.fromEntries(new FormData(newsForm).entries());
  payload.featured = payload.featured === 'true';
  const manualImages = parseImagesInput(newsImagesList?.value || '');
  newsImages = Array.from(new Set([...newsImages, ...manualImages]));
  payload.images = newsImages;
  if (payload.publishAt) {
    payload.publishAt = new Date(payload.publishAt).toISOString();
  }
  const id = payload.id;
  delete payload.id;
  const res = await authedFetch(id ? `/api/admin/news/${id}` : '/api/admin/news', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  setStatus(newsMsg, data.message || (res.ok ? 'Actualité enregistrée.' : 'Erreur.'));
  if (res.ok) {
    newsForm.reset();
    newsImages = [];
    if (newsImagePreview) newsImagePreview.textContent = 'Aucun aperçu';
  }
  await loadNewsAdmin();
});

newsImageFile?.addEventListener('change', async () => {
  const files = Array.from(newsImageFile.files || []);
  if (!files.length) return;
  setStatus(newsMsg, 'Upload images...');
  for (const file of files) {
    const url = await uploadNewsImage(file);
    if (url) {
      newsImages.push(url);
    }
  }
  newsImages = Array.from(new Set(newsImages));
  renderNewsImagesPreview();
  setStatus(newsMsg, 'Images téléversées.');
});

newsImagesClear?.addEventListener('click', () => {
  newsImages = [];
  if (newsImagesList) newsImagesList.value = '';
  renderNewsImagesPreview();
});

newsImagesList?.addEventListener('input', () => {
  const manualImages = parseImagesInput(newsImagesList.value);
  newsImages = Array.from(new Set(manualImages));
  renderNewsImagesPreview();
});

newsTable?.addEventListener('click', async (e) => {
  const editBtn = e.target.closest('button[data-edit-news]');
  const deleteBtn = e.target.closest('button[data-delete-news]');
  const toggleStatusBtn = e.target.closest('button[data-toggle-status]');
  const toggleFeatureBtn = e.target.closest('button[data-toggle-feature]');
  if (editBtn) {
    const row = editBtn.closest('tr');
    const cells = row.querySelectorAll('td');
    newsForm.querySelector('#newsId').value = cells[0].textContent;
    newsForm.querySelector('#newsTitle').value = cells[1].textContent;
    const res = await authedFetch(`/api/admin/news`);
    if (res.ok) {
      const data = await res.json();
      const items = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
      const item = items.find((n) => String(n.id) === String(cells[0].textContent));
      if (item) {
        newsForm.querySelector('#newsBody').value = item.body || '';
        newsForm.querySelector('#newsStatus').value = item.status || 'draft';
        if (newsFeatured) newsFeatured.value = item.featured ? 'true' : 'false';
        if (newsCategory) newsCategory.value = item.category || '';
        if (newsImageUrl) newsImageUrl.value = item.imageurl || item.imageUrl || '';
        if (newsPublishAt) {
          const ts = item.publishat || item.publishAt;
          newsPublishAt.value = ts ? new Date(ts).toISOString().slice(0, 16) : '';
        }
        const rawImages = item.imagesjson || item.imagesJson;
        try {
          newsImages = rawImages ? JSON.parse(rawImages) : [];
        } catch {
          newsImages = [];
        }
        const mainUrl = item.imageurl || item.imageUrl;
        if (mainUrl) newsImages.unshift(mainUrl);
        newsImages = Array.from(new Set(newsImages));
        if (newsImagesList) newsImagesList.value = newsImages.join(', ');
        renderNewsImagesPreview();
      }
    }
    return;
  }
  if (toggleStatusBtn) {
    const id = toggleStatusBtn.dataset.toggleStatus;
    const nextStatus = toggleStatusBtn.dataset.nextStatus || 'draft';
    await authedFetch(`/api/admin/news/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus }),
    });
    await loadNewsAdmin();
    return;
  }
  if (toggleFeatureBtn) {
    const id = toggleFeatureBtn.dataset.toggleFeature;
    const nextFeature = toggleFeatureBtn.dataset.nextFeature === 'true';
    await authedFetch(`/api/admin/news/${id}/feature`, {
      method: 'PATCH',
      body: JSON.stringify({ featured: nextFeature }),
    });
    await loadNewsAdmin();
    return;
  }
  if (deleteBtn) {
    const id = deleteBtn.dataset.deleteNews;
    const res = await authedFetch(`/api/admin/news/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setStatus(newsMsg, 'Supprimé.');
      await loadNewsAdmin();
    }
  }
});

sponsorForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus(sponsorMsg, 'Sauvegarde...');
  const payload = Object.fromEntries(new FormData(sponsorForm).entries());
  if (sponsorFilesList) {
    payload.files = (sponsorFilesList.value || '')
      .split(/[\n,]+/)
      .map((v) => v.trim())
      .filter(Boolean);
  }
  const id = payload.id;
  delete payload.id;
  const res = await authedFetch(id ? `/api/admin/sponsors/${id}` : '/api/admin/sponsors', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  setStatus(sponsorMsg, data.message || (res.ok ? 'Sponsor enregistré.' : 'Erreur.'));
  if (res.ok) sponsorForm.reset();
  await loadSponsors();
});

scoresTable?.addEventListener('click', async (e) => {
  const deleteBtn = e.target.closest('button[data-delete-score]');
  if (!deleteBtn) return;
  const id = deleteBtn.dataset.deleteScore;
  const ok = confirm('Supprimer cette note ?');
  if (!ok) return;
  const res = await authedFetch(`/api/admin/scores/${id}`, { method: 'DELETE' });
  if (res.ok) {
    await renderScoresTable();
    await loadDashboard();
  } else {
    alert('Suppression impossible.');
  }
});

sponsorLogoFile?.addEventListener('change', async () => {
  const file = sponsorLogoFile.files?.[0];
  if (!file) return;
  setStatus(sponsorMsg, 'Upload logo...');
  const url = await uploadSponsorLogo(file);
  if (url) {
    if (sponsorLogoUrl) sponsorLogoUrl.value = url;
    if (sponsorLogoPreview) {
      sponsorLogoPreview.innerHTML = `<img src="${url}" alt="Logo" style="max-width:160px; border-radius:8px;" />`;
    }
    setStatus(sponsorMsg, 'Logo téléversé.');
  } else {
    setStatus(sponsorMsg, 'Erreur upload logo.');
  }
});

sponsorLogoReplace?.addEventListener('click', () => {
  sponsorLogoFile?.click();
});

sponsorLogoRemove?.addEventListener('click', () => {
  if (sponsorLogoUrl) sponsorLogoUrl.value = '';
  if (sponsorLogoFile) sponsorLogoFile.value = '';
  if (sponsorLogoPreview) sponsorLogoPreview.textContent = 'Aucun aperçu';
  setStatus(sponsorMsg, 'Logo supprimé (pensez à enregistrer).');
});

sponsorsTable?.addEventListener('click', async (e) => {
  const editBtn = e.target.closest('button[data-edit-sponsor]');
  const deleteBtn = e.target.closest('button[data-delete-sponsor]');
  const approveBtn = e.target.closest('button[data-approve-sponsor]');
  const pendingBtn = e.target.closest('button[data-pending-sponsor]');
  if (editBtn) {
    const id = editBtn.dataset.editSponsor;
    const res = await authedFetch('/api/admin/sponsors');
    if (res.ok) {
      const data = await res.json();
      const items = Array.isArray(data) ? data : [];
      const item = items.find((s) => String(s.id) === String(id));
      if (item) {
        sponsorForm.querySelector('#sponsorId').value = item.id;
        sponsorForm.querySelector('#sponsorName').value = item.name || '';
        sponsorForm.querySelector('#sponsorContact').value = item.contactname || item.contactName || '';
        sponsorForm.querySelector('#sponsorEmail').value = item.email || '';
        sponsorForm.querySelector('#sponsorPhone').value = item.phone || '';
        sponsorForm.querySelector('#sponsorAmount').value = item.amount || '';
        sponsorForm.querySelector('#sponsorWebsite').value = item.website || '';
        sponsorForm.querySelector('#sponsorLogoUrl').value = item.logourl || item.logoUrl || '';
        sponsorForm.querySelector('#sponsorStatus').value = item.status || 'pending';
        if (sponsorFilesList) {
          const raw = item.filesjson || item.filesJson;
          let files = [];
          try {
            files = raw ? JSON.parse(raw) : [];
          } catch {}
          sponsorFilesList.value = files.join(', ');
        }
        if (sponsorLogoPreview) {
          const logo = item.logourl || item.logoUrl;
          sponsorLogoPreview.innerHTML = logo
            ? `<img src="${logo}" alt="Logo" style="max-width:160px; border-radius:8px;" />`
            : 'Aucun aperçu';
        }
      }
    }
  }
  if (deleteBtn) {
    const id = deleteBtn.dataset.deleteSponsor;
    const res = await authedFetch(`/api/admin/sponsors/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setStatus(sponsorMsg, 'Supprimé.');
      await loadSponsors();
    }
  }
  if (approveBtn) {
    const id = approveBtn.dataset.approveSponsor;
    const item = sponsorsCache.find((s) => String(s.id) === String(id));
    if (item) {
      await authedFetch(`/api/admin/sponsors/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: item.name || '',
          contactName: item.contactname || item.contactName || '',
          email: item.email || '',
          phone: item.phone || '',
          amount: item.amount || '',
          logoUrl: item.logourl || item.logoUrl || '',
          website: item.website || '',
          files: (() => {
            try { return item.filesjson ? JSON.parse(item.filesjson) : item.filesJson ? JSON.parse(item.filesJson) : []; }
            catch { return []; }
          })(),
          status: 'approved'
        })
      });
    }
    await loadSponsors();
    await loadFinances();
  }
  if (pendingBtn) {
    const id = pendingBtn.dataset.pendingSponsor;
    const item = sponsorsCache.find((s) => String(s.id) === String(id));
    if (item) {
      await authedFetch(`/api/admin/sponsors/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: item.name || '',
          contactName: item.contactname || item.contactName || '',
          email: item.email || '',
          phone: item.phone || '',
          amount: item.amount || '',
          logoUrl: item.logourl || item.logoUrl || '',
          website: item.website || '',
          files: (() => {
            try { return item.filesjson ? JSON.parse(item.filesjson) : item.filesJson ? JSON.parse(item.filesJson) : []; }
            catch { return []; }
          })(),
          status: 'pending'
        })
      });
    }
    await loadSponsors();
    await loadFinances();
  }
});

donationsTable?.addEventListener('click', async (e) => {
  const confirmBtn = e.target.closest('button[data-confirm-donation]');
  if (!confirmBtn) return;
  const id = confirmBtn.dataset.confirmDonation;
  await authedFetch(`/api/admin/donations/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'confirmed' })
  });
  await loadFinances();
});

pollForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!pollQuestionInput || !pollOptionsInput || !pollActive) return;
  setStatus(pollMsg, 'Enregistrement...');
  const question = pollQuestionInput.value.trim();
  const options = pollOptionsInput.value
    .split('\n')
    .map((v) => v.trim())
    .filter(Boolean);
  const active = pollActive.value === '1';
  const res = await authedFetch('/api/admin/poll', {
    method: 'POST',
    body: JSON.stringify({ question, options, active })
  });
  const data = await res.json().catch(() => ({}));
  setStatus(pollMsg, data.message || (res.ok ? 'Sondage mis à jour.' : 'Erreur.'));
  await loadPollAdmin();
});

memberToolsForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus(memberToolsMsg, 'Enregistrement...');
  const messages = parsePipeLines(memberMessagesInput?.value || '', ['scope', 'title', 'body']);
  const tasks = parsePipeLines(memberTasksInput?.value || '', ['assignee', 'title', 'dueDate', 'status']);
  const documents = parsePipeLines(memberDocsInput?.value || '', ['title', 'url']);
  const res = await authedFetch('/api/admin/member-tools', {
    method: 'PUT',
    body: JSON.stringify({ messages, tasks, documents })
  });
  const data = await res.json().catch(() => ({}));
  setStatus(memberToolsMsg, data.message || (res.ok ? 'Sauvegardé.' : 'Erreur.'));
  if (res.ok) {
    await loadMemberTools();
  }
});

// Force login each time for security
hideAdmin();
localStorage.removeItem('adminAuth');
bindEditListeners();

exportCandidatesCsv?.addEventListener('click', async () => {
  const res = await authedFetch('/api/admin/export/candidates');
  if (!res.ok) return;
  const text = await res.text();
  downloadFile('candidats.csv', text);
});

exportRankingCsv?.addEventListener('click', async () => {
  const res = await authedFetch('/api/admin/export/ranking');
  if (!res.ok) return;
  const text = await res.text();
  downloadFile('classement.csv', text);
});

const exportCandidatesXls = document.createElement('button');
exportCandidatesXls.className = 'btn-primary';
exportCandidatesXls.type = 'button';
exportCandidatesXls.textContent = 'Exporter candidats (Excel)';
exportCandidatesCsv?.parentElement?.appendChild(exportCandidatesXls);

const exportRankingXls = document.createElement('button');
exportRankingXls.className = 'btn-primary';
exportRankingXls.type = 'button';
exportRankingXls.textContent = 'Exporter classement (Excel)';
exportRankingCsv?.parentElement?.appendChild(exportRankingXls);

exportCandidatesXls.addEventListener('click', async () => {
  const res = await authedFetch('/api/admin/export/candidates-xls');
  if (!res.ok) return;
  const text = await res.text();
  downloadFile('candidats.xls', text);
});

exportRankingXls.addEventListener('click', async () => {
  const res = await authedFetch('/api/admin/export/ranking-xls');
  if (!res.ok) return;
  const text = await res.text();
  downloadFile('classement.xls', text);
});

exportRankingPdf?.addEventListener('click', () => {
  const rows = Array.from(document.querySelectorAll('#rankingTable tbody tr'));
  if (!rows.length) return;
  const bodyRows = rows
    .map((row) => {
      const cells = row.querySelectorAll('td');
      return `<tr><td>${cells[0].textContent}</td><td>${cells[1].textContent}</td><td>${cells[2].textContent}</td></tr>`;
    })
    .join('');
  const html = `
    <html>
      <head>
        <title>Classement - Quiz Islamique 2026</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; }
          h1 { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f3f3f3; }
        </style>
      </head>
      <body>
        <h1>Classement — Quiz Islamique 2026</h1>
        <table>
          <thead><tr><th>Candidat</th><th>Total</th><th>Passages</th></tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </body>
    </html>`;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
});

exportRankingOfficialPdf?.addEventListener('click', async () => {
  const res = await authedFetch('/api/admin/export/ranking-official-pdf');
  if (!res.ok) return;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'classement-officiel.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

exportCandidatesPdf?.addEventListener('click', () => {
  const rows = Array.from(document.querySelectorAll('#candidatesTable tbody tr'));
  if (!rows.length) return;
  const bodyRows = rows
    .map((row) => {
      const cells = row.querySelectorAll('td');
      return `<tr><td>${cells[0].textContent}</td><td>${cells[1].textContent}</td><td>${cells[2].textContent}</td><td>${cells[3].textContent}</td><td>${cells[4].textContent}</td></tr>`;
    })
    .join('');
  const html = `
    <html>
      <head>
        <title>Liste des candidats</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; }
          h1 { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f3f3f3; }
        </style>
      </head>
      <body>
        <h1>Liste des candidats — Quiz Islamique 2026</h1>
        <table>
          <thead><tr><th>ID</th><th>Nom</th><th>WhatsApp</th><th>Commune</th><th>Statut</th></tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </body>
    </html>`;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
});

generateGroupsBtn?.addEventListener('click', () => {
  groupsCache = generateGroupsFromRanking();
  if (!groupsCache.length) {
    if (groupsPreview) groupsPreview.textContent = 'Aucune donnée pour générer les groupes.';
    return;
  }
  renderGroupsPreview();
});

exportGroupsPdfBtn?.addEventListener('click', () => {
  if (!groupsCache.length) {
    alert('Veuillez générer les groupes avant l’export.');
    return;
  }
  const body = groupsCache
    .map((group, idx) => {
      const rows = group
        .map((c, i) => {
          const name = resolveName({ fullName: c.fullName || c.fullname, whatsapp: c.whatsapp });
          const score = Number(c.totalScore ?? c.totalscore ?? c.averageScore ?? 0).toFixed(2);
          return `<tr><td>${i + 1}</td><td>${name || 'Inconnu'}</td><td>${score}</td></tr>`;
        })
        .join('');
      return `
        <h3>Groupe ${idx + 1}</h3>
        <table>
          <thead><tr><th>#</th><th>Candidat</th><th>Score</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    })
    .join('<div style="height:16px;"></div>');
  const html = `
    <html>
      <head>
        <title>Groupes — Quiz Islamique 2026</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; }
          h1 { text-align: center; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f3f3f3; }
        </style>
      </head>
      <body>
        <h1>Groupes — Quiz Islamique 2026</h1>
        ${body}
      </body>
    </html>`;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
});

exportConvocationsPdfBtn?.addEventListener('click', () => {
  if (!groupsCache.length) {
    alert('Veuillez générer les groupes avant l’export.');
    return;
  }
  const body = groupsCache
    .map((group, idx) => {
      const groupName = `Groupe ${idx + 1}`;
      const rows = group
        .map((c) => {
          const name = resolveName({ fullName: c.fullName || c.fullname, whatsapp: c.whatsapp });
          const msg = buildConvocationMessage({
            name,
            date: formatScheduleDate(settingsCache?.convocationDate || ''),
            time: settingsCache?.convocationTime || '',
            place: settingsCache?.convocationPlace || '',
            groupName
          });
          return `<tr><td>${name}</td><td>${c.whatsapp || ''}</td><td>${msg}</td></tr>`;
        })
        .join('');
      return `
        <h3>${groupName}</h3>
        <table>
          <thead><tr><th>Candidat</th><th>WhatsApp</th><th>Message</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    })
    .join('<div style="height:16px;"></div>');
  const html = `
    <html>
      <head>
        <title>Convocations — Quiz Islamique 2026</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; }
          h1 { text-align: center; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f3f3f3; }
        </style>
      </head>
      <body>
        <h1>Convocations — Quiz Islamique 2026</h1>
        ${body}
      </body>
    </html>`;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
});

openConvocationsModalBtn?.addEventListener('click', () => {
  if (!convocationModal || !convocationBody) return;
  if (!groupsCache.length) {
    alert('Veuillez générer les groupes avant la diffusion.');
    return;
  }
  const html = groupsCache
    .map((group, idx) => {
      const groupName = `Groupe ${idx + 1}`;
      const rows = group
        .map((c) => {
          const name = resolveName({ fullName: c.fullName || c.fullname, whatsapp: c.whatsapp });
          const msg = buildConvocationMessage({
            name,
            date: formatScheduleDate(settingsCache?.convocationDate || ''),
            time: settingsCache?.convocationTime || '',
            place: settingsCache?.convocationPlace || '',
            groupName
          });
          const digits = digitsOnly(c.whatsapp);
          const link = digits
            ? `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`
            : '';
          return `
            <tr>
              <td>${name}</td>
              <td>${c.whatsapp || ''}</td>
              <td><button data-whats-link="${link}">Envoyer</button></td>
            </tr>
          `;
        })
        .join('');
      return `
        <h4>${groupName}</h4>
        <table class="table">
          <thead><tr><th>Candidat</th><th>WhatsApp</th><th>Action</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    })
    .join('<div style="height:16px;"></div>');
  convocationBody.innerHTML = html;
  convocationModal.style.display = 'flex';
});

convocationModalClose?.addEventListener('click', () => {
  if (convocationModal) convocationModal.style.display = 'none';
});

convocationModal?.addEventListener('click', (e) => {
  if (e.target === convocationModal) convocationModal.style.display = 'none';
});

convocationBody?.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-whats-link]');
  if (!btn) return;
  const link = btn.getAttribute('data-whats-link');
  if (!link) {
    alert('WhatsApp indisponible.');
    return;
  }
  window.open(link, '_blank', 'noopener');
});

exportFullPdf?.addEventListener('click', () => {
  const statsCandidates = document.getElementById('statCandidates')?.textContent || '0';
  const statsVotes = document.getElementById('statVotes')?.textContent || '0';
  const statsScores = document.getElementById('statScores')?.textContent || '0';
  const candidateRows = Array.from(document.querySelectorAll('#candidatesTable tbody tr'))
    .map((row) => {
      const cells = row.querySelectorAll('td');
      return `<tr><td>${cells[0].textContent}</td><td>${cells[1].textContent}</td><td>${cells[2].textContent}</td><td>${cells[3].textContent}</td><td>${cells[4].textContent}</td></tr>`;
    })
    .join('');
  const rankingRows = Array.from(document.querySelectorAll('#rankingTable tbody tr'))
    .map((row) => {
      const cells = row.querySelectorAll('td');
      return `<tr><td>${cells[0].textContent}</td><td>${cells[1].textContent}</td><td>${cells[2].textContent}</td></tr>`;
    })
    .join('');
  const communeHtml = communeStats?.innerHTML || '';
  const html = `
    <html>
      <head>
        <title>Rapport complet — Quiz Islamique 2026</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; }
          h1 { text-align: center; }
          h2 { margin-top: 24px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f3f3f3; }
        </style>
      </head>
      <body>
        <h1>Rapport complet — Quiz Islamique 2026</h1>
        <h2>Statistiques</h2>
        <p>Candidats inscrits: <strong>${statsCandidates}</strong></p>
        <p>Votes exprimés: <strong>${statsVotes}</strong></p>
        <p>Passages notés: <strong>${statsScores}</strong></p>
        <h2>Statistiques par commune</h2>
        <div>${communeHtml}</div>
        <h2>Liste des candidats</h2>
        <table>
          <thead><tr><th>ID</th><th>Nom</th><th>WhatsApp</th><th>Commune</th><th>Statut</th></tr></thead>
          <tbody>${candidateRows}</tbody>
        </table>
        <h2>Classement</h2>
        <table>
          <thead><tr><th>Candidat</th><th>Total</th><th>Passages</th></tr></thead>
          <tbody>${rankingRows}</tbody>
        </table>
      </body>
    </html>`;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
});
function renderSchedule() {
  if (!eventList) return;
  if (!scheduleCache.length) {
    eventList.textContent = 'Aucun événement';
    return;
  }
  eventList.innerHTML = `
    <table class="table">
      <thead><tr><th>Date</th><th>Heure</th><th>Événement</th><th>Action</th></tr></thead>
      <tbody>
        ${scheduleCache
          .map(
            (e, idx) => `<tr>
              <td>${e.date || ''}</td>
              <td>${e.time || ''}</td>
              <td>${e.title || ''}</td>
              <td><button data-remove="${idx}">Supprimer</button></td>
            </tr>`,
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function formatScheduleDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('fr-FR');
}

function renderPhaseTimeline() {
  if (!phaseTimelineList) return;
  if (!scheduleCache.length) {
    phaseTimelineList.textContent = 'Aucune phase renseignée.';
    return;
  }
  const items = scheduleCache
    .slice()
    .sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return String(a.date).localeCompare(String(b.date));
    })
    .map((e) => {
      const date = formatScheduleDate(e.date);
      const time = e.time ? ` • ${e.time}` : '';
      const title = e.title || 'Événement';
      const meta = date ? `${date}${time}` : 'Date à préciser';
      return `<li class="timeline-item"><div class="timeline-meta">${meta}</div><div class="timeline-title">${title}</div></li>`;
    })
    .join('');
  phaseTimelineList.innerHTML = `<ul class="timeline">${items}</ul>`;
}

addEventBtn?.addEventListener('click', () => {
  const date = eventDate?.value || '';
  const time = eventTime?.value || '';
  const title = eventTitle?.value || '';
  if (!date || !title) return;
  scheduleCache.push({ date, time, title });
  if (eventDate) eventDate.value = '';
  if (eventTime) eventTime.value = '';
  if (eventTitle) eventTitle.value = '';
  renderSchedule();
  renderPhaseTimeline();
});

eventList?.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-remove]');
  if (!btn) return;
  const idx = Number(btn.dataset.remove);
  scheduleCache.splice(idx, 1);
  renderSchedule();
  renderPhaseTimeline();
});
