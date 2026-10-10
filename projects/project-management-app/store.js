/* =====================================================================
   PROJECT MANAGEMENT APPLICATION — store.js
   Everything about DATA lives here: the rules, the demo data, the
   "heat" engine, and the actions that change the board.
   No DOM / HTML code in this file.
   ===================================================================== */

const DAY = 86400000;
let STORE_KEY = 'pm-app.v1';   // changes per signed-in account (see openWorkspace)

/* ---------- Fixed lists ---------- */
const COLS = [
  { id: 'backlog',  name: 'Backlog',     color: '#8A91AF', hint: 'Ideas and someday tasks live here' },
  { id: 'todo',     name: 'To Do',       color: '#3D7BFF', hint: 'Ready to start' },
  { id: 'progress', name: 'In Progress', color: '#7A5CFF', hint: 'Being worked on right now' },
  { id: 'review',   name: 'Review',      color: '#D6489B', hint: 'Waiting for a second pair of eyes' },
  { id: 'done',     name: 'Done',        color: '#1FA37A', hint: 'Finished work' }
];

const PRIORITIES = [
  { id: 'low',    name: 'Low',    w: 10 },
  { id: 'medium', name: 'Medium', w: 25 },
  { id: 'high',   name: 'High',   w: 40 },
  { id: 'urgent', name: 'Urgent', w: 55 }
];

/* ---------- Small helpers ---------- */
const uid = () => Math.random().toString(36).slice(2, 9);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const toISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const startOfDay = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
const fmtDate = ts => new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const fmtFull = ts => new Date(ts).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const colName = id => (COLS.find(c => c.id === id) || {}).name || id;
const colIndex = id => COLS.findIndex(c => c.id === id);
const byId = (arr, id) => arr.find(x => x.id === id);

