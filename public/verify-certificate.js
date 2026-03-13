const form = document.getElementById('verifyForm');
const codeInput = document.getElementById('verifyCode');
const resultBox = document.getElementById('verifyResult');

async function checkCertificateEnabled() {
  try {
    const res = await fetch('/api/public-settings?ts=' + Date.now(), { cache: 'no-store' });
    const data = await res.json();
    if (!data || !Number(data.certificatesEnabled)) {
      if (form) form.style.display = 'none';
      setResult('Vérification des certificats désactivée par l’administration.');
      return false;
    }
    return true;
  } catch {
    return true;
  }
}

function setResult(text, ok = false) {
  if (!resultBox) return;
  resultBox.textContent = text;
  resultBox.style.background = ok ? '#e8f7ef' : '';
  resultBox.style.color = ok ? '#0b6f4f' : '';
}

async function verifyCode(code) {
  if (!code) return;
  setResult('Vérification en cours...');
  try {
    const res = await fetch(`/api/public/verify-certificate?code=${encodeURIComponent(code)}`, { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.valid) {
      setResult(data.message || 'Certificat invalide.');
      return;
    }
    const c = data.candidate || {};
    setResult(`Certificat valide ✅ — ${c.fullName || 'Candidat'} (${c.city || ''})`, true);
  } catch {
    setResult('Erreur réseau, réessayez.');
  }
}

form?.addEventListener('submit', (e) => {
  e.preventDefault();
  verifyCode(codeInput?.value || '');
});

const params = new URLSearchParams(window.location.search);
checkCertificateEnabled().then((enabled) => {
  if (!enabled) return;
  if (params.get('code')) {
    if (codeInput) codeInput.value = params.get('code');
    verifyCode(params.get('code'));
  }
});
