/* =====================================================================
   PROJECT MANAGEMENT APPLICATION — views.js
   Everything the user SEES. Each function returns an HTML string.
   No data is changed here (that happens in store.js / app.js).
   ===================================================================== */

const PAGES = [
  { id: 'workspace', name: 'Workspace', icon: 'home' },
  { id: 'projects',  name: 'Projects',  icon: 'folder' },
  { id: 'tasks',     name: 'Tasks',     icon: 'check' },
  { id: 'kanban',    name: 'Kanban',    icon: 'columns' },
  { id: 'calendar',  name: 'Calendar',  icon: 'calendar' },
  { id: 'team',      name: 'Team',      icon: 'users' },
  { id: 'timeline',  name: 'Timeline',  icon: 'timeline' },
  { id: 'reports',   name: 'Reports',   icon: 'chart' },
  { id: 'settings',  name: 'Settings',  icon: 'settings' }
];

/* Screen-only state (not saved) */
const now0 = new Date();
const ui = {
  page: 'workspace',
  filters: { q: '', project: '', assignee: '', priority: '', label: '', heat: '' },
  sort: { key: 'heat', dir: -1 },
  cal: { y: now0.getFullYear(), m: now0.getMonth() },
  tt: null,            // Time Machine timestamp (null = live)
  tmOpen: false,
  tmValue: 1000,
  standupWho: ''
};