function relTime(ts) {
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

/* ---------- Demo data ---------- */
function makeSeed() {
  const now = Date.now();
  const ago = d => now - d * DAY;
  const dueIn = n => toISO(new Date(now + n * DAY));
  const subs = arr => arr.map(([text, done]) => ({ id: uid(), text, done }));
  // path = [[daysAgo, column], ...] oldest -> newest. This builds the card's history.
  const mk = (projectId, title, priority, o) => {
    const path = o.path.map(([d, col]) => ({ t: ago(d), col }));
    const last = path[path.length - 1];
    return {
      id: uid(), projectId, title, desc: o.desc || '', col: last.col, priority,
      labels: o.labels || [], assignees: o.as || [],
      due: o.due === undefined ? '' : dueIn(o.due),
      subtasks: subs(o.subs || []), created: path[0].t, touched: last.t, history: path
    };
  };

  const tasks = [
    mk('p1', 'Audit current site speed', 'high', { labels: ['research'], as: ['m3'], due: -1, path: [[20, 'backlog'], [14, 'todo'], [9, 'progress']], desc: 'Run Lighthouse on the 5 slowest pages and list what to fix first.', subs: [['Run Lighthouse', true], ['List slow pages', true], ['Write fix list', false]] }),
    mk('p1', 'Design new homepage hero', 'high', { labels: ['design'], as: ['m2'], due: 2, path: [[18, 'backlog'], [12, 'todo'], [6, 'progress'], [1, 'review']], subs: [['Sketch 3 ideas', true], ['Pick one', true], ['High-fidelity mock', true], ['Mobile version', false]] }),
    mk('p1', 'Write product page copy', 'medium', { labels: ['content'], as: ['m5'], due: 6, path: [[15, 'todo'], [3, 'progress']], subs: [['Soya range', true], ['Makhana range', false], ['Poha + besan', false]] }),
    mk('p1', 'Fix broken checkout link', 'urgent', { labels: ['bug'], as: ['m3', 'm4'], due: 0, path: [[2, 'todo'], [1, 'progress']], desc: 'The "Pay now" button points to the old URL.' }),
    mk('p1', 'Set up redirects from old URLs', 'medium', { labels: ['feature'], as: ['m3'], due: 10, path: [[10, 'backlog']] }),
    mk('p1', 'Accessibility pass', 'medium', { labels: ['research'], as: ['m4'], due: 14, path: [[8, 'backlog'], [2, 'todo']] }),
    mk('p1', 'Pick new fonts', 'low', { labels: ['design'], as: ['m2'], path: [[16, 'backlog'], [12, 'todo'], [8, 'progress'], [5, 'review'], [4, 'done']] }),
    mk('p1', 'Approve sitemap', 'low', { labels: ['content'], as: ['m1'], path: [[13, 'todo'], [9, 'progress'], [6, 'done']] }),
    mk('p1', 'Renew domain', 'medium', { as: ['m1'], path: [[5, 'todo'], [1.5, 'done']] }),
    mk('p2', 'Login screen', 'high', { labels: ['feature'], as: ['m3'], due: 4, path: [[12, 'todo'], [5, 'progress']], subs: [['Email field', true], ['Password rules', false], ['Forgot password', false]] }),
    mk('p2', 'Push notification permissions', 'medium', { labels: ['feature'], as: ['m3'], due: 9, path: [[9, 'backlog']] }),
    mk('p2', 'Crash on low-memory phones', 'urgent', { labels: ['bug'], as: ['m3', 'm4'], due: -2, path: [[4, 'todo'], [3, 'progress']], desc: 'App closes when 3+ images load. Reproduced on two test phones.' }),
    mk('p2', 'App store screenshots', 'medium', { labels: ['design'], as: ['m2', 'm5'], due: 12, path: [[7, 'backlog'], [1, 'todo']] }),
    mk('p2', 'Dark mode palette', 'low', { labels: ['design'], as: ['m2'], path: [[11, 'backlog']] }),
    mk('p2', 'Beta tester feedback form', 'medium', { labels: ['feature'], as: ['m4'], due: 3, path: [[6, 'todo'], [2, 'review']] }),
    mk('p2', 'Onboarding flow v1', 'high', { labels: ['feature'], as: ['m2', 'm3'], due: 7, path: [[14, 'todo'], [8, 'progress'], [2, 'review'], [0.5, 'done']] }),
    mk('p2', 'Release checklist', 'medium', { as: ['m4'], due: 13, path: [[2, 'backlog']] }),
    mk('p3', 'Press kit', 'medium', { labels: ['content'], as: ['m5'], due: 5, path: [[10, 'todo'], [4, 'progress']], subs: [['Logo pack', true], ['Fact sheet', false], ['Photos', false]] }),
    mk('p3', 'Launch day email', 'high', { labels: ['content'], as: ['m5'], due: 8, path: [[5, 'backlog'], [2, 'todo']] }),
    mk('p3', 'Influencer shortlist', 'low', { labels: ['research'], as: ['m5'], path: [[9, 'backlog']] }),
    mk('p3', 'Video teaser edit', 'high', { labels: ['design'], as: ['m2'], due: 3, path: [[7, 'todo'], [3, 'progress'], [0.2, 'review']] }),
    mk('p3', 'Budget sign-off', 'urgent', { labels: ['blocked'], as: ['m1'], due: 1, path: [[6, 'todo'], [5, 'progress']], desc: 'Waiting on finance. Chase them today.' }),
    mk('p3', 'Landing page tracking', 'medium', { labels: ['feature'], as: ['m3'], due: 11, path: [[3, 'backlog']] }),
    mk('p3', 'Lock brand colours', 'medium', { labels: ['design'], as: ['m2'], path: [[10, 'todo'], [7, 'progress'], [3, 'done']] })
  ];

  return {
    version: 1,
    projects: [
      { id: 'p1', name: 'Website Relaunch', color: '#3355FF', desc: 'New site, faster and easier to buy from.' },
      { id: 'p2', name: 'Mobile App', color: '#0CA678', desc: 'First version of the customer app.' },
      { id: 'p3', name: 'Launch Campaign', color: '#E8590C', desc: 'Everything needed for launch day.' }
    ],
    members: [
      { id: 'm1', name: 'Alex Morgan', role: 'Project lead', color: '#3355FF' },
      { id: 'm2', name: 'Aarav Sharma', role: 'Designer', color: '#D6489B' },
      { id: 'm3', name: 'Simran Kaur', role: 'Developer', color: '#0CA678' },
      { id: 'm4', name: 'Kabir Singh', role: 'QA tester', color: '#F08C00' },
      { id: 'm5', name: 'Meera Joshi', role: 'Marketing', color: '#7A5CFF' }
    ],
    labels: [
      { id: 'bug', name: 'Bug', color: '#E03131' },
      { id: 'feature', name: 'Feature', color: '#3355FF' },
      { id: 'design', name: 'Design', color: '#AE3EC9' },
      { id: 'content', name: 'Content', color: '#0CA678' },
      { id: 'research', name: 'Research', color: '#F08C00' },
      { id: 'blocked', name: 'Blocked', color: '#495057' }
    ],
    tasks,
    notifications: [
      { id: uid(), t: now - 2 * 3600000, text: 'Welcome to the Project Management Application. Cards glow hotter as they get more urgent.', read: false, kind: 'info' },
      { id: uid(), t: now - 5 * 3600000, text: 'Try the Time Machine: rewind the board and watch cards move back.', read: false, kind: 'info' }
    ],
    seen: [],
    settings: { userName: 'Alex', theme: 'light', notify: true, wip: { backlog: 0, todo: 8, progress: 4, review: 3, done: 0 } }
  };
}

/* ---------- Load / save ---------- */
let state = load();

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && Array.isArray(s.tasks)) return normalise(s);
    }
  } catch (e) { /* ignore broken storage */ }
  return makeSeed();
}
function normalise(s) {
  const d = makeSeed();
  s.settings = Object.assign({}, d.settings, s.settings || {});
  s.settings.wip = Object.assign({}, d.settings.wip, s.settings.wip || {});
  ['projects', 'members', 'labels', 'notifications', 'seen'].forEach(k => { if (!Array.isArray(s[k])) s[k] = d[k]; });
  return s;
}
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage full or blocked */ } }
function replaceState(next) { state = normalise(next); save(); }
function resetDemo() { state = makeSeed(); save(); }

