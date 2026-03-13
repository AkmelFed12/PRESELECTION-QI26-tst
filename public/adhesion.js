const membershipForm = document.getElementById('membershipForm');
const membershipStatus = document.getElementById('membershipStatus');

function setMembershipStatus(text, ok = false) {
  if (!membershipStatus) return;
  membershipStatus.textContent = text;
  membershipStatus.style.color = ok ? '#0b6f4f' : '';
}

membershipForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(membershipForm).entries());
  const message = [
    `Demande d'adhésion ASAA`,
    `Nom: ${payload.fullName || ''}`,
    `Téléphone: ${payload.phone || ''}`,
    `Commune: ${payload.city || ''}`,
    `Motivation: ${payload.message || ''}`
  ].join('\n');

  if (!payload.fullName || !payload.email) {
    setMembershipStatus('Nom et email obligatoires.');
    return;
  }
  setMembershipStatus('Envoi en cours...');
  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: payload.fullName,
        email: payload.email,
        subject: "Demande d'adhésion ASAA",
        message
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMembershipStatus(data.message || 'Erreur lors de l’envoi.');
      return;
    }
    setMembershipStatus('Demande envoyée avec succès.', true);
    membershipForm.reset();
  } catch {
    setMembershipStatus('Erreur réseau, réessayez.');
  }
});
