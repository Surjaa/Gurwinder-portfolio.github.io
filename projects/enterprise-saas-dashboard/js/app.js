'use strict';
/* =====================================================================
   ENTERPRISE SAAS DASHBOARD - app.js  (vanilla JavaScript, no libraries, no build step)

   Table of contents
   1.  Helpers & storage
   2.  Fake data (seeded, so it looks the same every time)
   3.  Icons
   4.  State, theme, toasts, modals, dropdowns, forms
   5.  Charts (hand-made SVG)
   6.  Data table (search + sort + filter + pagination)
   7.  Live pulse engine (the signature feature)
   8.  Command palette + "ask the dashboard"
   9.  Pages
   10. Router, auth, boot
   ===================================================================== */

/* ---------- 1. HELPERS & STORAGE ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => '$' + Math.round(n).toLocaleString('en-US');
const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'k' : String(Math.round(n));
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const sum = (arr, k) => arr.reduce((t, x) => t + x[k], 0);
const pct = (a, b) => b ? ((a - b) / b) * 100 : 0;
const iso = d => d.toISOString().slice(0, 10);
const store = {
  get(k, d) { try { const v = localStorage.getItem('saas-dash.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('saas-dash.' + k, JSON.stringify(v)); } catch (e) { /* private mode: ignore */ } }
};
const ago = d => {
  const m = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return m + ' min ago';
  if (m < 1440) return Math.round(m / 60) + ' h ago';
  return Math.round(m / 1440) + ' d ago';
};
const shortDate = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const initials = n => n.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
const hue = n => [...n].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
const avatar = (name, cls = 'sm') => `<span class="avatar ${cls}" style="background:hsl(${hue(name)} 52% 42%)">${esc(initials(name))}</span>`;
const pill = (t, c = '') => `<span class="pill ${c}">${esc(t)}</span>`;
const head = (t, s, a = '') => `<div class="page-head"><div><h1>${t}</h1><p>${s}</p></div><div class="page-actions">${a}</div></div>`;
function downloadCSV(name, rows) {
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
}

/* ---------- 2. FAKE DATA ---------- */
function rng(seed) { // tiny seeded random generator
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const R = rng(42);
const pick = a => a[Math.floor(R() * a.length)];
const between = (a, b) => a + R() * (b - a);
const weighted = (items, weights) => { let r = R() * weights.reduce((a, b) => a + b, 0); for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; } return items[0]; };

const DAYS = 120;
const today = new Date(); today.setHours(0, 0, 0, 0);
const days = [];
for (let i = DAYS - 1; i >= 0; i--) {
  const d = new Date(today); d.setDate(d.getDate() - i);
  const idx = DAYS - 1 - i;
  const season = [.82, 1.05, 1.1, 1.08, 1.04, .98, .86][d.getDay()];
  const visitors = Math.round(between(2400, 3200) * season * (1 + idx * 0.0035));
  const orders = Math.round(visitors * (between(.026, .036) + idx * 0.00002));
  days.push({ date: d, label: shortDate(d), visitors, orders, revenue: Math.round(orders * between(78, 104)), newCust: Math.round(orders * between(.28, .4)) });
}

const FIRST = ['Maya', 'Liam', 'Noor', 'Arjun', 'Sofia', 'Kenji', 'Amara', 'Lucas', 'Priya', 'Omar', 'Elena', 'Tariq', 'Hana', 'Diego', 'Zoe', 'Ivan'];
const LAST = ['Chen', 'Patel', 'Okafor', 'Silva', 'Novak', 'Tanaka', 'Haddad', 'Walker', 'Rossi', 'Kim', 'Ortiz', 'Berg', 'Singh', 'Dubois', 'Cohen', 'Reyes'];
const COMPANIES = ['Northwind', 'Brightlane', 'Kestrel Labs', 'Harbor & Co', 'Lumen Retail', 'Fieldstone', 'Cobalt Works', 'Peakline', 'Orchard Row', 'Tandem', 'Blueprint Goods', 'Solace Home', 'Quarry Digital', 'Marlow', 'Evergreen Supply', 'Vantage'];
const COUNTRIES = [['CA', 'Canada', 0.07], ['UK', 'United Kingdom', 0.11], ['DE', 'Germany', 0.09], ['JP', 'Japan', 0.06], ['US', 'United States', 0.31], ['FR', 'France', 0.06], ['IN', 'India', 0.08], ['SG', 'Singapore', 0.03], ['MX', 'Mexico', 0.04], ['BR', 'Brazil', 0.07], ['NG', 'Nigeria', 0.02], ['AU', 'Australia', 0.06]];

const products = [
  ['Aero Buds Pro', 'AUD-101', 'Audio', 129, 340, 4.7], ['Studio Over-Ear', 'AUD-204', 'Audio', 219, 88, 4.8], ['Pocket Speaker', 'AUD-310', 'Audio', 59, 12, 4.3],
  ['Pulse Band 3', 'WER-110', 'Wearables', 89, 210, 4.4], ['Orbit Watch', 'WER-250', 'Wearables', 249, 64, 4.6], ['Sleep Ring', 'WER-330', 'Wearables', 179, 7, 4.2],
  ['Lumen Desk Lamp', 'HOM-120', 'Home', 74, 150, 4.5], ['Calm Diffuser', 'HOM-140', 'Home', 49, 260, 4.1], ['Brew Kettle', 'HOM-280', 'Home', 99, 45, 4.6],
  ['Snap Charger 65W', 'ACC-105', 'Accessories', 39, 500, 4.7], ['Trail Backpack', 'ACC-230', 'Accessories', 119, 33, 4.4], ['Slim Cable Pack', 'ACC-310', 'Accessories', 19, 18, 4.0]
].map((p, i) => ({ id: i + 1, name: p[0], sku: p[1], category: p[2], price: p[3], stock: p[4], rating: p[5], sold: Math.round(between(180, 1900)), status: p[4] < 20 ? 'Low stock' : 'In stock' }));

const customers = Array.from({ length: 64 }, (_, i) => {
  const name = FIRST[i % 16] + ' ' + LAST[Math.floor(i / 4) % 16];
  const status = weighted(['Active', 'Trial', 'Churned'], [70, 15, 15]);
  const joined = new Date(today); joined.setDate(joined.getDate() - Math.floor(between(5, 400)));
  const co = COMPANIES[(i * 7) % 16];
  const orders = Math.round(between(1, 38));
  return {
    id: i + 1, name, company: co, email: name.toLowerCase().replace(' ', '.') + '@' + co.toLowerCase().replace(/[^a-z]/g, '') + '.com',
    plan: weighted(['Starter', 'Growth', 'Scale'], [40, 40, 20]), status, joined, orders, spent: orders * Math.round(between(70, 190)),
    health: status === 'Churned' ? Math.round(between(8, 35)) : Math.round(between(40, 98)), country: pick(COUNTRIES)[1]
  };
});

let orderSeq = 2000;
const orders = Array.from({ length: 140 }, () => {
  const p = pick(products), qty = 1 + Math.floor(R() * 3), c = pick(customers);
  const date = new Date(Date.now() - between(3, 45 * 1440) * 60000);
  return { id: 'T-' + (++orderSeq), customer: c.name, product: p.name, qty, amount: p.price * qty, status: weighted(['Paid', 'Pending', 'Refunded', 'Failed'], [72, 13, 6, 9]), date, method: pick(['Visa', 'Mastercard', 'PayPal', 'Bank transfer']) };
}).sort((a, b) => b.date - a.date);

const team = [
  ['Alex Morgan', 'Owner', 'alex@saas-dash.dev', 'Active'], ['Jordan Lee', 'Admin', 'jordan@saas-dash.dev', 'Active'], ['Sam Rivera', 'Analyst', 'sam@saas-dash.dev', 'Active'],
  ['Riya Kapoor', 'Support', 'riya@saas-dash.dev', 'Active'], ['Chris Duval', 'Analyst', 'chris@saas-dash.dev', 'Away'], ['Mina Park', 'Support', 'mina@saas-dash.dev', 'Active'],
  ['Tobias Wren', 'Admin', 'tobias@saas-dash.dev', 'Invited'], ['Leila Haddad', 'Analyst', 'leila@saas-dash.dev', 'Active'], ['Pat Nguyen', 'Support', 'pat@saas-dash.dev', 'Away']
].map((t, i) => ({ id: i + 1, name: t[0], role: t[1], email: t[2], status: t[3], seen: new Date(Date.now() - between(2, 3000) * 60000) }));

const notes = [
  { id: 1, type: 'Orders', title: 'Large order received', body: 'Order T-2003 from Maya Chen is worth $657.', time: new Date(Date.now() - 12 * 60000), read: false },
  { id: 2, type: 'System', title: 'Nightly backup finished', body: 'Your workspace data was backed up at 02:00.', time: new Date(Date.now() - 6 * 3600000), read: false },
  { id: 3, type: 'Orders', title: 'Refund requested', body: 'Liam Patel asked for a refund on order T-2011.', time: new Date(Date.now() - 20 * 3600000), read: true },
  { id: 4, type: 'System', title: 'Jordan Lee joined your team', body: 'Jordan accepted the invite and now has Admin access.', time: new Date(Date.now() - 2 * 86400000), read: true },
  { id: 5, type: 'System', title: 'Invoice ready', body: 'Your invoice for last month is ready to download.', time: new Date(Date.now() - 4 * 86400000), read: true },
  { id: 6, type: 'Orders', title: 'Stock is running low', body: 'Sleep Ring has 7 units left. Reorder soon.', time: new Date(Date.now() - 5 * 86400000), read: false }
];

const threads = [
  { id: 1, name: 'Jordan Lee', role: 'Admin', msgs: [{ me: false, text: 'Did you see the jump in orders from Germany?', t: '09:12' }, { me: true, text: 'Yes. The email campaign is working.', t: '09:14' }, { me: false, text: 'Great. Should we double the budget?', t: '09:15' }], unread: 1 },
  { id: 2, name: 'Riya Kapoor', role: 'Support', msgs: [{ me: false, text: 'Three customers asked about shipping times today.', t: 'Yesterday' }], unread: 1 },
  { id: 3, name: 'Sam Rivera', role: 'Analyst', msgs: [{ me: false, text: 'The weekly report is ready for you.', t: 'Mon' }, { me: true, text: 'Thanks, I will read it this afternoon.', t: 'Mon' }], unread: 0 }
];

const FAQ = [
  ['Getting started', 'How do I invite my team?', 'Open Team, choose Invite member, enter an email and pick a role. They get a link that works for 7 days.'],
  ['Getting started', 'What is the business pulse score?', 'It is a number from 5 to 99 built from revenue growth, conversion change, churned customers and pending orders in the date range you picked.'],
  ['Getting started', 'How do I use the command palette?', 'Press Ctrl+K (Cmd+K on Mac). Type a page name to jump, an action to run it, or a question such as "top product".'],
  ['Billing', 'How do I change my plan?', 'Go to Subscription, pick a plan and confirm. Changes apply immediately and are prorated.'],
  ['Billing', 'Where can I download invoices?', 'Open Billing and use the Download button next to any invoice.'],
  ['Data', 'Why does my data look the same every time?', 'This demo uses seeded sample data. The live orders you see arriving are generated in your browser.'],
  ['Data', 'Can I export my orders?', 'Yes. On the Orders page choose Export CSV. The file includes every order in the table.'],
  ['Security', 'How do I change my password?', 'Open Settings, go to the Security tab and fill in the password form.'],
  ['Security', 'Is my data stored on a server?', 'No. This demo keeps your preferences in your own browser using localStorage.']
];