/* ---------- Lookups ---------- */
const member = id => byId(state.members, id);
const project = id => byId(state.projects, id);
const label = id => byId(state.labels, id);

/* =====================================================================
   THE HEAT ENGINE  (the idea that makes this app different)
   heat = how much a task needs attention right now, from 0 to 100.
   It adds up three things:
     1. Priority  (Low 10 ... Urgent 55)
     2. Due date  (the closer or later, the hotter)
     3. Neglect   (days since anyone touched it)
   Done tasks are always 0 (cold).
   ===================================================================== */
function heatOf(t, now, col, touched) {
  now = now || Date.now();
  col = col || t.col;
  touched = touched || t.touched;
  if (col === 'done') return 0;
  let h = (PRIORITIES.find(p => p.id === t.priority) || PRIORITIES[1]).w;
  if (t.due) {
    const diff = (parseISO(t.due).getTime() + DAY - now) / DAY;
    if (diff < 0) h += 35 + Math.min(10, Math.abs(diff) * 2);
    else if (diff <= 1) h += 30;
    else if (diff <= 3) h += 22;
    else if (diff <= 7) h += 12;
    else if (diff <= 14) h += 5;
  }
  const idle = Math.max(0, (now - touched) / DAY);
  h += (col === 'progress' || col === 'review') ? Math.min(15, idle * 2) : Math.min(8, idle);
  return Math.max(0, Math.min(100, Math.round(h)));
}
function heatLevel(h) {
  if (h < 25) return { id: 'cool', label: 'Cool' };
  if (h < 50) return { id: 'warm', label: 'Warm' };
  if (h < 75) return { id: 'hot', label: 'Hot' };
  return { id: 'blazing', label: 'Blazing' };
}
// 0 = calm teal, 100 = red-orange
const heatColor = h => `hsl(${Math.round(175 - h * 1.67)} 72% 46%)`;

function progressOf(t, col) {
  col = col || t.col;
  if (col === 'done') return 100;
  if (t.subtasks && t.subtasks.length) return Math.round(100 * t.subtasks.filter(s => s.done).length / t.subtasks.length);
  return { backlog: 0, todo: 0, progress: 40, review: 80, done: 100 }[col] || 0;
}

function dueDiff(t, now) { return Math.round((parseISO(t.due).getTime() - startOfDay(now || Date.now())) / DAY); }
function dueInfo(t, now) {
  if (!t.due) return null;
  if (t.col === 'done') return { text: fmtDate(parseISO(t.due).getTime()), cls: '' };
  const d = dueDiff(t, now);
  if (d < 0) return { text: `Overdue ${-d}d`, cls: 'late' };
  if (d === 0) return { text: 'Due today', cls: 'soon' };
  if (d === 1) return { text: 'Tomorrow', cls: 'soon' };
  if (d <= 7) return { text: `In ${d} days`, cls: '' };
  return { text: fmtDate(parseISO(t.due).getTime()), cls: '' };
}

/* ---------- Time Machine ---------- */
// What did this task look like at time T? (null = it did not exist yet)
function taskAt(t, T) {
  if (t.created > T) return null;
  let h = t.history[0];
  for (const e of t.history) { if (e.t <= T) h = e; }
  return Object.assign({}, t, { col: h.col, touched: h.t });
}

