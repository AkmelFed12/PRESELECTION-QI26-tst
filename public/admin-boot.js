(() => {
  const loginMsg = document.getElementById('loginMsg');
  if (loginMsg) {
    loginMsg.textContent = 'Chargement admin...';
  }

  const ensureScript = (src, onload, onerror) => {
    const existing = document.querySelector(`script[src^="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => onload?.());
      existing.addEventListener('error', () => onerror?.());
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.defer = true;
    s.onload = () => onload?.();
    s.onerror = () => onerror?.();
    document.body.appendChild(s);
  };

  ensureScript('utils.js?v=2.4.0', () => {
    ensureScript('admin.js?v=2.4.0', () => {
      if (loginMsg && loginMsg.textContent === 'Chargement admin...') {
        loginMsg.textContent = 'Prêt à se connecter.';
      }
    }, () => {
      if (loginMsg) loginMsg.textContent = 'Erreur chargement admin.js';
    });
  }, () => {
    if (loginMsg) loginMsg.textContent = 'Erreur chargement utils.js';
  });
})();