/* ---------- 3. ICONS ---------- */
const ICONS = {
  dashboard: 'M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z', analytics: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  customers: 'M16 8a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 21c0-4 3.6-7 8-7s8 3 8 7', orders: 'M6 2L4 7v14h16V7l-2-5zM4 7h16M9 11a3 3 0 0 0 6 0',
  products: 'M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8', team: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3 2.7-5 6-5s6 2 6 5M17 11a2.5 2.5 0 1 0 0-5M21 19c0-2.2-1.5-3.8-4-4.5',
  messages: 'M4 5h16v11H9l-5 4z', bell: 'M6 16v-5a6 6 0 1 1 12 0v5l2 2H4zM10 21h4', card: 'M3 6h18v12H3zM3 10h18', layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01', search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5',
  menu: 'M4 6h16M4 12h16M4 18h16', sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5',
  moon: 'M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z', plus: 'M12 5v14M5 12h14', x: 'M6 6l12 12M18 6L6 18', download: 'M12 3v12M7 10l5 5 5-5M4 21h16', user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-7 8-7s8 3 8 7'
};
const icon = n => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n]}"/></svg>`;

/* ---------- 4. STATE, THEME, TOASTS, MODALS, DROPDOWNS, FORMS ---------- */
const state = {
  user: store.get('auth', null),
  range: { preset: '30', from: iso(days[DAYS - 30].date), to: iso(days[DAYS - 1].date) },
  unread: notes.filter(n => !n.read).length,
  prefs: store.get('prefs', { workspace: 'Northwind Retail', timezone: 'UTC', email: true, push: true, weekly: false, orders: true })
};
const root = document.documentElement;

function applyTheme(mode) {
  store.set('theme', mode);
  const dark = mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  root.dataset.theme = dark ? 'dark' : 'light';
  const b = $('#themeBtn'); if (b) b.innerHTML = icon(dark ? 'sun' : 'moon');
}
const setAccent = a => { root.dataset.accent = a; store.set('accent', a); };
function toggleSidebar() {
  if (matchMedia('(max-width: 900px)').matches) { root.classList.toggle('nav-open'); return; }
  const next = root.dataset.sidebar === 'collapsed' ? 'open' : 'collapsed';
  root.dataset.sidebar = next; store.set('sidebar', next);
  setTimeout(redrawCharts, 230);
}

function toast(msg, kind = '') {
  const t = document.createElement('div'); t.className = 'toast ' + kind; t.textContent = msg;
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3600);
}

/* modal: openModal({title, body, primary:{label, fn}, secondary, wide}). fn returns false to keep it open */
let lastFocus = null;
function openModal(o) {
  closeModal(); lastFocus = document.activeElement;
  const wrap = document.createElement('div'); wrap.className = 'modal-back'; wrap.id = 'modalBack';
  wrap.innerHTML = `<div class="modal ${o.wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="mTitle">
    <div class="modal-head"><h3 id="mTitle">${esc(o.title)}</h3><button class="icon-btn" data-close aria-label="Close">${icon('x')}</button></div>
    <div class="modal-body">${o.body}</div>
    ${o.primary || o.secondary ? `<div class="modal-foot">${o.secondary === false ? '' : `<button class="btn" data-close>${o.secondary || 'Cancel'}</button>`}${o.primary ? `<button class="btn primary" id="mPrimary">${o.primary.label}</button>` : ''}</div>` : ''}
  </div>`;
  $('#overlay').appendChild(wrap);
  wrap.addEventListener('click', e => { if (e.target === wrap || e.target.closest('[data-close]')) closeModal(); });
  const p = $('#mPrimary', wrap);
  if (p) p.addEventListener('click', () => { if (o.primary.fn(wrap) !== false) closeModal(); });
  const form = $('form', wrap);
  if (form) form.addEventListener('submit', e => { e.preventDefault(); p && p.click(); });
  o.onOpen && o.onOpen(wrap);
  const first = $('input,select,textarea', wrap); (first || $('[data-close]', wrap)).focus();
}
function closeModal() { const m = $('#modalBack'); if (m) { m.remove(); lastFocus && lastFocus.focus && lastFocus.focus(); } }

/* form helpers */
const field = (label, name, type = 'text', extra = '', hint = '') =>
  `<label class="field"><span>${label}</span><input name="${name}" type="${type}" ${extra}>${hint ? `<small class="hint">${hint}</small>` : ''}<small class="err"></small></label>`;
const selectField = (label, name, options, value = '') =>
  `<label class="field"><span>${label}</span><select name="${name}">${options.map(o => `<option ${o === value ? 'selected' : ''}>${o}</option>`).join('')}</select><small class="err"></small></label>`;
const rule = {
  req: l => v => v ? '' : `${l} is required.`,
  email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Enter an email like name@company.com.',
  min: (n, l) => v => v.length >= n ? '' : `${l} needs at least ${n} characters.`,
  num: l => v => v !== '' && Number(v) >= 0 ? '' : `${l} must be a number of 0 or more.`
};
function validate(form, rules) {
  let ok = true, firstBad = null;
  for (const [name, fns] of Object.entries(rules)) {
    const f = form.elements[name]; if (!f) continue;
    let msg = ''; for (const fn of fns) { msg = fn(f.value.trim(), form); if (msg) break; }
    const err = f.closest('.field').querySelector('.err'); err.textContent = msg;
    f.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (msg) { ok = false; firstBad = firstBad || f; }
  }
  if (firstBad) firstBad.focus();
  return ok;
}

/* dropdowns */
function closeDropdowns(except) { $$('.dd-menu').forEach(m => { if (m !== except) m.hidden = true; }); }
function bindTabs(rootEl, cb) {
  const btns = $$('[data-tab]', rootEl), panes = $$('[data-pane]', rootEl);
  const show = id => { btns.forEach(b => { const on = b.dataset.tab === id; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); }); panes.forEach(p => p.hidden = p.dataset.pane !== id); cb && cb(id); };
  btns.forEach(b => b.addEventListener('click', () => show(b.dataset.tab)));
  show(btns[0].dataset.tab);
}

/* ---------- 5. CHARTS (hand-made SVG) ---------- */
const charts = new Map(); // element -> redraw function
function mount(el, draw) { if (!el) return; charts.set(el, draw); draw(); }
function redrawCharts() { charts.forEach((draw, el) => { if (el.isConnected) draw(); else charts.delete(el); }); }
let resizeT; addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(redrawCharts, 120); });

const smooth = pts => pts.reduce((d, p, i, a) => {
  if (!i) return `M${p[0].toFixed(1)},${p[1].toFixed(1)}`;
  const q = a[i - 1], cx = (q[0] + p[0]) / 2;
  return d + `C${cx.toFixed(1)},${q[1].toFixed(1)} ${cx.toFixed(1)},${p[1].toFixed(1)} ${p[0].toFixed(1)},${p[1].toFixed(1)}`;
}, '');

function lineChart(el, o) {
  mount(el, () => {
    const w = el.clientWidth || 600, h = o.height || 260, p = { l: 46, r: 10, t: 10, b: 26 };
    const all = o.series.flatMap(s => s.values);
    const max = Math.max(...all) * 1.08, min = o.zero === false ? Math.min(...all) * .94 : 0, n = o.labels.length;
    const x = i => p.l + (n < 2 ? 0 : i * (w - p.l - p.r) / (n - 1));
    const y = v => p.t + (1 - (v - min) / ((max - min) || 1)) * (h - p.t - p.b);
    const yf = o.yFmt || fmt; let g = '';
    for (let k = 0; k <= 4; k++) { const v = min + (max - min) * k / 4; g += `<line class="gl" x1="${p.l}" x2="${w - p.r}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${p.l - 8}" y="${y(v) + 4}" text-anchor="end">${yf(v)}</text>`; }
    const step = Math.ceil(n / Math.max(2, Math.floor((w - p.l) / 78)));
    o.labels.forEach((l, i) => { if (i % step === 0) g += `<text class="ax" x="${x(i)}" y="${h - 6}" text-anchor="middle">${l}</text>`; });
    const gid = 'g' + Math.random().toString(36).slice(2, 7); let defs = '', body = '', dots = '';
    o.series.forEach((s, si) => {
      const pts = s.values.map((v, i) => [x(i), y(v)]), d = smooth(pts);
      if (s.fill) { defs += `<linearGradient id="${gid}${si}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.color}" stop-opacity=".28"/><stop offset="1" stop-color="${s.color}" stop-opacity="0"/></linearGradient>`; body += `<path d="${d}L${x(n - 1)},${y(min)}L${x(0)},${y(min)}Z" fill="url(#${gid}${si})"/>`; }
      body += `<path d="${d}" fill="none" style="stroke:${s.color}" stroke-width="2.4" stroke-linecap="round" ${s.dash ? 'stroke-dasharray="5 5"' : ''}/>`;
      dots += `<circle class="dot" r="5" style="fill:${s.color}"/>`;
    });
    el.innerHTML = `<svg width="${w}" height="${h}" role="img" aria-label="${esc(o.label || 'Chart')}"><defs>${defs}</defs>${g}${body}<line class="cross" y1="${p.t}" y2="${h - p.b}"/>${dots}<rect class="hit" x="${p.l}" y="0" width="${w - p.l - p.r}" height="${h}" fill="transparent"/></svg>`;
    const svg = $('svg', el), hit = $('.hit', el), cross = $('.cross', el), ds = $$('.dot', el);
    hit.addEventListener('pointermove', e => {
      const r = svg.getBoundingClientRect(), i = clamp(Math.round((e.clientX - r.left - p.l) / ((w - p.l - p.r) / (n - 1 || 1))), 0, n - 1);
      cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.style.opacity = 1;
      ds.forEach((d, si) => { d.setAttribute('cx', x(i)); d.setAttribute('cy', y(o.series[si].values[i])); d.style.opacity = 1; });
      hit.dataset.tip = `<b>${o.labels[i]}</b><br>` + o.series.map(s => `${esc(s.name)}: ${(o.tipFmt || yf)(s.values[i])}`).join('<br>');
    });
    hit.addEventListener('pointerleave', () => { cross.style.opacity = 0; ds.forEach(d => d.style.opacity = 0); });
  });
}

function barChart(el, o) {
  mount(el, () => {
    const w = el.clientWidth || 600, h = o.height || 260, p = { l: 46, r: 6, t: 10, b: 26 }, n = o.values.length;
    const max = Math.max(...o.values) * 1.1, bw = (w - p.l - p.r) / n, y = v => p.t + (1 - v / max) * (h - p.t - p.b);
    let g = ''; const yf = o.yFmt || fmt;
    for (let k = 0; k <= 4; k++) { const v = max * k / 4; g += `<line class="gl" x1="${p.l}" x2="${w - p.r}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${p.l - 8}" y="${y(v) + 4}" text-anchor="end">${yf(v)}</text>`; }
    const step = Math.ceil(n / Math.max(2, Math.floor((w - p.l) / 60)));
    o.values.forEach((v, i) => {
      const bx = p.l + i * bw + bw * .18, ww = bw * .64;
      g += `<rect class="bar-r" x="${bx}" y="${y(v)}" width="${ww}" height="${h - p.b - y(v)}" rx="${Math.min(6, ww / 2)}" style="fill:${o.color || 'var(--accent)'}" data-tip="<b>${o.labels[i]}</b><br>${(o.tipFmt || yf)(v)}"/>`;
      if (i % step === 0) g += `<text class="ax" x="${bx + ww / 2}" y="${h - 6}" text-anchor="middle">${o.labels[i]}</text>`;
    });
    el.innerHTML = `<svg width="${w}" height="${h}" role="img" aria-label="${esc(o.label || 'Bar chart')}">${g}</svg>`;
  });
}

