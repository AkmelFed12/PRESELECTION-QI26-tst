const pollStatus = document.getElementById('pollStatus');
const pollOptions = document.getElementById('pollOptions');
const pollResults = document.getElementById('pollResults');

function renderResults(options, counts) {
  if (!pollResults || !pollOptions) return;
  pollResults.classList.remove('hidden');
  const total = options.reduce((acc, opt) => acc + (counts[opt] || 0), 0);
  pollResults.innerHTML = options
    .map((opt) => {
      const count = counts[opt] || 0;
      const pct = total ? Math.round((count / total) * 100) : 0;
      return `
        <div class="poll-result">
          <span>${opt}</span>
          <span>${count} (${pct}%)</span>
        </div>
      `;
    })
    .join('');
}

async function loadPoll() {
  if (!pollStatus || !pollOptions) return;
  pollStatus.textContent = 'Chargement du sondage...';
  try {
    const res = await fetch('/api/poll', { cache: 'no-store' });
    const data = await res.json();
    if (!data.poll) {
      pollStatus.textContent = 'Aucun sondage disponible.';
      return;
    }
    pollStatus.textContent = data.poll.question;
    const options = data.poll.options || [];
    pollOptions.innerHTML = options
      .map(
        (opt) =>
          `<button type="button" class="btn-link outline poll-option" data-option="${encodeURIComponent(opt)}">${opt}</button>`
      )
      .join('');

    renderResults(options, data.counts || {});
    pollOptions.addEventListener('click', async (e) => {
      const btn = e.target.closest('.poll-option');
      if (!btn) return;
      const option = decodeURIComponent(btn.dataset.option || '');
      if (!option) return;
      try {
        const voteRes = await fetch('/api/poll/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pollId: data.poll.id, option })
        });
        const voteData = await voteRes.json();
        if (!voteRes.ok) {
          pollStatus.textContent = voteData.error || 'Vote déjà enregistré.';
          return;
        }
        pollStatus.textContent = 'Merci pour votre vote !';
        renderResults(options, voteData.counts || {});
      } catch (error) {
        pollStatus.textContent = 'Erreur lors du vote.';
      }
    }, { once: true });
  } catch (error) {
    pollStatus.textContent = 'Erreur chargement du sondage.';
  }
}

loadPoll();
