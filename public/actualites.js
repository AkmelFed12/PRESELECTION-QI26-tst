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
    const renderImages = (item) => {
      let images = [];
      if (item.imagesJson || item.imagesjson) {
        try {
          images = JSON.parse(item.imagesJson || item.imagesjson) || [];
        } catch {}
      }
      const main = item.imageUrl || item.imageurl;
      if (main) images.unshift(main);
      images = Array.from(new Set(images));
      if (!images.length) return '';
      return `
        <div style="display:flex; flex-wrap:wrap; gap:10px; margin:10px 0;">
          ${images
            .map(
              (url) =>
                `<img src="${url}" alt="illustration" style="max-width:180px; border-radius:10px;" />`,
            )
            .join('')}
        </div>
      `;
    };
    const featuredHtml = featured
      ? `
        <article class="status" style="margin-bottom:16px; border-left:4px solid var(--accent);">
          <div class="badge-new">À la une</div>
          <strong>${featured.title || 'Actualité'}</strong>
          ${featured.category ? `<div class="muted" style="margin-top:4px;">${featured.category}</div>` : ''}
          <div class="muted" style="margin:6px 0;">${new Date(featured.createdAt).toLocaleDateString('fr-FR')}</div>
          ${renderImages(featured)}
          <p>${featured.body || ''}</p>
        </article>
      `
      : '';
    const listHtml = rest
      .map(
        (item) => `
        <article class="status" style="margin-bottom:12px;">
          <strong>${item.title || 'Actualité'}</strong>
          ${item.category ? `<div class="muted" style="margin-top:4px;">${item.category}</div>` : ''}
          <div class="muted" style="margin:6px 0;">${new Date(item.createdAt).toLocaleDateString('fr-FR')}</div>
          ${renderImages(item)}
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
