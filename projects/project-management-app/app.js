/* =====================================================================
   PROJECT MANAGEMENT APPLICATION — app.js
   The "controller": it listens to clicks, drags and keys, changes the
   data (through store.js), and asks views.js to draw the result.
   ===================================================================== */

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

let modal = null;          // { type, draft, isNew }
let notifOpen = false;
let userOpen = false;
let tmTimer = null;
const toastUndo = {};

/* =====================================================================
   RENDERING
   ===================================================================== */
function renderNav() {
  $('#nav').innerHTML = PAGES.map(p =>
    `<a href="#/${p.id}" data-act="nav" data-id="${p.id}" class="nav-item ${ui.page === p.id ? 'active' : ''}" ${ui.page === p.id ? 'aria-current="page"' : ''}>${icon(p.icon, 18)}<span>${p.name}</span></a>`).join('');
}

function renderChrome() {
  renderNav();
  const unread = state.notifications.filter(n => !n.read).length;
  const badge = $('#bell-badge');
  badge.textContent = unread > 9 ? '9+' : unread;
  badge.hidden = !unread;
  const s = $('#search');
  if (s !== document.activeElement) s.value = ui.filters.q;
  $('#me').innerHTML = `<button class="me-btn" data-act="user-menu" aria-label="Account menu" aria-haspopup="menu">${avatar(state.members[0] || { name: state.settings.userName, color: '#3355FF' })}</button>`;
  document.documentElement.dataset.theme = state.settings.theme;
  $('#tm-btn').classList.toggle('on', ui.tmOpen);
}

function renderView() {
  const view = $('#view');
  const board = $('.board');
  const keepLeft = board ? board.scrollLeft : 0;
  const keepTop = view.scrollTop;
  view.innerHTML = (VIEWS[ui.page] || viewWorkspace)();
  view.dataset.page = ui.page;
  const nb = $('.board');
  if (nb) nb.scrollLeft = keepLeft;
  view.scrollTop = keepTop;
}

function renderTM() {
  const root = $('#tm-root');
  if (!ui.tmOpen) { root.innerHTML = ''; return; }
  root.innerHTML = tmBarHTML();
  updateTMInfo();
}

function render() { renderChrome(); renderView(); renderTM(); }

/* =====================================================================
   ROUTER
   ===================================================================== */
