let currentStoryIndex = 0;
let allStories = [];
let storiesFetchInFlight = false;
let storiesRefreshTimer = null;
const mediaFileInput = document.getElementById('mediaFile');
const uploadMediaBtn = document.getElementById('uploadMediaBtn');
const uploadMediaStatus = document.getElementById('uploadMediaStatus');
const uploadMediaProgress = document.getElementById('uploadMediaProgress');
const uploadMediaProgressBar = uploadMediaProgress?.querySelector('span');
const uploadMediaPreview = document.getElementById('uploadMediaPreview');
const mediaUrlInput = document.getElementById('mediaUrl');

document.getElementById('storyForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const authorName = document.getElementById('authorName').value;
  const authorEmail = document.getElementById('authorEmail').value;
  const content = document.getElementById('storyContent').value;
  const mediaUrl = document.getElementById('mediaUrl').value;

  const successMsg = document.getElementById('successMsg');
  const errorMsg = document.getElementById('errorMsg');
  successMsg.classList.remove('show');
  errorMsg.classList.remove('show');

  try {
    const response = await fetch('/api/stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorName, authorEmail, content, mediaUrl: mediaUrl || null })
    });

    const data = await response.json();

    if (response.ok) {
      successMsg.textContent = 'Story publiée! Elle sera visible après approbation (24h de visibilité).';
      successMsg.classList.add('show');
      document.getElementById('storyForm').reset();
      setTimeout(loadStories, 2000);
    } else {
      errorMsg.textContent = data.error || 'Erreur lors de la publication';
      errorMsg.classList.add('show');
    }
  } catch (error) {
    console.error(error);
    errorMsg.textContent = 'Erreur serveur';
    errorMsg.classList.add('show');
  }
});

uploadMediaBtn?.addEventListener('click', async () => {
  if (!mediaFileInput || !uploadMediaStatus) return;
  const file = mediaFileInput.files?.[0];
  if (!file) {
    uploadMediaStatus.textContent = 'Veuillez choisir un fichier.';
    return;
  }
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    uploadMediaStatus.textContent = 'Fichier trop lourd (max 5MB).';
    return;
  }
  uploadMediaStatus.textContent = 'Téléversement en cours...';
  if (uploadMediaProgressBar) uploadMediaProgressBar.style.width = '0%';
  if (uploadMediaPreview) {
    uploadMediaPreview.style.display = 'none';
    uploadMediaPreview.innerHTML = '';
  }
  try {
    const data = await uploadFileWithProgress('/api/upload/photo', file, (pct) => {
      if (uploadMediaProgressBar) uploadMediaProgressBar.style.width = `${pct}%`;
    });
    if (mediaUrlInput) mediaUrlInput.value = data.url || '';
    uploadMediaStatus.textContent = 'Téléversement terminé.';
    setTimeout(() => {
      if (uploadMediaStatus.textContent === 'Téléversement terminé.') {
        uploadMediaStatus.textContent = '';
      }
    }, 3000);
    if (uploadMediaPreview) {
      const isVideo = file.type.startsWith('video/');
      uploadMediaPreview.style.display = 'block';
      uploadMediaPreview.innerHTML = isVideo
        ? `<video src="${data.url}" controls muted playsinline></video>`
        : `<img src="${data.url}" alt="Aperçu">`;
    }
  } catch (error) {
    uploadMediaStatus.textContent = 'Erreur de téléversement.';
  }
});

function uploadFileWithProgress(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return;
      const pct = Math.round((evt.loaded / evt.total) * 100);
      onProgress?.(pct);
    };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(data);
      } catch {
        reject(new Error('Upload failed'));
      }
    };
    xhr.onerror = () => reject(new Error('Upload failed'));
    const formData = new FormData();
    formData.append('file', file);
    xhr.send(formData);
  });
}

async function loadStories() {
  if (storiesFetchInFlight) return;
  storiesFetchInFlight = true;
  try {
    const response = await fetch('/api/stories/active', { cache: 'no-store' });
    allStories = await response.json();

    const storiesDiv = document.getElementById('storiesDiv');
    storiesDiv.innerHTML = '';

    if (allStories.length === 0) {
      storiesDiv.innerHTML = '<div class="empty-stories">Aucune story en ce moment. Soyez le premier!</div>';
      return;
    }

    allStories.forEach((story, index) => {
      const expiresAt = new Date(story.expiresAt);
      const now = new Date();
      const hoursLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60));

      const storyHTML = `
        <div class="story-item" onclick="openStory(${index})">
          ${story.mediaUrl ? `<img src="${story.mediaUrl}" alt="Story" class="story-media" onerror="this.style.display='none'">` : '<div class="story-media" style="background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px;">📱</div>'}
          <div class="story-overlay">
            <div class="story-author">${escapeHtml(story.authorName)}</div>
            <div class="story-time">⏰ ${hoursLeft}h restantes</div>
          </div>
        </div>
      `;
      storiesDiv.innerHTML += storyHTML;
    });
  } catch (error) {
    console.error(error);
    document.getElementById('storiesDiv').innerHTML = '<div class="empty-stories">Erreur chargement des stories</div>';
  } finally {
    storiesFetchInFlight = false;
  }
}

function openStory(index) {
  currentStoryIndex = index;
  displayStory();
  document.getElementById('storyModal').classList.add('active');
}

function closeStory() {
  document.getElementById('storyModal').classList.remove('active');
}

function nextStory() {
  currentStoryIndex = (currentStoryIndex + 1) % allStories.length;
  displayStory();
}

function prevStory() {
  currentStoryIndex = (currentStoryIndex - 1 + allStories.length) % allStories.length;
  displayStory();
}

function displayStory() {
  const story = allStories[currentStoryIndex];
  const mediaEl = document.getElementById('storyModalMedia');
  const infoEl = document.getElementById('storyModalInfo');

  if (story.mediaUrl) {
    mediaEl.src = story.mediaUrl;
  } else {
    mediaEl.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
    mediaEl.style.minHeight = '400px';
  }

  const expiresAt = new Date(story.expiresAt);
  const now = new Date();
  const hoursLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60));

  infoEl.innerHTML = `
    <strong>${escapeHtml(story.authorName)}</strong><br>
    <p>${escapeHtml(story.content)}</p>
    <small>⏰ ${hoursLeft}h restantes</small>
  `;
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Close modal on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeStory();
  if (e.key === 'ArrowRight') nextStory();
  if (e.key === 'ArrowLeft') prevStory();
});

function startStoriesRefresh() {
  if (storiesRefreshTimer) clearInterval(storiesRefreshTimer);
  storiesRefreshTimer = setInterval(() => {
    if (!document.hidden) loadStories();
  }, 20000);
}

// Auto-refresh stories every 20 seconds
loadStories();
startStoriesRefresh();
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) loadStories();
});

document.getElementById('storyForm')?.addEventListener('submit', () => {
  if (mediaFileInput) mediaFileInput.value = '';
  if (mediaUrlInput) mediaUrlInput.value = '';
  if (uploadMediaPreview) {
    uploadMediaPreview.style.display = 'none';
    uploadMediaPreview.innerHTML = '';
  }
  if (uploadMediaProgressBar) uploadMediaProgressBar.style.width = '0%';
  if (uploadMediaStatus) uploadMediaStatus.textContent = '';
});