/* ---------- Icons ---------- */
const ICONS = {
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  check: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  columns: '<path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7m0-18H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7m0-18v18"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  timeline: '<rect x="3" y="4" width="10" height="4" rx="1"/><rect x="8" y="10" width="13" height="4" rx="1"/><rect x="5" y="16" width="8" height="4" rx="1"/>',
  chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  right: '<polyline points="9 18 15 12 9 6"/>',
  left: '<polyline points="15 18 9 12 15 6"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  note: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  play: '<polygon points="5 3 19 12 5 21 5 3"/>',
  pause: '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m5 0V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2"/>',
  menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>'
};
const icon = (n, s) => `<svg class="ic" width="${s || 18}" height="${s || 18}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

/* ---------- Small building blocks ---------- */
const initials = n => n.split(/\s+/).map(w => w[0] || '').slice(0, 2).join('').toUpperCase();
const avatar = m => `<span class="av" style="--c:${m.color}" title="${esc(m.name)}">${esc(initials(m.name))}</span>`;
const avatars = ids => ids.map(member).filter(Boolean).map(avatar).join('');
const priName = id => (PRIORITIES.find(p => p.id === id) || {}).name || id;
const pageHead = (title, sub, actions) => `<div class="page-head"><div><h1>${title}</h1><p>${sub}</p></div><div class="actions">${actions || ''}</div></div>`;
const emptyState = (title, text) => `<div class="empty-state"><h3>${title}</h3><p>${text}</p></div>`;

function labelChips(ids) {
  return ids.map(label).filter(Boolean).map(l => `<span class="chip" style="--c:${l.color}">${esc(l.name)}</span>`).join('');
}
function projectProgress(p) {
  const ts = state.tasks.filter(t => t.projectId === p.id);
  if (!ts.length) return { pct: 0, n: 0, done: 0 };
  return { pct: Math.round(ts.reduce((s, t) => s + progressOf(t), 0) / ts.length), n: ts.length, done: ts.filter(t => t.col === 'done').length };
}

/* ---------- Filtering (used by Kanban, Tasks, Calendar, Timeline) ---------- */
function visibleTasks() {
  const T = ui.tt;
  const now = T || Date.now();
  const f = ui.filters;
  const q = f.q.trim().toLowerCase();
  return state.tasks.map(t => (T ? taskAt(t, T) : t)).filter(Boolean).filter(t => {
    if (f.project && t.projectId !== f.project) return false;
    if (f.assignee === 'none' ? t.assignees.length : (f.assignee && !t.assignees.includes(f.assignee))) return false;
    if (f.priority && t.priority !== f.priority) return false;
    if (f.label && !t.labels.includes(f.label)) return false;
    if (f.heat) { const h = heatOf(t, now); if (f.heat === 'hot' ? h < 50 : h >= 25) return false; }
    if (q) {
      const p = project(t.projectId);
      const hay = (t.title + ' ' + t.desc + ' ' + (p ? p.name : '') + ' ' + t.labels.map(l => (label(l) || {}).name).join(' ') +
        ' ' + t.assignees.map(a => (member(a) || {}).name).join(' ')).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
const filtersActive = () => Object.values(ui.filters).some(Boolean);

function filterBar() {
  const f = ui.filters;
  const opt = (v, t, cur) => `<option value="${esc(v)}"${cur === v ? ' selected' : ''}>${esc(t)}</option>`;
  const sel = (key, name, opts) => `<label class="fsel"><span>${name}</span><select data-filter="${key}">${opts}</select></label>`;
  return `<div class="filters" role="group" aria-label="Filters">
    ${sel('project', 'Project', opt('', 'All', f.project) + state.projects.map(p => opt(p.id, p.name, f.project)).join(''))}
    ${sel('assignee', 'Person', opt('', 'Anyone', f.assignee) + opt('none', 'Unassigned', f.assignee) + state.members.map(m => opt(m.id, m.name, f.assignee)).join(''))}
    ${sel('priority', 'Priority', opt('', 'Any', f.priority) + PRIORITIES.map(p => opt(p.id, p.name, f.priority)).join(''))}
    ${sel('label', 'Label', opt('', 'Any', f.label) + state.labels.map(l => opt(l.id, l.name, f.label)).join(''))}
    ${sel('heat', 'Heat', opt('', 'Any', f.heat) + opt('hot', 'Hot and above', f.heat) + opt('cool', 'Cool only', f.heat))}
    ${filtersActive() ? `<button class="btn ghost" data-act="clear-filters">Clear filters</button>` : ''}
  </div>`;
}

/* ---------- Task card ---------- */
function cardHTML(t, T) {
  const now = T || Date.now();
  const h = heatOf(t, now);
  const lv = heatLevel(h);
  const p = project(t.projectId);
  const di = dueInfo(t, now);
  const subs = t.subtasks.length ? `${t.subtasks.filter(s => s.done).length}/${t.subtasks.length}` : '';
  const done = t.col === 'done';
  return `<article class="card ${done ? 'is-done' : lv.id}" draggable="${T ? 'false' : 'true'}" data-act="open-task" data-id="${t.id}" style="--h:${done ? 'var(--ok)' : heatColor(h)}" tabindex="0" aria-label="${esc(t.title)}">
    <div class="card-top">
      <span class="proj"><i style="background:${p ? p.color : '#999'}"></i>${esc(p ? p.name : 'No project')}</span>
      ${done ? '' : `<span class="heat" title="Heat ${h}: ${lv.label}">${icon('flame', 12)}${h}</span>`}
    </div>
    <h3>${esc(t.title)}</h3>
    ${t.labels.length ? `<div class="chips">${labelChips(t.labels)}</div>` : ''}
    <div class="bar" title="${progressOf(t, t.col)}% complete"><i style="width:${progressOf(t, t.col)}%"></i></div>
    <div class="card-foot">
      <span class="pri ${t.priority}"><i></i>${priName(t.priority)}</span>
      ${di ? `<span class="due ${di.cls}">${di.text}</span>` : ''}
      ${subs ? `<span class="subs">${icon('check', 12)}${subs}</span>` : ''}
      <span class="grow"></span>
      <span class="avs">${avatars(t.assignees)}</span>
    </div>
    ${T || done ? '' : `<button class="mv" data-act="move-next" data-id="${t.id}" title="Move to next column" aria-label="Move to next column">${icon('right', 14)}</button>`}
  </article>`;
}

/* =====================================================================
   PAGES
   ===================================================================== */

/* ---------- Workspace ---------- */
function viewWorkspace() {
  const now = Date.now();
  const open = state.tasks.filter(t => t.col !== 'done');
  const scored = open.map(t => ({ t, h: heatOf(t, now) })).sort((a, b) => b.h - a.h);
  const temp = open.length ? Math.round(scored.reduce((s, x) => s + x.h, 0) / open.length) : 0;
  const lv = heatLevel(temp);
  const dueSoon = open.filter(t => t.due && dueDiff(t, now) <= 3).length;
  const doneWeek = completedSince(7 * DAY).length;
  const hr = new Date().getHours();
  const greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const line = { cool: 'Everything is calm. A good moment to plan ahead.', warm: 'A few tasks need attention this week.',
    hot: 'Several tasks are close to their limit.', blazing: 'The board is overheating. Start with the hottest tasks.' }[lv.id];
  const ribbon = scored.map(x => `<button class="tick" style="--h:${heatColor(x.h)};height:${14 + x.h * 0.34}px" data-act="open-task" data-id="${x.t.id}" title="${esc(x.t.title)} (heat ${x.h})" aria-label="${esc(x.t.title)}, heat ${x.h}"></button>`).join('');
  const act = recentActivity(8).map(e => `<li><span class="dot" style="background:${colorOfCol(e.col)}"></span><span>${e.created ? 'Created' : 'Moved'} <b>${esc(e.task.title)}</b>${e.created ? '' : ' to ' + colName(e.col)}</span><time>${relTime(e.t)}</time></li>`).join('');
  return `
    ${pageHead(`${greet}, ${esc(state.settings.userName)}`, new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      `<button class="btn" data-act="standup">${icon('note', 16)}Write standup</button><button class="btn primary" data-act="new-task">${icon('plus', 16)}New task</button>`)}
    ${state.projects.length ? '' : `<section class="panel onboard"><div><h2>Start your first project</h2><p class="sub" style="margin:0">Projects hold your tasks. Create one, then add tasks from the Kanban board.</p></div><button class="btn primary" data-act="new-project">${icon('plus', 16)}New project</button></section>`}
    <section class="temp panel">
      <div class="temp-read" style="--h:${heatColor(temp)}">
        <div class="temp-num">${temp}</div>
        <div><strong>${lv.label} workspace</strong><p>${line}</p></div>
      </div>
      <div class="ribbon big" aria-label="Heat of every open task, coolest on the right">${ribbon || '<span class="muted">No open tasks</span>'}</div>
    </section>
    <section class="stats">
      <div class="stat"><b>${open.length}</b><span>open tasks</span></div>
      <div class="stat"><b>${scored.filter(x => x.h >= 50).length}</b><span>running hot</span></div>
      <div class="stat"><b>${dueSoon}</b><span>due within 3 days</span></div>
      <div class="stat"><b>${doneWeek}</b><span>finished this week</span></div>
    </section>
    <div class="grid2">
      <section class="panel">
        <h2>Needs attention first</h2>
        <ul class="rows">${scored.slice(0, 5).map(x => {
          const di = dueInfo(x.t);
          return `<li data-act="open-task" data-id="${x.t.id}" tabindex="0"><span class="heat" style="--h:${heatColor(x.h)}">${icon('flame', 12)}${x.h}</span><span class="grow"><b>${esc(x.t.title)}</b><small>${esc((project(x.t.projectId) || {}).name || '')} · ${colName(x.t.col)}${di ? ' · ' + di.text : ''}</small></span><span class="avs">${avatars(x.t.assignees)}</span></li>`;
        }).join('') || '<li class="muted">Nothing is open. Nice.</li>'}</ul>
      </section>
      <section class="panel">
        <h2>Projects</h2>
        <div class="proj-list">${state.projects.map(p => {
          const pp = projectProgress(p);
          return `<button class="proj-row" data-act="open-project" data-id="${p.id}"><i style="background:${p.color}"></i><span class="grow"><b>${esc(p.name)}</b><small>${pp.done} of ${pp.n} tasks done</small></span><span class="pct">${pp.pct}%</span><span class="bar"><i style="width:${pp.pct}%;background:${p.color}"></i></span></button>`;
        }).join('') || '<p class="muted">No projects yet.</p>'}</div>
      </section>
    </div>
    <section class="panel"><h2>Recent activity</h2><ul class="feed">${act}</ul></section>`;
}
const colorOfCol = id => (COLS.find(c => c.id === id) || {}).color || '#999';

/* ---------- Projects ---------- */
function viewProjects() {
  const cards = state.projects.map(p => {
    const pp = projectProgress(p);
    const ts = state.tasks.filter(t => t.projectId === p.id);
    const hot = ts.filter(t => t.col !== 'done' && heatOf(t) >= 50).length;
    const people = [...new Set(ts.flatMap(t => t.assignees))];
    const stack = COLS.map(c => { const n = ts.filter(t => t.col === c.id).length; return n ? `<i style="flex:${n};background:${c.color}" title="${c.name}: ${n}"></i>` : ''; }).join('');
    return `<article class="proj-card" style="--c:${p.color}">
      <header><span class="swatch"></span><h3>${esc(p.name)}</h3><button class="icon-btn" data-act="delete-project" data-id="${p.id}" title="Delete project" aria-label="Delete ${esc(p.name)}">${icon('trash', 16)}</button></header>
      <p>${esc(p.desc || 'No description')}</p>
      <div class="stack" title="Tasks by column">${stack || '<i style="flex:1;background:var(--line)"></i>'}</div>
      <div class="proj-meta"><span><b>${pp.pct}%</b> complete</span><span><b>${ts.length}</b> tasks</span><span class="${hot ? 'hotcount' : ''}"><b>${hot}</b> hot</span></div>
      <footer><span class="avs">${avatars(people)}</span><button class="btn" data-act="open-project" data-id="${p.id}">Open board</button></footer>
    </article>`;
  }).join('');
  return `${pageHead('Projects', 'Every project, how far along it is, and how hot it is running.', `<button class="btn primary" data-act="new-project">${icon('plus', 16)}New project</button>`)}
    <div class="grid3">${cards || emptyState('No projects yet', 'Create your first project to start adding tasks.')}</div>`;
}

/* ---------- Tasks (table) ---------- */
function viewTasks() {
  const now = Date.now();
  const rows = visibleTasks().map(t => ({ t, h: heatOf(t, now), prog: progressOf(t) }));
  const k = ui.sort.key, d = ui.sort.dir;
  const val = {
    title: r => r.t.title.toLowerCase(), col: r => colIndex(r.t.col),
    priority: r => (PRIORITIES.find(p => p.id === r.t.priority) || {}).w, due: r => r.t.due || '9999-99-99',
    progress: r => r.prog, heat: r => r.h
  }[k];
  rows.sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * d);
  const th = (key, name) => `<th aria-sort="${ui.sort.key === key ? (d > 0 ? 'ascending' : 'descending') : 'none'}"><button data-act="sort" data-key="${key}">${name}${ui.sort.key === key ? (d > 0 ? ' ↑' : ' ↓') : ''}</button></th>`;
  const body = rows.map(({ t, h, prog }) => {
    const di = dueInfo(t); const p = project(t.projectId);
    return `<tr data-act="open-task" data-id="${t.id}" tabindex="0">
      <td><b>${esc(t.title)}</b><small><i class="pdot" style="background:${p ? p.color : '#999'}"></i>${esc(p ? p.name : 'No project')}</small></td>
      <td><span class="stage"><i style="background:${colorOfCol(t.col)}"></i>${colName(t.col)}</span></td>
      <td><span class="pri ${t.priority}"><i></i>${priName(t.priority)}</span></td>
      <td><span class="avs">${avatars(t.assignees)}</span></td>
      <td>${di ? `<span class="due ${di.cls}">${di.text}</span>` : '<span class="muted">None</span>'}</td>
      <td><span class="bar sm"><i style="width:${prog}%"></i></span></td>
      <td>${t.col === 'done' ? '<span class="muted">Done</span>' : `<span class="heat" style="--h:${heatColor(h)}">${icon('flame', 12)}${h}</span>`}</td>
    </tr>`;
  }).join('');
  return `${pageHead('Tasks', `${rows.length} task${rows.length === 1 ? '' : 's'} shown. Click a column title to sort.`, `<button class="btn primary" data-act="new-task">${icon('plus', 16)}New task</button>`)}
    ${filterBar()}
    ${rows.length ? `<div class="table-wrap"><table class="tbl"><thead><tr>${th('title', 'Task')}${th('col', 'Status')}${th('priority', 'Priority')}<th>People</th>${th('due', 'Due')}${th('progress', 'Progress')}${th('heat', 'Heat')}</tr></thead><tbody>${body}</tbody></table></div>`
      : emptyState('No tasks match', 'Clear a filter or add a new task.')}`;
}

/* ---------- Kanban ---------- */
function viewKanban() {
  const T = ui.tt;
  const now = T || Date.now();
  const base = T ? state.tasks.map(t => taskAt(t, T)).filter(Boolean) : state.tasks;
  const list = visibleTasks();
  const open = list.filter(t => t.col !== 'done');
  const scored = open.map(t => ({ t, h: heatOf(t, now) }));
  const temp = scored.length ? Math.round(scored.reduce((s, x) => s + x.h, 0) / scored.length) : 0;
  const ribbon = scored.slice().sort((a, b) => colIndex(a.t.col) - colIndex(b.t.col) || b.h - a.h)
    .map(x => `<button class="tick" style="--h:${heatColor(x.h)};height:${12 + x.h * 0.3}px" ${T ? '' : `data-act="open-task" data-id="${x.t.id}"`} title="${esc(x.t.title)} (heat ${x.h})" aria-label="${esc(x.t.title)}, heat ${x.h}"></button>`).join('');
  const cols = COLS.map(c => {
    const items = list.filter(t => t.col === c.id);
    const n = base.filter(t => t.col === c.id).length;
    const lim = state.settings.wip[c.id] || 0;
    const cls = lim && n > lim ? 'over' : lim && n === lim ? 'full' : '';
    return `<section class="col ${cls}" data-col="${c.id}" aria-label="${c.name}">
      <header class="col-head"><span class="dot" style="background:${c.color}"></span><h2>${c.name}</h2>
        <span class="count">${items.length}${lim ? ` of ${lim}` : ''}</span>
        ${cls === 'over' ? '<span class="wip">Over limit</span>' : cls === 'full' ? '<span class="wip soft">At limit</span>' : ''}</header>
      <div class="cards">${items.map(t => cardHTML(t, T)).join('') || `<p class="empty">${c.hint}</p>`}</div>
      ${T ? '' : `<form class="quick" data-quickadd="${c.id}"><input name="title" placeholder="Add a task" autocomplete="off" aria-label="Add a task to ${c.name}"></form>`}
    </section>`;
  }).join('');
  return `${pageHead('Kanban board', T ? `Read-only: this is how the board looked in the past.` : 'Drag cards between columns. Hotter cards need you sooner.',
      `<button class="btn" data-act="tm-toggle">${icon('clock', 16)}Time Machine</button><button class="btn primary" data-act="new-task">${icon('plus', 16)}New task</button>`)}
    <div class="pulse panel">
      <div class="pulse-read" style="--h:${heatColor(temp)}"><b>${temp}</b><span>${heatLevel(temp).label} board</span></div>
      <div class="ribbon" aria-label="Heat of every open task">${ribbon || '<span class="muted">No open tasks</span>'}</div>
    </div>
    ${filterBar()}
    <div class="board ${T ? 'past' : ''}">${cols}</div>`;
}

/* ---------- Calendar ---------- */
function viewCalendar() {
  const { y, m } = ui.cal;
  const first = new Date(y, m, 1);
  const offset = (first.getDay() + 6) % 7;            // Monday first
  const dim = new Date(y, m + 1, 0).getDate();
  const rows = Math.ceil((offset + dim) / 7);
  const list = visibleTasks();
  const todayISO = toISO(new Date());
  let cells = '';
  for (let i = 0; i < rows * 7; i++) {
    const d = new Date(y, m, 1 - offset + i);
    const iso = toISO(d);
    const ts = list.filter(t => t.due === iso);
    const shown = ts.slice(0, 3).map(t => `<button class="pill ${t.col === 'done' ? 'is-done' : ''}" style="--h:${t.col === 'done' ? 'var(--ok)' : heatColor(heatOf(t))}" data-act="open-task" data-id="${t.id}" title="${esc(t.title)}">${esc(t.title)}</button>`).join('');
    cells += `<div class="day ${d.getMonth() !== m ? 'out' : ''} ${iso === todayISO ? 'today' : ''}" data-act="new-task" data-due="${iso}" tabindex="0" aria-label="${d.toDateString()}, ${ts.length} tasks due">
      <span class="dn">${d.getDate()}</span>${shown}${ts.length > 3 ? `<span class="more">+${ts.length - 3} more</span>` : ''}</div>`;
  }
  const nodue = list.filter(t => !t.due && t.col !== 'done');
  const title = first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  return `${pageHead('Calendar', 'Tasks by due date. Click any day to add a task for it.',
      `<button class="btn" data-act="cal-today">Today</button><button class="icon-btn bordered" data-act="cal-prev" aria-label="Previous month">${icon('left', 16)}</button><strong class="cal-title">${title}</strong><button class="icon-btn bordered" data-act="cal-next" aria-label="Next month">${icon('right', 16)}</button>`)}
    ${filterBar()}
    <div class="cal"><div class="cal-head">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<span>${d}</span>`).join('')}</div><div class="cal-grid" style="grid-template-rows:repeat(${rows},minmax(104px,1fr))">${cells}</div></div>
    ${nodue.length ? `<section class="panel"><h2>No due date (${nodue.length})</h2><div class="chips wrap">${nodue.map(t => `<button class="chip btnchip" data-act="open-task" data-id="${t.id}">${esc(t.title)}</button>`).join('')}</div></section>` : ''}`;
}

