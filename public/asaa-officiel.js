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
      const data = button.dataset;
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
        ? `<p><a class="poster-link inline" href="${data.poster}" target="_blank" rel="noopener">Voir l’affiche officielle</a></p>`
        : '';
      const details = fields.length > 1
        ? fields.map(([label, value]) => `<p><strong>${label} :</strong> ${value}</p>`).join('')
        : `${fields.map(([label, value]) => `<p><strong>${label} :</strong> ${value}</p>`).join('')}<p>La fiche détaillée de ce finaliste n’a pas encore été publiée par le comité d’organisation.</p>`;

      profileOutput.innerHTML = `
        <p class="kicker">Profil sélectionné</p>
        <h2>${data.name || ''}</h2>
        <div class="profile-detail-list">
          ${details}
        </div>
        ${posterLink}
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
