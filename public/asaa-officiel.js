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

  const profileOutput = document.querySelector('[data-finalist-profile]');
  document.querySelectorAll('[data-finalist]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!profileOutput) return;
      const name = button.getAttribute('data-name') || '';
      const commune = button.getAttribute('data-commune') || '';
      profileOutput.innerHTML = `
        <p class="kicker">Profil sélectionné</p>
        <h2>${name}</h2>
        <p>Commune de résidence : <strong>${commune}</strong></p>
        <p>Ce finaliste fait partie des dix candidats retenus pour la finale du Quiz Islamique 2026. Les scores détaillés seront publiés uniquement par l’équipe d’organisation.</p>
      `;
      profileOutput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
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