/* ---------- Team ---------- */
function viewTeam() {
  const loads = state.members.map(m => ({ m, ...memberLoad(m.id) }));
  const max = Math.max(150, ...loads.map(x => x.load));
  const unassigned = state.tasks.filter(t => t.col !== 'done' && !t.assignees.length).length;
  const cards = loads.map(({ m, tasks, load }) => {
    const top = tasks.map(t => ({ t, h: heatOf(t) })).sort((a, b) => b.h - a.h).slice(0, 3);
    const status = load >= 150 ? ['Stretched', 'hot'] : load >= 80 ? ['Busy', 'warm'] : ['Comfortable', 'cool'];
    return `<article class="member">
      <header>${avatar(m)}<div class="grow"><h3>${esc(m.name)}</h3><small>${esc(m.role)}</small></div><span class="tag ${status[1]}">${status[0]}</span>
        <button class="icon-btn" data-act="remove-member" data-id="${m.id}" title="Remove member" aria-label="Remove ${esc(m.name)}">${icon('trash', 16)}</button></header>
      <div class="load" title="Total heat of open tasks: ${load}"><i style="width:${Math.min(100, load / max * 100)}%;background:${heatColor(Math.min(100, load / 2))}"></i></div>
      <p class="small">${tasks.length} open task${tasks.length === 1 ? '' : 's'}, workload score ${load}</p>
      <ul class="rows tight">${top.map(x => `<li data-act="open-task" data-id="${x.t.id}" tabindex="0"><span class="heat" style="--h:${heatColor(x.h)}">${icon('flame', 12)}${x.h}</span><span class="grow">${esc(x.t.title)}</span></li>`).join('') || '<li class="muted">No open tasks</li>'}</ul>
    </article>`;
  }).join('');
  return `${pageHead('Team', 'Workload score = the combined heat of everything open on someone\'s plate.', `<button class="btn primary" data-act="new-member">${icon('plus', 16)}Add member</button>`)}
    ${unassigned ? `<p class="note">${unassigned} open task${unassigned === 1 ? ' has' : 's have'} nobody assigned.</p>` : ''}
    <div class="grid3">${cards}</div>`;
}

