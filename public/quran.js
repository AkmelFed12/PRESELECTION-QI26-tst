const API_BASE = 'https://api.alquran.cloud/v1';

const surahSelect = document.getElementById('surahSelect');
const loadSurahBtn = document.getElementById('loadSurah');
const versesWrap = document.getElementById('versesWrap');
const quranStatus = document.getElementById('quranStatus');
const showTranslit = document.getElementById('showTranslit');
const showFrench = document.getElementById('showFrench');
const showTafsir = document.getElementById('showTafsir');
const quranDarkToggle = document.getElementById('quranDarkToggle');

let editions = {
  arabic: 'quran-uthmani',
  translit: null,
  french: null,
  tafsir: null,
  tafsirLang: null
};

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

async function loadSurahList() {
  const data = await fetchJson(`${API_BASE}/surah`);
  const list = data.data || [];
  surahSelect.innerHTML = list
    .map((s) => `<option value="${s.number}">${s.number}. ${s.englishName} (${s.name})</option>`)
    .join('');
}

function renderVerseRow(index, arabic, translit, french, tafsir) {
  const translitHtml = showTranslit.checked && translit ? `<div class="muted">${translit}</div>` : '';
  const frenchHtml = showFrench.checked && french ? `<div>${french}</div>` : '';
  const tafsirButton = editions.tafsir && showTafsir.checked
    ? `<button class="btn outline" data-tafsir="${index}">Afficher tafsir</button><div class="status" data-tafsir-target="${index}">${tafsir || ''}</div>`
    : '';
  const shareData = `data-arabic="${(arabic || '').replace(/"/g, '&quot;')}" data-translit="${(translit || '').replace(/"/g, '&quot;')}" data-french="${(french || '').replace(/"/g, '&quot;')}"`;
  return `
    <div class="card" style="margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <strong>Verset ${index}</strong>
        <button class="btn outline" data-share="${index}" ${shareData}>Partager</button>
      </div>
      <div style="font-size:22px; text-align:right;">${arabic || ''}</div>
      ${translitHtml}
      ${frenchHtml}
      ${tafsirButton}
    </div>
  `;
}

async function loadSurah() {
  const number = Number(surahSelect.value || 1);
  if (!number) return;
  versesWrap.textContent = 'Chargement...';
  const editionsList = [editions.arabic, editions.translit, editions.french].filter(Boolean).join(',');
  try {
    const data = await fetchJson(`${API_BASE}/surah/${number}/editions/${editionsList}`);
    const packs = data.data || [];
    const arabic = packs.find((p) => p.edition.identifier === editions.arabic)?.ayahs || [];
    const translit = packs.find((p) => p.edition.identifier === editions.translit)?.ayahs || [];
    const french = packs.find((p) => p.edition.identifier === editions.french)?.ayahs || [];
    versesWrap.innerHTML = arabic
      .map((a, idx) =>
        renderVerseRow(
          a.numberInSurah,
          a.text,
          translit[idx]?.text,
          french[idx]?.text,
          ''
        )
      )
      .join('');
  } catch (e) {
    versesWrap.textContent = 'Impossible de charger la sourate.';
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
  const surah = Number(surahSelect.value || 1);
  loadTafsir(surah, ayah, target);
});

versesWrap?.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-share]');
  if (!btn) return;
  const ayah = btn.dataset.share;
  const surah = surahSelect.value || 1;
  const arabic = btn.dataset.arabic || '';
  const translit = btn.dataset.translit || '';
  const french = btn.dataset.french || '';
  const text = `Sourate ${surah}, Verset ${ayah}\n${arabic}\n${translit}\n${french}\nhttps://preselectionqi26.vercel.app/quran.html`;
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

loadSurahBtn?.addEventListener('click', loadSurah);
showTranslit?.addEventListener('change', loadSurah);
showFrench?.addEventListener('change', loadSurah);
showTafsir?.addEventListener('change', loadSurah);

quranDarkToggle?.addEventListener('click', () => {
  document.body.classList.toggle('dark');
});

(async function init() {
  try {
    await initEditions();
    await loadSurahList();
    quranStatus.textContent = editions.tafsirLang === 'fr'
      ? 'Ressources chargées (tafsir FR).'
      : 'Ressources chargées (tafsir AR).';
  } catch {
    quranStatus.textContent = 'Ressources indisponibles.';
  }
})();
