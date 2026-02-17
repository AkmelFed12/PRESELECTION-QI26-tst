document.getElementById('postForm').addEventListener('submit', async (e) => {
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
  try {
    const response = await fetch('/api/posts');
    const posts = await response.json();

    const postsDiv = document.getElementById('postsDiv');
    postsDiv.innerHTML = '';

    if (posts.length === 0) {
      postsDiv.innerHTML = '<div class="empty-state">Aucune publication pour le moment. Soyez le premier!</div>';
      return;
    }

    posts.forEach(post => {
      const date = new Date(post.createdAt).toLocaleDateString('fr-FR');
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
            <button class="btn-small" onclick="alert('Vous avez aimé cette publication')">❤️ Aimer</button>
            <button class="btn-small" onclick="alert('Partager avec vos contacts')">📤 Partager</button>
          </div>
        </div>
      `;
      postsDiv.innerHTML += postHTML;
    });
  } catch (error) {
    console.error(error);
    document.getElementById('postsDiv').innerHTML = '<div class="error-message show">Erreur chargement des publications</div>';
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

// Auto-refresh posts every 30 seconds
loadPosts();
setInterval(loadPosts, 30000);