/* ---------- Timeline ---------- */
function viewTimeline() {
  const now = Date.now();
  const start = startOfDay(now) - 7 * DAY;
  const days = 42, span = days * DAY;
  const pos = ts => (ts - start) / span * 100;
  const list = visibleTasks();
  const projs = state.projects.filter(p => !ui.filters.project || p.id === ui.filters.project);
  let hidden = 0;
  const head = Array.from({ length: days / 7 }, (_, i) => `<span style="left:${i * 7 / days * 100}%">${fmtDate(start + i * 7 * DAY)}</span>`).join('');
  const body = projs.map(p => {
    const ts = list.filter(t => t.projectId === p.id).sort((a, b) => (a.due || '9').localeCompare(b.due || '9'));
    if (!ts.length) return '';
    const rows = ts.map(t => {
      const started = t.history.find(e => e.col === 'progress');
      const s = started ? started.t : (t.col === 'done' ? t.created : Math.max(now, t.created));
      let e = t.col === 'done' ? t.history[t.history.length - 1].t : (t.due ? parseISO(t.due).getTime() + DAY : s + 3 * DAY);
      if (e <= s) e = s + DAY;
      const l = pos(s), r = pos(e);
      if (r < 0 || l > 100) { hidden++; return ''; }
      const L = Math.max(0, l), W = Math.max(1.8, Math.min(100, r) - L);
      const h = heatOf(t, now), planned = !started && t.col !== 'done';
      const di = dueInfo(t);
      return `<div class="tl-row"><button class="tl-label" data-act="open-task" data-id="${t.id}">${esc(t.title)}</button>
        <div class="tl-track"><button class="tl-bar ${planned ? 'planned' : ''} ${t.col === 'done' ? 'is-done' : ''}" style="left:${L}%;width:${W}%;--h:${t.col === 'done' ? 'var(--ok)' : heatColor(h)}" data-act="open-task" data-id="${t.id}" title="${esc(t.title)}: ${colName(t.col)}${di ? ', ' + di.text.toLowerCase() : ''}"><i style="width:${progressOf(t)}%"></i></button></div></div>`;
    }).join('');
    return `<div class="tl-group"><div class="tl-gh"><i style="background:${p.color}"></i>${esc(p.name)}</div>${rows}</div>`;
  }).join('');
  const todayPos = pos(now) / 100;
  return `${pageHead('Timeline', 'Each bar runs from when work started to its due date. Colour shows heat; the lighter fill shows progress.', '')}
    ${filterBar()}
    <div class="tl panel"><div class="tl-inner" style="--today:${todayPos}">
      <div class="tl-axis"><span class="tl-corner"></span><div class="tl-weeks">${head}</div></div>
      <span class="tl-today" aria-hidden="true"><em>Today</em></span>
      ${body || emptyState('Nothing to plot', 'No tasks match the current filters.')}
    </div></div>
    ${hidden ? `<p class="note">${hidden} task${hidden === 1 ? ' is' : 's are'} outside this 6-week window.</p>` : ''}`;
}

