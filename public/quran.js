const API_BASE = 'https://api.alquran.cloud/v1';

const pageInput = document.getElementById('pageNumber');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const prevPageBottomBtn = document.getElementById('prevPageBottom');
const nextPageBottomBtn = document.getElementById('nextPageBottom');
const loadPageBtn = document.getElementById('loadPage');
const pageIndicator = document.getElementById('pageIndicator');
const versesWrap = document.getElementById('versesWrap');
const quranStatus = document.getElementById('quranStatus');
const showTranslit = document.getElementById('showTranslit');
const showFrench = document.getElementById('showFrench');
const showTafsir = document.getElementById('showTafsir');
const quranDarkToggle = document.getElementById('quranDarkToggle');
const fullscreenToggle = document.getElementById('fullscreenToggle');
const readingCard = document.getElementById('quranReadingCard');

const totalPages = 604;
let currentPage = 1;

let editions = {
  arabic: 'quran-uthmani',
  translit: null,
  french: null,
  tafsir: null,
  tafsirLang: null
};

const STORAGE_KEY = 'quranReaderPrefs';

function savePrefs() {
  const prefs = {
    page: currentPage,
    showTranslit: !!showTranslit?.checked,
    showFrench: !!showFrench?.checked,
    showTafsir: !!showTafsir?.checked
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const prefs = JSON.parse(raw);
    if (prefs.showTranslit !== undefined && showTranslit) showTranslit.checked = !!prefs.showTranslit;
    if (prefs.showFrench !== undefined && showFrench) showFrench.checked = !!prefs.showFrench;
    if (prefs.showTafsir !== undefined && showTafsir) showTafsir.checked = !!prefs.showTafsir;
    if (prefs.page) currentPage = clampPage(prefs.page);
  } catch {}
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Request failed');
  return res.json();
}

async function pickEdition(type, lang) {
  const data = await fetchJson(`${API_BASE}/edition?format=text&type=${type}&language=${lang}`);
  const list = data.data || [];
  return list[0]?.identifier || null;
}

async function initEditions() {
  try {
    editions.translit = await pickEdition('transliteration', 'en');
    editions.french = await pickEdition('translation', 'fr');
    editions.tafsir = await pickEdition('tafsir', 'fr');
    editions.tafsirLang = 'fr';
    if (!editions.tafsir) {
      editions.tafsir = await pickEdition('tafsir', 'ar');
      editions.tafsirLang = 'ar';
    }
  } catch {
    // fallback minimal
  }
}

function clampPage(value) {
  const num = Number(value || 1);
  if (Number.isNaN(num)) return 1;
  return Math.max(1, Math.min(totalPages, num));
}

function renderVerseRow(index, arabic, translit, french, tafsir, meta) {
  const translitHtml = showTranslit.checked && translit ? `<div class="muted">${translit}</div>` : '';
  const frenchHtml = showFrench.checked && french ? `<div>${french}</div>` : '';
  const tafsirButton = editions.tafsir && showTafsir.checked
    ? `<button class="btn outline" data-tafsir="${index}" data-surah="${meta?.surahNumber || ''}" data-ayah="${meta?.ayahNumber || ''}">Afficher tafsir</button><div class="status" data-tafsir-target="${index}">${tafsir || ''}</div>`
    : '';
  const shareData = `data-arabic="${(arabic || '').replace(/"/g, '&quot;')}" data-translit="${(translit || '').replace(/"/g, '&quot;')}" data-french="${(french || '').replace(/"/g, '&quot;')}"`;
  const metaData = `data-surah="${meta?.surahNumber || ''}" data-ayah="${meta?.ayahNumber || ''}"`;
  return `
    <div class="card" style="margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <strong>Verset ${index}</strong>
        <button class="btn outline" data-share="${index}" ${shareData} ${metaData}>Partager</button>
      </div>
      <div style="font-size:22px; text-align:right;">${arabic || ''}</div>
      ${translitHtml}
      ${frenchHtml}
      ${tafsirButton}
    </div>
  `;
}

function renderPage(arabicAyahs, translitAyahs, frenchAyahs) {
  let html = '';
  let currentSurah = null;
  arabicAyahs.forEach((a, idx) => {
    const surahNumber = a.surah?.number;
    const surahName = a.surah?.name;
    if (surahNumber && surahNumber !== currentSurah) {
      currentSurah = surahNumber;
      html += `
        <div class="status" style="margin:12px 0; font-weight:700;">
          Sourate ${surahNumber}${surahName ? ` — ${surahName}` : ''}
        </div>
      `;
    }
    html += renderVerseRow(
      a.numberInSurah,
      a.text,
      translitAyahs[idx]?.text,
      frenchAyahs[idx]?.text,
      '',
      { surahNumber, ayahNumber: a.numberInSurah }
    );
  });
  return html || 'Page vide.';
}

