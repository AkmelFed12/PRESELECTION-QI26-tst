(() => {
  const form = document.getElementById('audienceForm');
  const message = document.getElementById('audienceMessage');
  const communeList = document.getElementById('audienceCommuneList');
  const totalEl = document.querySelector('[data-audience-total]');
  const brothersEl = document.querySelector('[data-audience-brothers]');
  const sistersEl = document.querySelector('[data-audience-sisters]');
  const communesEl = document.querySelector('[data-audience-communes]');

  const setMessage = (text, tone = '') => {
    if (!message) return;
    message.textContent = text || '';
    message.dataset.tone = tone;
  };

  const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);

  const renderStats = (stats = {}) => {
    const byCommune = Array.isArray(stats.byCommune) ? stats.byCommune : [];
    if (totalEl) totalEl.textContent = stats.total ?? 0;
    if (brothersEl) brothersEl.textContent = stats.brothers ?? 0;
    if (sistersEl) sistersEl.textContent = stats.sisters ?? 0;
    if (communesEl) communesEl.textContent = byCommune.length;

    if (!communeList) return;
    if (!byCommune.length) {
      communeList.textContent = 'Aucune présence enregistrée pour le moment.';
      return;
    }
    communeList.innerHTML = byCommune
      .map((item) => `
        <div class="commune-mini-row">
          <span>${escapeHtml(item.commune || 'Non renseignée')}</span>
          <strong>${Number(item.total || 0)}</strong>
        </div>
      `)
      .join('');
  };

  const loadStats = async () => {
    try {
      const res = await fetch('/api/qi26/audience/stats', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      renderStats(data.stats || {});
    } catch {}
  };

  const readResponse = async (res) => {
    const text = await res.text().catch(() => '');
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { message: text };
    }
  };

  const friendlyError = (data = {}) => {
    const text = String(data.message || '').trim();
    if (!text || /^not found$/i.test(text)) {
      return 'Enregistrement indisponible pour le moment. Merci de réessayer dans un instant.';
    }
    return text;
  };

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage('Enregistrement en cours...');
    const payload = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch('/api/qi26/audience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await readResponse(res);
      if (!res.ok) {
        setMessage(friendlyError(data), 'error');
        if (data.stats) renderStats(data.stats);
        return;
      }
      form.reset();
      renderStats(data.stats || {});
      setMessage(data.message || 'Présence enregistrée.', 'success');
    } catch {
      setMessage('Réseau indisponible. Merci de réessayer.', 'error');
    }
  });

  loadStats();
  window.setInterval(loadStats, 15000);
})();
