function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripContacts(value) {
  return String(value || '').replace(/\s*\(?\+?\d[\d\s.-]*\)?/g, '').trim();
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

function ensureAnnouncementBanner() {
  let banner = document.getElementById('announcementBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'announcementBanner';
    banner.className = 'announcement-banner';
    const span = document.createElement('span');
    span.id = 'announcementBannerText';
    banner.appendChild(span);
    document.body.prepend(banner);
  }
  return banner;
}

async function loadAnnouncementBanner() {
  try {
    const res = await fetch(`/api/public-settings?ts=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    const text = String(data.announcementText || '').trim();
    const banner = ensureAnnouncementBanner();
    const span = banner.querySelector('#announcementBannerText') || banner.querySelector('span');
    if (text) {
      if (span) span.textContent = text;
      banner.style.display = 'block';
    } else {
      banner.style.display = 'none';
    }
  } catch {
    // silent
  }
}

function renderList(container, items, renderer, emptyText) {
  if (!container) return;
  if (!items || !items.length) {
    container.innerHTML = `<div class="status">${emptyText || 'Aucun élément.'}</div>`;
    return;
  }
  container.innerHTML = items.map(renderer).join('');
}

function normalizeRole(role) {
  return String(role || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

const COMMITTEE_ORDER = [
  'PRESIDENT',
  'VICE PRESIDENT',
  'SECRETAIRE GENERAL',
  'SECRETAIRE ADJOINTE 1',
  'SECRETAIRE ADJOINTE 2',
  'SECRETAIRE ADJOINTE 3',
  'DELEGUE CULTUREL',
  'DELEGUE CULTUREL ADJOINT 1',
  'DELEGUE CULTUREL ADJOINTE 2',
  'DELEGUE SOCIAL',
  'DELEGUE SOCIAL ADJOINT 1',
  'DELEGUE SOCIAL ADJOINT 2',
  'DELEGUE SOCIAL ADJOINTE 3',
  'DELEGUE SOCIAL ADJOINTE 4',
  'DELEGUE SOCIAL ADJOINTE 5',
  'DELEGUE DE MOBILISATION',
  'DELEGUE DE MOBILISATION ADJOINTE 1',
  'DELEGUE DE MOBILISATION ADJOINTE 2',
  'DELEGUE DE MOBILISATION ADJOINT 3',
  'DELEGUE DE MOBILISATION ADJOINTE 4',
  'TRESORIERE',
  'TRESORIERE ADJOINT',
  'TRESORIERE ADJOINTE 2'
];

const COMMITTEE_ORDER_MAP = COMMITTEE_ORDER.reduce((acc, role, idx) => {
  acc[role] = idx;
  return acc;
}, {});

function sortCommitteeMembers(items) {
  return (items || [])
    .slice()
    .sort((a, b) => {
      const ra = normalizeRole(a.role);
      const rb = normalizeRole(b.role);
      const ia = COMMITTEE_ORDER_MAP[ra] ?? 999;
      const ib = COMMITTEE_ORDER_MAP[rb] ?? 999;
      if (ia !== ib) return ia - ib;
      return ra.localeCompare(rb);
    });
}

function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0] || '').join('').toUpperCase();
}

function renderCommitteeOrg(items) {
  const orgEl = document.getElementById('committeeOrg');
  if (!orgEl) return;
  if (!items.length) {
    orgEl.innerHTML = `<div class="status">Aucun membre renseigné.</div>`;
    return;
  }

  const byRole = (role) => items.find((m) => normalizeRole(m.role) === role);
  const byStarts = (prefix) =>
    items.filter((m) => normalizeRole(m.role).startsWith(prefix));

  const president = byRole('PRESIDENT');
  const vice = byRole('VICE PRESIDENT');
  const secGen = byRole('SECRETAIRE GENERAL');
  const secretaires = byStarts('SECRETAIRE ADJOINT');
  const culture = byStarts('DELEGUE CULTUREL');
  const social = byStarts('DELEGUE SOCIAL');
  const mobil = byStarts('DELEGUE DE MOBILISATION');
  const treasury = items.filter((m) => normalizeRole(m.role).startsWith('TRESORIERE'));

  const card = (label, person, primary = false) => {
    if (!person) return '';
    const name = stripContacts(person.name || '');
    return `
      <div class="org-card ${primary ? 'primary' : ''}">
        ${escapeHtml(label)}
        <span>${escapeHtml(name)}</span>
      </div>
    `;
  };

  const group = (title, members) => {
    if (!members.length) return '';
    return `
      <div class="org-group">
        <div class="org-group-title">${escapeHtml(title)}</div>
        <div class="org-group-grid">
          ${members
            .map((m) => {
              const name = stripContacts(m.name || '');
              return `
                <div class="org-card">
                  ${escapeHtml(m.role || '')}
                  <span>${escapeHtml(name)}</span>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>
    `;
  };

  const secondLevel = [vice, secGen].filter(Boolean);
  const groupsLevel = [secretaires, culture, social, mobil, treasury].filter((g) => g.length);

  orgEl.innerHTML = `
    <div class="org-chart">
      <div class="org-level">
        ${card('Président', president, true)}
      </div>
      <div class="org-connector"><span></span></div>
      <div class="org-level ${secondLevel.length > 1 ? 'wide' : ''}">
        ${card('Vice Président', vice)}
        ${card('Secrétaire Général', secGen)}
      </div>
      <div class="org-connector"><span></span></div>
      <div class="org-level ${groupsLevel.length > 1 ? 'groups' : ''}">
        ${group('Secrétariat', secretaires)}
        ${group('Culturel', culture)}
        ${group('Social', social)}
        ${group('Mobilisation', mobil)}
        ${group('Trésorerie', treasury)}
      </div>
    </div>
  `;
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

    const leadersList = document.getElementById('leadersList');
    if (leadersList) {
      const leaders = data.leaders?.items || [];
      renderList(
        leadersList,
        leaders,
        (l) => `
          <div class="leader-card">
            <div class="leader-role">${escapeHtml(l.role || '')}</div>
            <div class="leader-name">${escapeHtml(stripContacts(l.name || ''))}</div>
            <div class="leader-message">${textToHtml(l.message || '')}</div>
          </div>
        `,
        'Aucun message publié.'
      );
    }

    // Committee
    const committeeItems = sortCommitteeMembers(data.committee?.members || []);
    const committeeList = document.getElementById('committeeList');
    if (committeeList) {
      if (!committeeItems.length) {
        committeeList.innerHTML = `<div class="status">Aucun membre renseigné.</div>`;
      } else {
        committeeList.classList.add('committee-grid');
        committeeList.innerHTML = committeeItems
          .map((m) => {
            const name = stripContacts(m.name || '');
            return `
              <div class="committee-card">
                <div class="committee-avatar">${escapeHtml(getInitials(name))}</div>
                <div>
                  <div class="committee-role">${escapeHtml(m.role || '')}</div>
                  <div class="committee-name">${escapeHtml(name)}</div>
                </div>
              </div>
            `;
          })
          .join('');
      }
    }

    const committeePreview = document.getElementById('committeePreview');
    if (committeePreview) {
      const preview = committeeItems.slice(0, 3);
      const list = preview
        .map((m) => `<div>• ${escapeHtml(m.role || '')}</div>`)
        .join('');
      const listEl = committeePreview.querySelector('.mini-list');
      if (listEl) listEl.innerHTML = list || 'Aucun membre.';
    }

    renderCommitteeOrg(committeeItems);

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

    // Values & Missions
    setText(document.getElementById('valuesTitle'), data.values?.title);
    if (document.getElementById('valuesBody')) {
      document.getElementById('valuesBody').innerHTML = textToHtml(data.values?.body || '');
    }
    renderList(
      document.getElementById('valuesList'),
      (data.values?.bullets || []).map((b) => ({ label: b })),
      (b) => `<div class="status">${escapeHtml(b.label || '')}</div>`,
      'Aucune valeur renseignée.'
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
    const documentsSummary = document.getElementById('documentsSummary');
    if (documentsSummary) {
      const summaryText = data.documents?.summary || '';
      documentsSummary.innerHTML = summaryText ? textToHtml(summaryText) : 'Documents officiels et règlements disponibles.';
    }

    // Reports page (activity reports)
    renderList(
      document.getElementById('reportsList'),
      data.transparency?.reports || [],
      (r) => `
        <a class="status" href="${escapeHtml(r.url || '#')}" target="_blank" rel="noopener">
          ${escapeHtml(r.title || '')}
        </a>
      `,
      'Aucun rapport publié.'
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

    const printBtn = document.getElementById('printCommitteeBtn');
    printBtn?.addEventListener('click', () => window.print());
  } catch {
    // silent
  }
}

loadSiteContent();
loadAnnouncementBanner();
