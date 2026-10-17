/* =========================================================
   LARDER — storefront app (vanilla JS, no build step)
   Catalog and pricing live in js/data.js.
   Sections: 1 helpers · 2 state · 3 server API · 4 UI primitives
             5 components · 6 pages · 7 chrome + router · 8 events · 9 boot
   ========================================================= */
'use strict';

/* =========================================================
   1. HELPERS
   ========================================================= */
const IMG_EXT = 'svg';   // images/products/<id>-<view>.svg  (switch to 'jpg' if you add real photos)
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const money = n => '₹' + Math.round(n).toLocaleString('en-IN');
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sum = (a, f) => a.reduce((t, x) => t + f(x), 0);
const grams = l => { const m = l.match(/([\d.]+)\s*(kg|g)/i); return m ? (m[2].toLowerCase() === 'kg' ? m[1] * 1000 : +m[1]) : 100; };
const fmtDate = (d, o = {day: 'numeric', month: 'short'}) => new Date(d).toLocaleDateString('en-IN', o);
const addDays = n => Date.now() + n * 864e5;
const STAGES = [['Order placed', 'We have your order'], ['Packed', 'Sealed and batch-coded'], ['Shipped', 'On its way to your city'], ['Out for delivery', 'Arriving today'], ['Delivered', 'Enjoy!']];
const REVIEWS = [
  {n: 'Anita R.', r: 5, t: 'Fresh, well sealed and arrived in two days. Will reorder.', d: '12 Sep 2026'},
  {n: 'Vikram S.', r: 4, t: 'Good quality. The pack could be a little bigger for the price.', d: '28 Aug 2026'},
  {n: 'Meera K.', r: 5, t: 'Exactly as described. Packaging was neat with a clear batch code.', d: '3 Aug 2026'}
];
const ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  heart: '<path d="M20.8 5.6a5.2 5.2 0 0 0-7.4 0L12 7l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4L12 21.7l8.8-8.7a5.2 5.2 0 0 0 0-7.4z"/>',
  bag: '<path d="M6 7h12l1 13H5L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  scale: '<path d="M12 3v18M5 7h14M5 7l-3 7a3 3 0 0 0 6 0L5 7zM19 7l-3 7a3 3 0 0 0 6 0l-3-7z"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>', plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  truck: '<path d="M2 6h11v10H2zM13 10h4l3 3v3h-7"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>',
  chev: '<path d="M9 6l6 6-6 6"/>', chevd: '<path d="M6 9l6 6 6-6"/>', chevl: '<path d="M15 6l-6 6 6 6"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4-2v-4L3 5z"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  tag: '<path d="M3 12V3h9l9 9-9 9-9-9z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  box: '<path d="M3 8l9-5 9 5v8l-9 5-9-5V8zM3 8l9 5 9-5M12 13v8"/>', pin: '<path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>'
};
const ic = (n, s = 20) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;
const STAR = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2 6.4 20.2l1.1-6.3L2.9 9.5l6.3-.9z"/></svg>';
const stars = r => `<span class="stars" role="img" aria-label="${r} out of 5 stars"><span class="row">${STAR.repeat(5)}</span><span class="f" style="width:${r / 5 * 100}%"><span class="row">${STAR.repeat(5)}</span></span></span>`;
/* Product image: a real file from /images/products. view = front | back | detail | life */
const art = (p, view = 'front', bare = false) => `<img class="pimg" src="images/products/${p.id}-${view}${bare ? '-bare' : ''}.${IMG_EXT}" alt="${esc(p.name)} pack, ${view} view" width="300" height="300" decoding="async">`;

/* =========================================================
   2. STATE (saved in localStorage so a refresh keeps your cart)
   ========================================================= */
const KEY = 'larder.v2';
const seedAddr = () => ({id: 'a1', name: 'Guest Shopper', phone: '9876543210', line: '12, Market Road', city: 'Bengaluru', state: 'Karnataka', pin: '560001', def: true});
function mkOrder(items, t, seeded) {
  const it = items.map(i => { const p = P(i.id); return {...i, price: priceOf(p, i.size), mrp: mrpOf(p, i.size)}; });
  const sub = sum(it, i => i.price * i.qty), ship = sub >= FREE_AT ? 0 : 49;
  return {id: 'LR-' + Math.floor(100000 + Math.random() * 900000), t, items: it, sub, disc: 0, ship, total: sub + ship, coupon: null, addr: seedAddr(), shipOpt: 'std', pay: {m: 'upi', info: 'guest@upi'}, note: '', adv: 0, seed: !!seeded};
}
function seed() {
  return {
    cart: [], wish: [], cmp: [], coupon: null, recent: [], token: '', user: null,
    orders: [mkOrder([{id: 'makhana-pp', size: '100 g', type: 'Himalayan Salt', qty: 3}], Date.now() - 3 * 864e5, true),
             mkOrder([{id: 'atta', size: '5 kg', type: 'Regular', qty: 1}, {id: 'soya-chunks', size: '1 kg', type: '', qty: 2}], Date.now() - 12 * 864e5, true)],
    profile: {name: '', email: '', phone: ''},
    addrs: [seedAddr()]
  };
}
let S; try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
S = S && S.cart ? Object.assign(seed(), S) : seed();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

const cartLines = () => S.cart.filter(c => P(c.id)).map(c => { const p = P(c.id); return {...c, p, price: priceOf(p, c.size), mrp: mrpOf(p, c.size)}; });
const cartCount = () => sum(S.cart, c => c.qty);
const totals = (shipOpt = 'std') => calcTotals(cartLines(), S.coupon, shipOpt);   // same maths the server uses
function addCart(id, size, type, qty = 1) {
  const k = [id, size, type || ''].join('|'), ex = S.cart.find(c => c.k === k);
  if (ex) ex.qty = Math.min(10, ex.qty + qty); else S.cart.push({k, id, size, type: type || '', qty});
  save();
}

/* =========================================================
   3. SERVER API  (server.js — orders + accounts are saved in data/db.json)
   ========================================================= */
const API = location.protocol === 'file:' ? 'http://localhost:3000' : '';
let serverUp = null;
async function api(path, o = {}) {
  const h = {'Content-Type': 'application/json'}; if (S.token) h.Authorization = 'Bearer ' + S.token;
  const r = await fetch(API + path, {method: o.method || 'GET', headers: h, body: o.body ? JSON.stringify(o.body) : undefined});
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || 'Request failed'), {status: r.status});
  return j;
}
const srvText = () => serverUp === false ? 'Shop server not reachable. Orders and accounts are saved on this device only. Run “node server.js” to send them to the shop.' : serverUp ? 'Connected to the shop. Orders are sent to the shop and saved.' : 'Checking the shop server…';
const paintSrv = () => $$('.srv').forEach(e => { e.textContent = srvText(); e.classList.toggle('off', serverUp !== true); });
async function ping() { try { await api('/api/health'); serverUp = true; } catch (e) { serverUp = false; } paintSrv(); }
const fromServer = o => ({id: o.id, t: Date.parse(o.createdAt), items: o.items.map(i => ({id: i.id, size: i.size, type: i.type, qty: i.qty, price: i.price, mrp: i.mrp})), sub: o.subtotal, disc: o.discount, ship: o.shipping, total: o.total, coupon: o.coupon, addr: {id: '', name: o.customer.name, phone: o.customer.phone, ...o.address}, shipOpt: o.shipOpt, pay: {m: o.payment.method, info: o.payment.info}, note: o.note, adv: 0, synced: true, srv: o.status});
async function syncOrders() {                       // pull this user's orders from the shop (if signed in)
  if (!S.token) return false; let changed = false;
  try {
    const {orders} = await api('/api/my-orders');
    orders.forEach(so => { const i = S.orders.findIndex(o => o.id === so.id), n = fromServer(so); if (i < 0) { S.orders.push(n); changed = true; } else if (S.orders[i].srv !== so.status) { S.orders[i].srv = so.status; S.orders[i].synced = true; changed = true; } });
    S.orders.sort((a, b) => b.t - a.t); if (changed) save();
  } catch (e) { if (e.status === 401) { S.token = ''; S.user = null; save(); } }
  return changed;
}

/* =========================================================
   4. UI PRIMITIVES: toast, fly-to-cart, badges, drawer, modal
   ========================================================= */
