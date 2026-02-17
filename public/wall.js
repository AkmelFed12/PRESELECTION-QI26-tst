const wallGrid = document.getElementById('wallGrid');

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return String(text ?? '').replace(/[&<>"']/g, (m) => map[m]);
}

async function loadWall() {
  if (!wallGrid) return;
  try {
    const [postsRes, storiesRes] = await Promise.all([
      fetch('/api/posts?limit=20', { cache: 'no-store' }),
      fetch('/api/stories/active', { cache: 'no-store' })
    ]);
    const posts = await postsRes.json();
    const stories = await storiesRes.json();
    const items = [];

    (Array.isArray(posts) ? posts : []).forEach((p) => {
      items.push({
        type: 'post',
        createdAt: p.createdAt,
        title: p.authorName,
        content: p.content,
        media: p.imageUrl
      });
    });
    (Array.isArray(stories) ? stories : []).forEach((s) => {
      items.push({
        type: 'story',
        createdAt: s.createdAt,
        title: s.authorName,
        content: s.content,
        media: s.mediaUrl
      });
    });

    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (!items.length) {
      wallGrid.textContent = 'Aucun contenu pour le moment.';
      return;
    }

    wallGrid.innerHTML = items.map((item) => `
      <div class="wall-card">
        ${item.media ? `<img src="${item.media}" alt="" class="wall-media" onerror="this.style.display='none'">` : ''}
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.content || '').slice(0, 140)}${(item.content || '').length > 140 ? '…' : ''}</p>
        <span class="muted-note">${item.type === 'post' ? 'Actualité' : 'Story'}</span>
      </div>
    `).join('');
  } catch (error) {
    wallGrid.textContent = 'Erreur de chargement.';
  }
}

loadWall();