function route(pageArg) {
  let page = pageArg || (location.hash.replace(/^#\/?/, '') || 'workspace');
  if (!VIEWS[page]) page = 'workspace';
  ui.page = page;
  if (page !== 'kanban' && ui.tmOpen) closeTM();
  $('#app').classList.remove('side-open');
  render();
  $('#view').scrollTop = 0;
  window.scrollTo(0, 0);
}
// Navigation never depends on the URL hash, so it also works inside
// sandboxed previews, iframes and file:// pages. The hash is only a bonus.
function go(page) {
  try { if (location.hash !== '#/' + page) history.pushState(null, '', '#/' + page); } catch (e) { /* sandboxed: ignore */ }
  route(page);
}

/* =====================================================================
   TOASTS
   ===================================================================== */
function toast(text, undo) {
  const id = uid();
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span>${esc(text)}</span>${undo ? `<button class="linkbtn" data-act="toast-undo" data-id="${id}">Undo</button>` : ''}`;
  if (undo) toastUndo[id] = undo;
  $('#toast-root').appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); delete toastUndo[id]; }, 250); }, undo ? 6000 : 3200);
}

/* =====================================================================
   TASK MODAL (edits a draft copy; nothing changes until "Save")
   ===================================================================== */
function openTaskModal(id, preset) {
  preset = preset || {};
  if (ui.tt) { toast('You are viewing the past. Press "Back to now" to edit.'); return; }
  if (id) {
    const t = byId(state.tasks, id);
    if (!t) return;
    modal = { type: 'task', isNew: false, draft: JSON.parse(JSON.stringify(t)) };
  } else {
    modal = {
      type: 'task', isNew: true,
      draft: {
        id: null, projectId: preset.projectId || ui.filters.project || (state.projects[0] || {}).id || '',
        title: '', desc: '', col: preset.col || 'todo', priority: 'medium', labels: [],
        assignees: ui.filters.assignee && ui.filters.assignee !== 'none' ? [ui.filters.assignee] : [],
        due: preset.due || '', subtasks: [], touched: Date.now(), history: []
      }
    };
  }
  showModal('#m-title');
}

function showModal(focusSel) {
  const root = $('#modal-root');
  const body = $('.modal-body', root);
  const keep = body ? body.scrollTop : 0;
  if (!modal) { root.innerHTML = ''; return; }
  const html = { confirm: () => confirmModalHTML(modal.text, modal.yes), task: () => taskModalHTML(modal.draft, modal.isNew), project: projectModalHTML, member: memberModalHTML, standup: standupModalHTML }[modal.type]();
  root.innerHTML = html;
  const nb = $('.modal-body', root);
  if (nb && body) nb.scrollTop = keep;
  if (focusSel) { const f = $(focusSel, root); if (f) { f.focus(); if (f.select && modal.isNew === false) { /* keep caret */ } } }
}
function closeModal() { modal = null; $('#modal-root').innerHTML = ''; }

function saveTaskFromModal() {
  const d = modal.draft;
  if (!d.title.trim()) { toast('Give the task a title first.'); const f = $('#m-title'); if (f) f.focus(); return; }
  if (modal.isNew) {
    addTask(d);
    toast('Task created');
  } else {
    saveTask(d);
    toast('Changes saved');
  }
  closeModal();
  render();
}

/* =====================================================================
   NOTIFICATIONS, THEME, TIME MACHINE, PALETTE, STANDUP
   ===================================================================== */
function toggleNotif(force) {
  notifOpen = force === undefined ? !notifOpen : force;
  $('#notif-root').innerHTML = notifOpen ? notifHTML() : '';
}

function toggleUserMenu(force) {
  userOpen = force === undefined ? !userOpen : force;
  $('#user-root').innerHTML = userOpen ? userMenuHTML() : '';
}

function signOut() {
  toggleUserMenu(false); toggleNotif(false); closeModal(); closePalette();
  closeTM();
  ui.filters = { q: '', project: '', assignee: '', priority: '', label: '', heat: '' };
  Auth.logout();
  Auth.show({ message: 'You have been signed out.' });
}

function toggleTheme() {
  state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
  save(); render();
}

/* ----- Time Machine ----- */
function tmRange() {
  const earliest = Math.min.apply(null, state.tasks.map(t => t.created).concat([Date.now() - 3 * DAY]));
  return { min: earliest, max: Date.now() };
}
function tmSet(v) {
  ui.tmValue = v;
  const r = tmRange();
  ui.tt = v >= 1000 ? null : Math.round(r.min + (r.max - r.min) * v / 1000);
}
function updateTMInfo() {
  const l = $('#tm-label'), s = $('#tm-sub');
  if (!l) return;
  if (!ui.tt) { l.textContent = 'Now'; s.textContent = 'Drag the slider left to rewind the board.'; return; }
  const snap = state.tasks.map(t => taskAt(t, ui.tt)).filter(Boolean);
  l.textContent = fmtFull(ui.tt);
  s.textContent = `${snap.filter(t => t.col !== 'done').length} open, ${snap.filter(t => t.col === 'done').length} done at that moment`;
}
function toggleTM(force) {
  const next = force === undefined ? !ui.tmOpen : force;
  if (next) { ui.tmOpen = true; if (ui.page !== 'kanban') { go('kanban'); return; } render(); }
  else closeTM();
}
function closeTM() {
  stopTMPlay();
  ui.tmOpen = false; ui.tt = null; ui.tmValue = 1000;
  if ($('#view')) render();
}
function stopTMPlay() {
  if (tmTimer) { clearInterval(tmTimer); tmTimer = null; }
  const b = $('#tm-play'); if (b) b.innerHTML = icon('play', 16);
}
function playTM() {
  if (tmTimer) { stopTMPlay(); return; }
  if (ui.tmValue >= 1000) { tmSet(0); }
  const b = $('#tm-play'); if (b) b.innerHTML = icon('pause', 16);
  tmTimer = setInterval(() => {
    tmSet(Math.min(1000, ui.tmValue + 8));
    const r = $('#tm-range'); if (r) r.value = ui.tmValue;
    renderView(); updateTMInfo();
    if (ui.tmValue >= 1000) stopTMPlay();
  }, 70);
}

/* ----- Command palette ----- */
const palette = { open: false, q: '', idx: 0, items: [] };
function paletteItems() {
  const q = palette.q.trim().toLowerCase();
  const cmds = [
    { label: 'Create a task', hint: 'N', run: () => openTaskModal() },
    { label: "Write today's standup", hint: 'Standup', run: openStandup },
    { label: 'Open Time Machine', hint: 'Kanban', run: () => toggleTM(true) },
    { label: 'Switch theme', hint: 'Light / dark', run: toggleTheme },
    { label: 'Clear all filters', hint: '', run: () => { ui.filters = { q: '', project: '', assignee: '', priority: '', label: '', heat: '' }; render(); } }
  ].concat(PAGES.map(p => ({ label: 'Go to ' + p.name, hint: 'Page', run: () => go(p.id) })));
  const matched = cmds.filter(c => !q || c.label.toLowerCase().includes(q)).slice(0, 8);
  const tasks = q ? state.tasks.filter(t => t.title.toLowerCase().includes(q)).slice(0, 6)
    .map(t => ({ label: t.title, hint: colName(t.col), run: () => openTaskModal(t.id) })) : [];
  return matched.concat(tasks);
}
function openPalette() {
  palette.open = true; palette.q = ''; palette.idx = 0; palette.items = paletteItems();
  $('#palette-root').innerHTML = paletteHTML(palette.items, 0, '');
  $('#pal-input').focus();
}
function closePalette() { palette.open = false; $('#palette-root').innerHTML = ''; }
function runPalette(i) {
  const it = palette.items[i];
  if (!it) return;
  closePalette();
  it.run();
}

/* ----- In-app confirmation (browsers block confirm() inside previews) ----- */
function askConfirm(text, yes, run) { modal = { type: 'confirm', text, yes, run }; showModal('#m-first'); }

/* ----- Standup ----- */
function openStandup() { modal = { type: 'standup' }; showModal(); }

function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
  return new Promise((res, rej) => {
    const ta = $('#standup-text'); if (!ta) return rej();
    ta.select();
    try { document.execCommand('copy') ? res() : rej(); } catch (e) { rej(e); }
  });
}

/* ----- Backup ----- */
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `project-management-backup-${toISO(new Date())}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* =====================================================================
   CLICK HANDLING (one listener for the whole app)
   ===================================================================== */
document.addEventListener('click', e => {
  // close the notification panel when clicking elsewhere
  if (notifOpen && !e.target.closest('#notif-root') && !e.target.closest('[data-act="toggle-notif"]')) toggleNotif(false);
  if (userOpen && !e.target.closest('#user-root') && !e.target.closest('[data-act="user-menu"]')) toggleUserMenu(false);

  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act, id = el.dataset.id;

  // scrims close only when the dark background itself is clicked
  if ((act === 'close-modal' || act === 'close-palette') && el.classList.contains('scrim') && e.target !== el) return;

  switch (act) {
    case 'nav': e.preventDefault(); go(id); break;
    case 'user-menu': e.stopPropagation(); toggleNotif(false); toggleUserMenu(); break;
    case 'um-settings': toggleUserMenu(false); go('settings'); break;
    case 'logout': signOut(); break;
    case 'confirm-yes': { const run = modal && modal.run; closeModal(); if (run) run(); break; }
    case 'toggle-menu': $('#app').classList.toggle('side-open'); break;
    case 'new-task': openTaskModal(null, { col: el.dataset.col, due: el.dataset.due }); break;
    case 'open-task': openTaskModal(id); break;
    case 'close-modal': closeModal(); break;
    case 'close-palette': closePalette(); break;
    case 'save-task': saveTaskFromModal(); break;
    case 'delete-task': {
      const snap = deleteTask(modal.draft.id);
      closeModal(); render();
      if (snap) toast('Task deleted', () => { restoreTask(snap); render(); });
      break;
    }
    case 'toggle-chip': {
      const list = modal.draft[el.dataset.field];
      const i = list.indexOf(id);
      if (i >= 0) list.splice(i, 1); else list.push(id);
      showModal(); break;
    }
    case 'sub-toggle': { const s = modal.draft.subtasks.find(x => x.id === id); if (s) s.done = el.checked; showModal(); break; }
    case 'sub-del': modal.draft.subtasks = modal.draft.subtasks.filter(x => x.id !== id); showModal(); break;
    case 'sub-add': addSubtaskFromInput(); break;
    case 'move-next': {
      e.stopPropagation();
      const t = byId(state.tasks, id);
      if (t && colIndex(t.col) < COLS.length - 1) { const to = COLS[colIndex(t.col) + 1].id; moveTask(id, to); render(); toast(`Moved to ${colName(to)}`); }
      break;
    }
    case 'open-project': ui.filters.project = id; go('kanban'); break;
    case 'new-project': modal = { type: 'project' }; showModal('#m-first'); break;
    case 'delete-project': {
      const p = project(id);
      if (p) askConfirm(`Delete "${p.name}" and all of its tasks? This cannot be undone.`, 'Delete project', () => { deleteProject(id); if (ui.filters.project === id) ui.filters.project = ''; render(); toast('Project deleted'); });
      break;
    }
    case 'new-member': modal = { type: 'member' }; showModal('#m-first'); break;
    case 'remove-member': {
      const m = member(id);
      if (m) askConfirm(`Remove ${m.name}? Their tasks will become unassigned.`, 'Remove member', () => { removeMember(id); if (ui.filters.assignee === id) ui.filters.assignee = ''; render(); toast('Member removed'); });
      break;
    }
    case 'toggle-notif': e.stopPropagation(); toggleNotif(); break;
    case 'read-all': state.notifications.forEach(n => { n.read = true; }); save(); toggleNotif(true); renderChrome(); break;
    case 'clear-notifs': state.notifications = []; save(); toggleNotif(true); renderChrome(); break;
    case 'tm-toggle': toggleTM(); break;
    case 'tm-play': playTM(); break;
    case 'tm-live': stopTMPlay(); tmSet(1000); { const r = $('#tm-range'); if (r) r.value = 1000; } renderView(); updateTMInfo(); break;
    case 'standup': openStandup(); break;
    case 'copy-standup': copyText($('#standup-text').value).then(() => toast('Standup copied'), () => toast('Could not copy. Select the text and copy it manually.')); break;
    case 'palette-open': openPalette(); break;
    case 'palette-run': runPalette(Number(id)); break;
    case 'clear-filters': ui.filters = { q: '', project: '', assignee: '', priority: '', label: '', heat: '' }; render(); break;
    case 'sort': ui.sort = { key: el.dataset.key, dir: ui.sort.key === el.dataset.key ? -ui.sort.dir : -1 }; renderView(); break;
    case 'cal-prev': ui.cal.m--; if (ui.cal.m < 0) { ui.cal.m = 11; ui.cal.y--; } renderView(); break;
    case 'cal-next': ui.cal.m++; if (ui.cal.m > 11) { ui.cal.m = 0; ui.cal.y++; } renderView(); break;
    case 'cal-today': { const n = new Date(); ui.cal = { y: n.getFullYear(), m: n.getMonth() }; renderView(); break; }
    case 'toggle-theme': toggleTheme(); break;
    case 'export': exportData(); break;
    case 'reset-demo': askConfirm('Replace everything with fresh demo data?', 'Reset demo data', () => { resetDemo(); checkOverdue(); render(); toast('Demo data restored'); }); break;
    case 'wipe':
      askConfirm('Delete ALL projects, tasks and people? This cannot be undone.', 'Delete everything', () => {
        replaceState({ projects: [], members: [{ id: 'm1', name: state.settings.userName, role: 'Owner', color: '#3355FF' }], labels: makeSeed().labels, tasks: [], notifications: [], seen: [], settings: state.settings });
        render(); toast('Workspace cleared');
      });
      break;
    case 'toast-undo': if (toastUndo[id]) { toastUndo[id](); delete toastUndo[id]; el.closest('.toast').remove(); } break;
  }
});

function addSubtaskFromInput() {
  const inp = $('#m-sub');
  const text = inp.value.trim();
  if (!text) { inp.focus(); return; }
  modal.draft.subtasks.push({ id: uid(), text, done: false });
  showModal('#m-sub');
}

/* =====================================================================
   INPUT / CHANGE / SUBMIT
   ===================================================================== */
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'search') {
    ui.filters.q = t.value;
    if (!['kanban', 'tasks', 'calendar', 'timeline'].includes(ui.page)) go('tasks'); else renderView();
    return;
  }
  if (t.id === 'pal-input') {
    palette.q = t.value; palette.idx = 0; palette.items = paletteItems();
    $('#pal-list').innerHTML = paletteListHTML(palette.items, 0);
    return;
  }
  if (t.id === 'tm-range') { tmSet(Number(t.value)); renderView(); updateTMInfo(); return; }
  if (modal && modal.type === 'task' && t.dataset.f && (t.tagName === 'INPUT' && t.type !== 'date' || t.tagName === 'TEXTAREA')) {
    modal.draft[t.dataset.f] = t.value;
  }
});

