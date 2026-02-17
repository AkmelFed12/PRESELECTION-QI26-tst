const galleryStatus = document.getElementById('galleryStatus');
const slideImage = document.getElementById('slideImage');
const slideVideo = document.getElementById('slideVideo');
const slideshowStage = document.getElementById('slideshowStage');
const prevSlideBtn = document.getElementById('prevSlide');
const nextSlideBtn = document.getElementById('nextSlide');
const toggleAutoBtn = document.getElementById('toggleAuto');
const downloadMediaBtn = document.getElementById('downloadMedia');
const slideCounter = document.getElementById('slideCounter');
const mediaGrid = document.getElementById('mediaGrid');
const mediaSearch = document.getElementById('mediaSearch');
const mediaTypeFilter = document.getElementById('mediaTypeFilter');
const mediaSort = document.getElementById('mediaSort');
const retryLoadBtn = document.getElementById('retryLoad');
const downloadAllZip = document.getElementById('downloadAllZip');
const mediaStats = document.getElementById('mediaStats');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');

const IMAGE_DURATION_MS = 5000;
const PAGE_SIZE = 30;

let mediaItems = [];
let currentIndex = 0;
let autoTimer = null;
let autoEnabled = true;
let lastTrackedMediaName = '';
let pagination = { page: 1, totalPages: 1, total: 0 };
let filters = { type: 'all', search: '', sort: 'newest' };
let mediaStatsCache = { totalMedia: 0, totalViews: 0, totalDownloads: 0 };
let touchStartX = 0;
let touchEndX = 0;

function stopAutoPlay() {
  if (autoTimer) {
    clearTimeout(autoTimer);
    autoTimer = null;
  }
}

function scheduleNext() {
  stopAutoPlay();
  if (!autoEnabled || mediaItems.length <= 1) return;
  autoTimer = setTimeout(nextSlide, IMAGE_DURATION_MS);
}

function updateCounter() {
  slideCounter.textContent = `${mediaItems.length ? currentIndex + 1 : 0} / ${mediaItems.length}`;
}

function updatePaginationInfo() {
  pageInfo.textContent = `Page ${pagination.page} / ${pagination.totalPages}`;
  prevPageBtn.disabled = pagination.page <= 1;
  nextPageBtn.disabled = pagination.page >= pagination.totalPages;
}

function updateStatsText() {
  mediaStats.textContent =
    `Médias: ${mediaStatsCache.totalMedia || 0} | ` +
    `Vues: ${mediaStatsCache.totalViews || 0} | ` +
    `Téléchargements: ${mediaStatsCache.totalDownloads || 0}`;
}

function splitBaseName(filename = '') {
  const idx = filename.lastIndexOf('.');
  return idx > 0 ? filename.slice(0, idx) : filename;
}

async function triggerDownload(url, filename) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error('Téléchargement impossible');
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
}

function downloadImageAsFormat(url, baseName, format) {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      showToast('Conversion image impossible', 'error');
      return;
    }
    ctx.drawImage(img, 0, 0);
    const mime = format === 'png' ? 'image/png' : 'image/jpeg';
    const dataUrl = canvas.toDataURL(mime, 0.92);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${baseName}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  img.onerror = () => showToast('Erreur pendant la conversion de l’image', 'error');
  img.src = url;
}

function updateDownloadLink(item) {
  if (!downloadMediaBtn || !item || !item.url) return;
  downloadMediaBtn.classList.remove('hidden');
  downloadMediaBtn.dataset.url = item.url;
  downloadMediaBtn.dataset.filename = item.name || (item.type === 'video' ? 'video-quiz-2025' : 'image-quiz-2025');
  downloadMediaBtn.textContent = item.type === 'video' ? 'Télécharger la vidéo' : 'Télécharger l’image';
}

