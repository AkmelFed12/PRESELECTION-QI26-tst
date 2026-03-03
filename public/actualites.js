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
    const featured = items.find((item) => item.featured);
    const rest = featured ? items.filter((item) => item.id !== featured.id) : items;
    const featuredHtml = featured
      ? `
        <article class="status" style="margin-bottom:16px; border-left:4px solid var(--accent);">
          <div class="badge-new">À la une</div>
          <strong>${featured.title || 'Actualité'}</strong>
          <div class="muted" style="margin:6px 0;">${new Date(featured.createdAt).toLocaleDateString('fr-FR')}</div>
          <p>${featured.body || ''}</p>
        </article>
      `
      : '';
    const listHtml = rest
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
    newsList.innerHTML = `${featuredHtml}${listHtml}`;
  } catch {
    newsList.textContent = 'Impossible de charger les actualités.';
  }
}

loadNews();