function donut(el, items) {
  const total = items.reduce((t, i) => t + i.value, 0), C = 2 * Math.PI * 54; let off = 0, segs = '';
  items.forEach(i => { const len = i.value / total * C; segs += `<circle r="54" cx="70" cy="70" fill="none" stroke="${i.color}" stroke-width="18" stroke-dasharray="${len - 2} ${C - len + 2}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)" data-tip="<b>${esc(i.label)}</b><br>${money(i.value)} (${Math.round(i.value / total * 100)}%)"/>`; off += len; });
  el.innerHTML = `<div class="donut-wrap"><svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label="Revenue by channel">${segs}<text x="70" y="68" text-anchor="middle" style="fill:var(--ink);font:700 18px var(--font-display)">${fmt(total)}</text><text x="70" y="86" text-anchor="middle" class="ax" style="fill:var(--muted);font-size:11px">revenue</text></svg>
  <ul>${items.map(i => `<li><i style="background:${i.color}"></i>${esc(i.label)}<span>${Math.round(i.value / total * 100)}%</span></li>`).join('')}</ul></div>`;
}
const sparkline = (vals, color = 'var(--accent)') => {
  const w = 160, h = 34, max = Math.max(...vals), min = Math.min(...vals);
  const pts = vals.map((v, i) => [i * w / (vals.length - 1 || 1), h - 3 - (v - min) / ((max - min) || 1) * (h - 6)]);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${smooth(pts)}" fill="none" style="stroke:${color}" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
};
function bucket(arr, key, agg = 'sum') {
  const size = Math.max(1, Math.ceil(arr.length / 24)), labels = [], values = [];
  for (let i = 0; i < arr.length; i += size) {
    const part = arr.slice(i, i + size); labels.push(part[0].label);
    const s = part.reduce((t, d) => t + (typeof key === 'function' ? key(d) : d[key]), 0);
    values.push(agg === 'avg' ? s / part.length : s);
  }
  return { labels, values };
}
/* one global tooltip that follows the pointer for anything with data-tip */
document.addEventListener('pointermove', e => {
  const t = e.target.closest ? e.target.closest('[data-tip]') : null, tip = $('#tip');
  if (!t) { tip.hidden = true; return; }
  tip.innerHTML = t.dataset.tip; tip.hidden = false;
  tip.style.left = Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 8) + 'px';
  tip.style.top = Math.max(8, e.clientY - tip.offsetHeight - 12) + 'px';
});

/* ---------- 6. DATA TABLE ---------- */
function dataTable(cfg) {
  const st = { q: '', sort: cfg.sort ? cfg.sort[0] : null, dir: cfg.sort ? cfg.sort[1] : 'desc', page: 1, f: '', size: cfg.size || 8 };
  const html = `<div class="tbl" data-tbl="${cfg.id}">
    <div class="tbl-bar">
      <label class="search">${icon('search')}<input type="search" placeholder="${cfg.ph || 'Search'}" aria-label="Search ${cfg.id}"></label>
      ${cfg.filter ? `<select aria-label="Filter by ${cfg.filter.label}"><option value="">${cfg.filter.label}: all</option>${cfg.filter.options.map(o => `<option>${o}</option>`).join('')}</select>` : ''}
      <span class="count" aria-live="polite"></span>
    </div>
    <div class="tbl-wrap"><table><thead><tr>${cfg.cols.map(c => `<th scope="col" data-k="${c.key}" ${c.num ? 'class="num"' : ''}>${c.sort === false ? c.label : `<button type="button" data-sort="${c.key}">${c.label}<i></i></button>`}</th>`).join('')}</tr></thead><tbody></tbody></table></div>
    <div class="pager"></div></div>`;
  const init = scope => {
    const box = $(`[data-tbl="${cfg.id}"]`, scope), tbody = $('tbody', box), pager = $('.pager', box); let view = [];
    const draw = () => {
      let rows = cfg.rows().slice();
      if (st.q) { const q = st.q.toLowerCase(); rows = rows.filter(r => cfg.search(r).toLowerCase().includes(q)); }
      if (st.f) rows = rows.filter(r => cfg.filter.get(r) === st.f);
      if (st.sort) {
        const c = cfg.cols.find(c => c.key === st.sort), v = c.val || (r => r[c.key]);
        rows.sort((a, b) => { const x = v(a), y = v(b); const d = (typeof x === 'number' || x instanceof Date) ? x - y : String(x).localeCompare(String(y)); return st.dir === 'asc' ? d : -d; });
      }
      const pages = Math.max(1, Math.ceil(rows.length / st.size)); st.page = clamp(st.page, 1, pages);
      const start = (st.page - 1) * st.size; view = rows.slice(start, start + st.size);
      tbody.innerHTML = view.length ? view.map((r, i) => `<tr data-i="${i}" ${cfg.onRow ? 'class="click" tabindex="0"' : ''}>${cfg.cols.map(c => `<td ${c.num ? 'class="num"' : ''}>${c.render ? c.render(r) : esc(r[c.key])}</td>`).join('')}</tr>`).join('')
        : `<tr><td colspan="${cfg.cols.length}" class="empty">Nothing matches. Clear the search or filter to see everything.</td></tr>`;
      $$('th', box).forEach(th => th.setAttribute('aria-sort', th.dataset.k === st.sort ? (st.dir === 'asc' ? 'ascending' : 'descending') : 'none'));
      $('.count', box).textContent = rows.length + (rows.length === 1 ? ' result' : ' results');
      const lo = Math.max(1, st.page - 2), hi = Math.min(pages, lo + 4); let pb = '';
      for (let p = Math.max(1, hi - 4); p <= hi; p++) pb += `<button data-p="${p}" class="${p === st.page ? 'on' : ''}" aria-label="Page ${p}" ${p === st.page ? 'aria-current="page"' : ''}>${p}</button>`;
      pager.innerHTML = `<span>${rows.length ? `Showing ${start + 1} to ${start + view.length} of ${rows.length}` : 'No rows'}</span><div><button data-p="${st.page - 1}" ${st.page === 1 ? 'disabled' : ''} aria-label="Previous page">&lsaquo;</button>${pb}<button data-p="${st.page + 1}" ${st.page === pages ? 'disabled' : ''} aria-label="Next page">&rsaquo;</button></div>`;
    };
    $('input', box).addEventListener('input', e => { st.q = e.target.value; st.page = 1; draw(); });
    const sel = $('select', box); sel && sel.addEventListener('change', e => { st.f = e.target.value; st.page = 1; draw(); });
    box.addEventListener('click', e => {
      const s = e.target.closest('[data-sort]'); if (s) { const k = s.dataset.sort; st.dir = st.sort === k && st.dir === 'desc' ? 'asc' : 'desc'; st.sort = k; draw(); return; }
      const p = e.target.closest('[data-p]'); if (p && !p.disabled) { st.page = +p.dataset.p; draw(); return; }
      const tr = e.target.closest('tbody tr.click');
      if (tr && cfg.onRow && !e.target.closest('select,button,a,input')) cfg.onRow(view[+tr.dataset.i], draw);
    });
    box.addEventListener('keydown', e => { if (e.key === 'Enter') { const tr = e.target.closest('tbody tr.click'); if (tr) cfg.onRow(view[+tr.dataset.i], draw); } });
    box._draw = draw; draw();
  };
  return { html, init };
}