function renderMediaGrid() {
  if (!mediaGrid) return;
  if (!mediaItems.length) {
    mediaGrid.innerHTML = '';
    return;
  }
  mediaGrid.innerHTML = mediaItems
    .map((item, idx) => {
      const safeName = escapeHtml(item.name || `media-${idx + 1}`);
      const safeCaption = escapeHtml(item.caption || '');
      const preview = item.type === 'video'
        ? `<video src="${item.url}" preload="metadata" muted playsinline></video>`
        : `<img src="${item.url}" alt="${safeName}" loading="lazy" decoding="async" />`;
      const actions = item.type === 'video'
        ? `<button type="button" class="small-btn" data-action="download-original" data-index="${idx}">Télécharger vidéo</button>`
        : `
          <button type="button" class="small-btn" data-action="download-original" data-index="${idx}">Original</button>
          <button type="button" class="small-btn" data-action="download-jpg" data-index="${idx}">JPG</button>
          <button type="button" class="small-btn" data-action="download-png" data-index="${idx}">PNG</button>
        `;
      return `
        <article class="media-card" data-index="${idx}">
          <div class="media-preview">${preview}</div>
          <p class="media-name">${safeName}</p>
          ${safeCaption ? `<p class="media-caption">${safeCaption}</p>` : ''}
          <div class="media-actions">${actions}</div>
        </article>
      `;
    })
    .join('');
}

function updateActiveMediaCard() {
  if (!mediaGrid) return;
  mediaGrid.querySelectorAll('.media-card').forEach((card) => {
    const idx = Number(card.dataset.index);
    card.classList.toggle('is-active', idx === currentIndex);
  });
}

async function trackEvent(item, event) {
  if (!item || !item.name) return;
  try {
    await fetch('/api/public-media/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: item.name, event }),
      keepalive: true,
    });
  } catch (_) {}
}

function preloadNextImage() {
  if (!mediaItems.length) return;
  const next = mediaItems[(currentIndex + 1) % mediaItems.length];
  if (!next || next.type !== 'image') return;
  const img = new Image();
  img.src = next.url;
}

async function renderSlide() {
  if (!mediaItems.length) {
    galleryStatus.textContent = 'Aucun média disponible pour le moment.';
    slideImage.classList.add('hidden');
    slideVideo.classList.add('hidden');
    if (downloadMediaBtn) {
      downloadMediaBtn.classList.add('hidden');
      delete downloadMediaBtn.dataset.url;
      delete downloadMediaBtn.dataset.filename;
    }
    updateCounter();
    updateActiveMediaCard();
    stopAutoPlay();
    return;
  }

  const item = mediaItems[currentIndex];
  galleryStatus.textContent = item.caption?.trim() ? item.caption : (item.name || 'Média');
  updateDownloadLink(item);

  if (item.type === 'video') {
    slideImage.classList.add('hidden');
    slideImage.removeAttribute('src');
    slideVideo.classList.remove('hidden');
    slideVideo.src = item.url;
    slideVideo.load();
    const playPromise = slideVideo.play();
    if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(() => {});
    stopAutoPlay();
  } else {
    slideVideo.pause();
    slideVideo.classList.add('hidden');
    slideVideo.removeAttribute('src');
    slideImage.classList.remove('hidden');
    slideImage.src = item.url;
    scheduleNext();
    preloadNextImage();
  }

  updateCounter();
  updateActiveMediaCard();
  if (item.name !== lastTrackedMediaName) {
    lastTrackedMediaName = item.name;
    trackEvent(item, 'view');
  }
}

function previousSlide() {
  if (!mediaItems.length) return;
  currentIndex = (currentIndex - 1 + mediaItems.length) % mediaItems.length;
  renderSlide();
}

function nextSlide() {
  if (!mediaItems.length) return;
  currentIndex = (currentIndex + 1) % mediaItems.length;
  renderSlide();
}