/* ---------- Reports ---------- */
function viewReports() {
  const open = state.tasks.filter(t => t.col !== 'done');
  // 1. Finished per day
  const per = doneByDay(14); const mx = Math.max(1, ...per.map(x => x.count));
  const bars = per.map((x, i) => {
    const h = x.count / mx * 100;
    return `<g><rect x="${i * 30 + 6}" y="${120 - h}" width="22" height="${h}" rx="4" fill="var(--ok)"/><text x="${i * 30 + 17}" y="${114 - h}" text-anchor="middle" class="svg-n">${x.count || ''}</text>
      <text x="${i * 30 + 17}" y="138" text-anchor="middle" class="svg-l">${new Date(x.date).getDate()}</text></g>`;
  }).join('');
  // 2. Status split
  const total = state.tasks.length || 1;
  const status = COLS.map(c => { const n = state.tasks.filter(t => t.col === c.id).length;
    return `<div class="hbar"><span>${c.name}</span><div><i style="width:${n / total * 100}%;background:${c.color}"></i></div><b>${n}</b></div>`; }).join('');
  // 3. Priority donut
  const C = 2 * Math.PI * 40; let off = 0;
  const pcol = { low: '#8A91AF', medium: '#3D7BFF', high: '#F08C00', urgent: '#E03131' };
  const parts = PRIORITIES.map(p => {
    const n = open.filter(t => t.priority === p.id).length; const len = n / (open.length || 1) * C;
    const seg = `<circle r="40" cx="60" cy="60" fill="none" stroke="${pcol[p.id]}" stroke-width="18" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 60 60)"/>`;
    off += len; return { n, seg, p };
  });
  // 4. Heat spread
  const lv = { cool: 0, warm: 0, hot: 0, blazing: 0 };
  open.forEach(t => lv[heatLevel(heatOf(t)).id]++);
  const heatMax = Math.max(1, ...Object.values(lv));
  const heatBars = [['cool', 12], ['warm', 37], ['hot', 62], ['blazing', 88]].map(([k, h]) =>
    `<div class="vbar"><div style="height:${lv[k] / heatMax * 100}%;background:${heatColor(h)}"></div><b>${lv[k]}</b><span>${k[0].toUpperCase() + k.slice(1)}</span></div>`).join('');
  // 5. Where work waits
  const wait = avgDaysPerColumn(); const wmax = Math.max(1, ...wait.map(w => w.days));
  const waitBars = wait.map(w => `<div class="hbar"><span>${w.col.name}</span><div><i style="width:${w.days / wmax * 100}%;background:${w.col.color}"></i></div><b>${w.days.toFixed(1)}d</b></div>`).join('');
  const slow = wait.slice().sort((a, b) => b.days - a.days)[0];
  // 6. Project progress
  const projBars = state.projects.map(p => { const pp = projectProgress(p);
    return `<div class="hbar"><span>${esc(p.name)}</span><div><i style="width:${pp.pct}%;background:${p.color}"></i></div><b>${pp.pct}%</b></div>`; }).join('');
  return `${pageHead('Reports', 'Plain-language charts built from the history of every card.', '')}
    <div class="grid2">
      <section class="panel"><h2>Finished per day</h2><p class="sub">Last 14 days</p><svg viewBox="0 0 420 146" class="chart" role="img" aria-label="Tasks finished per day over 14 days">${bars}</svg></section>
      <section class="panel"><h2>Where work waits</h2><p class="sub">Average days a task spends in each column. ${slow && slow.days > 0 ? `Tasks wait longest in <b>${slow.col.name}</b>.` : ''}</p>${waitBars}</section>
      <section class="panel"><h2>Heat spread</h2><p class="sub">How many open tasks sit at each temperature</p><div class="vbars">${heatBars}</div></section>
      <section class="panel"><h2>Open tasks by priority</h2><div class="donut"><svg viewBox="0 0 120 120" width="150" height="150" role="img" aria-label="Priority split">${parts.map(x => x.seg).join('')}<text x="60" y="64" text-anchor="middle" class="svg-big">${open.length}</text></svg>
        <ul class="legend">${parts.map(x => `<li><i style="background:${pcol[x.p.id]}"></i>${x.p.name}<b>${x.n}</b></li>`).join('')}</ul></div></section>
      <section class="panel"><h2>Tasks by column</h2>${status}</section>
      <section class="panel"><h2>Project progress</h2>${projBars || '<p class="muted">No projects.</p>'}</section>
    </div>`;
}

