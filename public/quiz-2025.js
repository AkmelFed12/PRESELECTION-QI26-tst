const galleryStatus = document.getElementById('galleryStatus');
const slideImage = document.getElementById('slideImage');
const slideVideo = document.getElementById('slideVideo');
const prevSlideBtn = document.getElementById('prevSlide');
const nextSlideBtn = document.getElementById('nextSlide');
const toggleAutoBtn = document.getElementById('toggleAuto');
const downloadMediaBtn = document.getElementById('downloadMedia');
const slideCounter = document.getElementById('slideCounter');
const mediaGrid = document.getElementById('mediaGrid');

const IMAGE_DURATION_MS = 5000;
let mediaItems = [];
let currentIndex = 0;
let autoTimer = null;
let autoEnabled = true;

function stopAutoPlay() {
  if (autoTimer) {
    clearTimeout(autoTimer);
    autoTimer = null;
  }
}

function scheduleNext() {
  stopAutoPlay();
  if (!autoEnabled || mediaItems.length <= 1) return;
  autoTimer = setTimeout(() => {
    nextSlide();
  }, IMAGE_DURATION_MS);
}

function updateCounter() {
  slideCounter.textContent = `${mediaItems.length ? currentIndex + 1 : 0} / ${mediaItems.length}`;
}

function splitBaseName(filename = '') {
  const idx = filename.lastIndexOf('.');
  return idx > 0 ? filename.slice(0, idx) : filename;
}

async function triggerDownload(url, filename) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Téléchargement impossible');
  }
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

function renderMediaGrid() {
  if (!mediaGrid) return;
  if (!mediaItems.length) {
    mediaGrid.innerHTML = '';
    return;
  }
  mediaGrid.innerHTML = mediaItems
    .map((item, idx) => {
      const safeName = escapeHtml(item.name || `media-${idx + 1}`);
      const preview = item.type === 'video'
        ? `<video src="${item.url}" preload="metadata" muted playsinline></video>`
        : `<img src="${item.url}" alt="${safeName}" loading="lazy" decoding="async" />`;
      const actions = item.type === 'video'
        ? `
          <button type="button" class="small-btn" data-action="download-original" data-index="${idx}">Télécharger vidéo</button>
        `
        : `
          <button type="button" class="small-btn" data-action="download-original" data-index="${idx}">Original</button>
          <button type="button" class="small-btn" data-action="download-jpg" data-index="${idx}">JPG</button>
          <button type="button" class="small-btn" data-action="download-png" data-index="${idx}">PNG</button>
        `;
      return `
        <article class="media-card" data-index="${idx}">
          <div class="media-preview">${preview}</div>
          <p class="media-name">${safeName}</p>
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

function updateDownloadLink(item) {
  if (!downloadMediaBtn || !item || !item.url) return;
  downloadMediaBtn.classList.remove('hidden');
  downloadMediaBtn.dataset.url = item.url;
  downloadMediaBtn.dataset.filename = item.name || (item.type === 'video' ? 'video-quiz-2025' : 'image-quiz-2025');
  downloadMediaBtn.textContent = item.type === 'video' ? 'Télécharger la vidéo' : 'Télécharger l’image';
}

function renderSlide() {
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
    stopAutoPlay();
    return;
  }

  const item = mediaItems[currentIndex];
  galleryStatus.textContent = item.name || 'Média';
  updateDownloadLink(item);

  if (item.type === 'video') {
    slideImage.classList.add('hidden');
    slideImage.removeAttribute('src');
    slideVideo.classList.remove('hidden');
    slideVideo.src = item.url;
    slideVideo.load();
    const playPromise = slideVideo.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
    stopAutoPlay();
  } else {
    slideVideo.pause();
    slideVideo.classList.add('hidden');
    slideVideo.removeAttribute('src');
    slideImage.classList.remove('hidden');
    slideImage.src = item.url;
    scheduleNext();
  }

  updateCounter();
  updateActiveMediaCard();
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
  if (autoEnabled) {
    renderSlide();
  } else {
    stopAutoPlay();
  }
}

async function loadMedia() {
  try {
    const response = await fetch('/api/public-media');
    if (!response.ok) throw new Error('Erreur de chargement');
    const data = await response.json();
    mediaItems = Array.isArray(data.items) ? data.items : [];
    currentIndex = 0;
    renderSlide();
    renderMediaGrid();
    updateActiveMediaCard();
  } catch (error) {
    galleryStatus.textContent = 'Impossible de charger la galerie.';
    showToast('Erreur de chargement de la galerie', 'error');
  }
}

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
    } catch (error) {
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
    return;
  }
  if (action === 'download-png') {
    downloadImageAsFormat(item.url, baseName, 'png');
  }
});

slideVideo?.addEventListener('ended', () => {
  if (!autoEnabled) return;
  nextSlide();
});

prevSlideBtn?.addEventListener('click', previousSlide);
nextSlideBtn?.addEventListener('click', nextSlide);
toggleAutoBtn?.addEventListener('click', toggleAutoPlay);

loadMedia();

downloadMediaBtn?.addEventListener('click', async () => {
  const url = downloadMediaBtn.dataset.url;
  const filename = downloadMediaBtn.dataset.filename || 'media-quiz-2025';
  if (!url) return;
  try {
    await triggerDownload(url, filename);
  } catch (error) {
    showToast('Téléchargement impossible', 'error');
  }
});
