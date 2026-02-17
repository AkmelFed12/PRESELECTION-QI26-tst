const postForm = document.getElementById('postForm');
const postsDiv = document.getElementById('postsDiv');
const topPostsList = document.getElementById('topPostsList');
const imageFileInput = document.getElementById('imageFile');
const uploadImageBtn = document.getElementById('uploadImageBtn');
const uploadStatus = document.getElementById('uploadStatus');
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

    renderTopPosts(posts);

    posts.forEach(post => {
      const date = new Date(post.createdAt).toLocaleDateString('fr-FR');
      const likes = Number(post.likes || 0);
      const shares = Number(post.shares || 0);
      const heart = Number(post.reactions_heart || 0);
      const thumb = Number(post.reactions_thumb || 0);
      const laugh = Number(post.reactions_laugh || 0);
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
            <button class="btn-small" data-action="reaction" data-reaction="heart" data-id="${post.id}">❤️ ${heart}</button>
            <button class="btn-small" data-action="reaction" data-reaction="thumb" data-id="${post.id}">👍 ${thumb}</button>
            <button class="btn-small" data-action="reaction" data-reaction="laugh" data-id="${post.id}">😂 ${laugh}</button>
            <button class="btn-small" data-action="like" data-id="${post.id}">Aimer (${likes})</button>
            <button class="btn-small" data-action="share-whatsapp" data-id="${post.id}">WhatsApp</button>
            <button class="btn-small" data-action="share-facebook" data-id="${post.id}">Facebook</button>
            <button class="btn-small" data-action="share" data-id="${post.id}">Copier (${shares})</button>
            <button class="btn-small" data-action="toggle-comments" data-id="${post.id}">Commentaires</button>
          </div>
          <div class="post-comments" data-comments="${post.id}"></div>
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

function renderTopPosts(posts) {
  if (!topPostsList) return;
  if (!Array.isArray(posts) || posts.length === 0) {
    topPostsList.textContent = 'Aucune publication pour le moment.';
    return;
  }
  const ranked = [...posts].map((p) => {
    const score =
      Number(p.reactions_heart || 0) +
      Number(p.reactions_thumb || 0) +
      Number(p.reactions_laugh || 0) +
      Number(p.likes || 0) +
      Number(p.shares || 0);
    return { ...p, score };
  }).sort((a, b) => b.score - a.score).slice(0, 5);

  topPostsList.innerHTML = ranked.map((p, idx) => `
    <div class="top-posts-item">
      <span>${idx + 1}. ${escapeHtml(p.authorName)} — ${escapeHtml((p.content || '').slice(0, 60))}${(p.content || '').length > 60 ? '…' : ''}</span>
      <strong>${p.score}</strong>
    </div>
  `).join('');
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
    if (action === 'reaction') {
      const reaction = button.dataset.reaction;
      const res = await fetch(`/api/posts/${postId}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Réaction déjà enregistrée.');
        return;
      }
      await loadPosts();
      return;
    }
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
    } else if (action === 'share-whatsapp') {
      const url = `${window.location.origin}/posts.html`;
      await fetch(`/api/posts/${postId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'whatsapp' })
      }).catch(() => {});
      window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, '_blank');
      await loadPosts();
    } else if (action === 'share-facebook') {
      const url = `${window.location.origin}/posts.html`;
      await fetch(`/api/posts/${postId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'facebook' })
      }).catch(() => {});
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
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
    } else if (action === 'toggle-comments') {
      const container = postsDiv.querySelector(`[data-comments="${postId}"]`);
      if (!container) return;
      if (container.dataset.loaded === '1') {
        container.classList.toggle('hidden');
        return;
      }
      container.dataset.loaded = '1';
      container.innerHTML = `
        <div class="comment-list" data-list="${postId}">Chargement...</div>
        <form class="comment-form" data-form="${postId}">
          <input type="text" name="authorName" placeholder="Votre nom" required maxlength="100" />
          <input type="email" name="authorEmail" placeholder="Email" required maxlength="100" />
          <textarea name="content" placeholder="Votre commentaire..." required maxlength="500"></textarea>
          <button type="submit" class="btn-small">Publier</button>
        </form>
      `;
      await loadComments(postId);
    }
  } catch (error) {
    console.error(error);
    alert('Action impossible pour le moment.');
  }
});

uploadImageBtn?.addEventListener('click', async () => {
  if (!imageFileInput || !uploadStatus) return;
  const file = imageFileInput.files?.[0];
  if (!file) {
    uploadStatus.textContent = 'Veuillez choisir un fichier.';
    return;
  }
  uploadStatus.textContent = 'Téléversement en cours...';
  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload/photo', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!res.ok) {
      uploadStatus.textContent = data.error || 'Erreur de téléversement.';
      return;
    }
    const imageUrlInput = document.getElementById('imageUrl');
    if (imageUrlInput) imageUrlInput.value = data.url || '';
    uploadStatus.textContent = 'Téléversement terminé.';
  } catch (error) {
    uploadStatus.textContent = 'Erreur de téléversement.';
  }
});

postsDiv?.addEventListener('submit', async (e) => {
  const form = e.target.closest('.comment-form');
  if (!form) return;
  e.preventDefault();
  const postId = form.dataset.form;
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  try {
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Erreur commentaire');
      return;
    }
    form.reset();
    await loadComments(postId);
  } catch (error) {
    alert('Erreur commentaire');
  }
});

async function loadComments(postId) {
  const list = postsDiv.querySelector(`[data-list="${postId}"]`);
  if (!list) return;
  try {
    const res = await fetch(`/api/posts/${postId}/comments`, { cache: 'no-store' });
    const comments = await res.json();
    if (!Array.isArray(comments) || !comments.length) {
      list.innerHTML = '<div class="comment-empty">Aucun commentaire pour le moment.</div>';
      return;
    }
    list.innerHTML = comments
      .map(
        (c) => `
        <div class="comment-item">
          <strong>${escapeHtml(c.authorName)}</strong>
          <p>${escapeHtml(c.content)}</p>
        </div>
      `
      )
      .join('');
  } catch (error) {
    list.innerHTML = '<div class="comment-empty">Erreur chargement commentaires.</div>';
  }
}

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
