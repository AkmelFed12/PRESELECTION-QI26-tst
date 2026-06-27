(function () {
  const STORAGE_KEY = 'asaa_qi26_regie_access';
  const CODE_HASH = 'e79fad339d11c58fc2e8218154eb120f2a637c46ff1cccbad8743ba46c6c170e';

  async function sha256(value) {
    const data = new TextEncoder().encode(String(value || '').trim());
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  function showGate() {
    const gate = document.createElement('div');
    gate.style.cssText = 'position:fixed;inset:0;z-index:99999;display:grid;place-items:center;background:#03251d;color:white;font-family:Manrope,Segoe UI,system-ui,sans-serif;padding:24px;';
    gate.innerHTML = `
      <form style="width:min(420px,100%);display:grid;gap:14px;border:1px solid rgba(255,255,255,.16);border-radius:8px;background:rgba(255,255,255,.08);padding:24px;">
        <img src="assets/logo.jpg" alt="Logo ASAA" style="width:64px;height:64px;border-radius:8px;object-fit:cover;border:2px solid #c99a35;" />
        <div>
          <p style="margin:0;color:#ffe7a3;font-weight:900;letter-spacing:.12em;text-transform:uppercase;font-size:.78rem;">Accès équipe</p>
          <h1 style="margin:8px 0 0;font-size:clamp(1.8rem,6vw,2.8rem);line-height:1;">Régie QI26</h1>
        </div>
        <label style="display:grid;gap:8px;font-weight:800;">Code régie
          <input name="code" type="password" autocomplete="current-password" autofocus style="min-height:46px;border:1px solid rgba(255,255,255,.22);border-radius:8px;padding:10px 12px;font:inherit;" />
        </label>
        <button type="submit" style="min-height:46px;border:0;border-radius:8px;background:#c99a35;color:#03251d;font:inherit;font-weight:950;cursor:pointer;">Entrer</button>
        <p data-error style="min-height:22px;margin:0;color:#ffd3d3;font-weight:800;"></p>
      </form>
    `;
    document.body.appendChild(gate);
    const form = gate.querySelector('form');
    const error = gate.querySelector('[data-error]');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const code = new FormData(form).get('code');
      if (await sha256(code) === CODE_HASH) {
        localStorage.setItem(STORAGE_KEY, '1');
        gate.remove();
      } else {
        error.textContent = 'Code incorrect.';
      }
    });
  }

  if (localStorage.getItem(STORAGE_KEY) !== '1') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showGate);
    else showGate();
  }
})();