document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.filter) { ui.filters[t.dataset.filter] = t.value; renderView(); return; }
  if (modal && modal.type === 'task' && t.dataset.f) {
    modal.draft[t.dataset.f] = t.value;
    showModal();                      // redraw so the heat meter updates
    return;
  }
  if (t.dataset.standupWho !== undefined) { ui.standupWho = t.value; $('#standup-text').value = buildStandup(ui.standupWho); return; }
  if (t.dataset.setting) {
    const k = t.dataset.setting;
    state.settings[k] = t.type === 'checkbox' ? t.checked : t.value;
    if (k === 'userName') { state.settings.userName = t.value.trim() || 'Alex'; if (state.members[0]) state.members[0].name = state.settings.userName; }
    save(); render(); return;
  }
  if (t.dataset.wip) { state.settings.wip[t.dataset.wip] = Math.max(0, Number(t.value) || 0); save(); toast('Limit updated'); return; }
  if (t.dataset.import !== undefined && t.files[0]) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (!data || !Array.isArray(data.tasks) || !Array.isArray(data.projects)) throw new Error('bad file');
        replaceState(data); render(); toast('Backup imported');
      } catch (err) { toast('That file is not a Project Management Application backup.'); }
    };
    r.readAsText(t.files[0]);
  }
});

document.addEventListener('submit', e => {
  const quick = e.target.closest('[data-quickadd]');
  if (quick) {
    e.preventDefault();
    const title = quick.elements.title.value.trim();
    if (!title) return;
    const col = quick.dataset.quickadd;
    addTask({ title, col, projectId: ui.filters.project || (state.projects[0] || {}).id, assignees: ui.filters.assignee && ui.filters.assignee !== 'none' ? [ui.filters.assignee] : [] });
    render();
    const again = $(`[data-quickadd="${col}"] input`); if (again) again.focus();
    return;
  }
  const form = e.target.closest('[data-form]');
  if (form) {
    e.preventDefault();
    const fd = new FormData(form);
    if (form.dataset.form === 'project') { const p = addProject({ name: fd.get('name'), desc: fd.get('desc'), color: fd.get('color') }); toast(`Project "${p.name}" created`); }
    if (form.dataset.form === 'member') { const m = addMember({ name: fd.get('name'), role: fd.get('role'), color: fd.get('color') }); toast(`${m.name} added to the team`); }
    closeModal(); render();
  }
});

