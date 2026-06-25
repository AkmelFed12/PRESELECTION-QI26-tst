(function () {
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const mainNav = document.querySelector('[data-main-nav]');

  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', () => {
      const isOpen = mainNav.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
      menuToggle.textContent = isOpen ? 'Fermer' : 'Menu';
    });

    mainNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        mainNav.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.textContent = 'Menu';
      });
    });
  }

  const topButton = document.querySelector('[data-scroll-top]');
  if (topButton) {
    topButton.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  const assetPrefix = document.body?.dataset.assetPrefix || '';
  const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
  const absoluteUrl = (value) => {
    try {
      return new URL(value || window.location.href, window.location.href).href;
    } catch {
      return window.location.href;
    }
  };
  const buildShareActions = (data) => {
    const name = data.name || 'ce finaliste';
    const shareUrl = absoluteUrl(data.profileUrl || window.location.href);
    const shareText = data.shareText || `Découvrez le profil de ${name}, finaliste du Quiz Islamique 2026.`;
    const fullMessage = `${shareText} ${shareUrl}`;

    return `
      <div class="share-actions" aria-label="Partager ce profil">
        <a class="share-button whatsapp-share" href="https://wa.me/?text=${encodeURIComponent(fullMessage)}" target="_blank" rel="noopener">WhatsApp</a>
        <a class="share-button facebook-share" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}" target="_blank" rel="noopener">Facebook</a>
        <button class="share-button copy-share" type="button" data-copy-link data-copy-value="${escapeHtml(shareUrl)}">Copier le lien</button>
      </div>
    `;
  };
  const startBrandedVideo = (stage, delay = 1100) => {
    if (!stage) return;
    const video = stage.querySelector('[data-finalist-video]');
    if (!video) return;

    window.setTimeout(() => {
      stage.classList.add('is-ready');
      const playRequest = video.play();
      if (playRequest && typeof playRequest.catch === 'function') {
        playRequest.catch(() => {});
      }
    }, delay);
  };

  const profileOutput = document.querySelector('[data-finalist-profile]');
  document.querySelectorAll('[data-finalist]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!profileOutput) return;
      const data = button.dataset;
      document.querySelectorAll('.person-card.is-selected').forEach((card) => {
        card.classList.remove('is-selected');
      });
      button.closest('.person-card')?.classList.add('is-selected');
      const fields = [
        ['Commune de résidence', data.commune],
        ['Âge', data.age],
        ['Niveau d’études', data.level],
        ['Établissement', data.school],
        ['Contact public', data.contact],
        ['Passion', data.passion],
        ['Parcours et motivation', data.path],
        ['Profil islamique', data.profile],
        ['Grand objectif', data.goal],
        ['Devise', data.motto],
        ['Message à la jeunesse', data.message]
      ].filter(([, value]) => value);
      const posterLink = data.poster
        ? `<p><a class="poster-link inline" href="${escapeHtml(data.poster)}" target="_blank" rel="noopener">Voir l’affiche officielle</a></p>`
        : '';
      const profileLink = data.profileUrl
        ? `<p><a class="poster-link inline" href="${escapeHtml(data.profileUrl)}">Ouvrir la page du candidat</a></p>`
        : '';
      const videoBlock = data.video
        ? `
          <div class="finalist-video-block">
            <div class="finalist-video-heading">
              <p class="kicker">Capsule vidéo</p>
              <h3>Présentation vidéo du finaliste</h3>
            </div>
            <div class="branded-video" data-branded-video>
              <div class="video-intro" data-video-intro>
                <img src="${assetPrefix}assets/logo.jpg" alt="" />
                <span>ASAA Officiel</span>
                <strong>Les Visages du Quiz Islamique 2026</strong>
                <em>${escapeHtml(data.name || '')}</em>
              </div>
              <video class="finalist-video-player" data-finalist-video controls playsinline preload="metadata" poster="${escapeHtml(data.videoPoster || '')}">
                <source src="${escapeHtml(data.video)}" type="video/mp4" />
                Votre navigateur ne permet pas de lire cette vidéo.
              </video>
            </div>
          </div>
        `
        : '';
      const details = fields.length > 1
        ? fields.map(([label, value]) => `<p><strong>${escapeHtml(label)} :</strong> ${escapeHtml(value)}</p>`).join('')
        : `${fields.map(([label, value]) => `<p><strong>${escapeHtml(label)} :</strong> ${escapeHtml(value)}</p>`).join('')}<p>La fiche détaillée de ce finaliste n’a pas encore été publiée par le comité d’organisation.</p>`;

      profileOutput.innerHTML = `
        <p class="kicker">Profil sélectionné</p>
        <h2>${escapeHtml(data.name || '')}</h2>
        ${videoBlock}
        <div class="profile-detail-list">
          ${details}
        </div>
        ${posterLink}
        ${profileLink}
        ${buildShareActions(data)}
      `;
      startBrandedVideo(profileOutput.querySelector('[data-branded-video]'));
      profileOutput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });

  document.querySelectorAll('[data-finalist-photo]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const card = trigger.closest('.person-card');
      const profileButton = card?.querySelector('[data-finalist]');
      profileButton?.click();
    });
  });

  document.querySelectorAll('[data-finalist-open]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const slug = trigger.getAttribute('data-finalist-open');
      const profileButton = document.querySelector(`[data-finalist][data-slug="${slug}"]`);
      profileButton?.click();
    });
  });

  document.querySelectorAll('[data-video-play]').forEach((button) => {
    button.addEventListener('click', () => {
      startBrandedVideo(button.closest('[data-branded-video]'), 700);
    });
  });

  document.addEventListener('click', (event) => {
    const copyButton = event.target.closest('[data-copy-link]');
    if (!copyButton) return;
    const value = copyButton.getAttribute('data-copy-value') || window.location.href;
    const originalText = copyButton.textContent;
    const markCopied = () => {
      copyButton.textContent = 'Lien copié';
      window.setTimeout(() => {
        copyButton.textContent = originalText;
      }, 1600);
    };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(value).then(markCopied).catch(() => {});
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      markCopied();
    } catch {}
    textarea.remove();
  });

  const filterButtons = document.querySelectorAll('[data-media-filter]');
  const mediaCards = document.querySelectorAll('[data-media-category]');

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.getAttribute('data-media-filter') || 'Tous';
      filterButtons.forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      mediaCards.forEach((card) => {
        const category = card.getAttribute('data-media-category');
        card.hidden = filter !== 'Tous' && category !== filter;
      });
    });
  });

  const contactForm = document.querySelector('[data-contact-form]');
  if (contactForm) {
    contactForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const form = new FormData(contactForm);
      const name = String(form.get('name') || '').trim();
      const subject = String(form.get('subject') || '').trim();
      const message = String(form.get('message') || '').trim();
      const email = contactForm.getAttribute('data-email') || '';
      const body = [`Nom : ${name}`, `Sujet : ${subject}`, '', message].join('\n');
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(`Contact ASAA - ${subject || 'Message officiel'}`)}&body=${encodeURIComponent(body)}`;
    });
  }
})();
