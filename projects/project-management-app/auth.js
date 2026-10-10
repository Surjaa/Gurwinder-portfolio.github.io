/* =====================================================================
   PROJECT MANAGEMENT APPLICATION — auth.js
   Login + sign-up screen with animation, and the account logic behind it.

   IMPORTANT: this is a browser-only demo. Accounts live in this
   browser's localStorage (passwords are salted and hashed, but there is
   no server). It is perfect for a portfolio, not for real user data.
   To go real, replace signup(), login() and logout() with calls to a
   backend (Firebase Auth, Supabase, your own API).
   ===================================================================== */

const Auth = (() => {
  const USERS_KEY = 'pm-app.auth.v1';
  const SESSION_KEY = 'pm-app.session.v1';
  const DEMO = { name: 'Demo Visitor', email: 'demo@pm-app.dev', password: 'Demo@123' };
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let current = null;           // the signed-in user (or guest)
  let onReady = () => {};       // set by app.js: draw the app after login
  let embers = null, timers = [], busy = false, fails = 0, lockUntil = 0;

  /* ---------- Storage that never crashes (previews can block it) ---------- */
  const mem = {};
  const st = {
    get(k, sess) {
      let v = null;
      try { v = (sess ? sessionStorage : localStorage).getItem(k); } catch (e) { /* blocked */ }
      return v !== null ? v : (mem[(sess ? 's:' : 'l:') + k] || null);
    },
    set(k, v, sess) {
      try { (sess ? sessionStorage : localStorage).setItem(k, v); } catch (e) { mem[(sess ? 's:' : 'l:') + k] = v; }
    },
    del(k) {
      ['s', 'l'].forEach(t => { try { (t === 's' ? sessionStorage : localStorage).removeItem(k); } catch (e) { /* blocked */ } delete mem[t + ':' + k]; });
    }
  };
  const readDB = () => { try { const d = JSON.parse(st.get(USERS_KEY)); if (d && Array.isArray(d.users)) return d; } catch (e) { /* ignore */ } return { users: [] }; };
  const writeDB = d => st.set(USERS_KEY, JSON.stringify(d));

  /* ---------- Password hashing (PBKDF2 when available) ---------- */
  const enc = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
  const hex = buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  async function derive(pw, salt) {
    try {
      if (enc && window.crypto && crypto.subtle) {
        const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
        const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' }, key, 256);
        return 'p1:' + hex(bits);
      }
    } catch (e) { /* fall through */ }
    let h = 5381; const s = salt + pw;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return 'w1:' + (h >>> 0).toString(16);
  }

  /* ---------- Account actions ---------- */
  async function signup({ name, email, password, seed }) {
    const db = readDB();
    email = email.trim().toLowerCase();
    if (db.users.some(u => u.email === email)) return { ok: false, field: 'email', msg: 'That email already has an account. Try logging in.' };
    const salt = uid() + uid();
    const user = { id: 'u' + uid(), name: name.trim(), email, salt, hash: await derive(password, salt), created: Date.now(), seed: !!seed };
    db.users.push(user); writeDB(db);
    return { ok: true, user };
  }
  async function login({ email, password }) {
    const user = readDB().users.find(u => u.email === email.trim().toLowerCase());
    if (!user) return { ok: false, field: 'email', msg: 'No account found for that email.', missing: true };
    if (await derive(password, user.salt) !== user.hash) return { ok: false, field: 'password', msg: 'That password is not right.' };
    return { ok: true, user };
  }
  async function ensureDemoAccount() {
    const db = readDB();
    if (db.users.some(u => u.email === DEMO.email)) return;
    await signup({ name: DEMO.name, email: DEMO.email, password: DEMO.password, seed: true });
  }

  function setSession(user, remember) {
    st.del(SESSION_KEY);
    st.set(SESSION_KEY, JSON.stringify({ id: user.id }), !remember);
  }
  function restore() {
    try {
      const raw = st.get(SESSION_KEY) || st.get(SESSION_KEY, true);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (s.id === 'guest') return guestUser();
      return readDB().users.find(u => u.id === s.id) || null;
    } catch (e) { return null; }
  }
  const guestUser = () => ({ id: 'guest', name: 'Guest', email: '', seed: true, guest: true });

  // Each account gets its own private workspace in this browser
  function enter(user) {
    current = user;
    const key = user.guest ? 'pm-app.v1' : 'pm-app.v1.' + user.id;
    openWorkspace(key, { name: user.name, empty: !user.seed });
  }

  function logout() {
    st.del(SESSION_KEY);
    current = null;
  }

  /* ---------- Small DOM helpers ---------- */
  const $a = (s, r) => (r || document).querySelector(s);
  const $$a = (s, r) => Array.from((r || document).querySelectorAll(s));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };

  /* ---------- Markup ---------- */
  const flame = (s) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.6 2.2c.4 3.2 2.1 4.9 3.9 6.7 1.7 1.7 3.2 3.4 3.2 6.2A7.7 7.7 0 0 1 12 22.8a7.7 7.7 0 0 1-7.7-7.7c0-2.2 1-4 2.3-5.3.2 1.5 1 2.5 2.1 2.9-.5-3.6.8-7.1 3.9-10.5z"/></svg>`;

  function field(form, id, label, type, auto) {
    return `<div class="fl" data-field="${id}">
      <input id="${form}-${id}" name="${id}" type="${type}" placeholder=" " autocomplete="${auto}" ${type === 'email' ? 'autocapitalize="off" spellcheck="false"' : ''}>
      <label for="${form}-${id}">${label}</label>
      ${type === 'password' ? '<button type="button" class="eye" data-toggle-pw aria-label="Show password" tabindex="-1">Show</button>' : ''}
      <span class="err" role="alert"></span></div>`;
  }

  function markup() {
    const minis = [['Fix checkout link', 88], ['Design homepage hero', 52], ['Write launch email', 18]]
      .map(([t, h], i) => `<div class="mc" data-heat="${h}" style="animation-delay:${i * .7}s"><span>${t}</span><b>${h}</b></div>`).join('');
    return `
    <div class="auth-bg"><canvas id="auth-canvas" aria-hidden="true"></canvas></div>
    <div class="auth-shell">
      <section class="auth-hero">
        <div class="auth-brand">${flame(30)}<span>Project Management Application</span></div>
        <h1>See what needs you first.</h1>
        <p class="lead">Every task here glows hotter as it gets more urgent. Log in to pick up where your board left off.</p>
        <div class="mini" aria-hidden="true">${minis}</div>
        <ul class="auth-points">
          <li>Cards heat up as deadlines close in</li>
          <li>Rewind the whole board with the Time Machine</li>
          <li>Write today's standup in one click</li>
        </ul>
      </section>
      <section class="auth-side">
        <div class="auth-card" id="auth-card">
          <div class="seg" role="tablist" aria-label="Log in or sign up" style="--i:0">
            <span class="thumb"></span>
            <button type="button" role="tab" data-tab="login" aria-selected="true">Log in</button>
            <button type="button" role="tab" data-tab="signup" aria-selected="false">Sign up</button>
          </div>

          <div class="auth-forms">
            <form class="aform active" data-aform="login" novalidate aria-label="Log in">
              ${field('login', 'email', 'Email', 'email', 'username')}
              ${field('login', 'password', 'Password', 'password', 'current-password')}
              <div class="row-between">
                <label class="check"><input type="checkbox" name="remember" checked><span>Keep me signed in</span></label>
                <button type="button" class="linkish" data-forgot>Forgot password?</button>
              </div>
              <p class="note-forgot" hidden>This is a browser-only demo, so there is no email reset. Use the demo account, continue as guest, or sign up with another email.</p>
              <p class="form-err" role="alert"></p>
              <button class="abtn primary" type="submit"><span class="lbl">Log in</span><i class="spin"></i></button>
            </form>

            <form class="aform" data-aform="signup" novalidate aria-label="Create account">
              ${field('signup', 'name', 'Full name', 'text', 'name')}
              ${field('signup', 'email', 'Email', 'email', 'email')}
              <div>
                ${field('signup', 'password', 'Password', 'password', 'new-password')}
                <div class="pw-heat" aria-live="polite">
                  <div class="pw-bar"><i></i></div>
                  <div class="pw-info"><b>Type a password</b><span>Cool means strong</span></div>
                  <ul class="pw-rules"><li data-r="len">8+ characters</li><li data-r="case">Upper and lower case</li><li data-r="num">A number</li><li data-r="sym">A symbol</li></ul>
                </div>
              </div>
              ${field('signup', 'confirm', 'Confirm password', 'password', 'new-password')}
              <label class="check"><input type="checkbox" name="seed" checked><span>Fill my workspace with demo projects</span></label>
              <p class="form-err" role="alert"></p>
              <button class="abtn primary" type="submit"><span class="lbl">Create account</span><i class="spin"></i></button>
            </form>
          </div>

          <div class="auth-or"><span>or</span></div>
          <div class="auth-alt">
            <button type="button" class="abtn ghost" data-demo>Try the demo account</button>
            <button type="button" class="abtn ghost" data-guest>Continue as guest</button>
          </div>
          <p class="auth-fine">Browser-only demo. Accounts are stored on this device, not on a server.</p>

          <div class="auth-success" aria-live="polite">
            <div class="ok-flame"><span class="ring"></span><span class="ring r2"></span>${flame(56)}</div>
            <h2 id="ok-title">Welcome</h2>
            <p>Lighting up your board…</p>
          </div>
        </div>
      </section>
    </div>`;
  }

  /* ---------- Ember particles (canvas) ---------- */
  function startEmbers(canvas) {
    const none = { burst() {}, stop() {} };
    if (reduceMotion || !canvas.getContext) return none;
    const ctx = canvas.getContext('2d');
    if (!ctx) return none;
    let w = 0, h = 0, raf = 0, running = true;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const mouse = { x: -9999, y: -9999 };
    const sprite = document.createElement('canvas'); sprite.width = sprite.height = 64;
    const sc = sprite.getContext('2d');
    if (!sc) return none;
    const g = sc.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,224,170,1)'); g.addColorStop(.28, 'rgba(255,128,64,.8)'); g.addColorStop(1, 'rgba(255,60,20,0)');
    sc.fillStyle = g; sc.fillRect(0, 0, 64, 64);

    const resize = () => { w = innerWidth; h = innerHeight; canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize();
    const make = (burst, x, y) => {
      const p = { x: Math.random() * w, y: h + Math.random() * 60, s: 6 + Math.random() * 16, vx: (Math.random() - .5) * .3, vy: -(.25 + Math.random() * .8), sw: Math.random() * 6.28, life: 0, max: 420 + Math.random() * 420, burst: false, glow: 1 };
      if (burst) {
        const a = Math.random() * 6.28, sp = 2 + Math.random() * 5;
        Object.assign(p, { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1, max: 60 + Math.random() * 50, s: 8 + Math.random() * 18, burst: true });
      }
      return p;
    };
    const P = [];
    const count = innerWidth < 700 ? 38 : 85;
    for (let i = 0; i < count; i++) { const p = make(); p.y = Math.random() * h; p.life = Math.random() * p.max; P.push(p); }

    const move = e => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const leave = () => { mouse.x = mouse.y = -9999; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerleave', leave);
    window.addEventListener('resize', resize);

    (function frame() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i]; p.life++; p.sw += .02;
        if (p.burst) { p.vx *= .96; p.vy = p.vy * .96 + .03; } else { p.x += Math.sin(p.sw) * .35; }
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
        if (d < 150 && d > 0) { const f = (150 - d) / 150; p.x += dx / d * f * 2.2; p.y += dy / d * f * 2.2; p.glow = 1 + f * 1.3; } else p.glow = 1;
        p.x += p.vx; p.y += p.vy;
        const t = Math.min(1, p.life / p.max);
        ctx.globalAlpha = Math.max(0, Math.sin(t * Math.PI) * (p.burst ? 1 : .75));
        const s = p.s * p.glow;
        ctx.drawImage(sprite, p.x - s / 2, p.y - s / 2, s, s);
        if (p.life >= p.max || p.y < -40) { if (p.burst) P.splice(i, 1); else P[i] = make(); }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    })();

    return {
      burst(x, y, n) { for (let i = 0; i < (n || 60); i++) P.push(make(true, x, y)); },
      stop() { running = false; cancelAnimationFrame(raf); window.removeEventListener('pointermove', move); window.removeEventListener('pointerleave', leave); window.removeEventListener('resize', resize); }
    };
  }

  /* ---------- Validation ---------- */
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const rules = {
    name: v => v.trim().length >= 2 ? '' : 'Enter your full name.',
    email: v => EMAIL.test(v.trim()) ? '' : 'Enter a valid email, like you@example.com.',
    password: (v, form) => form.dataset.aform === 'login' ? (v ? '' : 'Enter your password.') : (v.length >= 8 ? '' : 'Use at least 8 characters.'),
    confirm: (v, form) => v === form.elements.password.value ? '' : 'The passwords do not match.'
  };
  function setError(box, msg) {
    box.classList.toggle('invalid', !!msg);
    box.classList.toggle('valid', !msg && box.querySelector('input').value !== '');
    box.querySelector('.err').textContent = msg;
    box.querySelector('input').setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  function checkField(box, form) {
    const input = box.querySelector('input');
    const fn = rules[box.dataset.field];
    const msg = fn ? fn(input.value, form) : '';
    setError(box, msg);
    return !msg;
  }

  // Password "heat": a weak password is HOT (red), a strong one is COOL (teal).
  function passwordHeat(pw) {
    const has = { len: pw.length >= 8, case: /[a-z]/.test(pw) && /[A-Z]/.test(pw), num: /\d/.test(pw), sym: /[^A-Za-z0-9]/.test(pw) };
    let score = Math.min(40, pw.length * 4) + (has.case ? 20 : 0) + (has.num ? 20 : 0) + (has.sym ? 20 : 0);
    if (/^(password|12345|qwerty|letmein|admin)/i.test(pw) || /(.)\1{3,}/.test(pw)) score = Math.min(score, 15);
    score = Math.min(100, score);
    return { has, risk: pw ? 100 - score : 100 };
  }

  /* ---------- Show / hide the screen ---------- */
  function show(opts) {
    opts = opts || {};
    hide(true);
    busy = false; fails = 0;
    const root = document.createElement('div');
    root.className = 'auth'; root.id = 'auth';
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Log in or sign up');
    root.innerHTML = markup();
    document.body.appendChild(root);
    document.body.classList.add('locked');
    $a('#app').classList.add('is-locked');
    try { $a('#app').setAttribute('inert', ''); } catch (e) { /* ignore */ }

    embers = startEmbers($a('#auth-canvas', root));
    bind(root);
    animateMinis(root);
    if (opts.message) { const e = $a('[data-aform="login"] .form-err', root); e.textContent = opts.message; e.classList.add('info'); }
    later(() => { const f = $a('#login-email', root); if (f) f.focus(); }, 350);
  }

  function hide(instant) {
    timers.forEach(clearTimeout); timers = [];
    if (embers) { embers.stop(); embers = null; }
    const root = $a('#auth');
    if (root) root.remove();
    if (instant !== true) { document.body.classList.remove('locked'); }
  }

  function unlockApp() {
    const app = $a('#app');
    app.classList.remove('is-locked');
    try { app.removeAttribute('inert'); } catch (e) { /* ignore */ }
    document.body.classList.remove('locked');
  }

  /* ---------- Behaviour ---------- */
  function bind(root) {
    const card = $a('#auth-card', root);
    const seg = $a('.seg', root);

    function setTab(name, focus) {
      seg.style.setProperty('--i', name === 'signup' ? 1 : 0);
      $$a('[data-tab]', root).forEach(b => b.setAttribute('aria-selected', b.dataset.tab === name));
      $$a('.aform', root).forEach(f => f.classList.toggle('active', f.dataset.aform === name));
      $$a('.form-err', root).forEach(e => { e.textContent = ''; e.classList.remove('info'); });
      if (focus !== false) later(() => { const f = $a(`.aform.active input`, root); if (f) f.focus(); }, 60);
    }
    const shake = () => { card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); };
    const formErr = (form, msg, withLink) => {
      const e = $a('.form-err', form); e.classList.remove('info');
      e.innerHTML = esc(msg) + (withLink ? ' <button type="button" class="linkish" data-goto-signup>Create one</button>' : '');
    };

    root.addEventListener('click', e => {
      const t = e.target;
      const tab = t.closest('[data-tab]'); if (tab) { setTab(tab.dataset.tab); return; }
      if (t.closest('[data-goto-signup]')) {
        const em = $a('#login-email', root).value; setTab('signup');
        const s = $a('#signup-email', root); if (em) { s.value = em; s.dispatchEvent(new Event('input')); }
        return;
      }
      const eye = t.closest('[data-toggle-pw]');
      if (eye) {
        const input = $a('input', eye.parentElement); const showing = input.type === 'text';
        input.type = showing ? 'password' : 'text'; eye.textContent = showing ? 'Show' : 'Hide';
        eye.setAttribute('aria-label', showing ? 'Show password' : 'Hide password'); input.focus(); return;
      }
      if (t.closest('[data-forgot]')) { const n = $a('.note-forgot', root); n.hidden = !n.hidden; return; }
      if (t.closest('[data-demo]')) { runDemo(root, setTab, shake); return; }
      if (t.closest('[data-guest]')) { if (!busy) { busy = true; const g = guestUser(); setSession(g, false); finish(root, g, true, 'Welcome, guest'); } }
    });

    // live validation + password heat
    root.addEventListener('input', e => {
      const box = e.target.closest('.fl'); if (!box) return;
      const form = box.closest('form');
      if (box.classList.contains('invalid') || box.classList.contains('valid')) checkField(box, form);
      if (form.dataset.aform === 'signup' && box.dataset.field === 'password') {
        updateHeat(form);
        const c = $a('[data-field="confirm"]', form); if (c.querySelector('input').value) checkField(c, form);
      }
    });
    root.addEventListener('focusout', e => {
      const box = e.target.closest && e.target.closest('.fl');
      if (box && e.target.value !== '' && !e.relatedTarget?.closest?.('[data-toggle-pw]')) checkField(box, box.closest('form'));
    });
    root.addEventListener('keydown', e => {
      if (e.target.type === 'password' && e.getModifierState) {
        const box = e.target.closest('.fl'); box.classList.toggle('caps', e.getModifierState('CapsLock'));
      }
    });

    $$a('.aform', root).forEach(form => form.addEventListener('submit', async e => {
      e.preventDefault();
      if (busy) return;
      const boxes = $$a('.fl', form);
      const bad = boxes.filter(b => !checkField(b, form));
      if (bad.length) { shake(); bad[0].querySelector('input').focus(); return; }
      if (Date.now() < lockUntil) { formErr(form, `Too many tries. Wait ${Math.ceil((lockUntil - Date.now()) / 1000)} seconds.`); shake(); return; }

      busy = true;
      const btn = $a('.abtn.primary', form); btn.classList.add('loading'); btn.disabled = true;
      const f = form.elements;
      let res;
      try {
        const [r] = await Promise.all([
          form.dataset.aform === 'login'
            ? login({ email: f.email.value, password: f.password.value })
            : signup({ name: f.name.value, email: f.email.value, password: f.password.value, seed: f.seed.checked }),
          wait(700)
        ]);
        res = r;
      } catch (err) { res = { ok: false, msg: 'Something went wrong. Please try again.' }; }
      btn.classList.remove('loading'); btn.disabled = false;

      if (!res.ok) {
        busy = false; shake();
        if (res.field && !res.missing) setError($a(`[data-field="${res.field}"]`, form), res.msg);
        if (form.dataset.aform === 'login' && res.field === 'password') { if (++fails >= 5) { lockUntil = Date.now() + 30000; fails = 0; formErr(form, 'Too many tries. Please wait 30 seconds.'); } }
        else if (res.missing) formErr(form, 'No account with that email yet.', true);
        else if (!res.field) formErr(form, res.msg);
        const first = $a('.fl.invalid input', form); if (first) first.focus();
        return;
      }
      const remember = form.dataset.aform === 'signup' ? true : f.remember.checked;
      setSession(res.user, remember);
      finish(root, res.user, true, form.dataset.aform === 'signup' ? `Welcome, ${res.user.name.split(' ')[0]}` : `Welcome back, ${res.user.name.split(' ')[0]}`);
    }));

    // 3D tilt that follows the pointer (desktop only)
    const side = $a('.auth-side', root);
    if (!reduceMotion) {
      side.addEventListener('pointermove', e => {
        if (innerWidth < 900 || card.classList.contains('shake')) return;
        const r = side.getBoundingClientRect();
        const dx = (e.clientX - r.left) / r.width - .5, dy = (e.clientY - r.top) / r.height - .5;
        card.style.transform = `perspective(1000px) rotateY(${dx * 5}deg) rotateX(${-dy * 5}deg)`;
      });
      side.addEventListener('pointerleave', () => { card.style.transform = ''; });
    }
  }

  function updateHeat(form) {
    const pw = form.elements.password.value;
    const { has, risk } = passwordHeat(pw);
    const bar = $a('.pw-bar i', form), info = $a('.pw-info', form);
    bar.style.width = pw ? Math.max(8, risk) + '%' : '0%';
    bar.style.setProperty('--h', heatColor(risk));
    const label = !pw ? ['Type a password', 'Cool means strong'] : risk >= 75 ? ['Blazing: easy to guess', 'Add length and variety'] : risk >= 50 ? ['Hot: getting there', 'Try a symbol or more letters'] : risk >= 25 ? ['Warm: almost there', 'One more touch'] : ['Cool: strong password', 'Nicely done'];
    info.innerHTML = `<b style="color:${pw ? heatColor(risk) : 'inherit'}">${label[0]}</b><span>${label[1]}</span>`;
    $$a('.pw-rules li', form).forEach(li => li.classList.toggle('ok', !!has[li.dataset.r]));
  }

  // The "Try the demo account" button types the details for you, then logs in
  async function runDemo(root, setTab, shake) {
    if (busy) return;
    busy = true;
    setTab('login', false);
    const form = $a('[data-aform="login"]', root);
    const em = form.elements.email, pw = form.elements.password;
    em.value = ''; pw.value = '';
    $$a('.fl', form).forEach(b => b.classList.remove('invalid', 'valid'));
    const type = async (input, text) => {
      input.focus();
      for (const ch of text) { input.value += ch; input.dispatchEvent(new Event('input', { bubbles: true })); await wait(reduceMotion ? 0 : 45); }
    };
    await type(em, DEMO.email); await wait(200); await type(pw, DEMO.password); await wait(250);
    busy = false;
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  }

  // Success moment: embers burst, flame appears, then the app fades in
  function finish(root, user, fresh, title) {
    const card = $a('#auth-card', root);
    enter(user);
    $a('#ok-title', root).textContent = title;
    card.style.transform = '';
    card.classList.add('done');
    const r = card.getBoundingClientRect();
    if (embers) embers.burst(r.left + r.width / 2, r.top + r.height / 2, 90);
    later(() => {
      unlockApp();
      onReady(fresh);
      root.classList.add('leaving');
      later(() => { hide(); busy = false; }, 650);
    }, reduceMotion ? 100 : 1250);
  }

  // The little heat cards on the left cycle through temperatures
  function animateMinis(root) {
    $$a('.mc', root).forEach(el => {
      let cur = Number(el.dataset.heat), target = cur;
      const num = $a('b', el);
      const paint = () => {
        el.style.setProperty('--h', heatColor(cur));
        el.style.boxShadow = cur > 70 ? `0 0 24px -4px ${heatColor(cur)}` : 'none';
        num.textContent = Math.round(cur); num.style.color = heatColor(cur);
      };
      paint();
      if (reduceMotion) return;
      const step = setInterval(() => { if (Math.abs(cur - target) < 1) return; cur += Math.sign(target - cur) * 1.6; paint(); }, 30);
      const pick = setInterval(() => { target = 8 + Math.random() * 90; }, 1800 + Math.random() * 900);
      timers.push(step, pick);
    });
  }

  /* ---------- Public API ---------- */
  return {
    async init() { await ensureDemoAccount(); return restore(); },
    user: () => current,
    set onReady(fn) { onReady = fn; },
    resume(user) { enter(user); },
    show, hide, logout, unlockApp
  };
})();