/* =====================================================================
   KEYBOARD
   ===================================================================== */
const typing = el => el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable);

document.addEventListener('keydown', e => {
  if (document.body.classList.contains('locked')) return;   // login screen is showing
  // Command palette: Ctrl/Cmd + K
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette.open ? closePalette() : openPalette(); return; }

  if (palette.open) {
    if (e.key === 'Escape') { closePalette(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = palette.items.length || 1;
      palette.idx = (palette.idx + (e.key === 'ArrowDown' ? 1 : -1) + n) % n;
      $('#pal-list').innerHTML = paletteListHTML(palette.items, palette.idx);
      return;
    }
    if (e.key === 'Enter') { e.preventDefault(); runPalette(palette.idx); return; }
    return;
  }

  if (e.key === 'Escape') {
    if (modal) closeModal(); else if (userOpen) toggleUserMenu(false); else if (notifOpen) toggleNotif(false); else if (ui.tmOpen) closeTM(); else $('#app').classList.remove('side-open');
    return;
  }

  // Enter inside the subtask box adds a subtask (and never submits anything)
  if (e.key === 'Enter' && e.target.id === 'm-sub') { e.preventDefault(); addSubtaskFromInput(); return; }
  if (e.key === 'Enter' && modal && modal.type === 'task' && e.target.id === 'm-title') { e.preventDefault(); saveTaskFromModal(); return; }

  // Focused card: Enter opens, Shift+Arrow moves it
  const card = e.target.closest && e.target.closest('[data-act="open-task"]');
  if (card && !typing(e.target)) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTaskModal(card.dataset.id); return; }
    if (e.shiftKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && card.classList.contains('card') && !ui.tt) {
      const t = byId(state.tasks, card.dataset.id);
      const to = t && COLS[colIndex(t.col) + (e.key === 'ArrowRight' ? 1 : -1)];
      if (to) { e.preventDefault(); moveTask(t.id, to.id); render(); const again = $(`.card[data-id="${t.id}"]`); if (again) again.focus(); toast(`Moved to ${to.name}`); }
      return;
    }
  }
  // Calendar day: Enter adds a task
  if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('day')) { openTaskModal(null, { due: e.target.dataset.due }); return; }

  if (e.key.toLowerCase() === 'n' && !typing(e.target) && !modal && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); openTaskModal(); }
});