/* ---------- Settings ---------- */
function viewSettings() {
  const s = state.settings;
  return `${pageHead('Settings', 'Everything is saved in this browser. Nothing leaves your computer.', '')}
    <div class="grid2">
      <section class="panel form">
        <h2>You</h2>
        ${typeof Auth !== 'undefined' && Auth.user() ? `<p class="small" style="margin:0">Signed in as <b>${esc(Auth.user().name)}</b>${Auth.user().email ? ' (' + esc(Auth.user().email) + ')' : ' (guest)'}</p><div class="btn-row"><button class="btn" data-act="logout">Sign out</button></div>` : ''}
        <label>Your name<input data-setting="userName" value="${esc(s.userName)}" maxlength="30"></label>
        <label class="check"><input type="checkbox" data-setting="notify" ${s.notify ? 'checked' : ''}> Show notifications</label>
        <label>Theme<select data-setting="theme"><option value="light" ${s.theme === 'light' ? 'selected' : ''}>Light</option><option value="dark" ${s.theme === 'dark' ? 'selected' : ''}>Dark</option></select></label>
      </section>
      <section class="panel form">
        <h2>Work-in-progress limits</h2>
        <p class="sub">A column turns amber at its limit and red above it. Use 0 for no limit.</p>
        <div class="wip-grid">${COLS.map(c => `<label>${c.name}<input type="number" min="0" max="99" data-wip="${c.id}" value="${s.wip[c.id] || 0}"></label>`).join('')}</div>
      </section>
      <section class="panel form">
        <h2>Your data</h2>
        <div class="btn-row"><button class="btn" data-act="export">Export backup</button><label class="btn file">Import backup<input type="file" accept="application/json" data-import hidden></label></div>
        <div class="btn-row"><button class="btn" data-act="reset-demo">Reset demo data</button><button class="btn danger" data-act="wipe">Delete everything</button></div>
      </section>
      <section class="panel">
        <h2>Shortcuts</h2>
        <ul class="keys"><li><kbd>Ctrl</kbd> <kbd>K</kbd><span>Command palette</span></li><li><kbd>N</kbd><span>New task</span></li><li><kbd>Esc</kbd><span>Close anything open</span></li><li><kbd>Shift</kbd> <kbd>←</kbd> <kbd>→</kbd><span>Move a focused card</span></li></ul>
      </section>
    </div>`;
}