/* ---------- Actions (each one saves automatically) ---------- */
function notify(text, kind) {
  if (!state.settings.notify) return;
  state.notifications.unshift({ id: uid(), t: Date.now(), text, read: false, kind: kind || 'info' });
  state.notifications = state.notifications.slice(0, 60);
}

function addTask(data) {
  const now = Date.now();
  const col = data.col || 'todo';
  const t = {
    id: uid(), projectId: data.projectId || (state.projects[0] && state.projects[0].id) || '',
    title: (data.title || '').trim() || 'Untitled task', desc: data.desc || '', col,
    priority: data.priority || 'medium', labels: data.labels || [], assignees: data.assignees || [],
    due: data.due || '', subtasks: data.subtasks || [], created: now, touched: now, history: [{ t: now, col }]
  };
  state.tasks.push(t);
  notify(`New task "${t.title}" added to ${colName(col)}`);
  (t.assignees || []).forEach(a => { const m = member(a); if (m) notify(`${m.name} was assigned "${t.title}"`, 'assign'); });
  save();
  return t;
}

function moveTask(id, col, beforeId) {
  const t = byId(state.tasks, id);
  if (!t) return false;
  const changed = t.col !== col;
  state.tasks = state.tasks.filter(x => x.id !== id);
  t.col = col;
  const idx = beforeId ? state.tasks.findIndex(x => x.id === beforeId) : -1;
  if (idx >= 0) state.tasks.splice(idx, 0, t); else state.tasks.push(t);
  if (changed) {
    t.touched = Date.now();
    t.history.push({ t: t.touched, col });
    notify(`"${t.title}" moved to ${colName(col)}`, col === 'done' ? 'done' : 'info');
    const lim = state.settings.wip[col] || 0;
    const n = state.tasks.filter(x => x.col === col).length;
    if (lim && n > lim) notify(`${colName(col)} is over its limit (${n}/${lim}). Finish something before starting more.`, 'warn');
  }
  save();
  return changed;
}

function saveTask(draft) {
  const t = byId(state.tasks, draft.id);
  if (!t) return;
  const newPeople = draft.assignees.filter(a => !t.assignees.includes(a));
  const colChanged = t.col !== draft.col;
  Object.assign(t, {
    title: draft.title.trim() || 'Untitled task', desc: draft.desc, projectId: draft.projectId,
    priority: draft.priority, labels: draft.labels, assignees: draft.assignees, due: draft.due, subtasks: draft.subtasks
  });
  t.touched = Date.now();
  if (colChanged) {
    t.col = draft.col;
    t.history.push({ t: t.touched, col: t.col });
    notify(`"${t.title}" moved to ${colName(t.col)}`, t.col === 'done' ? 'done' : 'info');
  }
  newPeople.forEach(a => { const m = member(a); if (m) notify(`${m.name} was assigned "${t.title}"`, 'assign'); });
  save();
}

function deleteTask(id) {
  const i = state.tasks.findIndex(t => t.id === id);
  if (i < 0) return null;
  const [t] = state.tasks.splice(i, 1);
  save();
  return { task: t, index: i };
}
function restoreTask(snap) { state.tasks.splice(Math.min(snap.index, state.tasks.length), 0, snap.task); save(); }

function addProject(p) {
  const proj = { id: 'p' + uid(), name: p.name.trim() || 'Untitled project', color: p.color, desc: p.desc || '' };
  state.projects.push(proj); save(); return proj;
}
function deleteProject(id) {
  state.projects = state.projects.filter(p => p.id !== id);
  state.tasks = state.tasks.filter(t => t.projectId !== id);
  save();
}
function addMember(m) {
  const mem = { id: 'm' + uid(), name: m.name.trim() || 'New member', role: m.role || 'Teammate', color: m.color };
  state.members.push(mem); save(); return mem;
}
function removeMember(id) {
  state.members = state.members.filter(m => m.id !== id);
  state.tasks.forEach(t => { t.assignees = t.assignees.filter(a => a !== id); });
  save();
}

/* ---------- Numbers for dashboards and reports ---------- */
function wasCompleted(t, i) { return i > 0 && t.history[i].col === 'done' && t.history[i - 1].col !== 'done'; }

function completedSince(ms) {
  const from = Date.now() - ms;
  return state.tasks.filter(t => t.history.some((e, i) => wasCompleted(t, i) && e.t >= from));
}

