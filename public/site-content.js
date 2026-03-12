function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function textToHtml(value) {
  return escapeHtml(value).replace(/\n/g, '<br>');
}

function setText(el, value) {
  if (!el) return;
  const text = String(value || '').trim();
  if (!text) {
    el.style.display = 'none';
    return;
  }
  el.style.display = '';
  el.textContent = text;
}

function renderList(container, items, renderer, emptyText) {
  if (!container) return;
  if (!items || !items.length) {
    container.innerHTML = `<div class="status">${emptyText || 'Aucun élément.'}</div>`;
    return;
  }
  container.innerHTML = items.map(renderer).join('');
}

async function loadSiteContent() {
  try {
    const res = await fetch(`/api/public/site-content?ts=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();

    // About
    const aboutTitle = document.getElementById('aboutTitle');
    const aboutSubtitle = document.getElementById('aboutSubtitle');
    const aboutBody = document.getElementById('aboutBody');
    setText(aboutTitle, data.about?.title);
    setText(aboutSubtitle, data.about?.subtitle);
    if (aboutBody) aboutBody.innerHTML = textToHtml(data.about?.body || '');

    // Committee
    renderList(
      document.getElementById('committeeList'),
      data.committee?.members || [],
      (m) => `
        <div class="status">
          <strong>${escapeHtml(m.role || '')}</strong>
          <div class="muted">${escapeHtml(m.name || '')}</div>
        </div>
      `,
      'Aucun membre renseigné.'
    );

    // Programs
    renderList(
      document.getElementById('programsList'),
      data.programs?.items || [],
      (p) => `
        <div class="status">
          <strong>${escapeHtml(p.title || '')}</strong>
          <div class="muted">${textToHtml(p.description || '')}</div>
        </div>
      `,
      'Aucun programme renseigné.'
    );

    // Communiques
    renderList(
      document.getElementById('communiquesList'),
      data.communiques?.items || [],
      (c) => `
        <div class="status">
          <strong>${escapeHtml(c.title || '')}</strong>
          <div class="muted">${escapeHtml(c.date || '')}</div>
          <div style="margin-top:6px;">${textToHtml(c.body || '')}</div>
          ${c.signedBy ? `<div class="muted" style="margin-top:6px;">Signé: ${escapeHtml(c.signedBy)}</div>` : ''}
        </div>
      `,
      'Aucun communiqué pour le moment.'
    );

    // Documents
    renderList(
      document.getElementById('documentsList'),
      data.documents?.items || [],
      (d) => `
        <a class="status" href="${escapeHtml(d.url || '#')}" target="_blank" rel="noopener">
          ${escapeHtml(d.title || '')}
        </a>
      `,
      'Aucun document disponible.'
    );

    // Transparency
    const transparencyBody = document.getElementById('transparencyBody');
    if (transparencyBody) transparencyBody.innerHTML = textToHtml(data.transparency?.body || '');

    renderList(
      document.getElementById('transparencyStats'),
      data.transparency?.stats || [],
      (s) => `
        <div class="status">
          <strong>${escapeHtml(s.label || '')}</strong>
          <div class="muted">${escapeHtml(s.value || '')}</div>
        </div>
      `,
      'Aucune statistique.'
    );

    renderList(
      document.getElementById('transparencyReports'),
      data.transparency?.reports || [],
      (r) => `
        <a class="status" href="${escapeHtml(r.url || '#')}" target="_blank" rel="noopener">
          ${escapeHtml(r.title || '')}
        </a>
      `,
      'Aucun rapport publié.'
    );

    // Membership
    const membershipStatus = document.getElementById('membershipStatus');
    const membershipForm = document.getElementById('membershipForm');
    const membershipClosed = document.getElementById('membershipClosed');
    const isOpen = Boolean(data.membership?.open);
    if (membershipStatus) membershipStatus.textContent = data.membership?.info || '';
    if (membershipForm) membershipForm.style.display = isOpen ? 'grid' : 'none';
    if (membershipClosed) membershipClosed.style.display = isOpen ? 'none' : 'block';

    // Footer
    document.querySelectorAll('[data-footer-address]').forEach((el) => setText(el, data.footer?.address));
    document.querySelectorAll('[data-footer-phone]').forEach((el) => setText(el, data.footer?.phone));
    document.querySelectorAll('[data-footer-email]').forEach((el) => setText(el, data.footer?.email));
    document.querySelectorAll('[data-footer-hours]').forEach((el) => setText(el, data.footer?.hours));
  } catch {
    // silent
  }
}

loadSiteContent();
