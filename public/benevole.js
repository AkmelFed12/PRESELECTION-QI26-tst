const volunteerForm = document.getElementById('volunteerForm');
const volunteerMsg = document.getElementById('volunteerMsg');

volunteerForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  volunteerMsg.textContent = 'Envoi en cours...';
  const payload = Object.fromEntries(new FormData(volunteerForm).entries());
  payload.subject = 'Demande bénévole';
  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    volunteerMsg.textContent = data.message || (res.ok ? 'Merci, nous vous recontacterons.' : 'Erreur.');
    if (res.ok) volunteerForm.reset();
  } catch {
    volunteerMsg.textContent = 'Erreur réseau, réessayez.';
  }
});