const VIEWS = { workspace: viewWorkspace, projects: viewProjects, tasks: viewTasks, kanban: viewKanban, calendar: viewCalendar, team: viewTeam, timeline: viewTimeline, reports: viewReports, settings: viewSettings };

/* =====================================================================
   MODALS, PANELS, OVERLAYS
   ===================================================================== */
function taskModalHTML(d, isNew) {
  const h = heatOf(d);
  const lv = heatLevel(h);
  const chip = (field, items, sel) => items.map(i => `<button type="button" class="chip tog ${sel.includes(i.id) ? 'on' : ''}" style="--c:${i.color}" data-act="toggle-chip" data-field="${field}" data-id="${i.id}" aria-pressed="${sel.includes(i.id)}">${esc(i.name)}</button>`).join('');
  const options = (arr, cur) => arr.map(o => `<option value="${esc(o.id)}"${o.id === cur ? ' selected' : ''}>${esc(o.name)}</option>`).join('');
  const subsDone = d.subtasks.filter(s => s.done).length;
  const journey = isNew ? '' : `<h4>Journey</h4><ol class="journey">${d.history.map((e, i) => `<li><i style="background:${colorOfCol(e.col)}"></i><span>${i === 0 ? 'Created in ' : 'Moved to '}<b>${colName(e.col)}</b></span><time>${fmtDate(e.t)}</time></li>`).reverse().join('')}</ol>`;
  return `<div class="scrim" data-act="close-modal"><div class="modal" role="dialog" aria-modal="true" aria-label="${isNew ? 'New task' : 'Edit task'}">
    <header class="modal-head"><span class="muted">${isNew ? 'New task' : 'Edit task'}</span><button class="icon-btn" data-act="close-modal" aria-label="Close">${icon('x', 18)}</button></header>
    <div class="modal-body">
      <div class="m-main">
        <input id="m-title" class="m-title" data-f="title" value="${esc(d.title)}" placeholder="What needs to be done?" maxlength="120" autocomplete="off">
        <textarea data-f="desc" rows="3" placeholder="Add details (optional)">${esc(d.desc)}</textarea>
        <h4>Subtasks <span class="muted">${d.subtasks.length ? `${subsDone} of ${d.subtasks.length} done` : ''}</span></h4>
        ${d.subtasks.length ? `<div class="bar"><i style="width:${progressOf(d)}%"></i></div>` : ''}
        <ul class="subs-list">${d.subtasks.map(s => `<li><label><input type="checkbox" data-act="sub-toggle" data-id="${s.id}" ${s.done ? 'checked' : ''}><span class="${s.done ? 'struck' : ''}">${esc(s.text)}</span></label><button type="button" class="icon-btn" data-act="sub-del" data-id="${s.id}" aria-label="Remove subtask">${icon('x', 14)}</button></li>`).join('')}</ul>
        <div class="sub-add"><input id="m-sub" placeholder="Add a subtask and press Enter" autocomplete="off"><button type="button" class="btn" data-act="sub-add">Add</button></div>
        ${journey}
      </div>
      <aside class="m-side">
        <div class="m-heat" style="--h:${heatColor(h)}">${d.col === 'done' ? '<b>Done</b><span>Heat is 0 for finished tasks</span>' : `<b>${h}</b><span>${lv.label}. Heat rises with priority, nearer due dates and neglect.</span>`}</div>
        <label>Project<select data-f="projectId">${options(state.projects, d.projectId)}</select></label>
        <label>Status<select data-f="col">${options(COLS, d.col)}</select></label>
        <label>Priority<select data-f="priority">${options(PRIORITIES, d.priority)}</select></label>
        <label>Due date<input type="date" data-f="due" value="${esc(d.due)}"></label>
        <div class="field"><span>Assignees</span><div class="chips wrap">${chip('assignees', state.members, d.assignees)}</div></div>
        <div class="field"><span>Labels</span><div class="chips wrap">${chip('labels', state.labels, d.labels)}</div></div>
      </aside>
    </div>
    <footer class="modal-foot">${isNew ? '<span></span>' : `<button class="btn danger" data-act="delete-task">${icon('trash', 16)}Delete</button>`}<div><button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="save-task">${isNew ? 'Create task' : 'Save changes'}</button></div></footer>
  </div></div>`;
}

