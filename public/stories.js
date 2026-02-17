let currentStoryIndex = 0;
let allStories = [];

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

async function loadStories() {
  try {
    const response = await fetch('/api/stories/active');
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

// Auto-refresh stories every 20 seconds
loadStories();
setInterval(loadStories, 20000);