function toggleAutoPlay() {
  autoEnabled = !autoEnabled;
  toggleAutoBtn.textContent = autoEnabled ? 'Pause' : 'Lecture auto';
  if (autoEnabled) renderSlide();
  else stopAutoPlay();
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    slideshowStage.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

function buildMediaQuery() {
  const query = new URLSearchParams({
    page: String(pagination.page),
    pageSize: String(PAGE_SIZE),
    type: filters.type,
    sort: filters.sort,
    search: filters.search,
  });
  return query.toString();
}

async function loadStats() {
  try {
    const response = await fetch('/api/public-media/stats', { cache: 'no-store' });
    if (!response.ok) return;
    mediaStatsCache = await response.json();
    updateStatsText();
  } catch (_) {}
}

async function checkDownloadAll() {
  if (!downloadAllZip) return;
  try {
    const response = await fetch(downloadAllZip.href, { method: 'HEAD' });
    if (!response.ok) downloadAllZip.classList.add('hidden');
  } catch (_) {
    downloadAllZip.classList.add('hidden');
  }
}

async function loadMedia(resetPage = false) {
  if (resetPage) pagination.page = 1;
  try {
    const query = buildMediaQuery();
    const response = await fetch(`/api/public-media?${query}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Erreur de chargement');
    const data = await response.json();
    mediaItems = Array.isArray(data.items) ? data.items : [];
    pagination = data.pagination || { page: 1, totalPages: 1, total: mediaItems.length };
    currentIndex = 0;
    renderMediaGrid();
    await renderSlide();
    updatePaginationInfo();
    downloadAllZip.href = `/api/public-media/download-all?${query}`;
    await checkDownloadAll();
    await loadStats();
  } catch (error) {
    galleryStatus.textContent = 'Impossible de charger la galerie.';
    showToast('Erreur de chargement de la galerie', 'error');
  }
}

slideVideo?.addEventListener('ended', () => {
  if (!autoEnabled) return;
  nextSlide();
});

slideshowStage?.addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].screenX;
});
slideshowStage?.addEventListener('touchend', (e) => {
  touchEndX = e.changedTouches[0].screenX;
  const delta = touchEndX - touchStartX;
  if (Math.abs(delta) < 40) return;
  if (delta > 0) previousSlide();
  else nextSlide();
});

mediaGrid?.addEventListener('click', async (event) => {
  const target = event.target.closest('button[data-action], .media-card');
  if (!target) return;

  if (target.classList.contains('media-card')) {
    const idx = Number(target.dataset.index);
    if (Number.isInteger(idx) && idx >= 0 && idx < mediaItems.length) {
      currentIndex = idx;
      renderSlide();
    }
    return;
  }

  const action = target.dataset.action;
  const idx = Number(target.dataset.index);
  if (!Number.isInteger(idx) || idx < 0 || idx >= mediaItems.length) return;
  const item = mediaItems[idx];
  const baseName = splitBaseName(item.name || `media-${idx + 1}`);

  if (action === 'download-original') {
    try {
      await triggerDownload(item.url, item.name || `${baseName}.bin`);
      trackEvent(item, 'download');
      await loadStats();
    } catch (_) {
      showToast('Téléchargement impossible', 'error');
    }
    return;
  }
  if (item.type !== 'image') {
    showToast('Conversion disponible seulement pour les images', 'warning');
    return;
  }
  if (action === 'download-jpg') {
    downloadImageAsFormat(item.url, baseName, 'jpg');
    trackEvent(item, 'download');
    await loadStats();
    return;
  }
  if (action === 'download-png') {
    downloadImageAsFormat(item.url, baseName, 'png');
    trackEvent(item, 'download');
    await loadStats();
  }
});

downloadMediaBtn?.addEventListener('click', async () => {
  const url = downloadMediaBtn.dataset.url;
  const filename = downloadMediaBtn.dataset.filename || 'media-quiz-2025';
  if (!url) return;
  try {
    await triggerDownload(url, filename);
    const current = mediaItems[currentIndex];
    if (current) {
      trackEvent(current, 'download');
      await loadStats();
    }
  } catch (_) {
    showToast('Téléchargement impossible', 'error');
  }
});

prevSlideBtn?.addEventListener('click', previousSlide);
nextSlideBtn?.addEventListener('click', nextSlide);
toggleAutoBtn?.addEventListener('click', toggleAutoPlay);
retryLoadBtn?.addEventListener('click', () => loadMedia(false));
prevPageBtn?.addEventListener('click', () => {
  if (pagination.page <= 1) return;
  pagination.page -= 1;
  loadMedia(false);
});
nextPageBtn?.addEventListener('click', () => {
  if (pagination.page >= pagination.totalPages) return;
  pagination.page += 1;
  loadMedia(false);
});
mediaSearch?.addEventListener('input', debounce(() => {
  filters.search = (mediaSearch.value || '').trim();
  loadMedia(true);
}, 250));
mediaTypeFilter?.addEventListener('change', () => {
  filters.type = mediaTypeFilter.value || 'all';
  loadMedia(true);
});
mediaSort?.addEventListener('change', () => {
  filters.sort = mediaSort.value || 'newest';
  loadMedia(true);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') previousSlide();
  if (event.key === 'ArrowRight') nextSlide();
  if (event.key === 'f' || event.key === 'F') toggleFullscreen();
  if (event.key === ' ') {
    event.preventDefault();
    toggleAutoPlay();
  }
});

slideshowStage?.addEventListener('dblclick', toggleFullscreen);

loadMedia(true);