/* ---------- 7. LIVE PULSE ENGINE (the signature feature) ---------- */
const pulse = { data: Array(60).fill(0.12), spike: 0, hooks: [] };
function drawPulse() {
  $$('[data-pulse]').forEach(svg => {
    const w = 300, h = 60, pts = pulse.data.map((v, i) => [i * w / (pulse.data.length - 1), h - 6 - v * (h - 12)]);
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.innerHTML = `<path d="${pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('')}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;
    svg.style.color = svg.closest('.pulse-mini') ? 'var(--accent)' : 'currentColor';
  });
}
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
setInterval(() => {
  if (reduceMotion && !pulse.spike) return;
  pulse.data.shift();
  const base = 0.12 + Math.random() * 0.05;
  const beat = pulse.spike > 0.05 ? pulse.spike * (Math.random() > 0.5 ? 1 : 0.35) : 0;
  pulse.data.push(clamp(base + beat, 0, 1)); pulse.spike *= 0.55; drawPulse();
}, 450);

function newLiveOrder() {
  const p = pick(products), c = pick(customers), qty = 1 + Math.floor(Math.random() * 3);
  const o = { id: 'T-' + (++orderSeq), customer: c.name, product: p.name, qty, amount: p.price * qty, status: 'Paid', date: new Date(), method: pick(['Visa', 'Mastercard', 'PayPal']) };
  orders.unshift(o);
  pulse.spike = clamp(0.35 + o.amount / 700, 0.4, 1);
  notes.unshift({ id: Date.now(), type: 'Orders', title: o.amount >= 300 ? 'Large order received' : 'New order', body: `${o.id} from ${o.customer} is worth ${money(o.amount)}.`, time: new Date(), read: false });
  state.unread++; updateBadge();
  days[DAYS - 1].orders++; days[DAYS - 1].revenue += o.amount;
  pulse.hooks.forEach(fn => fn(o));
  return o;
}
function scheduleLive() { setTimeout(() => { if (state.user) newLiveOrder(); scheduleLive(); }, 7000 + Math.random() * 6000); }

function updateBadge() { const b = $('#badge'); b.hidden = state.unread < 1; b.textContent = state.unread > 9 ? '9+' : state.unread; }

/* ---------- 8. COMMAND PALETTE + ASK ENTERPRISE SAAS DASHBOARD ---------- */
function getRange() {
  const r = state.range; let cur;
  if (r.preset === 'custom') cur = days.filter(d => iso(d.date) >= r.from && iso(d.date) <= r.to);
  else cur = days.slice(-Number(r.preset));
  if (!cur.length) cur = days.slice(-30);
  const start = days.indexOf(cur[0]); const prev = days.slice(Math.max(0, start - cur.length), start);
  return { cur, prev };
}
const rangeLabel = () => state.range.preset === 'custom' ? `${shortDate(new Date(state.range.from + 'T00:00'))} to ${shortDate(new Date(state.range.to + 'T00:00'))}` : `the last ${state.range.preset} days`;
const convRate = arr => sum(arr, 'orders') / (sum(arr, 'visitors') || 1);
const sign = n => (n >= 0 ? '+' : '') + n.toFixed(1) + '%';

function answer(q) {
  q = q.toLowerCase(); if (q.length < 3) return null; const { cur, prev } = getRange();
  if (/revenue|sales|earn|income/.test(q)) return `Revenue for ${rangeLabel()} is ${money(sum(cur, 'revenue'))}, ${sign(pct(sum(cur, 'revenue'), sum(prev, 'revenue')))} compared with the period before.`;
  if (/top product|best product|best.?sell|popular/.test(q)) { const p = [...products].sort((a, b) => b.sold - a.sold)[0]; return `${p.name} is your best seller with ${p.sold.toLocaleString()} units sold.`; }
  if (/pending/.test(q)) return `${orders.filter(o => o.status === 'Pending').length} orders are waiting to be paid.`;
  if (/refund/.test(q)) return `${orders.filter(o => o.status === 'Refunded').length} orders were refunded.`;
  if (/churn/.test(q)) { const n = customers.filter(c => c.status === 'Churned').length; return `${n} customers have churned (${Math.round(n / customers.length * 100)}% of ${customers.length}).`; }
  if (/best customer|top customer|biggest customer/.test(q)) { const c = [...customers].sort((a, b) => b.spent - a.spent)[0]; return `${c.name} from ${c.company} has spent the most: ${money(c.spent)}.`; }
  if (/conversion/.test(q)) return `Conversion rate for ${rangeLabel()} is ${(convRate(cur) * 100).toFixed(2)}%.`;
  if (/region|country|where/.test(q)) { const c = [...COUNTRIES].sort((a, b) => b[2] - a[2])[0]; return `${c[1]} brings in the most revenue at about ${Math.round(c[2] * 100)}% of the total.`; }
  if (/stock|inventory/.test(q)) { const l = products.filter(p => p.stock < 20); return l.length ? `Low stock: ${l.map(p => `${p.name} (${p.stock})`).join(', ')}.` : 'Every product has healthy stock.'; }
  if (/team|member|seat/.test(q)) return `Your team has ${team.length} members, ${team.filter(t => t.status === 'Active').length} of them active now.`;
  return null;
}
const PAGES = [['dashboard', 'Dashboard', 'g d'], ['analytics', 'Analytics', 'g a'], ['customers', 'Customers', 'g c'], ['orders', 'Orders', 'g o'], ['products', 'Products', 'g p'], ['team', 'Team', 'g t'], ['messages', 'Messages', 'g m'], ['notifications', 'Notifications', 'g n'], ['billing', 'Billing', ''], ['subscription', 'Subscription', ''], ['settings', 'Settings', 'g s'], ['profile', 'Your profile', ''], ['help', 'Help center', 'g h']];

function openPalette() {
  if ($('#pal')) return;
  const items = [
    ...PAGES.map(p => ({ label: 'Go to ' + p[1], hint: p[2], run: () => { location.hash = '#/' + p[0]; } })),
    { label: 'Switch light or dark mode', hint: '', run: () => applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark') },
    { label: 'Collapse or expand sidebar', hint: '', run: toggleSidebar },
    { label: 'Add a customer', hint: '', run: () => actions['add-customer']() },
    { label: 'Add a product', hint: '', run: () => actions['add-product']() },
    { label: 'Invite a teammate', hint: '', run: () => actions['invite']() },
    { label: 'Simulate a live order', hint: '', run: () => newLiveOrder() },
    { label: 'Show keyboard shortcuts', hint: '?', run: () => actions['shortcuts']() },
    ...['indigo', 'tangerine', 'lagoon', 'rose'].map(a => ({ label: 'Accent colour: ' + a, hint: '', run: () => setAccent(a) })),
    { label: 'Sign out', hint: '', run: () => actions['signout']() }
  ];
  const back = document.createElement('div'); back.className = 'pal-back'; back.id = 'pal';
  back.innerHTML = `<div class="pal" role="dialog" aria-label="Command palette"><div class="pal-in">${icon('search')}<input id="palIn" placeholder="Jump to a page, run an action, or ask a question" autocomplete="off" aria-label="Command palette input"><kbd>Esc</kbd></div><div class="pal-ans" hidden></div><ul class="pal-list" role="listbox"></ul><div class="pal-foot">Try asking: revenue, top product, pending orders, low stock, churn</div></div>`;
  document.body.appendChild(back);
  const input = $('#palIn'), list = $('.pal-list', back), ans = $('.pal-ans', back); let shown = [], sel = 0;
  const render = () => {
    const q = input.value.trim().toLowerCase();
    shown = items.filter(i => i.label.toLowerCase().includes(q)).slice(0, 9); sel = Math.min(sel, Math.max(0, shown.length - 1));
    list.innerHTML = shown.length ? shown.map((i, n) => `<li role="option" data-n="${n}" aria-selected="${n === sel}">${esc(i.label)}${i.hint ? `<kbd>${i.hint}</kbd>` : ''}</li>`).join('') : '<li style="cursor:default">No matching command. Try a different word.</li>';
    const a = q ? answer(q) : null; ans.hidden = !a; if (a) ans.innerHTML = `<small>Answer</small>${esc(a)}`;
  };
  const run = n => { const it = shown[n]; closePalette(); it && it.run(); };
  input.addEventListener('input', () => { sel = 0; render(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % (shown.length || 1); render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + shown.length) % (shown.length || 1); render(); }
    else if (e.key === 'Enter') { e.preventDefault(); run(sel); }
  });
  list.addEventListener('click', e => { const li = e.target.closest('[data-n]'); if (li) run(+li.dataset.n); });
  back.addEventListener('click', e => { if (e.target === back) closePalette(); });
  render(); input.focus();
}
function closePalette() { const p = $('#pal'); if (p) p.remove(); }

/* ---------- 9. PAGES ---------- */
let cleanups = [];
const routes = {};

/* ----- shared bits ----- */
function rangeControl() {
  const r = state.range;
  const seg = ['7', '30', '90'].map(p => `<button class="${r.preset === p ? 'on' : ''}" data-action="range" data-p="${p}">${p} days</button>`).join('');
  return `<div class="seg" role="group" aria-label="Date range">${seg}<button class="${r.preset === 'custom' ? 'on' : ''}" data-action="range" data-p="custom">Custom</button></div>` +
    (r.preset === 'custom' ? `<div class="dates"><input type="date" id="rFrom" value="${r.from}" min="${iso(days[0].date)}" max="${iso(days[DAYS - 1].date)}" aria-label="From date"><input type="date" id="rTo" value="${r.to}" min="${iso(days[0].date)}" max="${iso(days[DAYS - 1].date)}" aria-label="To date"></div>` : '');
}
const statusPill = s => pill(s, { Paid: 'good', Active: 'good', Pending: 'warn', Trial: 'accent', Away: 'warn', Invited: 'accent', Refunded: 'warn', Failed: 'bad', Churned: 'bad', 'Low stock': 'warn', 'In stock': 'good' }[s] || '');
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
const firstName = () => (state.user ? state.user.name.split(' ')[0] : '');

function pulseScore() {
  const { cur, prev } = getRange();
  const g = pct(sum(cur, 'revenue'), sum(prev, 'revenue')), cv = (convRate(cur) - convRate(prev)) * 100;
  const churn = customers.filter(c => c.status === 'Churned').length / customers.length * 100, pend = orders.filter(o => o.status === 'Pending').length / orders.length * 100;
  const score = clamp(Math.round(62 + g * 1.1 + cv * 4 - churn * .8 - pend * .3), 5, 99);
  return { score, g, cv, churn, pend, label: score >= 80 ? 'Thriving' : score >= 60 ? 'Healthy' : score >= 40 ? 'Needs attention' : 'At risk' };
}
function kpiCard(label, value, cur, prev, key, f, isPts) {
  const d = isPts ? (cur - prev) * 100 : pct(cur, prev), up = d >= 0;
  return `<div class="card kpi"><span class="label">${label}</span><span class="value">${value}</span>
    <span class="delta ${up ? 'up' : 'down'}">${up ? '&#9650;' : '&#9660;'} ${isPts ? Math.abs(d).toFixed(2) + ' pts' : Math.abs(d).toFixed(1) + '%'} <span>vs previous period</span></span>${f}</div>`;
}
function liveItem(o, fresh) {
  return `<li class="${fresh ? 'fresh' : ''}">${avatar(o.customer)}<div><b>${esc(o.customer)}</b><small>${esc(o.product)} x${o.qty} &middot; ${ago(o.date)}</small></div><b>${money(o.amount)}</b></li>`;
}
function topProducts() { const max = Math.max(...products.map(p => p.sold)); return [...products].sort((a, b) => b.sold - a.sold).slice(0, 6).map(p => `<li><div class="r-top">${esc(p.name)}<span>${p.sold.toLocaleString()} sold</span></div><div class="track"><i style="width:${p.sold / max * 100}%"></i></div></li>`).join(''); }
function geoTiles(total) {
  const order = ['CA', 'UK', 'DE', 'JP', 'US', 'FR', 'IN', 'SG', 'MX', 'BR', 'NG', 'AU'], max = Math.max(...COUNTRIES.map(c => c[2]));
  return order.map(code => { const c = COUNTRIES.find(x => x[0] === code), v = c[2] / max; return `<div class="tile ${v > .5 ? 'hi' : ''}" style="--v:${(0.14 + v * .8).toFixed(2)}" data-tip="<b>${c[1]}</b><br>${money(total * c[2])} (${Math.round(c[2] * 100)}%)"><span>${c[0]}</span><b>${Math.round(c[2] * 100)}%</b></div>`; }).join('');
}
const timelineData = [
  ['<b>Jordan Lee</b> updated the price of Aero Buds Pro', 38], ['<b>Riya Kapoor</b> resolved 4 support tickets', 95], ['<b>Stock alert:</b> Sleep Ring is down to 7 units', 170],
  ['<b>Sam Rivera</b> exported the weekly report', 340], ['<b>Mina Park</b> added 3 new customers', 620]
];

/* ----- Dashboard ----- */
routes.dashboard = {
  title: 'Dashboard',
  render() {
    const { cur, prev } = getRange(), ps = pulseScore(), rev = sum(cur, 'revenue');
    const recent = dataTable({ id: 'recent', size: 6, rows: () => orders.slice(0, 40), search: r => r.id + r.customer + r.product, sort: ['date', 'desc'], ph: 'Search transactions', cols: txCols });
    routes.dashboard._recent = recent;
    return head(`${greeting()}, ${esc(firstName())}`, `Here is how things look for ${rangeLabel()}.`, rangeControl() + `<button class="btn" data-action="export-orders">${icon('download')} Export CSV</button>`) + `
    <section class="hero" aria-label="Business pulse">
      <div class="hero-pulse">
        <div class="hero-top"><div class="ring" style="--s:${ps.score}" role="img" aria-label="Pulse score ${ps.score} out of 100"><b>${ps.score}</b></div>
          <div><h2>Business pulse: ${ps.label}</h2><p>One score for how the business is doing right now. It moves with revenue, conversion, churn and unpaid orders.</p></div></div>
        <div class="drivers"><span>Revenue ${sign(ps.g)}</span><span>Conversion ${ps.cv >= 0 ? '+' : ''}${ps.cv.toFixed(2)} pts</span><span>${Math.round(ps.churn)}% churned</span><span>${Math.round(ps.pend)}% unpaid</span></div>
        <svg data-pulse class="pulse-big" preserveAspectRatio="none" aria-hidden="true"></svg>
      </div>
      <div class="card live"><div class="card-head"><div><h3>Live orders</h3><p>New orders appear here as they arrive</p></div></div><ul id="liveList">${orders.slice(0, 5).map(o => liveItem(o)).join('')}</ul></div>
    </section>
    <section class="kpis" aria-label="Key numbers">
      ${kpiCard('Revenue', money(rev), rev, sum(prev, 'revenue'), 'revenue', sparkline(cur.map(d => d.revenue)))}
      ${kpiCard('Orders', fmt(sum(cur, 'orders')), sum(cur, 'orders'), sum(prev, 'orders'), 'orders', sparkline(cur.map(d => d.orders)))}
      ${kpiCard('New customers', fmt(sum(cur, 'newCust')), sum(cur, 'newCust'), sum(prev, 'newCust'), 'newCust', sparkline(cur.map(d => d.newCust)))}
      ${kpiCard('Conversion rate', (convRate(cur) * 100).toFixed(2) + '%', convRate(cur), convRate(prev), 'conv', sparkline(cur.map(d => d.orders / d.visitors)), true)}
    </section>
    <div class="grid">
      <div class="card c8"><div class="card-head"><div><h3>Revenue</h3><p>Compared with the previous period</p></div><div class="legend"><span><i style="background:var(--accent)"></i>This period</span><span><i style="background:var(--muted)"></i>Previous</span></div></div><div class="chart" id="chRev"></div></div>
      <div class="card c4"><div class="card-head"><div><h3>Customer growth</h3><p>Total customers over time</p></div></div><div class="chart" id="chGrow"></div></div>
      <div class="card c6"><div class="card-head"><div><h3>Sales</h3><p>Orders per ${cur.length > 24 ? 'group of days' : 'day'}</p></div></div><div class="chart" id="chSales"></div></div>
      <div class="card c6"><div class="card-head"><div><h3>Conversion rate</h3><p>Visitors who placed an order</p></div></div><div class="chart" id="chConv"></div></div>
      <div class="card c4"><div class="card-head"><div><h3>Top products</h3><p>By units sold</p></div></div><ul class="rank">${topProducts()}</ul></div>
      <div class="card c4"><div class="card-head"><div><h3>Where customers are</h3><p>Share of revenue by country</p></div></div><div class="geo">${geoTiles(rev)}</div></div>
      <div class="card c4"><div class="card-head"><div><h3>Activity</h3><p>What your team did lately</p></div></div><ol class="timeline" id="timeline">${timelineData.map(t => `<li>${t[0]}<small>${ago(new Date(Date.now() - t[1] * 60000))}</small></li>`).join('')}</ol></div>
      <div class="card c12"><div class="card-head"><div><h3>Recent transactions</h3><p>Click a row to see the full order</p></div><a href="#/orders">View all orders</a></div>${recent.html}</div>
    </div>`;
  },
  init(el) {
    const { cur, prev } = getRange();
    lineChart($('#chRev', el), { labels: cur.map(d => d.label), series: [{ name: 'Previous', color: 'var(--muted)', values: cur.map((_, i) => prev[i] ? prev[i].revenue : 0), dash: true }, { name: 'This period', color: 'var(--accent)', values: cur.map(d => d.revenue), fill: true }], yFmt: v => '$' + fmt(v), tipFmt: money, label: 'Revenue line chart' });
    let c = days.indexOf(cur[0]) > 0 ? 1800 : 1800; const base = days.slice(0, days.indexOf(cur[0])).reduce((t, d) => t + d.newCust, 1800);
    let run = base; const growth = cur.map(d => (run += d.newCust));
    lineChart($('#chGrow', el), { labels: cur.map(d => d.label), series: [{ name: 'Customers', color: 'var(--accent)', values: growth, fill: true }], zero: false, yFmt: fmt, tipFmt: v => Math.round(v).toLocaleString(), label: 'Customer growth chart' });
    const sb = bucket(cur, 'orders'); barChart($('#chSales', el), { labels: sb.labels, values: sb.values, tipFmt: v => Math.round(v) + ' orders', label: 'Orders bar chart' });
    const cb = bucket(cur, d => d.orders / d.visitors * 100, 'avg'); lineChart($('#chConv', el), { labels: cb.labels, series: [{ name: 'Conversion', color: 'var(--good)', values: cb.values, fill: true }], zero: false, yFmt: v => v.toFixed(1) + '%', label: 'Conversion rate chart' });
    routes.dashboard._recent.init(el);
    const list = $('#liveList', el);
    const hook = o => { list.insertAdjacentHTML('afterbegin', liveItem(o, true)); while (list.children.length > 5) list.lastChild.remove(); const tl = $('#timeline'); tl && tl.insertAdjacentHTML('afterbegin', `<li><b>${esc(o.customer)}</b> placed order ${o.id}<small>just now</small></li>`); const t = $('[data-tbl="recent"]', el); t && t._draw && t._draw(); };
    pulse.hooks.push(hook); cleanups.push(() => { pulse.hooks = pulse.hooks.filter(h => h !== hook); });
    drawPulse();
  }
};
const txCols = [
  { key: 'id', label: 'Order' }, { key: 'customer', label: 'Customer', render: r => `<div class="who">${avatar(r.customer)}<div><b>${esc(r.customer)}</b></div></div>` },
  { key: 'product', label: 'Product' }, { key: 'date', label: 'Date', render: r => ago(r.date), val: r => r.date },
  { key: 'status', label: 'Status', render: r => statusPill(r.status) }, { key: 'amount', label: 'Amount', num: true, render: r => money(r.amount) }
];

/* ----- Analytics ----- */
routes.analytics = {
  title: 'Analytics',
  render() {
    return head('Analytics', `A closer look at ${rangeLabel()}.`, rangeControl()) + `
    <div class="tabs" role="tablist"><button data-tab="overview" role="tab">Overview</button><button data-tab="audience" role="tab">Audience</button><button data-tab="funnel" role="tab">Funnel</button></div>
    <div class="pane" data-pane="overview"><div class="grid" style="margin-top:0">
      <div class="card c8"><div class="card-head"><div><h3>Visitors and orders</h3><p>Daily traffic against purchases</p></div><div class="legend"><span><i style="background:var(--accent)"></i>Visitors</span><span><i style="background:var(--good)"></i>Orders x10</span></div></div><div class="chart" id="anTraffic"></div></div>
      <div class="card c4"><div class="card-head"><div><h3>Revenue by channel</h3><p>Where sales come from</p></div></div><div id="anDonut"></div></div>
      <div class="card c12"><div class="card-head"><div><h3>Revenue by category</h3><p>Sales per product group</p></div></div><div class="chart" id="anCat"></div></div></div></div>
    <div class="pane" data-pane="audience"><div class="grid" style="margin-top:0">
      <div class="card c6"><div class="card-head"><div><h3>New customers</h3><p>Sign-ups per day</p></div></div><div class="chart" id="anNew"></div></div>
      <div class="card c6"><div class="card-head"><div><h3>Busiest hours</h3><p>When orders arrive, by weekday and time of day. Darker means busier.</p></div></div><div id="anHeat"></div></div></div></div>
    <div class="pane" data-pane="funnel"><div class="card"><div class="card-head"><div><h3>Purchase funnel</h3><p>How many visitors make it to each step</p></div></div><div class="funnel" id="anFunnel"></div></div></div>`;
  },
  init(el) {
    const { cur } = getRange(), rev = sum(cur, 'revenue');
    const draws = {
      overview() {
        lineChart($('#anTraffic', el), { labels: cur.map(d => d.label), series: [{ name: 'Visitors', color: 'var(--accent)', values: cur.map(d => d.visitors), fill: true }, { name: 'Orders x10', color: 'var(--good)', values: cur.map(d => d.orders * 10) }], tipFmt: v => Math.round(v).toLocaleString(), label: 'Visitors and orders' });
        donut($('#anDonut', el), [['Organic', .34, '#3d3bf3'], ['Paid ads', .26, '#e8561c'], ['Email', .2, '#0b8f83'], ['Social', .12, '#d12d6b'], ['Referral', .08, '#b97800']].map(c => ({ label: c[0], value: rev * c[1], color: c[2] })));
        const cats = ['Audio', 'Wearables', 'Home', 'Accessories'], w = [.34, .27, .2, .19];
        barChart($('#anCat', el), { labels: cats, values: w.map(x => rev * x), yFmt: v => '$' + fmt(v), tipFmt: money, height: 240, label: 'Revenue by category' });
      },
      audience() {
        const nb = bucket(cur, 'newCust'); barChart($('#anNew', el), { labels: nb.labels, values: nb.values, color: 'var(--good)', tipFmt: v => Math.round(v) + ' sign-ups', label: 'New customers' });
        const dn = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], r2 = rng(7); let h = '<div></div>' + Array.from({ length: 12 }, (_, i) => `<div class="hh">${i * 2}</div>`).join('');
        dn.forEach((d, di) => { h += `<div>${d}</div>`; for (let i = 0; i < 12; i++) { const peak = Math.exp(-Math.pow((i * 2 - 14) / 5, 2)) * .8 + Math.exp(-Math.pow((i * 2 - 20) / 3, 2)) * .5, v = clamp(peak * (di > 4 ? .75 : 1) + r2() * .2, .04, 1); h += `<div class="cell" style="--v:${v.toFixed(2)}" data-tip="<b>${d}, ${i * 2}:00 to ${i * 2 + 2}:00</b><br>${Math.round(v * 40)} orders on average"></div>`; } });
        $('#anHeat', el).innerHTML = `<div class="heat" role="img" aria-label="Heatmap of busiest hours">${h}</div>`;
      },
      funnel() {
        const o = sum(cur, 'orders'), steps = [['Visitors', sum(cur, 'visitors')], ['Viewed a product', sum(cur, 'visitors') * .62], ['Added to cart', o * 3.4], ['Started checkout', o * 1.7], ['Paid', o]];
        $('#anFunnel', el).innerHTML = steps.map((s, i) => `<div class="f-row"><span>${s[0]}</span><div class="f-bar" style="width:${Math.max(2, s[1] / steps[0][1] * 100)}%;--o:${1 - i * .18}" data-tip="<b>${s[0]}</b><br>${Math.round(s[1]).toLocaleString()} people"></div><small>${fmt(s[1])}${i ? ' &middot; ' + Math.round(s[1] / steps[i - 1][1] * 100) + '%' : ''}</small></div>`).join('');
      }
    };
    bindTabs(el, id => draws[id]());
  }
};

/* ----- Customers ----- */
routes.customers = {
  title: 'Customers',
  render() {
    const t = dataTable({
      id: 'customers', size: 8, rows: () => customers, search: r => r.name + r.email + r.company, sort: ['spent', 'desc'], ph: 'Search name, email or company',
      filter: { label: 'Status', options: ['Active', 'Trial', 'Churned'], get: r => r.status }, onRow: r => customerModal(r),
      cols: [
        { key: 'name', label: 'Customer', render: r => `<div class="who">${avatar(r.name)}<div><b>${esc(r.name)}</b><small>${esc(r.email)}</small></div></div>` },
        { key: 'company', label: 'Company' }, { key: 'plan', label: 'Plan', render: r => pill(r.plan, 'accent') }, { key: 'status', label: 'Status', render: r => statusPill(r.status) },
        { key: 'health', label: 'Health', render: r => `<span class="bar" aria-hidden="true"><i style="width:${r.health}%;background:${r.health > 60 ? 'var(--good)' : r.health > 35 ? 'var(--warn)' : 'var(--bad)'}"></i></span> ${r.health}` },
        { key: 'orders', label: 'Orders', num: true }, { key: 'spent', label: 'Spent', num: true, render: r => money(r.spent) }, { key: 'joined', label: 'Joined', val: r => r.joined, render: r => shortDate(r.joined) }
      ]
    });
    routes.customers._t = t;
    return head('Customers', `${customers.length} people and companies who buy from you.`, `<button class="btn primary" data-action="add-customer">${icon('plus')} Add customer</button>`) + `<div class="card">${t.html}</div>`;
  },
  init(el) { routes.customers._t.init(el); routes.customers._el = el; }
};
function customerModal(c) {
  openModal({ title: c.name, secondary: 'Close', body: `<div class="profile-top" style="margin-bottom:18px">${avatar(c.name, 'lg')}<div><h3>${esc(c.name)}</h3><p class="muted">${esc(c.company)} &middot; ${esc(c.country)}</p><p style="margin-top:6px">${statusPill(c.status)} ${pill(c.plan, 'accent')}</p></div></div>
    <div class="form-grid"><p><span class="muted">Email</span><br>${esc(c.email)}</p><p><span class="muted">Customer since</span><br>${shortDate(c.joined)}</p><p style="margin-top:12px"><span class="muted">Orders</span><br>${c.orders}</p><p style="margin-top:12px"><span class="muted">Lifetime spend</span><br>${money(c.spent)}</p></div>
    <p style="margin-top:16px"><span class="muted">Health score</span></p><div class="usage"><div class="track"><i style="width:${c.health}%"></i></div></div>` });
}

/* ----- Orders ----- */
routes.orders = {
  title: 'Orders',
  render() {
    const t = dataTable({
      id: 'orders', size: 10, rows: () => orders, search: r => r.id + r.customer + r.product, sort: ['date', 'desc'], ph: 'Search order, customer or product',
      filter: { label: 'Status', options: ['Paid', 'Pending', 'Refunded', 'Failed'], get: r => r.status }, onRow: r => orderModal(r), cols: txCols
    });
    routes.orders._t = t;
    return head('Orders', 'Every order, newest first. Click one to see the details.', `<button class="btn" data-action="export-orders">${icon('download')} Export CSV</button>`) + `<div class="card">${t.html}</div>`;
  },
  init(el) { routes.orders._t.init(el); const hook = () => { const b = $('[data-tbl="orders"]', el); b && b._draw(); }; pulse.hooks.push(hook); cleanups.push(() => { pulse.hooks = pulse.hooks.filter(h => h !== hook); }); }
};
function orderModal(o) {
  const steps = [['Order placed', o.date], ['Payment ' + (o.status === 'Failed' ? 'failed' : o.status === 'Pending' ? 'pending' : 'received'), new Date(o.date.getTime() + 120000)]];
  if (o.status === 'Paid') steps.push(['Packed and shipped', new Date(o.date.getTime() + 86400000)]);
  if (o.status === 'Refunded') steps.push(['Refund issued', new Date(o.date.getTime() + 172800000)]);
  openModal({ title: 'Order ' + o.id, secondary: 'Close', wide: true, body: `<div class="form-grid"><p><span class="muted">Customer</span><br>${esc(o.customer)}</p><p><span class="muted">Status</span><br>${statusPill(o.status)}</p><p style="margin-top:12px"><span class="muted">Product</span><br>${esc(o.product)} x${o.qty}</p><p style="margin-top:12px"><span class="muted">Total</span><br><b>${money(o.amount)}</b> via ${esc(o.method)}</p></div>
    <h4 style="margin:22px 0 12px">Timeline</h4><ol class="timeline">${steps.map(s => `<li>${s[0]}<small>${s[1].toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</small></li>`).join('')}</ol>` });
}

/* ----- Products ----- */
routes.products = {
  title: 'Products',
  render() {
    const t = dataTable({
      id: 'products', size: 8, rows: () => products, search: r => r.name + r.sku + r.category, sort: ['sold', 'desc'], ph: 'Search name, SKU or category',
      filter: { label: 'Category', options: ['Audio', 'Wearables', 'Home', 'Accessories'], get: r => r.category },
      cols: [
        { key: 'name', label: 'Product', render: r => `<b>${esc(r.name)}</b><br><small class="muted">${esc(r.sku)}</small>` }, { key: 'category', label: 'Category' },
        { key: 'price', label: 'Price', num: true, render: r => money(r.price) }, { key: 'stock', label: 'Stock', render: r => `${r.stock} ${statusPill(r.status)}` },
        { key: 'sold', label: 'Sold', num: true, render: r => r.sold.toLocaleString() }, { key: 'rating', label: 'Rating', num: true, render: r => r.rating.toFixed(1) + ' / 5' }
      ]
    });
    routes.products._t = t;
    return head('Products', `${products.length} products in your catalogue.`, `<button class="btn primary" data-action="add-product">${icon('plus')} Add product</button>`) + `<div class="card">${t.html}</div>`;
  },
  init(el) { routes.products._t.init(el); }
};

/* ----- Team ----- */
routes.team = {
  title: 'Team',
  render() {
    const t = dataTable({
      id: 'team', size: 8, rows: () => team, search: r => r.name + r.email + r.role, sort: ['name', 'asc'], ph: 'Search teammates',
      filter: { label: 'Role', options: ['Owner', 'Admin', 'Analyst', 'Support'], get: r => r.role },
      cols: [
        { key: 'name', label: 'Member', render: r => `<div class="who">${avatar(r.name)}<div><b>${esc(r.name)}</b><small>${esc(r.email)}</small></div></div>` },
        { key: 'role', label: 'Role', render: r => r.role === 'Owner' ? pill('Owner', 'accent') : `<select data-role="${r.id}" aria-label="Role for ${esc(r.name)}">${['Admin', 'Analyst', 'Support'].map(o => `<option ${o === r.role ? 'selected' : ''}>${o}</option>`).join('')}</select>` },
        { key: 'status', label: 'Status', render: r => statusPill(r.status) }, { key: 'seen', label: 'Last active', val: r => r.seen, render: r => ago(r.seen) },
        { key: 'x', label: '', sort: false, render: r => r.role === 'Owner' ? '' : `<button class="btn sm danger" data-remove="${r.id}">Remove</button>` }
      ]
    });
    routes.team._t = t;
    return head('Team', 'Control who can see and change what.', `<button class="btn primary" data-action="invite">${icon('plus')} Invite member</button>`) + `<div class="card">${t.html}</div>`;
  },
  init(el) {
    routes.team._t.init(el);
    el.addEventListener('change', e => { const s = e.target.closest('[data-role]'); if (s) { const m = team.find(t => t.id === +s.dataset.role); m.role = s.value; toast(`${m.name} is now ${m.role}.`); } });
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-remove]'); if (!b) return; const m = team.find(t => t.id === +b.dataset.remove);
      openModal({ title: 'Remove ' + m.name + '?', body: `<p>${esc(m.name)} will lose access to this workspace straight away.</p>`, primary: { label: 'Remove member', fn: () => { team.splice(team.indexOf(m), 1); $('[data-tbl="team"]')._draw(); toast(`${m.name} was removed.`); } } });
    });
  }
};

/* ----- Messages ----- */
routes.messages = {
  title: 'Messages',
  render() {
    return head('Messages', 'Talk with your team without leaving the dashboard.') + `<div class="card msgs"><div class="threads" id="threads"></div><div class="chat"><div class="chat-head" id="chatHead"></div><div class="chat-body" id="chatBody" aria-live="polite"></div>
    <form class="chat-form" id="chatForm"><input type="text" name="m" placeholder="Write a message" aria-label="Message" autocomplete="off"><button class="btn primary" type="submit">Send</button></form></div></div>`;
  },
  init(el) {
    let cur = threads[0]; const tEl = $('#threads', el), body = $('#chatBody', el);
    const drawThreads = () => { tEl.innerHTML = threads.map(t => `<button class="thread ${t === cur ? 'on' : ''}" data-t="${t.id}">${avatar(t.name)}<span><b>${esc(t.name)}</b><small>${esc(t.msgs[t.msgs.length - 1].text)}</small></span>${t.unread ? pill(t.unread, 'accent') : ''}</button>`).join(''); };
    const drawChat = () => { $('#chatHead', el).innerHTML = `${avatar(cur.name)}<div><b>${esc(cur.name)}</b><br><small class="muted">${cur.role}</small></div>`; body.innerHTML = cur.msgs.map(m => `<div class="bubble ${m.me ? 'me' : ''}">${esc(m.text)}<small>${m.t}</small></div>`).join(''); body.scrollTop = body.scrollHeight; };
    tEl.addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (!b) return; cur = threads.find(t => t.id === +b.dataset.t); cur.unread = 0; drawThreads(); drawChat(); });
    $('#chatForm', el).addEventListener('submit', e => {
      e.preventDefault(); const inp = e.target.m, v = inp.value.trim(); if (!v) return;
      const thread = cur; thread.msgs.push({ me: true, text: v, t: 'Now' }); inp.value = ''; drawThreads(); drawChat();
      const replies = ['Got it, thanks!', 'I will look into that today.', 'Good idea. Let us talk about it at standup.', 'Done. I updated the sheet.'];
      const to = setTimeout(() => { thread.msgs.push({ me: false, text: pick(replies), t: 'Now' }); if (thread !== cur) thread.unread++; if ($('#chatBody')) { drawThreads(); drawChat(); } }, 1300);
      cleanups.push(() => clearTimeout(to));
    });
    drawThreads(); drawChat();
  }
};

/* ----- Notifications ----- */
const noteHTML = n => `<div class="note ${n.read ? 'read' : ''}" data-n="${n.id}" tabindex="0"><span class="dot"></span><div><b>${esc(n.title)}</b><br><span class="muted">${esc(n.body)}</span><br><small>${ago(n.time)} &middot; ${n.type}</small></div></div>`;
function renderNotifMenu() {
  $('#notifMenu').innerHTML = `<div class="dd-head"><b>Notifications</b><button class="btn sm" data-action="notif-read-all">Mark all read</button></div>${notes.slice(0, 5).map(noteHTML).join('')}<div class="dd-foot"><a href="#/notifications">See all notifications</a></div>`;
}
routes.notifications = {
  title: 'Notifications',
  render() {
    return head('Notifications', 'Orders, system messages and team updates.', `<button class="btn" data-action="notif-read-all">Mark all as read</button>`) +
      `<div class="card"><div class="tabs"><button data-tab="All">All</button><button data-tab="Unread">Unread</button><button data-tab="Orders">Orders</button><button data-tab="System">System</button></div><div id="noteList"></div></div>`;
  },
  init(el) {
    let f = 'All'; const list = $('#noteList', el);
    const draw = () => { const rows = notes.filter(n => f === 'All' || (f === 'Unread' ? !n.read : n.type === f)); list.innerHTML = rows.length ? rows.map(noteHTML).join('') : '<p class="muted" style="padding:30px;text-align:center">Nothing here. You are all caught up.</p>'; };
    el.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { f = b.dataset.tab; el.querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('on', x === b)); draw(); }));
    el.querySelector('[data-tab]').classList.add('on'); draw();
    routes.notifications._draw = draw; cleanups.push(() => { routes.notifications._draw = null; });
  }
};

/* ----- Billing ----- */
routes.billing = {
  title: 'Billing',
  render() {
    const inv = Array.from({ length: 8 }, (_, i) => { const d = new Date(today); d.setMonth(d.getMonth() - i); d.setDate(1); return { id: 'INV-' + (1042 - i), date: d, amount: 49, status: 'Paid' }; });
    const t = dataTable({
      id: 'invoices', size: 5, rows: () => inv, search: r => r.id, ph: 'Search invoices', sort: ['date', 'desc'],
      cols: [{ key: 'id', label: 'Invoice' }, { key: 'date', label: 'Date', val: r => r.date, render: r => r.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }, { key: 'amount', label: 'Amount', num: true, render: r => money(r.amount) }, { key: 'status', label: 'Status', render: r => statusPill(r.status) }, { key: 'dl', label: '', sort: false, render: r => `<button class="btn sm" data-dl="${r.id}">Download</button>` }]
    });
    routes.billing._t = t;
    return head('Billing', 'Your payment method, usage and invoices.') + `<div class="grid" style="margin-top:0">
      <div class="card c4"><h3>Current plan</h3><p class="price" style="font:700 34px var(--font-display);margin:10px 0 2px">$49<small class="muted" style="font:400 14px var(--font-body)"> / month</small></p><p class="muted">Growth plan. Renews on the 1st.</p><a class="btn block" style="margin-top:16px" href="#/subscription">Change plan</a></div>
      <div class="card c4"><h3>Payment method</h3><div class="code" style="margin:14px 0">Visa ending in 4242<br>Expires 08/28</div><button class="btn block" data-action="update-card">Update card</button></div>
      <div class="card c4"><h3>Usage this month</h3><div class="usage" style="margin-top:14px">
        <div><div class="r-top" style="display:flex;justify-content:space-between"><span>Seats</span><span class="muted">9 of 12</span></div><div class="track"><i style="width:75%"></i></div></div>
        <div><div class="r-top" style="display:flex;justify-content:space-between"><span>Orders tracked</span><span class="muted">6,240 of 10,000</span></div><div class="track"><i style="width:62%"></i></div></div>
        <div><div class="r-top" style="display:flex;justify-content:space-between"><span>Storage</span><span class="muted">3.1 of 20 GB</span></div><div class="track"><i style="width:16%"></i></div></div></div></div>
      <div class="card c12"><div class="card-head"><h3>Invoices</h3></div>${t.html}</div></div>`;
  },
  init(el) { routes.billing._t.init(el); el.addEventListener('click', e => { const b = e.target.closest('[data-dl]'); if (b) toast(`Downloading ${b.dataset.dl}.pdf (demo)`); }); }
};

/* ----- Subscription ----- */
const PLANS = [
  { id: 'Starter', m: 19, y: 15, feats: ['3 team seats', '2,000 orders tracked', 'Basic analytics', 'Email support'] },
  { id: 'Growth', m: 49, y: 39, feats: ['12 team seats', '10,000 orders tracked', 'Full analytics and funnels', 'Command palette and live pulse', 'Priority support'] },
  { id: 'Scale', m: 129, y: 99, feats: ['Unlimited seats', 'Unlimited orders', 'Custom reports', 'Single sign-on', 'Dedicated manager'] }
];
routes.subscription = {
  title: 'Subscription',
  render() {
    const yearly = store.get('yearly', false), cur = store.get('plan', 'Growth');
    return head('Subscription', 'Pick the plan that fits. You can change it any time.', `<div class="seg" role="group" aria-label="Billing period"><button class="${!yearly ? 'on' : ''}" data-bill="m">Monthly</button><button class="${yearly ? 'on' : ''}" data-bill="y">Yearly (save 20%)</button></div>`) +
      `<div class="plans">${PLANS.map(p => `<div class="card plan ${p.id === cur ? 'current' : ''}"><div><h3>${p.id}</h3>${p.id === cur ? pill('Current plan', 'accent') : ''}</div><div class="price">$${yearly ? p.y : p.m}<small> / month</small></div><ul>${p.feats.map(f => `<li>${f}</li>`).join('')}</ul>${p.id === cur ? '<button class="btn block" disabled>You are on this plan</button>' : `<button class="btn primary block" data-plan="${p.id}">Switch to ${p.id}</button>`}</div>`).join('')}</div>
      <div class="card" style="margin-top:18px;display:flex;justify-content:space-between;gap:16px;align-items:center;flex-wrap:wrap"><div><h3>Cancel subscription</h3><p class="muted">You keep access until the end of the billing period.</p></div><button class="btn danger" data-action="cancel-sub">Cancel plan</button></div>`;
  },
  init(el) {
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-bill]'); if (b) { store.set('yearly', b.dataset.bill === 'y'); route(); return; }
      const p = e.target.closest('[data-plan]'); if (!p) return; const plan = PLANS.find(x => x.id === p.dataset.plan), yearly = store.get('yearly', false);
      openModal({ title: 'Switch to ' + plan.id, body: `<p>You will pay <b>$${yearly ? plan.y : plan.m} per month</b>${yearly ? ', billed yearly' : ''}. The change starts today and is prorated.</p>`, primary: { label: 'Confirm switch', fn: () => { store.set('plan', plan.id); toast('You are now on the ' + plan.id + ' plan.'); route(); } } });
    });
  }
};

/* ----- Settings ----- */
routes.settings = {
  title: 'Settings',
  render() {
    const p = state.prefs, th = store.get('theme', 'system'), ac = root.dataset.accent;
    const sw = (k, t, d) => `<div class="switch-row"><div><b>${t}</b><p>${d}</p></div><label class="switch"><input type="checkbox" data-pref="${k}" ${p[k] ? 'checked' : ''} aria-label="${t}"><i></i></label></div>`;
    return head('Settings', 'Workspace, look and feel, alerts and security.') + `
    <div class="tabs" role="tablist"><button data-tab="general">General</button><button data-tab="appearance">Appearance</button><button data-tab="alerts">Notifications</button><button data-tab="security">Security</button><button data-tab="api">API</button></div>
    <div class="pane" data-pane="general"><form class="card" id="genForm" novalidate style="max-width:640px">${field('Workspace name', 'workspace', 'text', `value="${esc(p.workspace)}"`)}${selectField('Time zone', 'timezone', ['UTC', 'US Eastern', 'US Pacific', 'Central Europe', 'India', 'Japan'], p.timezone)}<button class="btn primary" type="submit">Save changes</button></form></div>
    <div class="pane" data-pane="appearance"><div class="card" style="max-width:640px"><div class="field"><span>Theme</span><div class="seg" style="width:max-content">${['light', 'dark', 'system'].map(t => `<button data-theme-set="${t}" class="${th === t ? 'on' : ''}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div></div>
      <div class="field"><span>Accent colour</span><div class="swatches">${[['indigo', '#3d3bf3'], ['tangerine', '#e8561c'], ['lagoon', '#0b8f83'], ['rose', '#d12d6b']].map(a => `<button class="swatch" data-accent-set="${a[0]}" style="background:${a[1]}" aria-label="${a[0]}" aria-pressed="${ac === a[0]}"></button>`).join('')}</div></div>
      <div class="field"><span>Density</span><div class="seg" style="width:max-content">${['comfortable', 'compact'].map(d => `<button data-density-set="${d}" class="${root.dataset.density === d ? 'on' : ''}">${d[0].toUpperCase() + d.slice(1)}</button>`).join('')}</div></div></div></div>
    <div class="pane" data-pane="alerts"><div class="card" style="max-width:640px">${sw('orders', 'New order alerts', 'Show a notification for every order that arrives.')}${sw('email', 'Email updates', 'Get a summary of important events by email.')}${sw('push', 'Push notifications', 'Allow alerts in your browser.')}${sw('weekly', 'Weekly report', 'Receive a report every Monday morning.')}</div></div>
    <div class="pane" data-pane="security"><form class="card" id="pwForm" novalidate style="max-width:640px">${field('Current password', 'cur', 'password', 'autocomplete="current-password"')}${field('New password', 'pw', 'password', 'autocomplete="new-password"', 'Use 8 or more characters with at least one number.')}${field('Confirm new password', 'pw2', 'password', 'autocomplete="new-password"')}<button class="btn primary" type="submit">Update password</button></form></div>
    <div class="pane" data-pane="api"><div class="card" style="max-width:640px"><h3>API key</h3><p class="muted" style="margin:6px 0 14px">Use this key to read your data from other tools. Keep it private.</p><div class="code" id="apiKey">tmp_live_&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;a91f</div><div style="display:flex;gap:10px;margin-top:14px"><button class="btn" data-action="copy-key">Copy key</button><button class="btn danger" data-action="roll-key">Roll key</button></div></div></div>`;
  },
  init(el) {
    bindTabs(el);
    $('#genForm', el).addEventListener('submit', e => { e.preventDefault(); if (!validate(e.target, { workspace: [rule.req('Workspace name'), rule.min(2, 'Workspace name')] })) return; state.prefs.workspace = e.target.workspace.value.trim(); state.prefs.timezone = e.target.timezone.value; store.set('prefs', state.prefs); toast('Settings saved.'); });
    $('#pwForm', el).addEventListener('submit', e => {
      e.preventDefault();
      const ok = validate(e.target, { cur: [rule.req('Current password')], pw: [rule.req('New password'), rule.min(8, 'New password'), v => /\d/.test(v) ? '' : 'Add at least one number.'], pw2: [rule.req('Confirmation'), (v, f) => v === f.pw.value ? '' : 'Passwords do not match.'] });
      if (ok) { e.target.reset(); toast('Password updated.'); }
    });
    el.addEventListener('click', e => {
      const t = e.target.closest('[data-theme-set]'); if (t) { applyTheme(t.dataset.themeSet); $$('[data-theme-set]', el).forEach(b => b.classList.toggle('on', b === t)); return; }
      const a = e.target.closest('[data-accent-set]'); if (a) { setAccent(a.dataset.accentSet); $$('[data-accent-set]', el).forEach(b => b.setAttribute('aria-pressed', b === a)); return; }
      const d = e.target.closest('[data-density-set]'); if (d) { root.dataset.density = d.dataset.densitySet; store.set('density', d.dataset.densitySet); $$('[data-density-set]', el).forEach(b => b.classList.toggle('on', b === d)); }
    });
    el.addEventListener('change', e => { const c = e.target.closest('[data-pref]'); if (c) { state.prefs[c.dataset.pref] = c.checked; store.set('prefs', state.prefs); toast('Preference saved.'); } });
  }
};

/* ----- Profile ----- */
routes.profile = {
  title: 'Your profile',
  render() {
    const u = state.user;
    return head('Your profile', 'How you appear to your team.') + `<div class="grid" style="margin-top:0"><div class="card c4" style="text-align:center">${avatar(u.name, 'lg').replace('class="avatar lg"', 'class="avatar lg" style="margin:0 auto 14px;background:var(--accent)"')}<h3>${esc(u.name)}</h3><p class="muted">${esc(u.email)}</p><p style="margin-top:10px">${pill('Owner', 'accent')}</p></div>
      <form class="card c8" id="profForm" novalidate><div class="form-grid">${field('Full name', 'name', 'text', `value="${esc(u.name)}"`)}${field('Email', 'email', 'email', `value="${esc(u.email)}"`)}${field('Job title', 'title', 'text', `value="${esc(u.title || 'Head of Operations')}"`)}${field('Phone (optional)', 'phone', 'text', `value="${esc(u.phone || '')}"`)}</div><button class="btn primary" type="submit">Save profile</button></form></div>`;
  },
  init(el) {
    $('#profForm', el).addEventListener('submit', e => {
      e.preventDefault(); if (!validate(e.target, { name: [rule.req('Name'), rule.min(2, 'Name')], email: [rule.req('Email'), rule.email], title: [rule.req('Job title')] })) return;
      Object.assign(state.user, { name: e.target.name.value.trim(), email: e.target.email.value.trim(), title: e.target.title.value.trim(), phone: e.target.phone.value.trim() }); store.set('auth', state.user); fillUser(); toast('Profile saved.'); route();
    });
  }
};

/* ----- Help ----- */
routes.help = {
  title: 'Help center',
  render() {
    const cats = ['All', ...new Set(FAQ.map(f => f[0]))];
    return head('Help center', 'Answers to common questions.', `<button class="btn primary" data-action="contact">Contact support</button>`) + `<div class="card"><div class="tbl-bar"><label class="search" style="max-width:none">${icon('search')}<input type="search" id="faqQ" placeholder="Search help articles" aria-label="Search help articles"></label></div><div class="tabs">${cats.map(c => `<button data-tab="${c}">${c}</button>`).join('')}</div><div id="faqList"></div></div>`;
  },
  init(el) {
    let cat = 'All', q = ''; const list = $('#faqList', el);
    const draw = () => {
      const rows = FAQ.filter(f => (cat === 'All' || f[0] === cat) && (f[1] + f[2]).toLowerCase().includes(q));
      list.innerHTML = rows.length ? rows.map((f, i) => `<div class="faq"><button aria-expanded="false" aria-controls="fa${i}">${esc(f[1])}</button><p id="fa${i}" hidden>${esc(f[2])}</p></div>`).join('') : '<p class="muted" style="padding:30px;text-align:center">No articles match. Try fewer words or contact support.</p>';
    };
    $$('[data-tab]', el).forEach(b => b.addEventListener('click', () => { cat = b.dataset.tab; $$('[data-tab]', el).forEach(x => x.classList.toggle('on', x === b)); draw(); }));
    $('[data-tab]', el).classList.add('on');
    $('#faqQ', el).addEventListener('input', e => { q = e.target.value.toLowerCase(); draw(); });
    list.addEventListener('click', e => { const b = e.target.closest('.faq button'); if (!b) return; const open = b.getAttribute('aria-expanded') === 'true'; b.setAttribute('aria-expanded', !open); b.nextElementSibling.hidden = open; });
    draw();
  }
};

/* ----- actions (buttons with data-action) ----- */
const actions = {
  'nav-toggle': toggleSidebar, 'nav-close': () => root.classList.remove('nav-open'), palette: openPalette,
  theme: () => applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'),
  dd(btn) { const m = $('.dd-menu', btn.closest('.dd')); const open = m.hidden; closeDropdowns(); m.hidden = !open; if (open && m.id === 'notifMenu') renderNotifMenu(); },
  signout() { store.set('auth', null); state.user = null; location.hash = ''; showLogin(); },
  range(btn) {
    const p = btn.dataset.p; state.range.preset = p;
    if (p !== 'custom') { state.range.from = iso(days[DAYS - Number(p)].date); state.range.to = iso(days[DAYS - 1].date); }
    route();
  },
  'notif-read-all'() { notes.forEach(n => n.read = true); state.unread = 0; updateBadge(); renderNotifMenu(); routes.notifications._draw && routes.notifications._draw(); toast('All notifications marked as read.'); },
  'export-orders'() { downloadCSV('saas-dashboard-orders.csv', [['Order', 'Customer', 'Product', 'Qty', 'Amount', 'Status', 'Date']].concat(orders.map(o => [o.id, o.customer, o.product, o.qty, o.amount, o.status, o.date.toISOString()]))); toast('Orders exported.'); },
  'add-customer'() {
    openModal({
      title: 'Add customer', body: `<form novalidate>${field('Full name', 'name')}${field('Email', 'email', 'email')}<div class="form-grid">${field('Company', 'company')}${selectField('Plan', 'plan', ['Starter', 'Growth', 'Scale'], 'Growth')}</div></form>`,
      primary: {
        label: 'Add customer', fn(m) {
          const f = $('form', m); if (!validate(f, { name: [rule.req('Name'), rule.min(2, 'Name')], email: [rule.req('Email'), rule.email], company: [rule.req('Company')] })) return false;
          customers.unshift({ id: customers.length + 1, name: f.name.value.trim(), email: f.email.value.trim(), company: f.company.value.trim(), plan: f.plan.value, status: 'Trial', joined: new Date(), orders: 0, spent: 0, health: 60, country: 'United States' });
          toast(f.name.value.trim() + ' was added.'); const t = $('[data-tbl="customers"]'); t && t._draw();
        }
      }
    });
  },
  'add-product'() {
    openModal({
      title: 'Add product', body: `<form novalidate>${field('Product name', 'name')}<div class="form-grid">${field('SKU', 'sku')}${selectField('Category', 'category', ['Audio', 'Wearables', 'Home', 'Accessories'])}${field('Price (USD)', 'price', 'number', 'min="0" step="1"')}${field('Stock', 'stock', 'number', 'min="0" step="1"')}</div></form>`,
      primary: {
        label: 'Add product', fn(m) {
          const f = $('form', m); if (!validate(f, { name: [rule.req('Name')], sku: [rule.req('SKU')], price: [rule.num('Price')], stock: [rule.num('Stock')] })) return false;
          const st = +f.stock.value; products.unshift({ id: products.length + 1, name: f.name.value.trim(), sku: f.sku.value.trim(), category: f.category.value, price: +f.price.value, stock: st, rating: 4.5, sold: 0, status: st < 20 ? 'Low stock' : 'In stock' });
          toast(f.name.value.trim() + ' was added.'); const t = $('[data-tbl="products"]'); t && t._draw();
        }
      }
    });
  },
  invite() {
    openModal({
      title: 'Invite member', body: `<form novalidate>${field('Email', 'email', 'email', 'placeholder="teammate@company.com"')}${selectField('Role', 'role', ['Admin', 'Analyst', 'Support'], 'Analyst')}</form>`,
      primary: {
        label: 'Send invite', fn(m) {
          const f = $('form', m); if (!validate(f, { email: [rule.req('Email'), rule.email, v => team.some(t => t.email === v) ? 'That person is already on your team.' : ''] })) return false;
          const nm = f.email.value.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          team.unshift({ id: team.length + 1, name: nm, role: f.role.value, email: f.email.value.trim(), status: 'Invited', seen: new Date() }); toast('Invite sent to ' + f.email.value.trim()); const t = $('[data-tbl="team"]'); t && t._draw();
        }
      }
    });
  },
  'update-card'() { openModal({ title: 'Update card', body: `<form novalidate>${field('Name on card', 'n')}${field('Card number (demo, nothing is stored)', 'c', 'text', 'inputmode="numeric" placeholder="4242 4242 4242 4242"')}<div class="form-grid">${field('Expiry', 'e', 'text', 'placeholder="MM/YY"')}${field('CVC', 'v', 'text', 'inputmode="numeric"')}</div></form>`, primary: { label: 'Save card', fn(m) { const f = $('form', m); if (!validate(f, { n: [rule.req('Name')], c: [rule.req('Card number'), v => /^\d{13,19}$/.test(v.replace(/\s/g, '')) ? '' : 'Enter 13 to 19 digits.'], e: [rule.req('Expiry'), v => /^(0[1-9]|1[0-2])\/\d{2}$/.test(v) ? '' : 'Use the format MM/YY.'], v: [rule.req('CVC'), v => /^\d{3,4}$/.test(v) ? '' : 'Enter 3 or 4 digits.'] })) return false; toast('Card updated (demo only).'); } } }); },
  'cancel-sub'() { openModal({ title: 'Cancel your plan?', body: '<p>You will lose access to analytics, live pulse and team seats when the period ends.</p>', secondary: 'Keep my plan', primary: { label: 'Cancel plan', fn: () => toast('Cancellation scheduled (demo).', 'bad') } }); },
  'copy-key'() { navigator.clipboard && navigator.clipboard.writeText('tmp_live_demo_key_a91f'); toast('API key copied.'); },
  'roll-key'() { openModal({ title: 'Roll API key?', body: '<p>The old key stops working straight away. Update any tools that use it.</p>', primary: { label: 'Roll key', fn: () => toast('New key created (demo).') } }); },
  contact() { openModal({ title: 'Contact support', body: `<form novalidate>${selectField('Topic', 'topic', ['Billing', 'Data', 'Security', 'Something else'])}<label class="field"><span>How can we help?</span><textarea name="msg" rows="4"></textarea><small class="err"></small></label></form>`, primary: { label: 'Send message', fn(m) { const f = $('form', m); if (!validate(f, { msg: [rule.req('Message'), rule.min(10, 'Message')] })) return false; toast('Message sent. We reply within one working day.'); } } }); },
  shortcuts() { openModal({ title: 'Keyboard shortcuts', secondary: 'Close', body: `<div class="usage">${[['Ctrl / Cmd + K', 'Open the command palette'], ['g then d', 'Go to Dashboard'], ['g then a', 'Go to Analytics'], ['g then c', 'Go to Customers'], ['g then o', 'Go to Orders'], ['g then p', 'Go to Products'], ['g then t', 'Go to Team'], ['g then s', 'Go to Settings'], ['[', 'Collapse or expand sidebar'], ['?', 'Show this list'], ['Esc', 'Close dialogs']].map(s => `<div style="display:flex;justify-content:space-between"><span>${s[1]}</span><kbd>${s[0]}</kbd></div>`).join('')}</div>` }); }
};

/* ---------- 10. ROUTER, AUTH, BOOT ---------- */
const NAV = [['Overview', [['dashboard', 'Dashboard', 'dashboard'], ['analytics', 'Analytics', 'analytics']]], ['Commerce', [['customers', 'Customers', 'customers'], ['orders', 'Orders', 'orders'], ['products', 'Products', 'products']]],
  ['Workspace', [['team', 'Team', 'team'], ['messages', 'Messages', 'messages'], ['notifications', 'Notifications', 'bell']]], ['Account', [['billing', 'Billing', 'card'], ['subscription', 'Subscription', 'layers'], ['settings', 'Settings', 'settings'], ['help', 'Help center', 'help']]]];
function drawNav(active) {
  $('#nav').innerHTML = NAV.map(g => `<div class="nav-group"><div class="nav-title">${g[0]}</div>${g[1].map(l => `<a class="nav-link ${l[0] === active ? 'on' : ''}" href="#/${l[0]}" title="${l[1]}" ${l[0] === active ? 'aria-current="page"' : ''}>${icon(l[2])}<span>${l[1]}</span></a>`).join('')}</div>`).join('');
}
function route() {
  if (!state.user) return;
  cleanups.forEach(fn => fn()); cleanups = []; charts.clear(); closePalette();
  const name = (location.hash.replace('#/', '') || 'dashboard').split('?')[0], r = routes[name] || routes.dashboard, key = routes[name] ? name : 'dashboard';
  const main = $('#main'); main.innerHTML = r.render(); r.init && r.init(main);
  document.title = r.title + ' | Enterprise SaaS Dashboard'; drawNav(key); root.classList.remove('nav-open'); closeDropdowns();
  scrollTo(0, 0); main.focus({ preventScroll: true }); drawPulse();
}
function fillUser() { $('#userName').textContent = state.user.name; $('#userAvatar').textContent = initials(state.user.name); }
function showApp() { $('#login').hidden = true; $('#app').hidden = false; fillUser(); updateBadge(); route(); }
function showLogin() { $('#app').hidden = true; $('#login').hidden = false; drawPulse(); }
function signIn(email, name) { state.user = { email, name }; store.set('auth', state.user); showApp(); toast('Welcome back, ' + name.split(' ')[0] + '.'); }

function boot() {
  $('#navBtn').innerHTML = icon('menu'); $('#searchIcon').innerHTML = icon('search'); $('#bellIcon').innerHTML = icon('bell');
  applyTheme(store.get('theme', 'system'));
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (store.get('theme', 'system') === 'system') applyTheme('system'); });

  document.addEventListener('click', e => {
    const a = e.target.closest('[data-action]'); if (a && actions[a.dataset.action]) { e.preventDefault(); actions[a.dataset.action](a, e); }
    if (!e.target.closest('.dd')) closeDropdowns();
    const n = e.target.closest('.note[data-n]');
    if (n) { const note = notes.find(x => x.id === +n.dataset.n); if (note && !note.read) { note.read = true; state.unread = Math.max(0, state.unread - 1); updateBadge(); n.classList.add('read'); } }
  });
  document.addEventListener('change', e => { if (e.target.id === 'rFrom' || e.target.id === 'rTo') { state.range.from = $('#rFrom').value; state.range.to = $('#rTo').value; if (state.range.from > state.range.to) [state.range.from, state.range.to] = [state.range.to, state.range.from]; route(); } });
  addEventListener('hashchange', route);

  let g = false, gT;
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (state.user) $('#pal') ? closePalette() : openPalette(); return; }
    if (e.key === 'Escape') { closeModal(); closePalette(); closeDropdowns(); root.classList.remove('nav-open'); return; }
    if (!state.user || /input|textarea|select/i.test(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === '?') { actions.shortcuts(); return; }
    if (e.key === '[') { toggleSidebar(); return; }
    if (g) { const m = { d: 'dashboard', a: 'analytics', c: 'customers', o: 'orders', p: 'products', t: 'team', s: 'settings', m: 'messages', n: 'notifications', h: 'help' }[e.key]; g = false; clearTimeout(gT); if (m) location.hash = '#/' + m; return; }
    if (e.key === 'g') { g = true; gT = setTimeout(() => g = false, 900); }
  });

  const lf = $('#loginForm');
  lf.addEventListener('submit', e => { e.preventDefault(); if (!validate(lf, { email: [rule.req('Email'), rule.email], password: [rule.req('Password'), rule.min(6, 'Password')] })) return; const em = lf.email.value.trim(); signIn(em, em.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())); });
  $('#demoLogin').addEventListener('click', () => signIn('alex@saas-dash.dev', 'Alex Morgan'));

  state.user ? showApp() : showLogin();
  drawPulse(); scheduleLive();
}
boot();