function toast({msg, sub = '', act, fn, ms = 3600, icon = 'check'}) {
  const box = $('#toasts'), el = document.createElement('div');
  el.className = 'toast'; el.style.setProperty('--ms', ms + 'ms');
  el.innerHTML = `<span class="tic">${ic(icon, 16)}</span><div><b>${esc(msg)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>${act ? `<button class="act">${esc(act)}</button>` : ''}`;
  box.append(el);
  const kill = () => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, t = setTimeout(kill, ms);
  $('.act', el)?.addEventListener('click', () => { clearTimeout(t); kill(); fn && fn(); });
  while (box.children.length > 3) box.firstChild.remove();
}
function setCnt(sel, n, bump) {
  const el = $(sel); if (!el) return;
  el.textContent = n; el.classList.toggle('show', n > 0);
  if (bump) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); const b = el.parentElement; b.classList.remove('wig'); void b.offsetWidth; b.classList.add('wig'); }
}
function updateBadges(bump) {
  setCnt('#cartCount', cartCount(), bump); setCnt('#wishCount', S.wish.length, false);
  $('#cartBtn')?.setAttribute('aria-label', `Open cart, ${cartCount()} items`);
  renderTray();
}
const srcOf = btn => (btn && btn.closest('[data-src]')?.querySelector('.art')) || btn;
function fly(src, p) {
  return new Promise(res => {
    const tgt = $('#cartBtn'); if (!src || !tgt || reduce) return res();
    const a = src.getBoundingClientRect(), b = tgt.getBoundingClientRect(), size = Math.min(96, Math.max(56, a.width));
    const el = document.createElement('div'); el.className = 'fly'; el.innerHTML = art(p);
    el.style.cssText = `width:${size}px;height:${size}px;left:${a.left + a.width / 2 - size / 2}px;top:${a.top + a.height / 2 - size / 2}px`;
    document.body.append(el);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const an = el.animate([
      {transform: 'translate(0,0) scale(1) rotate(0)', opacity: 1},
      {transform: `translate(${dx * .5}px,${dy * .5 - 110}px) scale(.7) rotate(-14deg)`, opacity: 1, offset: .5},
      {transform: `translate(${dx}px,${dy}px) scale(.12) rotate(12deg)`, opacity: .5}
    ], {duration: 800, easing: 'cubic-bezier(.45,0,.3,1)'});
    an.onfinish = an.oncancel = () => { el.remove(); res(); };
  });
}
/* Product → button → fly → badge +1 → toast */
async function addToCart(id, size, type, qty, btn) {
  const p = P(id); addCart(id, size, type, qty);
  if (btn && btn.classList) { btn.classList.add('done'); setTimeout(() => btn.classList.remove('done'), 1500); }
  await fly(srcOf(btn), p);
  updateBadges(true); renderDrawer();
  if (/^\/cart/.test(location.hash.slice(1))) route(true);
  toast({msg: `${p.name} added`, sub: [size, type].filter(Boolean).join(' · '), act: 'View cart', fn: openDrawer});
}
function burst(btn) {
  if (reduce || !btn) return;
  const cols = ['#D8432C', '#F4A91F', '#F27B6B', '#0E5A3C'];
  for (let i = 0; i < 9; i++) {
    const s = document.createElement('span'); s.className = 'pt'; s.style.background = cols[i % 4]; btn.append(s);
    const a = i / 9 * 6.283, d = 26 + Math.random() * 12;
    s.animate([{transform: 'translate(0,0) scale(1)', opacity: 1}, {transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d}px) scale(0)`, opacity: 0}], {duration: 600, easing: 'cubic-bezier(.2,.8,.3,1)'}).onfinish = () => s.remove();
  }
}
function confetti() {
  if (reduce) return;
  const cols = ['#0E5A3C', '#F4A91F', '#D8432C', '#6BB38A', '#fff'];
  for (let i = 0; i < 46; i++) {
    const s = document.createElement('i'); s.className = 'cf'; s.style.background = cols[i % cols.length]; s.style.left = (30 + Math.random() * 40) + 'vw'; s.style.top = '28vh'; document.body.append(s);
    s.animate([{transform: 'translate(0,0) rotate(0)', opacity: 1}, {transform: `translate(${(Math.random() - .5) * 560}px,${240 + Math.random() * 380}px) rotate(${Math.random() * 720}deg)`, opacity: 0}], {duration: 1400 + Math.random() * 900, easing: 'cubic-bezier(.2,.7,.4,1)'}).onfinish = () => s.remove();
  }
}
let lastFocus = null;
const lock = () => { document.body.style.overflow = ($('#modal.open') || $('#drawer.open') || $('#filters.open')) ? 'hidden' : ''; };
function openDrawer() { renderDrawer(); closeModal(); lastFocus = document.activeElement; $('#drawer').classList.add('open'); $('#drawer').setAttribute('aria-hidden', 'false'); $('#scrim').classList.add('on'); lock(); setTimeout(() => $('#drawer [data-a="closeDrawer"]')?.focus(), 60); }
function closeDrawer() { $('#drawer').classList.remove('open'); $('#drawer').setAttribute('aria-hidden', 'true'); if (!$('#filters.open')) $('#scrim').classList.remove('on'); lock(); lastFocus?.focus?.(); lastFocus = null; }
function openModal(html) { lastFocus = document.activeElement; $('#modalBox').innerHTML = `<button class="ib mx" data-a="closeModal" aria-label="Close">${ic('x')}</button>` + html; $('#modal').classList.add('open'); lock(); setTimeout(() => $('#modalBox .mx')?.focus(), 40); }
function closeModal() { if (!$('#modal.open')) return; $('#modal').classList.remove('open'); lock(); lastFocus?.focus?.(); lastFocus = null; }
function closeFilters() { $('#filters')?.classList.remove('open'); if (!$('#drawer.open')) $('#scrim').classList.remove('on'); lock(); }
function closeMega() { $('#mega')?.classList.remove('open'); $('.shop-btn')?.setAttribute('aria-expanded', 'false'); }
function toggleMega(force) { const m = $('#mega'), o = force ?? !m.classList.contains('open'); m.classList.toggle('open', o); $('.shop-btn').setAttribute('aria-expanded', o); }

/* =========================================================
   5. SHARED COMPONENTS
   ========================================================= */
function card(p, i = 0) {
  const w = S.wish.includes(p.id), c = S.cmp.includes(p.id), d = disc(p), out = p.stock <= 0;
  return `<article class="card" data-src data-id="${p.id}" style="--i:${Math.min(i, 12)}">
    <div class="art-wrap" style="background:${p.tint}"><a class="art" href="#/product/${p.id}" aria-label="${esc(p.name)}">${art(p)}</a>
      ${p.badge ? `<span class="badge ${p.badge === 'New' ? 'new' : p.badge === 'Top rated' ? 'top' : ''}">${p.badge}</span>` : ''}${d >= 5 ? `<span class="off" style="${p.badge ? '' : 'top:12px'}">-${d}%</span>` : ''}
      <button class="heart ${w ? 'on' : ''}" data-a="wish" data-id="${p.id}" aria-label="${w ? 'Remove from' : 'Add to'} wishlist: ${esc(p.name)}" aria-pressed="${w}">${ic('heart', 19)}</button>
      <button class="qv-btn" data-a="quick" data-id="${p.id}">${ic('eye', 16)} Quick view</button></div>
    <div class="card-b"><div class="brand">${p.brand}</div><h3><a href="#/product/${p.id}">${esc(p.name)}</a></h3>
      <div class="rt">${stars(p.rating)}<span>${p.rating} (${p.reviews.toLocaleString('en-IN')})</span></div>
      <div class="pr"><b>${money(p.price)}</b><s>${money(p.mrp)}</s><small>/ ${baseSize(p).l}</small></div>
      <div class="card-act">${out ? `<button class="btn sec sm" disabled>Out of stock</button>` : `<button class="btn pri sm add" data-a="add" data-id="${p.id}"><span class="l1">${ic('bag', 16)} Add</span><span class="l2">${ic('check', 16)} Added</span></button>`}
        <label class="cmp"><input type="checkbox" data-a="cmp" value="${p.id}" ${c ? 'checked' : ''}> Compare</label></div></div></article>`;
}
const priceHTML = (p, size) => { const pr = priceOf(p, size); return `<b>${money(pr)}</b><s>${money(mrpOf(p, size))}</s><span class="sv">Save ${disc(p)}%</span><small>${money(pr / grams(size) * 100)} per 100 g · inclusive of taxes</small>`; };
function variantsHTML(p, st) {
  return (p.types.length ? `<div class="vgrp"><h4>${p.tl}: <span class="js-tv">${esc(st.type)}</span></h4><div class="pills" role="radiogroup" aria-label="${p.tl}">${p.types.map(t => `<button type="button" class="pill ${t === st.type ? 'on' : ''}" role="radio" aria-checked="${t === st.type}" data-a="pick" data-pk="type" data-v="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>` : '') +
    `<div class="vgrp"><h4>Pack size</h4><div class="pills" role="radiogroup" aria-label="Pack size">${sizesOf(p).map(s => `<button type="button" class="pill ${s.l === st.size ? 'on' : ''}" role="radio" aria-checked="${s.l === st.size}" data-a="pick" data-pk="size" data-v="${s.l}">${s.l}<small>${money(priceOf(p, s.l))}</small></button>`).join('')}</div></div>`;
}
const cpnHTML = () => { const c = S.coupon; return `<div class="cpn">${c ? `<div class="cpn-on"><span>${ic('tag', 16)} <b>${c}</b> applied</span><button class="ib sm" data-a="cpnrm" aria-label="Remove coupon">${ic('x', 16)}</button></div>` : `<form class="cpn-f" data-form="coupon"><input class="cpn-in" placeholder="Coupon code" aria-label="Coupon code" autocomplete="off"><button class="btn sec sm" type="submit">Apply</button></form>`}<p class="cpn-err" role="alert"></p><ul class="cpn-list">${Object.entries(COUPONS).filter(([k]) => k !== c).map(([k, v]) => `<li><button type="button" data-a="cpn" data-c="${k}"><b>${k}</b><span>${v.d}</span></button></li>`).join('')}</ul></div>`; };
function shipBar(t) {
  const left = FREE_AT - t.sub, ok = t.sub >= FREE_AT || t.free;
  return `<div class="pbar">${t.sub === 0 ? 'Free delivery on orders above ' + money(FREE_AT) : ok ? '<b>Free delivery unlocked.</b> Nice.' : `Add <b>${money(left)}</b> more for free delivery`}<i style="--w:${ok ? 100 : Math.min(100, t.sub / FREE_AT * 100)}%"></i></div>`;
}
function sumRows(t, shipLabel) {
  return `<div class="sumr"><span>Subtotal</span><span>${money(t.sub)}</span></div>${t.disc ? `<div class="sumr g"><span>Coupon ${t.applied}</span><span>-${money(t.disc)}</span></div>` : ''}${t.pending > 0 ? `<p class="note">Add ${money(t.pending)} more to use ${S.coupon}</p>` : ''}<div class="sumr"><span>${shipLabel || 'Delivery'}</span><span>${t.ship ? money(t.ship) : 'Free'}</span></div><div class="sumr tot"><span>Total</span><span>${money(t.total)}</span></div>${t.saved > 0 ? `<div class="sumr g"><span>You save</span><span>${money(t.saved)}</span></div>` : ''}`;
}
function lineHTML(l, big) {
  return `<li class="line"><a class="th" href="#/product/${l.id}" style="background:${l.p.tint}">${art(l.p)}</a>
    <div><h4><a href="#/product/${l.id}">${esc(l.p.name)}</a></h4><small>${[l.size, l.type].filter(Boolean).join(' · ')}</small>
      <div class="acts"><div class="qty"><button data-a="qty" data-k="${l.k}" data-d="-1" aria-label="Decrease quantity">${ic('minus', 16)}</button><span aria-live="polite">${l.qty}</span><button data-a="qty" data-k="${l.k}" data-d="1" aria-label="Increase quantity">${ic('plus', 16)}</button></div>
      <button class="lnk" data-a="rm" data-k="${l.k}">${ic('trash', 15)} Remove</button>${big ? `<button class="lnk" data-a="tow" data-k="${l.k}">${ic('heart', 15)} Save for later</button>` : ''}</div></div>
    <div class="lp">${money(l.price * l.qty)}${l.mrp > l.price ? `<small><s>${money(l.mrp * l.qty)}</s></small>` : ''}</div></li>`;
}
function renderDrawer() {
  const L = cartLines(), t = totals(), n = cartCount();
  $('#drawer').innerHTML = `<div class="dh"><h2>Your cart <small>(${n})</small></h2><button class="ib" data-a="closeDrawer" aria-label="Close cart">${ic('x')}</button></div>` + (L.length ?
    `<div class="db">${shipBar(t)}<ul>${L.map(l => lineHTML(l)).join('')}</ul>${cpnHTML()}</div><div class="df">${sumRows(t)}<div class="actions"><a class="btn sec" href="#/cart" style="flex:1" data-a="closeDrawer">View cart</a><a class="btn pri" href="#/checkout" style="flex:1.4" data-a="closeDrawer">Checkout</a></div></div>` :
    `<div class="db"><div class="empty" style="margin-top:20px"><h2>Your cart is empty</h2><p>Add a few staples and they will show up here.</p><div class="chips">${CATS.map(c => `<a class="chip" href="#/category/${c.id}" data-a="closeDrawer">${c.name}</a>`).join('')}</div></div></div>`);
}
function refreshCart() {
  updateBadges(); renderDrawer();
  const r = location.hash.slice(1);
  if (r.startsWith('/cart')) route(true); else if (r.startsWith('/checkout')) { const s = $('#ckSum'); s ? s.innerHTML = ckSum() : route(true); }
}
function renderTray() {
  const t = $('#tray'), ids = S.cmp;
  t.classList.toggle('on', ids.length > 0); document.body.classList.toggle('tray', ids.length > 0);
  t.innerHTML = ids.length ? `<div class="tt">${ids.map(id => `<span class="tth" style="background:${P(id).tint}">${art(P(id))}<button data-a="trayrm" data-id="${id}" aria-label="Remove ${esc(P(id).name)} from comparison">${ic('x', 12)}</button></span>`).join('')}</div><span class="tl">${ids.length} of 3 selected</span><button class="btn pri sm" data-a="cmpopen" ${ids.length < 2 ? 'disabled' : ''}>Compare</button><button class="ib sm" data-a="cmpclear" aria-label="Clear comparison">${ic('x', 16)}</button>` : '';
}
const syncCmp = () => $$('[data-a="cmp"]').forEach(i => i.checked = S.cmp.includes(i.value));
function openCompare() {
  const L = S.cmp.map(P), best = (f, mode) => { const v = L.map(f); return mode === 'min' ? Math.min(...v) : Math.max(...v); };
  const row = (label, f, fmt, mode) => { const b = mode ? best(f, mode) : null; return `<tr><th scope="row">${label}</th>${L.map(p => `<td class="${mode && f(p) === b ? 'best' : ''}">${fmt(p)}</td>`).join('')}</tr>`; };
  openModal(`<div class="cmp-w"><h2 style="margin-bottom:14px">Compare products</h2><table class="cmp-t"><thead><tr><th></th>${L.map(p => `<th scope="col"><a class="art" href="#/product/${p.id}" style="background:${p.tint}">${art(p)}</a><a href="#/product/${p.id}">${esc(p.name)}</a></th>`).join('')}</tr></thead><tbody>
    ${row('Price', p => p.price, p => `${money(p.price)} <small>/ ${baseSize(p).l}</small>`, 'min')}
    ${row('Discount', p => disc(p), p => disc(p) + '% off', 'max')}
    ${row('Rating', p => p.rating, p => `${p.rating} ★ <small>(${p.reviews.toLocaleString('en-IN')})</small>`, 'max')}
    ${row('Protein / 100 g', p => p.protein, p => p.protein + ' g', 'max')}
    ${row('Shelf life', p => 0, p => p.shelf)}${row('Origin', p => 0, p => p.origin)}${row('Brand', p => 0, p => p.brand)}
    ${row('Pack sizes', p => 0, p => sizesOf(p).map(s => s.l).join(', '))}
    <tr><th></th>${L.map(p => `<td>${p.stock > 0 ? `<button class="btn pri sm add" data-a="add" data-id="${p.id}"><span class="l1">${ic('bag', 16)} Add</span><span class="l2">${ic('check', 16)} Added</span></button>` : 'Out of stock'}</td>`).join('')}</tr></tbody></table></div>`);
}

/* ----- search ----- */
const searchP = q => { const t = q.toLowerCase().split(/\s+/).filter(Boolean); return PRODUCTS.filter(p => { const h = (p.name + ' ' + p.brand + ' ' + catOf(p.cat).name + ' ' + p.sub + ' ' + p.tags + ' ' + p.types.join(' ')).toLowerCase(); return t.every(w => h.includes(w)); }); };
function suggest(v) {
  const box = $('#sug'); v = v.trim(); if (!v) return box.classList.remove('open');
  const r = searchP(v).slice(0, 5);
  box.innerHTML = (r.length ? r.map(p => `<a href="#/product/${p.id}"><span class="th" style="background:${p.tint}">${art(p)}</span><span><b>${esc(p.name)}</b><small>${p.brand} · ${money(p.price)}</small></span></a>`).join('') : `<p class="none">No matches for “${esc(v)}”</p>`) + `<a class="all" href="#/search?q=${encodeURIComponent(v)}">See all results for “${esc(v)}”</a>`;
  box.classList.add('open');
}

/* =========================================================
   6. PAGES
   ========================================================= */
let Q = {}, cleanup = null;
const nf = () => ({title: 'Page not found', html: `<div class="wrap"><div class="empty" style="margin:40px 0"><h2>We could not find that page</h2><p>The link may be old, or the product may have moved.</p><a class="btn pri" href="#/products">Browse all products</a></div></div>`});

/* ----- Home ----- */
function home() {
  const hero = ['soya-chunks', 'makhana-pp', 'atta'].map(P), best = [...PRODUCTS].sort((a, b) => b.reviews - a.reviews).slice(0, 8), rec = S.recent.map(P).filter(Boolean).slice(0, 4);
  const h1 = 'Stock the kitchen once. Eat well all month.'.split(' ').map((w, i) => `<span style="--w:${i}">${w}</span>`).join(' ');
  return {title: 'Everyday staples, sorted', html: `
  <section class="wrap hero"><div><h1>${h1}</h1><p>Flours, dals, soya, makhana and seeds. Packed at the source and delivered sealed to your door.</p>
    <div class="chips">${[['High protein', '/search?q=protein'], ['Under ₹150', '/products?max=150'], ['Millets', '/category/grains?sub=Millets'], ['Snacks', '/category/snacks'], ['Top rated', '/products?sort=rating']].map(c => `<a class="chip" href="#${c[1]}">${c[0]}</a>`).join('')}</div></div>
    <div class="stage" aria-label="Featured products. Try adding one.">${hero.map((p, i) => `<div class="hp hp${i + 1}" data-src style="--n:${i}"><a class="art" href="#/product/${p.id}">${art(p, 'front', true)}</a><button class="btn sun sm add" data-a="add" data-id="${p.id}"><span class="l1">${ic('plus', 16)} ${money(p.price)}</span><span class="l2">${ic('check', 16)} Added</span></button></div>`).join('')}</div></section>
  <section class="wrap sec reveal"><div class="sec-h"><h2>Shop by aisle</h2></div><div class="tiles">${CATS.map(c => `<a class="tile" href="#/category/${c.id}" style="--t:${P(c.pid).tint}"><span class="tl-art">${art(P(c.pid), 'front', true)}</span><h3>${c.name}</h3><p>${c.blurb}</p></a>`).join('')}</div></section>
  <section class="wrap sec reveal"><div class="sec-h"><div><h2>Bestsellers</h2><p>What other kitchens reorder most.</p></div><div class="rail-btns"><button class="ib" data-a="rail" data-d="-1" aria-label="Scroll left">${ic('chevl')}</button><button class="ib" data-a="rail" data-d="1" aria-label="Scroll right">${ic('chev')}</button></div></div><div class="rail" id="rail" tabindex="0" aria-label="Bestsellers">${best.map(card).join('')}</div></section>
  <section class="wrap sec reveal"><div class="deal"><div><h2>Your first order, up to ₹150 lighter</h2><p>Code WELCOME10 takes 10% off orders above ₹299.</p></div><button class="btn sun lg" data-a="applyhero">Apply WELCOME10</button></div></section>
  ${rec.length ? `<section class="wrap sec reveal"><div class="sec-h"><h2>Pick up where you left off</h2></div><div class="grid">${rec.map(card).join('')}</div></section>` : ''}
  <section class="wrap sec reveal"><div class="perks"><div class="perk">${ic('shield', 26)}<div><b>Sealed and batch-coded</b><span>Every pack carries a batch number you can trace.</span></div></div><div class="perk">${ic('truck', 26)}<div><b>Free delivery above ${money(FREE_AT)}</b><span>Standard in 3–5 days, express next day.</span></div></div><div class="perk">${ic('box', 26)}<div><b>7-day returns on sealed packs</b><span>Wrong item or damaged in transit? We replace it.</span></div></div></div></section>`};
}

/* ----- Listing (all products, category, search) ----- */
let F = {};
const SORTS = [['rel', 'Most popular'], ['price', 'Price: low to high'], ['price-d', 'Price: high to low'], ['rating', 'Top rated'], ['disc', 'Biggest discount']];
function listing(o) {
  const c = o.cat ? catOf(o.cat) : null; if (o.cat && !c) return nf();
  F = {cat: c ? [c.id] : [], sub: c ? (Q.sub || '') : '', brand: [], min: 0, max: Math.min(MAXP, +Q.max || MAXP), rate: 0, stock: false, sort: SORTS.some(s => s[0] === Q.sort) ? Q.sort : 'rel', q: o.search ? (Q.q || '') : ''};
  const title = c ? (F.sub || c.name) : o.search ? `Results for “${F.q}”` : 'All products';
  return {title, html: `<div class="wrap"><div class="pghead"><div class="crumbs"><a href="#/">Home</a>${c ? `<span><a href="#/category/${c.id}">${c.name}</a></span>` : '<span>Products</span>'}${F.sub ? `<span>${esc(F.sub)}</span>` : ''}</div><h1>${esc(title)}</h1>${c && !F.sub ? `<p>${c.blurb}.</p>` : ''}</div>
    <div class="plp"><aside class="filters" id="filters" aria-label="Filters">${filtersHTML()}</aside><section>
      <div class="tb"><button class="btn sec sm fbtn" data-a="filters">${ic('filter', 16)} Filters</button><p id="rc" aria-live="polite"></p><label class="sort">Sort <select data-f="sort">${SORTS.map(s => `<option value="${s[0]}" ${F.sort === s[0] ? 'selected' : ''}>${s[1]}</option>`).join('')}</select></label></div>
      <div class="fchips" id="chips"></div><div id="results"></div></section></div></div>`,
    after() { $('#q').value = o.search ? F.q : ''; renderResults(); }};
}
const optH = (f, v, l, n, on) => `<label class="opt"><input type="checkbox" data-f="${f}" value="${esc(v)}" ${on ? 'checked' : ''}>${esc(l)}<small>${n}</small></label>`;
function filtersHTML() {
  return `<div class="fh"><h3>Filters</h3><button class="btn ghost sm" data-a="clearf">Clear all</button></div>
  <div class="fg"><h4>Category</h4>${CATS.map(c => optH('cat', c.id, c.name, PRODUCTS.filter(p => p.cat === c.id).length, F.cat.includes(c.id))).join('')}</div>
  <div class="fg"><h4>Brand</h4>${BRANDS.map(b => optH('brand', b, b, PRODUCTS.filter(p => p.brand === b).length, F.brand.includes(b))).join('')}</div>
  <div class="fg"><h4>Price</h4><div class="rl"><span id="pmin">${money(F.min)}</span><span id="pmax">${money(F.max)}</span></div><div class="rng" id="rng" style="--a:${F.min / MAXP * 100}%;--b:${F.max / MAXP * 100}%"><span class="tr"></span><span class="fl"></span><input type="range" data-f="min" min="0" max="${MAXP}" step="10" value="${F.min}" aria-label="Minimum price"><input type="range" data-f="max" min="0" max="${MAXP}" step="10" value="${F.max}" aria-label="Maximum price"></div></div>
  <div class="fg"><h4>Rating</h4>${[4.5, 4, 3, 0].map(r => `<label class="opt"><input type="radio" name="rate" data-f="rate" value="${r}" ${F.rate === r ? 'checked' : ''}>${r ? `${stars(r)}<span>${r} &amp; up</span>` : 'Any rating'}</label>`).join('')}</div>
  <div class="fg"><label class="opt"><input type="checkbox" data-f="stock" ${F.stock ? 'checked' : ''}>In stock only</label></div>
  <button class="btn pri block mfa" data-a="filters">Show results</button>`;
}
function filtered() {
  const qs = F.q ? new Set(searchP(F.q)) : null;
  const r = PRODUCTS.filter(p => (!F.cat.length || F.cat.includes(p.cat)) && (!F.sub || p.sub === F.sub) && (!F.brand.length || F.brand.includes(p.brand)) && p.price >= F.min && p.price <= F.max && p.rating >= F.rate && (!F.stock || p.stock > 0) && (!qs || qs.has(p)));
  const s = {rel: (a, b) => b.reviews - a.reviews, price: (a, b) => a.price - b.price, 'price-d': (a, b) => b.price - a.price, rating: (a, b) => b.rating - a.rating || b.reviews - a.reviews, disc: (a, b) => disc(b) - disc(a)}[F.sort];
  return r.sort(s);
}
function renderResults() {
  const L = filtered(); $('#rc').textContent = `${L.length} product${L.length === 1 ? '' : 's'}`;
  const ch = [];
  F.cat.forEach(v => ch.push(['cat', v, catOf(v).name])); if (F.sub) ch.push(['sub', '', F.sub]); F.brand.forEach(v => ch.push(['brand', v, v]));
  if (F.min > 0 || F.max < MAXP) ch.push(['price', '', `${money(F.min)} – ${money(F.max)}`]); if (F.rate) ch.push(['rate', '', `${F.rate}★ & up`]); if (F.stock) ch.push(['stock', '', 'In stock']); if (F.q) ch.push(['q', '', `“${F.q}”`]);
  $('#chips').innerHTML = ch.map(c => `<button data-a="unf" data-k="${c[0]}" data-v="${esc(c[1])}" aria-label="Remove filter ${esc(c[2])}">${esc(c[2])} ${ic('x', 14)}</button>`).join('');
  $('#results').innerHTML = L.length ? `<div class="grid">${L.map(card).join('')}</div>` : `<div class="empty"><h2>No products match</h2><p>Try removing a filter or widening the price range.</p><button class="btn pri" data-a="clearf">Clear all filters</button></div>`;
  $$('.mfa').forEach(b => b.textContent = `Show ${L.length} result${L.length === 1 ? '' : 's'}`);
}
const resetFilterUI = () => { $('#filters').innerHTML = filtersHTML(); renderResults(); };

/* ----- Product detail ----- */
let pd = {}, qv = {};
function pdp(id) {
  const p = P(id); if (!p) return nf();
  S.recent = [id, ...S.recent.filter(x => x !== id)].slice(0, 8); save();
  pd = {id, size: baseSize(p).l, type: p.types[0] || '', qty: 1, view: 'front'};
  const c = catOf(p.cat), rel = PRODUCTS.filter(x => x.id !== id && x.cat === p.cat).concat(PRODUCTS.filter(x => x.id !== id && x.cat !== p.cat)).slice(0, 4), rv = S.recent.filter(x => x !== id).map(P).slice(0, 4);
  const d = (r => { const k = 1 - r / 5, w = [Math.pow(r / 5, 8), Math.pow(r / 5, 4) * .6, .75 * k, .3 * k, .15 * k], t = sum(w, x => x); return w.map(x => Math.round(x / t * 100)); })(p.rating);
  const hlts = [`${p.protein} g protein per 100 g`, `Origin: ${p.origin}`, `Shelf life: ${p.shelf}`, 'Vacuum-sealed and batch-coded'];
  return {title: p.name, html: `<div class="wrap"><div class="pghead" style="padding-bottom:6px"><div class="crumbs"><a href="#/">Home</a><span><a href="#/category/${c.id}">${c.name}</a></span><span><a href="#/category/${c.id}?sub=${encodeURIComponent(p.sub)}">${p.sub}</a></span><span>${esc(p.name)}</span></div></div>
  <div class="pd" data-src>
    <div class="gal"><div class="thumbs" role="group" aria-label="Product images">${[['front', 'Front'], ['back', 'Back'], ['detail', 'Close-up'], ['life', 'Serving']].map(v => `<button class="${v[0] === 'front' ? 'on' : ''}" data-a="view" data-v="${v[0]}" style="background:${p.tint}" aria-label="${v[1]} view" aria-pressed="${v[0] === 'front'}">${art(p, v[0])}</button>`).join('')}</div>
      <div class="gal-main art" id="galMain" style="background:${p.tint}">${art(p, 'front')}</div></div>
    <div class="info" data-ctx="pd"><a class="brand" href="#/search?q=${encodeURIComponent(p.brand)}">${p.brand}</a><h1>${esc(p.name)}</h1>
      <div class="rt">${stars(p.rating)}<span>${p.rating} · <a href="#/product/${p.id}" data-a="tab" data-t="rev" style="text-decoration:underline">${p.reviews.toLocaleString('en-IN')} reviews</a></span></div>
      <div class="pdp-price js-price">${priceHTML(p, pd.size)}</div>
      ${variantsHTML(p, pd)}
      <div class="buyrow"><div class="qty"><button data-a="pdq" data-d="-1" aria-label="Decrease quantity">${ic('minus', 16)}</button><span id="pdQty" aria-live="polite">1</span><button data-a="pdq" data-d="1" aria-label="Increase quantity">${ic('plus', 16)}</button></div>
        ${p.stock > 0 ? `<button class="btn pri lg add" data-a="addsel" data-ctx="pd"><span class="l1">${ic('bag')} Add to cart</span><span class="l2">${ic('check')} Added</span></button>` : `<button class="btn sec lg" style="flex:1" disabled>Out of stock</button>`}
        <button class="heart inline ${S.wish.includes(id) ? 'on' : ''}" data-a="wish" data-id="${id}" aria-label="Save to wishlist" aria-pressed="${S.wish.includes(id)}">${ic('heart', 22)}</button></div>
      ${p.stock > 0 ? `<button class="btn sec block" style="margin-top:10px" data-a="buy">Buy now</button>` : ''}
      <div class="dlv"><b>${ic('pin', 16)} Check delivery</b><form data-form="pin"><input id="pin" inputmode="numeric" maxlength="6" placeholder="Enter PIN code" aria-label="PIN code"><button class="btn sec sm" type="submit">Check</button></form><p id="pinMsg" role="status"></p></div>
      <div class="pk"><div>${ic('truck', 18)} Free delivery above ${money(FREE_AT)}</div><div>${ic('shield', 18)} Sealed and batch-coded at the plant</div><div>${ic('box', 18)} 7-day returns on sealed packs</div></div></div></div>
  <div class="tabs" role="tablist"><button class="on" role="tab" data-a="tab" data-t="desc" aria-selected="true">Description</button><button role="tab" data-a="tab" data-t="spec" aria-selected="false">Specifications</button><button role="tab" data-a="tab" data-t="rev" aria-selected="false">Reviews (${p.reviews.toLocaleString('en-IN')})</button></div>
  <div class="tp" id="tp-desc"><p>${esc(p.desc)}</p><ul>${hlts.map(h => `<li>${h}</li>`).join('')}</ul></div>
  <div class="tp" id="tp-spec" hidden><table class="spec"><tr><th>Brand</th><td>${p.brand}</td></tr><tr><th>Pack sizes</th><td>${sizesOf(p).map(s => s.l).join(', ')}</td></tr><tr><th>Protein per 100 g</th><td>${p.protein} g</td></tr><tr><th>Shelf life</th><td>${p.shelf}</td></tr><tr><th>Origin</th><td>${p.origin}</td></tr><tr><th>Diet</th><td>Vegetarian</td></tr><tr><th>Storage</th><td>Keep cool and dry. Reseal after opening.</td></tr></table></div>
  <div class="tp" id="tp-rev" hidden style="max-width:none"><div class="rvs"><div><div class="big">${p.rating}</div>${stars(p.rating)}<p style="color:var(--muted)">${p.reviews.toLocaleString('en-IN')} ratings</p>${[5, 4, 3, 2, 1].map((s, i) => `<div class="bar5"><span>${s}★</span><i style="--w:${d[i]}%"></i><span>${d[i]}%</span></div>`).join('')}</div><div>${REVIEWS.map(r => `<div class="rv"><b>${r.n}</b>${stars(r.r)} <small>${r.d}</small><p>${r.t}</p></div>`).join('')}</div></div></div>
  <section class="sec reveal"><div class="sec-h"><h2>You may also like</h2></div><div class="grid">${rel.map(card).join('')}</div></section>
  ${rv.length ? `<section class="sec reveal"><div class="sec-h"><h2>Recently viewed</h2></div><div class="grid">${rv.map(card).join('')}</div></section>` : ''}</div>`,
    after() { const g = $('#galMain'); g.addEventListener('mousemove', e => { if (!matchMedia('(hover:hover)').matches) return; const r = g.getBoundingClientRect(); g.classList.add('zoomed'); g.style.setProperty('--zx', (e.clientX - r.left) / r.width * 100 + '%'); g.style.setProperty('--zy', (e.clientY - r.top) / r.height * 100 + '%'); }); g.addEventListener('mouseleave', () => g.classList.remove('zoomed')); }};
}
function pickRefresh(ctx) {
  const st = ctx === 'qv' ? qv : pd, p = P(st.id), root = $(`[data-ctx="${ctx}"]`); if (!root) return;
  $$('[data-pk]', root).forEach(b => { const on = (b.dataset.pk === 'size' ? st.size : st.type) === b.dataset.v; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
  $('.js-price', root).innerHTML = priceHTML(p, st.size); const tv = $('.js-tv', root); if (tv) tv.textContent = st.type;
}
function quickView(id) {
  const p = P(id); qv = {id, size: baseSize(p).l, type: p.types[0] || '', qty: 1};
  openModal(`<div class="qv" data-src><a class="art" href="#/product/${id}" style="background:${p.tint}">${art(p)}</a><div data-ctx="qv"><div class="brand">${p.brand}</div><h2>${esc(p.name)}</h2><div class="rt">${stars(p.rating)}<span>${p.rating} (${p.reviews.toLocaleString('en-IN')})</span></div><div class="pdp-price js-price">${priceHTML(p, qv.size)}</div><p style="color:var(--muted);margin-top:6px">${esc(p.desc)}</p>${variantsHTML(p, qv)}
    <div class="buyrow">${p.stock > 0 ? `<button class="btn pri lg add" data-a="addsel" data-ctx="qv"><span class="l1">${ic('bag')} Add to cart</span><span class="l2">${ic('check')} Added</span></button>` : `<button class="btn sec lg" disabled style="flex:1">Out of stock</button>`}<a class="btn sec lg" href="#/product/${id}" data-a="closeModal">Full details</a></div></div></div>`);
}

/* ----- Wishlist ----- */
function wishlist() {
  const L = S.wish.map(P).filter(Boolean);
  return {title: 'Wishlist', html: `<div class="wrap"><div class="pghead"><h1>Your wishlist</h1><p>${L.length ? `${L.length} saved item${L.length > 1 ? 's' : ''}` : 'Tap the heart on any product to save it here.'}</p></div>
  ${L.length ? `<div class="tb"><span id="rc"></span><button class="btn pri sm" data-a="wishall">Add all in-stock items to cart</button></div><div class="grid" style="padding-bottom:50px">${L.map(card).join('')}</div>` : `<div class="empty" style="margin-bottom:50px"><h2>Nothing saved yet</h2><p>Save products you want to come back to.</p><a class="btn pri" href="#/products">Browse products</a></div>`}</div>`};
}

/* ----- Cart page ----- */
function cartPage() {
  const L = cartLines(), t = totals();
  if (!L.length) return {title: 'Cart', html: `<div class="wrap"><div class="pghead"><h1>Your cart</h1></div><div class="empty" style="margin-bottom:50px"><h2>Your cart is empty</h2><p>Add a few staples to get started.</p><div class="chips">${CATS.map(c => `<a class="chip" href="#/category/${c.id}">${c.name}</a>`).join('')}</div></div></div>`};
  const more = PRODUCTS.filter(p => !S.cart.some(c => c.id === p.id) && p.stock > 0).slice(0, 4);
  return {title: 'Cart', html: `<div class="wrap"><div class="pghead"><h1>Your cart <small style="font:500 18px var(--font-b);color:var(--muted)">(${cartCount()} items)</small></h1></div>
  <div class="two"><div><div class="panel">${shipBar(t)}<ul>${L.map(l => lineHTML(l, true)).join('')}</ul></div></div>
  <aside class="sum-box"><h3>Order summary</h3>${cpnHTML()}${sumRows(t)}<a class="btn pri lg block" style="margin-top:16px" href="#/checkout">Checkout</a><a class="btn ghost block" href="#/products" style="margin-top:6px">Keep shopping</a></aside></div>
  <section class="sec"><div class="sec-h"><h2>Add a little more</h2></div><div class="grid">${more.map(card).join('')}</div></section></div>`};
}

/* ----- Checkout ----- */
const newCk = () => ({step: 1, addrId: (S.addrs.find(a => a.def) || S.addrs[0] || {id: 'new'}).id, ship: 'std', pay: 'upi', upi: '', card4: '', note: ''});
let ck = newCk();
const fld = (n, l, v = '', o = {}) => `<div class="fld ${o.w || ''}"><label for="${o.p || ''}${n}">${l}</label><input id="${o.p || ''}${n}" name="${n}" value="${esc(v)}" ${o.attr || ''}><span class="err" data-err="${n}"></span></div>`;
const fldT = (n, l, v = '', o = {}) => `<div class="fld ${o.w || ''}"><label for="${o.p || ''}${n}">${l}</label><textarea id="${o.p || ''}${n}" name="${n}" ${o.attr || ''}>${esc(v)}</textarea><span class="err" data-err="${n}"></span></div>`;
const addrFields = (a = {}, p = '') => fld('name', 'Full name', a.name, {p, attr: 'autocomplete="name"'}) + fld('phone', 'Mobile number', a.phone, {p, attr: 'inputmode="numeric" maxlength="10" autocomplete="tel-national"'}) + fld('line', 'Address', a.line, {p, w: 'full', attr: 'autocomplete="street-address"'}) + fld('city', 'City', a.city, {p}) + fld('state', 'State', a.state, {p}) + fld('pin', 'PIN code', a.pin, {p, attr: 'inputmode="numeric" maxlength="6" autocomplete="postal-code"'});
function showErrs(form, E) {
  $$('[data-err]', form).forEach(s => { const m = E[s.dataset.err] || ''; s.textContent = m; $(`[name="${s.dataset.err}"]`, form)?.setAttribute('aria-invalid', m ? 'true' : 'false'); });
  const f = Object.keys(E)[0]; if (f) $(`[name="${f}"]`, form)?.focus();
}
function validAddr(form) {
  const fd = Object.fromEntries(new FormData(form)), E = {};
  if ((fd.name || '').trim().length < 2) E.name = 'Enter your full name';
  if (!/^[6-9]\d{9}$/.test(fd.phone || '')) E.phone = 'Enter a 10-digit mobile number';
  if ((fd.line || '').trim().length < 5) E.line = 'Enter the street address';
  if ((fd.city || '').trim().length < 2) E.city = 'Enter your city';
  if ((fd.state || '').trim().length < 2) E.state = 'Enter your state';
  if (!/^[1-9]\d{5}$/.test(fd.pin || '')) E.pin = 'Enter a 6-digit PIN code';
  showErrs(form, E); return Object.keys(E).length ? null : fd;
}
const addrLine = a => `${esc(a.name)} · ${esc(a.phone)}<br>${esc(a.line)}, ${esc(a.city)}, ${esc(a.state)} ${esc(a.pin)}`;
function ckSum() {
  const L = cartLines(), t = totals(ck.ship);
  return `<h3>Order summary</h3>${L.map(l => `<div class="mini"><span class="th" style="background:${l.p.tint}">${art(l.p)}</span><span>${esc(l.p.name)}<br><small style="color:var(--muted)">${[l.size, l.type].filter(Boolean).join(' · ')} × ${l.qty}</small></span><span>${money(l.price * l.qty)}</span></div>`).join('')}${cpnHTML()}${sumRows(t, ck.ship === 'exp' ? 'Express delivery' : 'Delivery')}`;
}
function checkout() {
  if (!S.cart.length) return {title: 'Checkout', html: `<div class="wrap"><div class="pghead"><h1>Checkout</h1></div><div class="empty" style="margin-bottom:50px"><h2>Your cart is empty</h2><p>Add something before checking out.</p><a class="btn pri" href="#/products">Browse products</a></div></div>`};
  if (ck.addrId !== 'new' && !S.addrs.some(a => a.id === ck.addrId)) ck.addrId = newCk().addrId;
  const steps = ['Address', 'Delivery', 'Payment', 'Review'], t = totals(ck.ship);
  const stepper = `<nav class="stepper" aria-label="Checkout progress">${steps.map((s, i) => `${i ? `<span class="sl ${ck.step > i ? 'done' : ''}"><i></i></span>` : ''}<span class="st ${ck.step === i + 1 ? 'cur' : ck.step > i + 1 ? 'done' : ''}" ${ck.step > i + 1 ? `data-a="step" data-s="${i + 1}" role="button" tabindex="0"` : ''} ${ck.step === i + 1 ? 'aria-current="step"' : ''}><span class="n">${ck.step > i + 1 ? ic('check', 16) : i + 1}</span><span class="t">${s}</span></span>`).join('')}</nav>`;
  let body = '';
  if (ck.step === 1) {
    const sel = ck.addrId;
    body = `<form class="panel" data-form="ckAddr" novalidate><div class="sh"><h2>Where should we deliver?</h2></div>${S.addrs.map(a => `<label class="rc"><input type="radio" name="addr" value="${a.id}" ${sel === a.id ? 'checked' : ''}><span>${addrLine(a)}${a.def ? '<small>Default address</small>' : ''}</span></label>`).join('')}
    ${S.addrs.length ? `<label class="rc"><input type="radio" name="addr" value="new" ${sel === 'new' ? 'checked' : ''}><span>Use a new address</span></label>` : ''}
    <div class="fgrid" id="newAddr" ${S.addrs.length && sel !== 'new' ? 'hidden' : ''}>${addrFields({name: S.addrs.length ? '' : S.profile.name, phone: S.profile.phone}, 'ck-')}</div>
    <div class="fgrid">${fldT('note', 'Note for the shop (optional)', ck.note, {w: 'full', p: 'ck-', attr: 'maxlength="300" rows="3" placeholder="e.g. Please call before delivery, leave with the security desk, extra-fresh pack…"'})}</div>
    <div class="actions"><button class="btn pri lg" type="submit">Continue to delivery</button></div></form>`;
  } else if (ck.step === 2) {
    const d1 = fmtDate(addDays(3)) + ' – ' + fmtDate(addDays(5)), d2 = fmtDate(addDays(1), {weekday: 'short', day: 'numeric', month: 'short'});
    body = `<form class="panel" data-form="ckShip"><div class="sh"><h2>Choose delivery speed</h2></div>
    <label class="rc"><input type="radio" name="ship" value="std" ${ck.ship === 'std' ? 'checked' : ''}><span>Standard<small>Arrives ${d1}</small></span><span class="rp">${t.sub >= FREE_AT || t.free ? 'Free' : money(49)}</span></label>
    <label class="rc"><input type="radio" name="ship" value="exp" ${ck.ship === 'exp' ? 'checked' : ''}><span>Express<small>Arrives ${d2}</small></span><span class="rp">${money(99)}</span></label>
    <div class="actions"><button class="btn sec" type="button" data-a="step" data-s="1">Back</button><button class="btn pri lg" type="submit">Continue to payment</button></div></form>`;
  } else if (ck.step === 3) {
    body = `<form class="panel" data-form="ckPay" novalidate><div class="sh"><h2>How would you like to pay?</h2></div><p class="demo-note">Demo store: no real payment happens. Please do not enter real card details. Only the last 4 digits are kept.</p>
    <label class="rc"><input type="radio" name="pay" value="upi" ${ck.pay === 'upi' ? 'checked' : ''}><span>UPI<small>Pay with any UPI app</small></span></label>
    <div data-pp="upi" ${ck.pay !== 'upi' ? 'hidden' : ''} style="margin:-2px 0 12px">${fld('upi', 'UPI ID', ck.upi, {attr: 'placeholder="name@bank" autocomplete="off"'})}</div>
    <label class="rc"><input type="radio" name="pay" value="card" ${ck.pay === 'card' ? 'checked' : ''}><span>Credit or debit card<small>Visa, Mastercard, RuPay</small></span></label>
    <div data-pp="card" ${ck.pay !== 'card' ? 'hidden' : ''} style="margin:-2px 0 12px"><div class="fgrid">${fld('num', 'Card number', '', {w: 'full', attr: 'inputmode="numeric" maxlength="19" placeholder="1234 5678 9012 3456" autocomplete="off"'})}${fld('cname', 'Name on card', '', {w: 'full'})}${fld('exp', 'Expiry (MM/YY)', '', {attr: 'maxlength="5" placeholder="MM/YY" inputmode="numeric" autocomplete="off"'})}${fld('cvv', 'CVV', '', {attr: 'maxlength="4" inputmode="numeric" type="password" autocomplete="off"'})}</div></div>
    <label class="rc"><input type="radio" name="pay" value="cod" ${ck.pay === 'cod' ? 'checked' : ''}><span>Cash on delivery<small>Pay when the order arrives</small></span></label>
    <div class="actions"><button class="btn sec" type="button" data-a="step" data-s="2">Back</button><button class="btn pri lg" type="submit">Review order</button></div></form>`;
  } else {
    const a = S.addrs.find(x => x.id === ck.addrId), payTxt = ck.pay === 'upi' ? 'UPI · ' + esc(ck.upi) : ck.pay === 'card' ? 'Card ending ' + esc(ck.card4) : 'Cash on delivery';
    body = `<div class="rev"><div class="panel"><h4>Delivering to <button class="lnk" data-a="step" data-s="1">Change</button></h4><p style="color:var(--muted)">${a ? addrLine(a) : ''}</p>${ck.note ? `<div class="notebox"><b>Your note:</b> ${esc(ck.note)}</div>` : ''}</div>
    <div class="panel"><h4>Delivery <button class="lnk" data-a="step" data-s="2">Change</button></h4><p style="color:var(--muted)">${ck.ship === 'exp' ? 'Express · arrives ' + fmtDate(addDays(1), {weekday: 'short', day: 'numeric', month: 'short'}) : 'Standard · arrives ' + fmtDate(addDays(3)) + ' – ' + fmtDate(addDays(5))}</p></div>
    <div class="panel"><h4>Payment <button class="lnk" data-a="step" data-s="3">Change</button></h4><p style="color:var(--muted)">${payTxt}</p></div>
    <p class="srv ${serverUp === true ? '' : 'off'}">${srvText()}</p>
    <div class="actions"><button class="btn sec" type="button" data-a="step" data-s="3">Back</button><button class="btn sun lg" data-a="place" style="flex:1">Place order · ${money(t.total)}</button></div></div>`;
  }
  return {title: 'Checkout', html: `<div class="wrap"><div class="pghead"><h1>Checkout</h1></div>${stepper}<div class="two"><div>${body}</div><aside class="sum-box" id="ckSum">${ckSum()}</aside></div></div>`};
}
async function placeOrder(btn) {
  const L = cartLines(), t = totals(ck.ship), a = S.addrs.find(x => x.id === ck.addrId); if (!L.length || !a) return;
  btn?.classList.add('busy');
  const email = S.user?.email || S.profile.email || '';
  let order = null;
  try {   // 1) send to the shop server (it re-checks prices and stores the order in data/db.json)
    const r = await api('/api/orders', {method: 'POST', body: {customer: {name: a.name, phone: a.phone, email}, address: {line: a.line, city: a.city, state: a.state, pin: a.pin}, items: L.map(l => ({id: l.id, size: l.size, type: l.type, qty: l.qty})), note: ck.note, shipOpt: ck.ship, coupon: S.coupon, pay: {m: ck.pay, info: ck.pay === 'upi' ? ck.upi : ck.pay === 'card' ? '•••• ' + ck.card4 : 'Cash on delivery'}}});
    order = fromServer(r.order); serverUp = true;
  } catch (e) {
    if (e.status) { btn?.classList.remove('busy'); return toast({msg: 'Could not place the order', sub: e.message, icon: 'x', ms: 6000}); }   // server said no (stock, validation…)
    serverUp = false;   // 2) server not running → keep the order on this device so the demo still works
    order = {id: 'LR-' + Math.floor(100000 + Math.random() * 900000), t: Date.now(), items: L.map(l => ({id: l.id, size: l.size, type: l.type, qty: l.qty, price: l.price, mrp: l.mrp})), sub: t.sub, disc: t.disc, ship: t.ship, total: t.total, coupon: t.applied, addr: {...a}, shipOpt: ck.ship, pay: {m: ck.pay, info: ck.pay === 'upi' ? ck.upi : ck.pay === 'card' ? '•••• ' + ck.card4 : 'Cash on delivery'}, note: ck.note, adv: 0, synced: false};
    toast({msg: 'Saved on this device only', sub: 'The shop server is not running, so the shop has not received this order.', icon: 'x', ms: 7000});
  }
  S.orders.unshift(order); S.cart = []; S.coupon = null; save(); ck = newCk(); updateBadges(); renderDrawer(); go('/order/' + order.id + '?new=1');
}

/* ----- Orders ----- */
let ofilter = 'all';
const stage = o => (o.cancelled || o.srv === 'Cancelled') ? -1 : o.srv === 'Delivered' ? 4 : Math.min(4, Math.floor((Date.now() - o.t) / STEP_MS) + (o.adv || 0));
const statusOf = o => { const s = stage(o); return s < 0 ? ['Cancelled', 'x'] : s === 4 ? ['Delivered', ''] : [STAGES[s][0], 'run']; };
function orders() {
  const list = S.orders.filter(o => ofilter === 'all' || (ofilter === 'run' && stage(o) >= 0 && stage(o) < 4) || (ofilter === 'done' && stage(o) === 4) || (ofilter === 'x' && stage(o) < 0));
  return {title: 'Orders', html: `<div class="wrap"><div class="pghead"><h1>Your orders</h1></div><div class="otabs" role="tablist">${[['all', 'All'], ['run', 'In progress'], ['done', 'Delivered'], ['x', 'Cancelled']].map(t => `<button class="${ofilter === t[0] ? 'on' : ''}" data-a="ofilter" data-v="${t[0]}">${t[1]}</button>`).join('')}</div>
  <div style="padding-bottom:50px">${list.length ? list.map((o, i) => { const [st, cl] = statusOf(o); return `<div class="ord" style="--i:${i}"><div><h3><a href="#/order/${o.id}">${o.id}</a> <span class="pill-s ${cl}">${st}</span></h3><small>Placed ${fmtDate(o.t, {day: 'numeric', month: 'short', year: 'numeric'})} · ${o.items.reduce((n, i) => n + i.qty, 0)} items · ${money(o.total)}</small><div class="ths">${o.items.slice(0, 4).map(i => `<span class="th" style="background:${P(i.id).tint}">${art(P(i.id))}</span>`).join('')}${o.items.length > 4 ? `<span class="more">+${o.items.length - 4}</span>` : ''}</div></div><div class="actions" style="margin:0"><a class="btn pri sm" href="#/order/${o.id}">${stage(o) >= 0 && stage(o) < 4 ? 'Track order' : 'View details'}</a><button class="btn sec sm" data-a="reorder" data-id="${o.id}">Reorder</button></div></div>`; }).join('') : `<div class="empty"><h2>No orders here</h2><p>Orders you place will show up in this list.</p><a class="btn pri" href="#/products">Start shopping</a></div>`}</div></div>`,
    after() { if (S.token) syncOrders().then(ch => { if (ch && location.hash.startsWith('#/orders')) route(true); }); }};
}
function trackHTML(o) {
  const s = stage(o), [st, cl] = statusOf(o), eta = fmtDate(o.t + (o.shipOpt === 'exp' ? 1 : 4) * 864e5, {weekday: 'long', day: 'numeric', month: 'short'});
  const off = [0, 3, 9, 26, 30], at = i => o.seed ? o.t + off[i] * 36e5 : o.t + i * STEP_MS;
  return `<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;align-items:center"><div><span class="pill-s ${cl}">${st}</span></div><div style="color:var(--muted)">${s < 0 ? '' : s === 4 ? 'Delivered' : 'Arriving ' + eta}</div></div>` + (s < 0 ? `<p style="margin-top:14px;color:var(--muted)">This order was cancelled. Nothing was charged.</p>` : `<div class="track" style="--p:${s / 4}"><span class="bar"></span><span class="van" aria-hidden="true">${ic('truck', 22)}</span>${STAGES.map((x, i) => `<div class="ts ${i <= s ? 'on' : ''} ${i === s ? 'cur' : ''}"><span class="d">${i <= s ? ic('check', 18) : ''}</span><div><b>${x[0]}</b><small>${i <= s ? fmtDate(at(i), {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'}) : x[1]}</small></div></div>`).join('')}</div>`);
}
function orderDetail(id) {
  const o = S.orders.find(x => x.id === id); if (!o) return nf();
  const isNew = Q.new === '1', s = stage(o);
  return {title: 'Order ' + o.id, html: `<div class="wrap" style="padding-bottom:50px"><div class="pghead">${isNew ? `<div class="okb"><div class="ring"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg></div><h1>Order placed. Thank you!</h1><p>Your order number is <b>${o.id}</b>.</p></div>` : `<div class="crumbs"><a href="#/orders">Orders</a><span>${o.id}</span></div><h1>Order ${o.id}</h1>`}</div>
  <div class="two"><div><div class="panel" id="trackWrap">${trackHTML(o)}</div>
    <div class="panel" style="margin-top:16px"><h3 style="margin-bottom:6px">Items</h3><ul>${o.items.map(i => { const p = P(i.id); return `<li class="line"><a class="th" href="#/product/${p.id}" style="background:${p.tint}">${art(p)}</a><div><h4><a href="#/product/${p.id}">${esc(p.name)}</a></h4><small>${[i.size, i.type].filter(Boolean).join(' · ')} × ${i.qty}</small></div><div class="lp">${money(i.price * i.qty)}</div></li>`; }).join('')}</ul></div></div>
  <aside class="sum-box"><h3>Summary</h3><div class="sumr"><span>Subtotal</span><span>${money(o.sub)}</span></div>${o.disc ? `<div class="sumr g"><span>Coupon ${o.coupon || ''}</span><span>-${money(o.disc)}</span></div>` : ''}<div class="sumr"><span>Delivery</span><span>${o.ship ? money(o.ship) : 'Free'}</span></div><div class="sumr tot"><span>Total</span><span>${money(o.total)}</span></div>
    <div class="kv" style="margin-top:18px"><div><h4>Delivering to</h4><p>${addrLine(o.addr)}</p></div><div><h4>Payment</h4><p>${o.pay.m === 'upi' ? 'UPI' : o.pay.m === 'card' ? 'Card' : 'Cash on delivery'}<br>${esc(o.pay.info)}</p></div></div>
    ${o.note ? `<div class="notebox"><b>Your note:</b> ${esc(o.note)}</div>` : ''}
    <p class="srv ${o.synced ? '' : 'off'}" style="margin-top:14px">${o.synced ? 'The shop has received this order.' : o.seed ? 'Sample order for the demo.' : 'Saved on this device only. The shop has not received it.'}</p>
    <div class="actions noprint"><button class="btn pri sm" data-a="reorder" data-id="${o.id}">Reorder</button><button class="btn sec sm" data-a="print">Print invoice</button>${s >= 0 && s < 2 && !o.synced ? `<button class="btn sec sm" data-a="cancel" data-id="${o.id}">Cancel order</button>` : ''}${s >= 0 && s < 4 && !o.srv ? `<button class="btn ghost sm" data-a="adv" data-id="${o.id}" title="Demo only">Skip to next step</button>` : ''}</div></aside></div></div>`,
    after() { if (isNew) confetti(); let last = s; const iv = setInterval(() => { const cur = S.orders.find(x => x.id === id); if (!cur || !$('#trackWrap')) return; const n = stage(cur); if (n !== last) { last = n; refreshTrack(cur); } }, 3000); cleanup = () => clearInterval(iv); }};
}
function refreshTrack(o) {
  const w = $('#trackWrap'); if (!w) return;
  const tr = $('.track', w), s = stage(o);
  if (tr && s >= 0) { tr.style.setProperty('--p', s / 4); setTimeout(() => { if ($('#trackWrap')) $('#trackWrap').innerHTML = trackHTML(o); }, 1000); } else w.innerHTML = trackHTML(o);
}

/* ----- Account (sign in / create account / profile / addresses) ----- */
let authTab = 'login';
function authPanel() {
  return `<div class="panel"><div class="authtabs" role="tablist"><button class="${authTab === 'login' ? 'on' : ''}" data-a="authtab" data-v="login">Sign in</button><button class="${authTab === 'reg' ? 'on' : ''}" data-a="authtab" data-v="reg">Create account</button></div>
  <p style="color:var(--muted);margin-bottom:6px">Optional. Accounts let you see your orders on any device. You can also check out as a guest.</p>
  ${authTab === 'login' ? `<form data-form="login" novalidate><div class="fgrid">${fld('email', 'Email', '', {p: 'li-', attr: 'type="email" autocomplete="email"'})}${fld('password', 'Password', '', {p: 'li-', attr: 'type="password" autocomplete="current-password"'})}</div><div class="actions"><button class="btn pri" type="submit">Sign in</button></div></form>`
  : `<form data-form="register" novalidate><div class="fgrid">${fld('name', 'Full name', '', {p: 'rg-', attr: 'autocomplete="name"'})}${fld('email', 'Email', '', {p: 'rg-', attr: 'type="email" autocomplete="email"'})}${fld('phone', 'Mobile (optional)', '', {p: 'rg-', attr: 'inputmode="numeric" maxlength="10"'})}${fld('password', 'Password (6+ characters)', '', {p: 'rg-', attr: 'type="password" autocomplete="new-password"'})}</div><div class="actions"><button class="btn pri" type="submit">Create account</button></div></form>`}
  <p class="srv ${serverUp === true ? '' : 'off'}">${srvText()}</p></div>`;
}
function account() {
  const pr = S.profile, saved = sum(S.orders.filter(o => !o.cancelled), o => sum(o.items, i => (i.mrp - i.price) * i.qty) + o.disc);
  return {title: 'Account', html: `<div class="wrap" style="padding-bottom:50px"><div class="pghead"><h1>Hi, ${esc(((S.user?.name || pr.name || '').split(' ')[0]) || 'there')}</h1><p>${S.user ? `Signed in as ${esc(S.user.email)}` : 'Manage your details, addresses and demo data.'}</p></div>
  <div class="stat"><div><b>${S.orders.length}</b><span>Orders</span></div><div><b>${S.wish.length}</b><span>Wishlist</span></div><div><b>${money(saved)}</b><span>Saved on MRP</span></div></div>
  <div class="two"><div style="display:grid;gap:16px">${S.user ? '' : authPanel()}
  <form class="panel" data-form="profile" novalidate><div class="sh"><h2>Profile</h2></div><div class="fgrid">${fld('name', 'Full name', pr.name, {p: 'pf-'})}${fld('email', 'Email', pr.email, {p: 'pf-', attr: 'type="email"'})}${fld('phone', 'Mobile (optional)', pr.phone, {p: 'pf-', attr: 'inputmode="numeric" maxlength="10"'})}</div><div class="actions"><button class="btn pri" type="submit">Save changes</button></div></form>
  <div class="panel"><div class="sh"><h2>Addresses</h2></div>${S.addrs.length ? S.addrs.map(a => `<div class="addr"><div><b>${esc(a.name)}</b> ${a.def ? '<span class="pill-s">Default</span>' : ''}<p>${esc(a.line)}, ${esc(a.city)}, ${esc(a.state)} ${esc(a.pin)}<br>${esc(a.phone)}</p></div><div>${a.def ? '' : `<button class="lnk" data-a="defaddr" data-id="${a.id}">Make default</button>`}<button class="lnk" data-a="rmaddr" data-id="${a.id}">${ic('trash', 15)} Delete</button></div></div>`).join('') : '<p style="color:var(--muted)">No saved addresses.</p>'}
  <details style="margin-top:14px"><summary>Add a new address</summary><form data-form="acctAddr" novalidate><div class="fgrid">${addrFields({}, 'ac-')}</div><div class="actions"><button class="btn pri sm" type="submit">Save address</button></div></form></details></div></div>
  <aside class="sum-box"><h3>Quick links</h3><p><a class="lnk" href="#/orders">${ic('box', 16)} Your orders</a></p><p><a class="lnk" href="#/wishlist">${ic('heart', 16)} Wishlist</a></p><p><a class="lnk" href="#/cart">${ic('bag', 16)} Cart</a></p>${S.user ? `<p style="margin-top:10px"><button class="btn sec sm" data-a="logout">Sign out</button></p>` : ''}
  <h3 style="margin-top:18px">Demo data</h3><p style="color:var(--muted);font-size:14px;margin:6px 0 12px">Cart, wishlist and sample orders live in this browser. Reset to start fresh.</p><button class="btn sec sm" data-a="reset">Reset demo data</button></aside></div></div>`,
    after() { if (serverUp === null) ping(); }};
}

/* =========================================================
   7. CHROME (header, mega menu, footer) + ROUTER
   ========================================================= */
function megaHTML() {
  const f = P('makhana-pp');
  return `<div class="wrap mega-in"><div><div class="mega-cats">${CATS.map(c => `<div><a class="mh" href="#/category/${c.id}">${c.name}</a><ul>${c.subs.map(s => `<li><a href="#/category/${c.id}?sub=${encodeURIComponent(s)}">${s}</a></li>`).join('')}<li><a class="all" href="#/category/${c.id}">All ${c.name.toLowerCase()}</a></li></ul></div>`).join('')}</div>
  <div class="need"><span>Shop by need</span>${NEEDS.map(n => `<a class="chip" href="#${n[1]}">${n[0]}</a>`).join('')}</div></div>
  <a class="feat" href="#/product/${f.id}"><span class="art" style="background:${f.tint}">${art(f)}</span><span><small>Bestseller</small><b>${esc(f.name)}</b><span class="btn pri sm">Shop now</span></span></a></div>`;
}
function renderChrome() {
  $('#top').innerHTML = `<div class="wrap hbar"><a class="logo" href="#/" aria-label="Larder home"><i></i>Larder</a>
  <button class="shop-btn" data-a="mega" aria-expanded="false" aria-controls="mega">Shop ${ic('chevd', 16)}</button>
  <form class="search" role="search" data-form="search"><label class="sr" for="q">Search products</label>${ic('search')}<input id="q" type="search" placeholder="Search makhana, soya, atta…" autocomplete="off"><div class="sug" id="sug"></div></form>
  <div class="icons"><a class="ib" href="#/wishlist" aria-label="Wishlist">${ic('heart', 22)}<span class="cnt" id="wishCount">0</span></a><a class="ib" href="#/account" aria-label="Account and orders">${ic('user', 22)}</a><button class="ib" id="cartBtn" data-a="drawer" aria-label="Open cart">${ic('bag', 22)}<span class="cnt" id="cartCount">0</span></button></div></div><nav class="mega" id="mega" aria-label="Shop categories">${megaHTML()}</nav>`;
  $('#foot').innerHTML = `<div class="wrap"><div><div class="logo"><i></i>Larder</div><p>Everyday staples, packed at the source. This is a demo store with sample products and no real payments.</p></div><div><h4>Shop</h4>${CATS.map(c => `<a href="#/category/${c.id}">${c.name}</a>`).join('')}</div><div><h4>Your account</h4><a href="#/orders">Orders</a><a href="#/wishlist">Wishlist</a><a href="#/cart">Cart</a><a href="#/account">Account</a><a href="admin.html">Shop admin</a></div></div>`;
}
const routes = [
  [/^\/$/, home], [/^\/products$/, () => listing({})], [/^\/category\/([\w-]+)$/, m => listing({cat: m[1]})], [/^\/search$/, () => listing({search: true})],
  [/^\/product\/([\w-]+)$/, m => pdp(m[1])], [/^\/wishlist$/, wishlist], [/^\/cart$/, cartPage], [/^\/checkout$/, checkout],
  [/^\/orders$/, orders], [/^\/order\/([\w-]+)$/, m => orderDetail(m[1])], [/^\/account$/, account]
];
let io = null;
function observeReveals() {
  io?.disconnect(); const els = $$('.reveal');
  if (!('IntersectionObserver' in window) || reduce) return els.forEach(e => e.classList.add('in'));
  io = new IntersectionObserver(en => en.forEach(x => { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }), {threshold: .12});
  els.forEach(e => io.observe(e));
}
function route(keep) {
  const raw = location.hash.slice(1) || '/', [path, qs] = raw.split('?');
  Q = Object.fromEntries(new URLSearchParams(qs || ''));
  closeMega(); closeModal(); closeFilters(); $('#sug').classList.remove('open'); if (!keep) closeDrawer();
  if (cleanup) { cleanup(); cleanup = null; }
  let res = null; for (const [re, fn] of routes) { const m = path.match(re); if (m) { res = fn(m); break; } }
  res = res || nf();
  const main = $('#main'); main.innerHTML = res.html; document.title = res.title + ' · Larder';
  if (!keep) { main.classList.remove('page-in'); void main.offsetWidth; main.classList.add('page-in'); scrollTo(0, 0); if (document.body.dataset.ready) main.focus({preventScroll: true}); }
  document.body.dataset.ready = '1'; res.after && res.after(); updateBadges(); observeReveals();
}
const go = p => { location.hash = '#' + p; };

/* =========================================================
   8. EVENTS (one delegated listener per type)
   ========================================================= */
const actions = {
  mega() { toggleMega(); },
  drawer() { openDrawer(); }, closeDrawer, closeModal,
  add(a) { const p = P(a.dataset.id); addToCart(p.id, baseSize(p).l, p.types[0] || '', 1, a); },
  addsel(a) { const st = a.dataset.ctx === 'qv' ? qv : pd; addToCart(st.id, st.size, st.type, st.qty || 1, a); if (a.dataset.ctx === 'qv') closeModal(); },
  buy() { addCart(pd.id, pd.size, pd.type, pd.qty); updateBadges(true); renderDrawer(); go('/checkout'); },
  pick(a) { const ctx = a.closest('[data-ctx]').dataset.ctx, st = ctx === 'qv' ? qv : pd; st[a.dataset.pk] = a.dataset.v; pickRefresh(ctx); },
  pdq(a) { pd.qty = Math.max(1, Math.min(10, pd.qty + +a.dataset.d)); $('#pdQty').textContent = pd.qty; },
  view(a) { const p = P(pd.id), g = $('#galMain'); pd.view = a.dataset.v; g.innerHTML = art(p, pd.view); g.classList.remove('swap'); void g.offsetWidth; g.classList.add('swap'); $$('.thumbs button').forEach(b => { b.classList.toggle('on', b === a); b.setAttribute('aria-pressed', b === a); }); },
  tab(a, e) { e.preventDefault(); const t = a.dataset.t; $$('.tabs button').forEach(b => { const on = b.dataset.t === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); }); ['desc', 'spec', 'rev'].forEach(k => $('#tp-' + k).hidden = k !== t); if (a.tagName === 'A') $('.tabs').scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block: 'center'}); },
  quick(a) { quickView(a.dataset.id); },
  wish(a) {
    const id = a.dataset.id, i = S.wish.indexOf(id), on = i < 0;
    if (on) { S.wish.push(id); burst(a); toast({msg: 'Saved to wishlist', sub: P(id).name, act: 'View', fn: () => go('/wishlist'), icon: 'heart'}); } else { S.wish.splice(i, 1); toast({msg: 'Removed from wishlist', sub: P(id).name, icon: 'heart'}); }
    save(); updateBadges(on);
    $$(`[data-a="wish"][data-id="${id}"]`).forEach(b => { b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    if (location.hash.startsWith('#/wishlist') && !on) setTimeout(() => route(true), 250);
  },
  wishall() { const L = S.wish.map(P).filter(p => p && p.stock > 0); L.forEach(p => addCart(p.id, baseSize(p).l, p.types[0] || '', 1)); updateBadges(true); renderDrawer(); toast({msg: `${L.length} item${L.length === 1 ? '' : 's'} added to cart`, act: 'View cart', fn: openDrawer}); },
  qty(a) { const c = S.cart.find(x => x.k === a.dataset.k); if (!c) return; c.qty += +a.dataset.d; if (c.qty < 1) return actions.rm(a); c.qty = Math.min(10, c.qty); save(); refreshCart(); },
  rm(a) { const i = S.cart.findIndex(x => x.k === a.dataset.k); if (i < 0) return; const [gone] = S.cart.splice(i, 1); save(); refreshCart(); toast({msg: 'Removed from cart', sub: P(gone.id).name, icon: 'trash', act: 'Undo', fn: () => { S.cart.splice(i, 0, gone); save(); refreshCart(); }}); },
  tow(a) { const c = S.cart.find(x => x.k === a.dataset.k); if (!c) return; if (!S.wish.includes(c.id)) S.wish.push(c.id); S.cart = S.cart.filter(x => x !== c); save(); refreshCart(); toast({msg: 'Moved to wishlist', sub: P(c.id).name, icon: 'heart'}); },
  cpn(a) { applyCoupon(a.dataset.c, a.closest('.cpn')); },
  cpnrm() { S.coupon = null; save(); refreshCart(); },
  applyhero() { applyCoupon('WELCOME10'); },
  trayrm(a) { S.cmp = S.cmp.filter(x => x !== a.dataset.id); save(); syncCmp(); renderTray(); if ($('#modal.open')) S.cmp.length > 1 ? openCompare() : closeModal(); },
  cmpclear() { S.cmp = []; save(); syncCmp(); renderTray(); closeModal(); },
  cmpopen() { if (S.cmp.length > 1) openCompare(); },
  rail(a) { const r = $('#rail'); r.scrollBy({left: +a.dataset.d * (r.clientWidth * .8), behavior: reduce ? 'auto' : 'smooth'}); },
  filters() { const f = $('#filters'), o = !f.classList.contains('open'); f.classList.toggle('open', o); $('#scrim').classList.toggle('on', o); lock(); },
  unf(a) { const k = a.dataset.k, v = a.dataset.v; if (k === 'cat') F.cat = F.cat.filter(x => x !== v); else if (k === 'brand') F.brand = F.brand.filter(x => x !== v); else if (k === 'price') { F.min = 0; F.max = MAXP; } else if (k === 'rate') F.rate = 0; else if (k === 'stock') F.stock = false; else if (k === 'sub') F.sub = ''; else if (k === 'q') { F.q = ''; $('#q').value = ''; } resetFilterUI(); },
  clearf() { F = {...F, cat: [], sub: '', brand: [], min: 0, max: MAXP, rate: 0, stock: false, q: ''}; $('#q').value = ''; resetFilterUI(); },
  step(a) { const s = +a.dataset.s; if (s <= ck.step) { ck.step = s; route(true); } },
  place(a) { placeOrder(a); },
  ofilter(a) { ofilter = a.dataset.v; route(true); },
  cancel(a) { const o = S.orders.find(x => x.id === a.dataset.id); if (o && confirm('Cancel this order?')) { o.cancelled = true; save(); route(true); toast({msg: 'Order cancelled', sub: o.id, icon: 'x'}); } },
  adv(a) { const o = S.orders.find(x => x.id === a.dataset.id); if (!o || stage(o) >= 4) return; o.adv = (o.adv || 0) + 1; save(); refreshTrack(o); if (stage(o) >= 4 || stage(o) === 2) setTimeout(() => route(true), 1100); },
  reorder(a) { const o = S.orders.find(x => x.id === a.dataset.id); if (!o) return; o.items.forEach(i => addCart(i.id, i.size, i.type, i.qty)); updateBadges(true); openDrawer(); toast({msg: 'Items added to cart', sub: o.id}); },
  print() { window.print(); },
  defaddr(a) { S.addrs.forEach(x => x.def = x.id === a.dataset.id); save(); route(true); },
  rmaddr(a) { S.addrs = S.addrs.filter(x => x.id !== a.dataset.id); if (S.addrs.length && !S.addrs.some(x => x.def)) S.addrs[0].def = true; save(); route(true); toast({msg: 'Address deleted', icon: 'trash'}); },
  authtab(a) { authTab = a.dataset.v; route(true); },
  async logout() { try { await api('/api/logout', {method: 'POST'}); } catch (e) {} S.token = ''; S.user = null; save(); route(true); toast({msg: 'Signed out'}); },
  reset() { if (confirm('Reset all demo data in this browser?')) { try { localStorage.removeItem(KEY); } catch (e) {} S = seed(); ck = newCk(); updateBadges(); renderDrawer(); go('/'); route(); toast({msg: 'Demo data reset'}); } }
};
function applyCoupon(code, box) {
  code = (code || '').trim().toUpperCase();
  if (!COUPONS[code]) { const e = $('.cpn-err', box || document); if (e) e.textContent = code ? `“${code}” is not a valid code` : 'Enter a coupon code'; return; }
  S.coupon = code; save(); refreshCart();
  const t = totals(ck.ship);
  toast({msg: `${code} applied`, sub: t.disc ? `You save ${money(t.disc)}` : t.free ? 'Free delivery unlocked' : `Add ${money(t.pending)} more to use it`, icon: 'tag'});
}
async function authSubmit(f, kind) {
  const fd = Object.fromEntries(new FormData(f)), E = {}, btn = $('button[type=submit]', f);
  if (kind === 'register' && (fd.name || '').trim().length < 2) E.name = 'Enter your name';
  if (!/^\S+@\S+\.\S+$/.test(fd.email || '')) E.email = 'Enter a valid email';
  if (kind === 'register' && fd.phone && !/^[6-9]\d{9}$/.test(fd.phone)) E.phone = 'Enter a 10-digit mobile number';
  if ((fd.password || '').length < (kind === 'register' ? 6 : 1)) E.password = kind === 'register' ? 'Use at least 6 characters' : 'Enter your password';
  showErrs(f, E); if (Object.keys(E).length) return;
  btn.classList.add('busy');
  try {
    const r = await api(kind === 'register' ? '/api/register' : '/api/login', {method: 'POST', body: fd});
    S.token = r.token; S.user = r.user; S.profile = {name: r.user.name, email: r.user.email, phone: r.user.phone || S.profile.phone}; save(); serverUp = true;
    await syncOrders(); route(true); toast({msg: kind === 'register' ? 'Account created' : 'Signed in', sub: r.user.email});
  } catch (e) { btn.classList.remove('busy'); toast({msg: e.status ? e.message : 'Cannot reach the shop server', sub: e.status ? '' : 'Run “node server.js” and open http://localhost:3000', icon: 'x', ms: 5000}); }
}
const forms = {
  search() { const q = $('#q').value.trim(); $('#sug').classList.remove('open'); if (q) go('/search?q=' + encodeURIComponent(q)); },
  coupon(f) { applyCoupon($('.cpn-in', f).value, f.closest('.cpn')); },
  pin() { const v = $('#pin').value.trim(), m = $('#pinMsg'); if (/^[1-9]\d{5}$/.test(v)) { m.className = 'ok'; m.textContent = `Delivery to ${v} by ${fmtDate(addDays(3), {weekday: 'short', day: 'numeric', month: 'short'})}. Express available.`; } else { m.className = 'bad'; m.textContent = 'Enter a valid 6-digit PIN code.'; } },
  ckAddr(f) {
    const note = (new FormData(f).get('note') || '').toString().trim().slice(0, 300);
    if (ck.addrId === 'new' || !S.addrs.length) { const fd = validAddr(f); if (!fd) return; const a = {id: 'a' + Date.now(), name: fd.name.trim(), phone: fd.phone, line: fd.line.trim(), city: fd.city.trim(), state: fd.state.trim(), pin: fd.pin, def: !S.addrs.length}; S.addrs.push(a); ck.addrId = a.id; save(); }
    ck.note = note; ck.step = 2; route(true);
  },
  ckShip() { ck.step = 3; route(true); },
  ckPay(f) {
    const fd = Object.fromEntries(new FormData(f)), E = {};
    if (ck.pay === 'upi') { if (!/^[\w.\-]{2,}@[a-z]{2,}$/i.test((fd.upi || '').trim())) E.upi = 'Enter a valid UPI ID, like name@bank'; else ck.upi = fd.upi.trim(); }
    if (ck.pay === 'card') {
      const n = (fd.num || '').replace(/\s/g, ''), m = (fd.exp || '').match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
      if (!/^\d{16}$/.test(n)) E.num = 'Enter the 16-digit card number';
      if (!m) E.exp = 'Use MM/YY'; else if (new Date(2000 + +m[2], +m[1]) < new Date()) E.exp = 'This card has expired';
      if (!/^\d{3,4}$/.test(fd.cvv || '')) E.cvv = 'Enter 3 or 4 digits';
      if ((fd.cname || '').trim().length < 2) E.cname = 'Enter the name on the card';
      if (!Object.keys(E).length) ck.card4 = n.slice(-4);
    }
    showErrs(f, E); if (Object.keys(E).length) return; ck.step = 4; route(true);
  },
  login(f) { authSubmit(f, 'login'); }, register(f) { authSubmit(f, 'register'); },
  profile(f) {
    const fd = Object.fromEntries(new FormData(f)), E = {};
    if ((fd.name || '').trim().length < 2) E.name = 'Enter your name'; if (fd.email && !/^\S+@\S+\.\S+$/.test(fd.email)) E.email = 'Enter a valid email'; if (fd.phone && !/^[6-9]\d{9}$/.test(fd.phone)) E.phone = 'Enter a 10-digit mobile number';
    showErrs(f, E); if (Object.keys(E).length) return; S.profile = {name: fd.name.trim(), email: fd.email.trim(), phone: fd.phone || ''}; save(); toast({msg: 'Profile saved'});
  },
  acctAddr(f) { const fd = validAddr(f); if (!fd) return; S.addrs.push({id: 'a' + Date.now(), name: fd.name.trim(), phone: fd.phone, line: fd.line.trim(), city: fd.city.trim(), state: fd.state.trim(), pin: fd.pin, def: !S.addrs.length}); save(); route(true); toast({msg: 'Address saved'}); }
};
document.addEventListener('click', e => {
  const a = e.target.closest('[data-a]');
  if (a && actions[a.dataset.a]) { actions[a.dataset.a](a, e); if (a.dataset.a === 'wish' || a.dataset.a === 'quick') e.preventDefault(); }
  if (e.target.id === 'scrim') { closeDrawer(); closeFilters(); }
  if (!e.target.closest('.search')) $('#sug').classList.remove('open');
  if (!e.target.closest('#mega,.shop-btn')) closeMega();
  if (e.target.closest('#mega a,#sug a')) { closeMega(); $('#sug').classList.remove('open'); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if ($('#modal.open')) closeModal(); else if ($('#drawer.open')) closeDrawer(); else if ($('#filters.open')) closeFilters(); else closeMega(); $('#sug').classList.remove('open'); }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.st.done')) { e.preventDefault(); actions.step(e.target); }
  if (e.key === 'Tab') {
    const c = $('#modal.open #modalBox') || $('#drawer.open'); if (!c) return;
    const f = $$('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])', c).filter(x => x.offsetParent !== null); if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); } else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
  }
});
document.addEventListener('submit', e => { const f = e.target.closest('form'); if (f?.dataset.form) { e.preventDefault(); forms[f.dataset.form]?.(f); } });
document.addEventListener('change', e => {
  const t = e.target, f = t.dataset.f;
  if (t.dataset.a === 'cmp') {
    if (t.checked) { if (S.cmp.length >= 3) { t.checked = false; return toast({msg: 'Compare up to 3 products', sub: 'Remove one to add another', icon: 'scale'}); } S.cmp.push(t.value); } else S.cmp = S.cmp.filter(x => x !== t.value);
    save(); syncCmp(); renderTray(); return;
  }
  if (f === 'cat' || f === 'brand') { const arr = F[f]; t.checked ? arr.push(t.value) : arr.splice(arr.indexOf(t.value), 1); if (f === 'cat') F.sub = ''; renderResults(); }
  else if (f === 'rate') { F.rate = +t.value; renderResults(); } else if (f === 'stock') { F.stock = t.checked; renderResults(); } else if (f === 'sort') { F.sort = t.value; renderResults(); }
  if (t.name === 'addr') { ck.addrId = t.value; $('#newAddr').hidden = t.value !== 'new'; }
  if (t.name === 'ship') { ck.ship = t.value; const s = $('#ckSum'); if (s) s.innerHTML = ckSum(); }
  if (t.name === 'pay') { ck.pay = t.value; $$('[data-pp]').forEach(d => d.hidden = d.dataset.pp !== ck.pay); }
});
let sugT;
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'q') { clearTimeout(sugT); sugT = setTimeout(() => suggest(t.value), 120); }
  if (t.dataset.f === 'min' || t.dataset.f === 'max') {
    let v = +t.value; if (t.dataset.f === 'min') { v = Math.min(v, F.max - 10); F.min = v; } else { v = Math.max(v, F.min + 10); F.max = v; } t.value = v;
    $('#pmin').textContent = money(F.min); $('#pmax').textContent = money(F.max); const r = $('#rng'); r.style.setProperty('--a', F.min / MAXP * 100 + '%'); r.style.setProperty('--b', F.max / MAXP * 100 + '%'); renderResults();
  }
  if (t.name === 'num' && t.closest('form')?.dataset.form === 'ckPay') t.value = t.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  if (t.name === 'exp' && t.closest('form')?.dataset.form === 'ckPay') { let v = t.value.replace(/\D/g, '').slice(0, 4); if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2); t.value = v; }
});
addEventListener('scroll', () => $('#top').classList.toggle('scrolled', scrollY > 6), {passive: true});
addEventListener('hashchange', () => route());
addEventListener('storage', e => { if (e.key === KEY) { try { S = Object.assign(seed(), JSON.parse(e.newValue)); updateBadges(); renderDrawer(); } catch (x) {} } });

/* =========================================================
   9. BOOT
   ========================================================= */
renderChrome();
$('.shop-btn').addEventListener('mouseenter', () => { if (matchMedia('(hover:hover)').matches) toggleMega(true); });
$('#top').addEventListener('mouseleave', () => { if (matchMedia('(hover:hover)').matches) closeMega(); });
renderDrawer(); route(); ping(); if (S.token) syncOrders();