function doneByDay(n) {
  const today = startOfDay(Date.now());
  const arr = [];
  for (let i = n - 1; i >= 0; i--) {
    const s = new Date(today); s.setDate(s.getDate() - i);
    const e = new Date(s); e.setDate(e.getDate() + 1);
    arr.push({ date: s.getTime(), from: s.getTime(), to: e.getTime(), count: 0 });
  }
  state.tasks.forEach(t => t.history.forEach((ev, i) => {
    if (wasCompleted(t, i)) { const b = arr.find(x => ev.t >= x.from && ev.t < x.to); if (b) b.count++; }
  }));
  return arr;
}

// Average days a task spends in each column ("where does work wait?")
function avgDaysPerColumn() {
  const sums = {}, counts = {};
  COLS.forEach(c => { sums[c.id] = 0; counts[c.id] = 0; });
  state.tasks.forEach(t => t.history.forEach((e, i) => {
    if (e.col === 'done') return;
    const end = t.history[i + 1] ? t.history[i + 1].t : Date.now();
    sums[e.col] += (end - e.t) / DAY; counts[e.col]++;
  }));
  return COLS.filter(c => c.id !== 'done').map(c => ({ col: c, days: counts[c.id] ? sums[c.id] / counts[c.id] : 0 }));
}

function recentActivity(limit) {
  const ev = [];
  state.tasks.forEach(t => t.history.forEach((e, i) => ev.push({ t: e.t, task: t, col: e.col, created: i === 0 })));
  return ev.sort((a, b) => b.t - a.t).slice(0, limit);
}

function memberLoad(id) {
  const mine = state.tasks.filter(t => t.col !== 'done' && t.assignees.includes(id));
  return { tasks: mine, load: mine.reduce((s, t) => s + heatOf(t), 0) };
}

/* ---------- Standup writer ---------- */
function buildStandup(memberId) {
  const now = Date.now();
  const mine = t => !memberId || t.assignees.includes(memberId);
  const done = completedSince(DAY).filter(mine);
  const doing = state.tasks.filter(t => mine(t) && t.col === 'progress');
  const review = state.tasks.filter(t => mine(t) && t.col === 'review');
  const burning = state.tasks.filter(t => mine(t) && t.col !== 'done' && heatOf(t) >= 50)
    .sort((a, b) => heatOf(b) - heatOf(a)).slice(0, 5);
  const who = memberId ? (member(memberId) || {}).name : 'Whole team';
  const list = (arr, fn) => arr.length ? arr.map(t => '- ' + (fn ? fn(t) : t.title)).join('\n') : '- Nothing';
  const d = new Date(now).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  return [
    `Standup for ${who}, ${d}`, '',
    'Done since yesterday', list(done), '',
    'Working on today', list(doing), '',
    'Waiting for review', list(review), '',
    'Needs attention (running hot)',
    list(burning, t => { const di = dueInfo(t); return `${t.title} (heat ${heatOf(t)}${di ? ', ' + di.text.toLowerCase() : ''})`; })
  ].join('\n');
}

/* ---------- Overdue reminders (once per task per day) ---------- */
function checkOverdue() {
  const today = toISO(new Date());
  state.tasks.forEach(t => {
    if (t.col === 'done' || !t.due) return;
    if (dueDiff(t) < 0) {
      const key = `od:${t.id}:${today}`;
      if (!state.seen.includes(key)) {
        state.seen.push(key);
        notify(`"${t.title}" is overdue (${dueInfo(t).text.toLowerCase()})`, 'warn');
      }
    }
  });
  state.seen = state.seen.slice(-200);
  save();
}

/* ---------- Per-account workspaces ---------- */
function makeEmpty(name) {
  const d = makeSeed();
  return {
    version: 1, projects: [], tasks: [], seen: [],
    members: [{ id: 'm1', name: name, role: 'Owner', color: '#3355FF' }],
    labels: d.labels,
    notifications: [{ id: uid(), t: Date.now(), text: 'Welcome to the Project Management Application. Create your first project to get started.', read: false, kind: 'info' }],
    settings: Object.assign({}, d.settings)
  };
}
// Switch to (or create) the workspace that belongs to one account
function openWorkspace(key, profile) {
  STORE_KEY = key;
  let s = null;
  try {
    const raw = localStorage.getItem(key);
    if (raw) { const p = JSON.parse(raw); if (p && Array.isArray(p.tasks)) s = normalise(p); }
  } catch (e) { /* blocked or broken storage */ }
  if (!s) {
    const name = (profile && profile.name) || 'You';
    s = profile && profile.empty ? makeEmpty(name) : makeSeed();
    if (profile && profile.name) { s.members[0].name = profile.name; }
    s.settings.userName = name.split(' ')[0];
  }
  state = s;
  save();
}