async function loadPage(pageValue) {
  const page = clampPage(pageValue);
  currentPage = page;
  if (pageInput) pageInput.value = String(page);
  if (pageIndicator) pageIndicator.textContent = `Page ${page} / ${totalPages}`;
  versesWrap.textContent = 'Chargement...';
  const editionsList = [editions.arabic, editions.translit, editions.french].filter(Boolean).join(',');
  try {
    const data = await fetchJson(`${API_BASE}/page/${page}/editions/${editionsList}`);
    const packs = data.data || [];
    const arabic = packs.find((p) => p.edition.identifier === editions.arabic)?.ayahs || [];
    const translit = packs.find((p) => p.edition.identifier === editions.translit)?.ayahs || [];
    const french = packs.find((p) => p.edition.identifier === editions.french)?.ayahs || [];
    versesWrap.innerHTML = renderPage(arabic, translit, french);
    savePrefs();
  } catch (e) {
    versesWrap.textContent = 'Impossible de charger la page.';
  }
}

async function loadTafsir(surah, ayah, target) {
  if (!editions.tafsir) {
    target.textContent = 'Tafsir indisponible.';
    return;
  }
  target.textContent = 'Chargement du tafsir...';
  try {
    const data = await fetchJson(`${API_BASE}/ayah/${surah}:${ayah}/${editions.tafsir}`);
    const text = data.data?.text || 'Tafsir indisponible.';
    target.textContent = text;
  } catch {
    target.textContent = 'Tafsir indisponible.';
  }
}

versesWrap?.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-tafsir]');
  if (!btn) return;
  const ayah = btn.dataset.tafsir;
  const target = versesWrap.querySelector(`[data-tafsir-target="${ayah}"]`);
  if (!target) return;
  const surahNumber = Number(btn.dataset.surah || 0);
  if (!surahNumber) {
    target.textContent = 'Tafsir indisponible.';
    return;
  }
  loadTafsir(surahNumber, ayah, target);
});

versesWrap?.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-share]');
  if (!btn) return;
  const ayah = btn.dataset.share;
  const surah = btn.dataset.surah || '';
  const arabic = btn.dataset.arabic || '';
  const translit = btn.dataset.translit || '';
  const french = btn.dataset.french || '';
  const text = `Page ${currentPage} — Sourate ${surah}, Verset ${ayah}\n${arabic}\n${translit}\n${french}\nhttps://preselectionqi26.vercel.app/quran.html`;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Verset du Coran', text });
    } catch {}
  } else if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    alert('Verset copié.');
  } else {
    prompt('Copiez le verset:', text);
  }
});

loadPageBtn?.addEventListener('click', () => loadPage(pageInput?.value || 1));
prevPageBtn?.addEventListener('click', () => loadPage(currentPage - 1));
nextPageBtn?.addEventListener('click', () => loadPage(currentPage + 1));
prevPageBottomBtn?.addEventListener('click', () => loadPage(currentPage - 1));
nextPageBottomBtn?.addEventListener('click', () => loadPage(currentPage + 1));
pageInput?.addEventListener('change', () => loadPage(pageInput.value || 1));
showTranslit?.addEventListener('change', () => loadPage(currentPage));
showFrench?.addEventListener('change', () => loadPage(currentPage));
showTafsir?.addEventListener('change', () => loadPage(currentPage));
showTranslit?.addEventListener('change', savePrefs);
showFrench?.addEventListener('change', savePrefs);
showTafsir?.addEventListener('change', savePrefs);

quranDarkToggle?.addEventListener('click', () => {
  document.body.classList.toggle('dark');
});

fullscreenToggle?.addEventListener('click', async () => {
  if (!readingCard) return;
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      fullscreenToggle.textContent = 'Plein écran';
    } else {
      await readingCard.requestFullscreen();
      fullscreenToggle.textContent = 'Quitter plein écran';
    }
  } catch {}
});

(async function init() {
  try {
    await initEditions();
    loadPrefs();
    quranStatus.textContent = editions.tafsirLang === 'fr'
      ? 'Ressources chargées (tafsir FR).'
      : 'Ressources chargées (tafsir AR).';
    loadPage(currentPage || 1);
  } catch {
    quranStatus.textContent = 'Ressources indisponibles.';
  }
})();
