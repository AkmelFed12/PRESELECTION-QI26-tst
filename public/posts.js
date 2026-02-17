const postForm = document.getElementById('postForm');
const postsDiv = document.getElementById('postsDiv');
let postsFetchInFlight = false;
let postsRefreshTimer = null;

postForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const authorName = document.getElementById('authorName').value;
  const authorEmail = document.getElementById('authorEmail').value;
  const content = document.getElementById('postContent').value;
  const imageUrl = document.getElementById('imageUrl').value;

  const successMsg = document.getElementById('successMsg');
  const errorMsg = document.getElementById('errorMsg');
  successMsg.classList.remove('show');
  errorMsg.classList.remove('show');

  try {
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorName, authorEmail, content, imageUrl: imageUrl || null })
    });

    const data = await response.json();

    if (response.ok) {
      successMsg.textContent = 'Publication soumise! Elle sera affichée après approbation du modérateur.';
      successMsg.classList.add('show');
      document.getElementById('postForm').reset();
      setTimeout(loadPosts, 2000);
    } else {
      errorMsg.textContent = data.error || 'Erreur lors de la soumission';
      errorMsg.classList.add('show');
    }
  } catch (error) {
    console.error(error);
    errorMsg.textContent = 'Erreur serveur';
    errorMsg.classList.add('show');
  }
});

async function loadPosts() {
  if (postsFetchInFlight) return;
  postsFetchInFlight = true;
  try {
    const response = await fetch('/api/posts?limit=50', { cache: 'no-store' });
    const posts = await response.json();

    postsDiv.innerHTML = '';

    if (posts.length === 0) {
      postsDiv.innerHTML = '<div class="empty-state">Aucune publication pour le moment. Soyez le premier!</div>';
      return;
    }

    posts.forEach(post => {
      const date = new Date(post.createdAt).toLocaleDateString('fr-FR');
      const likes = Number(post.likes || 0);
      const shares = Number(post.shares || 0);
      const postHTML = `
        <div class="post-card">
          <div class="post-header">
            <div>
              <div class="post-author">${escapeHtml(post.authorName)}</div>
              <div class="post-date">${date}</div>
            </div>
          </div>
          ${post.imageUrl ? `<img src="${post.imageUrl}" alt="Post image" class="post-image" onerror="this.style.display='none'">` : ''}
          <div class="post-content">${escapeHtml(post.content)}</div>
          <div class="post-actions">
            <button class="btn-small" data-action="like" data-id="${post.id}">❤️ Aimer (${likes})</button>
            <button class="btn-small" data-action="share" data-id="${post.id}">📤 Partager (${shares})</button>
          </div>
        </div>
      `;
      postsDiv.innerHTML += postHTML;
    });
  } catch (error) {
    console.error(error);
    document.getElementById('postsDiv').innerHTML = '<div class="error-message show">Erreur chargement des publications</div>';
  } finally {
    postsFetchInFlight = false;
  }
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

postsDiv?.addEventListener('click', async (e) => {
  const button = e.target.closest('button[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  const postId = button.dataset.id;
  if (!postId) return;

  try {
    if (action === 'like') {
      const stored = localStorage.getItem('viewerEmail') || '';
      const email = prompt('Votre email pour aimer cette publication:', stored) || '';
      const cleanEmail = email.trim();
      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        alert('Email invalide.');
        return;
      }
      localStorage.setItem('viewerEmail', cleanEmail);
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });
      if (!res.ok) throw new Error('Erreur lors du like');
      await loadPosts();
    } else if (action === 'share') {
      const url = `${window.location.origin}/posts.html`;
      await fetch(`/api/posts/${postId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'copy' })
      }).catch(() => {});
      try {
        await navigator.clipboard.writeText(url);
        alert('Lien copié dans le presse-papiers.');
      } catch (_) {
        alert(`Copiez ce lien: ${url}`);
      }
      await loadPosts();
    }
  } catch (error) {
    console.error(error);
    alert('Action impossible pour le moment.');
  }
});

function startPostsRefresh() {
  if (postsRefreshTimer) clearInterval(postsRefreshTimer);
  postsRefreshTimer = setInterval(() => {
    if (!document.hidden) loadPosts();
  }, 30000);
}

// Auto-refresh posts every 30 seconds
loadPosts();
startPostsRefresh();
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) loadPosts();
});
