const newsList = document.getElementById('newsList');

async function loadNews() {
  try {
    const res = await fetch('/api/public-settings');
    const data = await res.json();
    const announcement = (data.announcementText || '').trim();
    if (!announcement) {
      newsList.textContent = 'Aucune actualité pour le moment.';
      return;
    }
    newsList.innerHTML = `
      <div class="status">
        <strong>Annonce officielle</strong>
        <p style="margin-top:8px;">${announcement}</p>
      </div>
    `;
  } catch {
    newsList.textContent = 'Impossible de charger les actualités.';
  }
}

loadNews();
