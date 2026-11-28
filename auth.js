/* ASS sign-in, shared by the Studios page and the Pinboard.
   Prototype: the session lives in this browser and there is no password. The real system signs students in
   with their KMITL Google account on a server; this file is where that hooks in. */
(() => {
  const KEY = 'ass-session-v1';
  const KNOWN = {'66070123': 'Ploy Srisuk'};   // prototype directory; the real one comes from the university account
  const get = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } };
  const set = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} };
  const clear = () => { try { localStorage.removeItem(KEY); } catch (e) {} };

  const css = `
.auth-shade{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:16px;background:rgba(15,17,21,.38);
  backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;transition:opacity .25s ease}
.auth-shade.solid{background:var(--auth-page)}
.auth-shade.show{opacity:1}
.auth-card{--a-bg:#FFFFFF;--a-fg:#111318;--a-muted:#5E636E;--a-rule:#D9DCE2;--a-accent:#1D4ED8;--a-err:#C8313A;
  width:min(400px,100%);background:var(--a-bg);color:var(--a-fg);border-radius:16px;padding:28px 26px 22px;display:grid;gap:14px;
  box-shadow:0 24px 60px rgba(15,17,21,.22),0 2px 6px rgba(15,17,21,.08);font:400 1rem/1.5 "Instrument Sans",system-ui,sans-serif;
  transform:translateY(8px) scale(.98);transition:transform .3s cubic-bezier(.2,.8,.2,1)}
.auth-shade.show .auth-card{transform:none}
.auth-card img{width:44px;height:44px}
.auth-card h2{margin:0;font-family:Fraunces,Georgia,serif;font-size:1.5rem;line-height:1.2;font-weight:700;letter-spacing:-.01em}
.auth-card p{margin:0}
.auth-card .why{color:var(--a-muted)}
.auth-card label{display:grid;gap:6px;font-size:.9rem;font-weight:600}
.auth-card input{font:inherit;font-size:1rem;padding:11px 12px;border:1px solid var(--a-rule);border-radius:10px;background:transparent;color:var(--a-fg)}
.auth-card input::placeholder{color:var(--a-muted);opacity:.55}
.auth-card input:focus{outline:2px solid var(--a-accent);outline-offset:1px;border-color:transparent}
.auth-card .err{color:var(--a-err);font-size:.9rem;min-height:1.35em}
.auth-card .row{display:flex;gap:10px;justify-content:flex-end;align-items:center;flex-wrap:wrap}
.auth-card button{font:inherit;font-weight:600;border:0;border-radius:10px;padding:11px 18px;cursor:pointer}
.auth-card .go{background:var(--a-accent);color:#fff}
.auth-card .go:hover{filter:brightness(1.08)}
.auth-card .cancel{background:transparent;color:var(--a-muted)}
.auth-card .cancel:hover{color:var(--a-fg)}
.auth-card .note{font-size:.82rem;color:var(--a-muted);border-top:1px solid var(--a-rule);padding-top:12px}
:root{--auth-page:#F3F4F6}
@media (prefers-color-scheme:dark){
  :root{--auth-page:#0C0E12}
  .auth-card{--a-bg:#171A20;--a-fg:#ECEDEF;--a-muted:#9AA0AB;--a-rule:#2C3038;--a-accent:#7C9BFF;--a-err:#FF7B83}
  .auth-card .go{color:#0F1115}
}
@media (prefers-reduced-motion:reduce){.auth-shade,.auth-card{transition:none}}`;

  /* Show the sign-in card. opts: {why, solid, cancel, root} → resolves with the session, or null if cancelled. */
  const ask = (opts = {}) => new Promise(done => {
    if (!document.getElementById('auth-css')) {
      const st = document.createElement('style'); st.id = 'auth-css'; st.textContent = css; document.head.appendChild(st);
    }
    const root = opts.root || '../';
    const shade = document.createElement('div');
    shade.className = 'auth-shade' + (opts.solid ? ' solid' : '');
    shade.innerHTML = `
      <form class="auth-card" role="dialog" aria-modal="true" aria-labelledby="auth-h" novalidate>
        <img src="${root}favicon.svg" alt="">
        <h2 id="auth-h">Sign in</h2>
        <p class="why">${opts.why || 'Sign in with your KMITL account to continue.'}</p>
        <label>KMITL email<input name="email" type="email" inputmode="email" autocomplete="username" placeholder="66070123@kmitl.ac.th" required></label>
        <p class="err" aria-live="polite"></p>
        <div class="row">${opts.cancel === false ? '' : '<button type="button" class="cancel">Cancel</button>'}<button class="go">Sign in</button></div>
        <p class="note">Prototype: no password yet. The real system signs you in with your KMITL Google account.</p>
      </form>`;
    document.body.appendChild(shade);
    const form = shade.querySelector('form'), input = form.email, err = form.querySelector('.err');
    requestAnimationFrame(() => shade.classList.add('show'));
    setTimeout(() => input.focus(), 60);
    const close = s => {
      shade.classList.remove('show');
      document.removeEventListener('keydown', onKey, true);
      setTimeout(() => shade.remove(), 260);
      done(s);
    };
    const onKey = e => { if (e.key === 'Escape' && opts.cancel !== false) { e.stopPropagation(); close(null); } };
    document.addEventListener('keydown', onKey, true);
    shade.querySelector('.cancel')?.addEventListener('click', () => close(null));
    form.addEventListener('submit', e => {
      e.preventDefault();
      const m = input.value.trim().match(/^(\d{8})@kmitl\.ac\.th$/i);
      if (!m) { err.textContent = 'Use your KMITL student email: your 8-digit student ID, then @kmitl.ac.th.'; input.focus(); return; }
      const s = {id: m[1], email: m[0].toLowerCase(), name: KNOWN[m[1]] || `Student ${m[1]}`, at: new Date().toISOString()};
      set(s); close(s);
    });
  });

  window.ASSAuth = {get, ask, signOut: clear};
})();