const COLOR_CHOICES = ['#3355FF', '#0CA678', '#E8590C', '#D6489B', '#7A5CFF', '#F08C00', '#1098AD', '#E03131'];
function colorPicker(sel) {
  return `<div class="swatches" role="radiogroup" aria-label="Colour">${COLOR_CHOICES.map((c, i) => `<label><input type="radio" name="color" value="${c}" ${(sel ? sel === c : i === 0) ? 'checked' : ''}><span style="background:${c}"></span></label>`).join('')}</div>`;
}
function projectModalHTML() {
  return `<div class="scrim" data-act="close-modal"><div class="modal small" role="dialog" aria-modal="true" aria-label="New project">
    <header class="modal-head"><span class="muted">New project</span><button class="icon-btn" data-act="close-modal" aria-label="Close">${icon('x', 18)}</button></header>
    <form class="modal-body col-body" data-form="project">
      <label>Project name<input name="name" id="m-first" maxlength="40" required autocomplete="off"></label>
      <label>Short description<input name="desc" maxlength="90" autocomplete="off"></label>
      <div class="field"><span>Colour</span>${colorPicker()}</div>
      <div class="modal-foot"><span></span><div><button type="button" class="btn" data-act="close-modal">Cancel</button><button class="btn primary" type="submit">Create project</button></div></div>
    </form></div></div>`;
}
function memberModalHTML() {
  return `<div class="scrim" data-act="close-modal"><div class="modal small" role="dialog" aria-modal="true" aria-label="Add member">
    <header class="modal-head"><span class="muted">Add team member</span><button class="icon-btn" data-act="close-modal" aria-label="Close">${icon('x', 18)}</button></header>
    <form class="modal-body col-body" data-form="member">
      <label>Full name<input name="name" id="m-first" maxlength="40" required autocomplete="off"></label>
      <label>Role<input name="role" maxlength="40" placeholder="Designer, developer, tester..." autocomplete="off"></label>
      <div class="field"><span>Avatar colour</span>${colorPicker()}</div>
      <div class="modal-foot"><span></span><div><button type="button" class="btn" data-act="close-modal">Cancel</button><button class="btn primary" type="submit">Add member</button></div></div>
    </form></div></div>`;
}
function standupModalHTML() {
  return `<div class="scrim" data-act="close-modal"><div class="modal small" role="dialog" aria-modal="true" aria-label="Standup writer">
    <header class="modal-head"><span class="muted">Standup writer</span><button class="icon-btn" data-act="close-modal" aria-label="Close">${icon('x', 18)}</button></header>
    <div class="modal-body col-body">
      <p class="sub">Written from the real history of your cards. Copy it into chat or email.</p>
      <label>Standup for<select data-standup-who><option value="">Whole team</option>${state.members.map(m => `<option value="${m.id}" ${ui.standupWho === m.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select></label>
      <textarea id="standup-text" rows="14" readonly>${esc(buildStandup(ui.standupWho))}</textarea>
      <div class="modal-foot"><span></span><div><button class="btn" data-act="close-modal">Close</button><button class="btn primary" data-act="copy-standup">Copy to clipboard</button></div></div>
    </div></div></div>`;
}

function notifHTML() {
  const n = state.notifications;
  return `<div class="notif" role="dialog" aria-label="Notifications">
    <header><strong>Notifications</strong><span><button class="linkbtn" data-act="read-all">Mark all read</button><button class="linkbtn" data-act="clear-notifs">Clear</button></span></header>
    <ul>${n.map(x => `<li class="${x.read ? '' : 'unread'} ${x.kind}"><span>${esc(x.text)}</span><time>${relTime(x.t)}</time></li>`).join('') || '<li class="muted">You are all caught up.</li>'}</ul></div>`;
}

function paletteHTML(items, idx, q) {
  return `<div class="scrim top" data-act="close-palette"><div class="palette" role="dialog" aria-modal="true" aria-label="Command palette">
    <input id="pal-input" placeholder="Type a command or search tasks" value="${esc(q)}" autocomplete="off" aria-label="Command palette">
    <ul id="pal-list">${paletteListHTML(items, idx)}</ul></div></div>`;
}
function paletteListHTML(items, idx) {
  return items.map((it, i) => `<li class="${i === idx ? 'on' : ''}" data-act="palette-run" data-id="${i}"><span>${esc(it.label)}</span><small>${esc(it.hint || '')}</small></li>`).join('') || '<li class="muted">No matches</li>';
}

function tmBarHTML() {
  return `<div class="tm" role="region" aria-label="Time Machine">
    <button class="icon-btn bordered" data-act="tm-play" id="tm-play" aria-label="Play replay">${icon('play', 16)}</button>
    <input id="tm-range" type="range" min="0" max="1000" value="${ui.tmValue}" aria-label="Travel through time">
    <div class="tm-info"><strong id="tm-label"></strong><span id="tm-sub"></span></div>
    <button class="btn" data-act="tm-live">Back to now</button>
    <button class="icon-btn" data-act="tm-toggle" aria-label="Close Time Machine">${icon('x', 18)}</button></div>`;
}

function confirmModalHTML(text, yesLabel) {
  return `<div class="scrim" data-act="close-modal"><div class="modal small" role="alertdialog" aria-modal="true" aria-label="Please confirm">
    <div class="modal-body col-body"><h3>Are you sure?</h3><p class="sub" style="margin:0">${esc(text)}</p>
    <div class="modal-foot"><span></span><div><button class="btn" data-act="close-modal">Cancel</button><button class="btn danger" data-act="confirm-yes" id="m-first">${esc(yesLabel || 'Yes, continue')}</button></div></div></div></div></div>`;
}

function userMenuHTML() {
  const u = (typeof Auth !== 'undefined' && Auth.user()) || { name: state.settings.userName, email: '' };
  return `<div class="usermenu" role="menu" aria-label="Account">
    <div class="um-head">${avatar(Object.assign({}, state.members[0] || {}, { name: u.name, color: (state.members[0] || {}).color || '#3355FF' }))}<div><b>${esc(u.name)}</b><small>${esc(u.email || 'Guest session')}</small></div></div>
    <button role="menuitem" data-act="toggle-theme">Switch theme</button>
    <button role="menuitem" data-act="um-settings">Settings</button>
    <button role="menuitem" class="danger-text" data-act="logout">Sign out</button></div>`;
}