/* =====================================================================
   DRAG AND DROP (native HTML5)
   While dragging, a blue line shows exactly where the card will land.
   ===================================================================== */
const drag = { id: null, before: null };

function clearDragUI() {
  $$('.drop-line').forEach(x => x.remove());
  $$('.col.drop').forEach(x => x.classList.remove('drop'));
  $$('.card.dragging').forEach(x => x.classList.remove('dragging'));
}
function cardAfter(list, y) {
  const cards = $$('.card:not(.dragging)', list);
  return cards.find(c => { const r = c.getBoundingClientRect(); return y < r.top + r.height / 2; }) || null;
}

document.addEventListener('dragstart', e => {
  const c = e.target.closest && e.target.closest('.card');
  if (!c || ui.tt) { e.preventDefault(); return; }
  drag.id = c.dataset.id; drag.before = null;
  e.dataTransfer.effectAllowed = 'move';
  try { e.dataTransfer.setData('text/plain', drag.id); } catch (err) { /* old browsers */ }
  setTimeout(() => c.classList.add('dragging'), 0);
});

document.addEventListener('dragover', e => {
  if (!drag.id) return;
  const col = e.target.closest && e.target.closest('.col');
  if (!col) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const list = $('.cards', col);
  const after = cardAfter(list, e.clientY);
  drag.before = after ? after.dataset.id : null;
  $$('.col.drop').forEach(x => { if (x !== col) x.classList.remove('drop'); });
  col.classList.add('drop');
  let line = $('.drop-line');
  if (!line) { line = document.createElement('div'); line.className = 'drop-line'; }
  list.insertBefore(line, after);
});

