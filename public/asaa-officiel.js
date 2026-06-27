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
  const getVisitorKey = () => {
    const storageKey = 'qi26VisitorKey';
    let key = localStorage.getItem(storageKey);
    if (!key) {
      key = window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : `qi26-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(storageKey, key);
    }
    return key;
  };
  const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const buildEngagementPanel = (slug, title) => {
    if (!slug) return '';
    const safeTitle = title || 'ce profil';
    return `
      <section class="engagement-panel" data-qi26-engagement data-item-slug="${escapeHtml(slug)}" data-engagement-title="${escapeHtml(safeTitle)}">
        <div class="engagement-header">
          <div>
            <p class="kicker">Espace communauté</p>
            <h3>Encouragements et avis</h3>
          </div>
          <button class="like-button" type="button" data-like-button>J’aime <span data-like-count>0</span></button>
        </div>
        <div class="comment-list" data-comment-list>Chargement des commentaires...</div>
        <form class="comment-form" data-comment-form>
          <div>
            <label>Nom</label>
            <input name="authorName" autocomplete="name" placeholder="Anonyme" />
          </div>
          <div class="full">
            <label>Commentaire</label>
            <textarea name="content" rows="3" maxlength="700" required placeholder="Un encouragement, une remarque constructive..."></textarea>
          </div>
          <div class="full">
            <button class="btn-solid" type="submit">Publier</button>
            <p class="form-message" data-comment-message role="status"></p>
          </div>
        </form>
      </section>
    `;
  };
  const initEngagementPanel = (panel) => {
    if (!panel || panel.dataset.ready === '1') return;
    panel.dataset.ready = '1';
    const slug = panel.dataset.itemSlug || '';
    const likeButton = panel.querySelector('[data-like-button]');
    const likeCount = panel.querySelector('[data-like-count]');
    const commentList = panel.querySelector('[data-comment-list]');
    const form = panel.querySelector('[data-comment-form]');
    const commentMessage = panel.querySelector('[data-comment-message]');
    const visitorKey = getVisitorKey();

    const setCommentMessage = (text, tone = '') => {
      if (!commentMessage) return;
      commentMessage.textContent = text || '';
      commentMessage.dataset.tone = tone;
    };

    const renderComments = (comments = []) => {
      if (!commentList) return;
      if (!comments.length) {
        commentList.textContent = 'Aucun avis visible pour le moment.';
        return;
      }
      commentList.innerHTML = comments
        .map((comment) => `
          <article class="comment-item">
            <strong>${escapeHtml(comment.authorName || 'Anonyme')}</strong>
            <time>${escapeHtml(formatDate(comment.createdAt))}</time>
            <p>${escapeHtml(comment.content || '')}</p>
          </article>
        `)
        .join('');
    };

    const renderEngagement = (data = {}) => {
      if (likeCount) likeCount.textContent = Number(data.likes || 0);
      if (likeButton) {
        likeButton.classList.toggle('is-liked', !!data.liked);
        likeButton.dataset.liked = data.liked ? '1' : '0';
      }
      renderComments(Array.isArray(data.comments) ? data.comments : []);
    };

    const loadEngagement = async () => {
      try {
        const res = await fetch(`/api/qi26/engagement/${encodeURIComponent(slug)}?visitorKey=${encodeURIComponent(visitorKey)}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        renderEngagement(data);
      } catch {}
    };

    likeButton?.addEventListener('click', async () => {
      const liked = likeButton.dataset.liked === '1';
      try {
        const res = await fetch(`/api/qi26/engagement/${encodeURIComponent(slug)}/like`, {
          method: liked ? 'DELETE' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visitorKey })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) renderEngagement({ ...data, comments: [] });
        await loadEngagement();
      } catch {}
    });

    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      setCommentMessage('Envoi en cours...');
      const payload = Object.fromEntries(new FormData(form).entries());
      payload.visitorKey = visitorKey;
      try {
        const res = await fetch(`/api/qi26/engagement/${encodeURIComponent(slug)}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setCommentMessage(data.message || 'Commentaire non envoyé.', 'error');
          return;
        }
        form.reset();
        setCommentMessage(data.message || 'Merci pour votre contribution.', 'success');
        await loadEngagement();
      } catch {
        setCommentMessage('Réseau indisponible. Merci de réessayer.', 'error');
      }
    });

    loadEngagement();
  };
  const initEngagementPanels = (root = document) => {
    root.querySelectorAll('[data-qi26-engagement]').forEach(initEngagementPanel);
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
              <p class="kicker">Présentation vidéo</p>
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
        : `${fields.map(([label, value]) => `<p><strong>${escapeHtml(label)} :</strong> ${escapeHtml(value)}</p>`).join('')}<p>La fiche de ce finaliste sera complétée par le comité d’organisation.</p>`;

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
        ${buildEngagementPanel(data.slug, data.name)}
      `;
      startBrandedVideo(profileOutput.querySelector('[data-branded-video]'));
      initEngagementPanels(profileOutput);
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
  const pageEngagementSlug = document.body?.dataset.qi26EngagementSlug || '';
  if (pageEngagementSlug && !document.querySelector('[data-qi26-engagement]')) {
    const anchor = document.querySelector('.profile-page-card .share-actions');
    const title = document.body?.dataset.qi26EngagementTitle || document.querySelector('h1')?.textContent || '';
    anchor?.insertAdjacentHTML('afterend', buildEngagementPanel(pageEngagementSlug, title));
  }
  initEngagementPanels();
})();
