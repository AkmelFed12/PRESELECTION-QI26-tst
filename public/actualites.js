const newsList = document.getElementById('newsList');

async function loadNews() {
  try {
    const res = await fetch('/api/public-news');
    const data = await res.json();
    const items = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
    if (!items.length) {
      newsList.textContent = 'Aucune actualité pour le moment.';
      return;
    }
    newsList.innerHTML = items
      .map(
        (item) => `
        <article class="status" style="margin-bottom:12px;">
          <strong>${item.title || 'Actualité'}</strong>
          <div class="muted" style="margin:6px 0;">${new Date(item.createdAt).toLocaleDateString('fr-FR')}</div>
          <p>${item.body || ''}</p>
        </article>
      `,
      )
      .join('');
  } catch {
    newsList.textContent = 'Impossible de charger les actualités.';
  }
}

loadNews();
