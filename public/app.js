const registrationForm = document.getElementById('registrationForm');
const registerMsg = document.getElementById('registerMsg');
const voteForm = document.getElementById('voteForm');
const voteMsg = document.getElementById('voteMsg');

registrationForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = Object.fromEntries(new FormData(registrationForm).entries());

  const res = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });

  const data = await res.json();
  if (!res.ok) {
    registerMsg.textContent = data.message || 'Erreur lors de l’inscription.';
    return;
  }

  registerMsg.textContent = `${data.message} Redirection WhatsApp en cours...`;
  registrationForm.reset();
  setTimeout(() => {
    window.location.href = data.whatsappRedirect;
  }, 1000);
});

voteForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = Object.fromEntries(new FormData(voteForm).entries());

  const res = await fetch('/api/votes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });

  const data = await res.json();
  voteMsg.textContent = data.message || 'Vote enregistré.';
  if (res.ok) voteForm.reset();
});