document.addEventListener('drop', e => {
  if (!drag.id) return;
  const col = e.target.closest && e.target.closest('.col');
  if (!col) { clearDragUI(); drag.id = null; return; }
  e.preventDefault();
  const id = drag.id, before = drag.before, to = col.dataset.col;
  const t = byId(state.tasks, id);
  const changed = t && t.col !== to;
  drag.id = null;
  moveTask(id, to, before);
  render();
  if (changed) toast(to === 'done' ? `Done. "${t.title}" has cooled to zero.` : `Moved to ${colName(to)}`);
});

document.addEventListener('dragend', () => { clearDragUI(); drag.id = null; });

/* =====================================================================
   START
   ===================================================================== */
window.addEventListener('hashchange', () => route());
window.addEventListener('popstate', () => route());
window.addEventListener('DOMContentLoaded', async () => {
  // After a successful login, draw the app behind the fading login screen
  Auth.onReady = fresh => { checkOverdue(); if (fresh) go('workspace'); else route(); render(); };

  const saved = await Auth.init();        // creates the demo account the first time
  if (saved) {
    Auth.resume(saved);
    checkOverdue(); route();
  } else {
    Auth.show();
  }
  // refresh heat colours and "x minutes ago" every minute
  setInterval(() => { if (Auth.user() && !modal && !palette.open && !ui.tt && !drag.id && document.activeElement.tagName !== 'INPUT') { renderChrome(); renderView(); } }, 60000);
});
