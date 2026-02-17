const donationForm = document.getElementById('donationForm');
let donationFetchInFlight = false;
let donationRefreshTimer = null;

donationForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const donorName = document.getElementById('donorName').value;
  const donorEmail = document.getElementById('donorEmail').value;
  const amount = document.getElementById('amount').value;
  const currency = document.getElementById('currency').value;
  const paymentMethod = document.getElementById('paymentMethod').value;
  const message = document.getElementById('message').value;

  const successMsg = document.getElementById('successMsg');
  const errorMsg = document.getElementById('errorMsg');
  successMsg.classList.remove('show');
  errorMsg.classList.remove('show');

  try {
    const response = await fetch('/api/donations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        donorName,
        donorEmail,
        amount: parseFloat(amount),
        currency,
        paymentMethod,
        message: message || null
      })
    });

    const data = await response.json();

    if (response.ok) {
      successMsg.textContent = `✅ Donation de ${amount} ${currency} enregistrée! Merci pour votre soutien. Complétez le paiement au numéro ${paymentMethod}.`;
      successMsg.classList.add('show');
      document.getElementById('donationForm').reset();
      setTimeout(loadDonations, 2000);
    } else {
      errorMsg.textContent = data.error || 'Erreur lors de l\'enregistrement';
      errorMsg.classList.add('show');
    }
  } catch (error) {
    console.error(error);
    errorMsg.textContent = 'Erreur serveur';
    errorMsg.classList.add('show');
  }
});

function copyToClipboard(elementId, methodName, button) {
  const element = document.getElementById(elementId);
  const text = element.textContent;
  
  navigator.clipboard.writeText(text).then(() => {
    const btn = button || document.activeElement;
    if (!btn) return;
    const originalText = btn.textContent;
    btn.textContent = '✅ Copié!';
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy:', err);
    alert(`Numéro: ${text}`);
  });
}

async function loadDonations() {
  if (donationFetchInFlight) return;
  donationFetchInFlight = true;
  try {
    const response = await fetch('/api/donations?limit=20', { cache: 'no-store' });
    const payload = await response.json();

    const donationsDiv = document.getElementById('donationsDiv');
    donationsDiv.innerHTML = '';

    const donations = Array.isArray(payload.items) ? payload.items : [];
    const summary = payload.summary || { totalDonations: 0, totalAmount: 0 };

    if (!donations.length) {
      donationsDiv.innerHTML = '<p style="color: #999;">Aucune donation enregistrée pour le moment.</p>';
      return;
    }

    let totalDonors = new Set();

    donations.forEach(donation => {
      totalDonors.add(donation.donorName);

      const donationHTML = `
        <div class="donation-item">
          <div class="donation-item-header">
            <span class="donation-item-name">${escapeHtml(donation.donorName)}</span>
            <span class="donation-item-amount">${donation.amount} ${donation.currency}</span>
          </div>
          <div class="donation-item-method">via ${donation.paymentMethod}</div>
          ${donation.message ? `<div class="donation-item-message">"${escapeHtml(donation.message)}"</div>` : ''}
        </div>
      `;
      donationsDiv.innerHTML += donationHTML;
    });

    // Add summary at the top
    const summaryHtml = `
      <div style="background: #E8F5E9; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center; border-left: 4px solid #4CAF50;">
        <strong style="color: #2E7D32; font-size: 18px;">Total: ${Number(summary.totalAmount || 0).toLocaleString('fr-FR')} FCA</strong><br>
        <span style="color: #666; font-size: 14px;">${summary.totalDonations || totalDonors.size} généreux donateurs</span>
      </div>
    `;
    donationsDiv.innerHTML = summaryHtml + donationsDiv.innerHTML;
  } catch (error) {
    console.error(error);
    document.getElementById('donationsDiv').innerHTML = '<p style="color: red;">Erreur chargement des donations</p>';
  } finally {
    donationFetchInFlight = false;
  }
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function startDonationRefresh() {
  if (donationRefreshTimer) clearInterval(donationRefreshTimer);
  donationRefreshTimer = setInterval(() => {
    if (!document.hidden) loadDonations();
  }, 60000);
}

// Load donations on page load
loadDonations();
startDonationRefresh();
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) loadDonations();
});
