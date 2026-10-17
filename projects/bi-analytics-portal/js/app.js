/* ==========================================================================
   app.js  -  THE APPLICATION BRAIN
   ==========================================================================
   This file connects everything:
       data.js (rows)  ->  filters + drill-down (state)  ->  aggregation  ->  charts.js (drawing)

   THE MAIN FLOW (explain this in an interview):
     1. The user changes a filter (dropdown, chart click, breadcrumb).
     2. setFilter() updates ONE object:  state.f   (the single source of truth).
     3. refresh() runs: it re-filters the rows, re-calculates totals, and
        re-draws the current page. So EVERY chart always matches the filters.

   KEY IDEA - "Drill-down is just a filter":
     Year > Quarter > Month > Day are four filters stored in state.f.
     The level shown by the drill chart is decided by which of them is set:
        nothing set  -> bars per YEAR
        year set     -> bars per QUARTER
        quarter set  -> bars per MONTH
        month set    -> bars per DAY
     Clicking a bar simply sets the next filter. Clicking a breadcrumb clears it.
   ========================================================================== */

(function () {
  'use strict';

  /* ======================================================================
     0. SHORTCUTS
     ====================================================================== */
  const D = DataStore;                                   // from data.js
  const { YEARS, MONTHS, WEEKDAYS, REGIONS, CATEGORIES, CHANNELS, FIELDS } = D;
  const PALETTE = Charts.PALETTE;                        // from charts.js
  const $ = id => document.getElementById(id);           // tiny helper: find element by id

  const REGION_NAMES = REGIONS.map(r => r.name);
  const CATEGORY_NAMES = CATEGORIES.map(c => c.name);
  const CHANNEL_NAMES = CHANNELS.map(c => c.name);

  // Each category / channel / region keeps the same colour on every chart.
  const colorOf = (list, name) => PALETTE[list.indexOf(name) % PALETTE.length];

  /* ======================================================================
     1. STATE  -  everything the user can change lives here
     ====================================================================== */
  const state = {
    page: 'executive',            // which dashboard page is open
    f: {                          // f = filters. null means "All".
      year: null, quarter: null, month: null,
      region: null, category: null, channel: null
    }
  };

  // Report page has its own small settings
  const reportState = { group: 'region', template: 'all', search: '' };

  /* ======================================================================
     2. DATA ENGINE  -  filter rows, add them up, group them
     ====================================================================== */

  // Does one row pass all the active filters?  (null filter = ignore)
  function matches(r, f) {
    return (f.year === null || r.y === f.year) &&
           (f.quarter === null || r.q === f.quarter) &&
           (f.month === null || r.m === f.month) &&
           (f.region === null || r.region === f.region) &&
           (f.category === null || r.category === f.category) &&
           (f.channel === null || r.channel === f.channel);
  }

  // Keep only the matching rows. This runs on ~219,000 rows and takes a few milliseconds.
  // Which table to read? The small monthly roll-up is enough unless a single month is
  // selected (then we need the daily rows to draw one bar per day).
  function sourceFor(f) { return f.month === null ? D.monthlyRows : D.rows; }

  function filterRows(f, source) {
    const out = [];
    const all = source || sourceFor(f);
    for (let i = 0; i < all.length; i++) if (matches(all[i], f)) out.push(all[i]);
    return out;
  }

  // A totals object with every measure set to 0.
  function emptyTotals() {
    const t = {};
    for (let i = 0; i < FIELDS.length; i++) t[FIELDS[i]] = 0;
    return t;
  }

  // Add one row's numbers into a totals object.
  function addRow(t, r) {
    for (let i = 0; i < FIELDS.length; i++) t[FIELDS[i]] += r[FIELDS[i]];
  }

  /* DERIVE: calculate "ratio" metrics from the raw sums.
     IMPORTANT BI RULE: never average percentages. Add the raw numbers first,
     then divide.  e.g. margin = total profit / total revenue (not the mean of margins). */
  function derive(t) {
    const profit = t.revenue - t.cost - t.marketing - t.opex;
    const customers = t.newCust + t.retCust;
    return Object.assign({}, t, {
      grossProfit: t.revenue - t.cost,
      profit: profit,
      aov: t.orders ? t.revenue / t.orders : 0,                  // average order value
      gm: t.revenue ? (t.revenue - t.cost) / t.revenue : 0,      // gross margin
      nm: t.revenue ? profit / t.revenue : 0,                    // net margin
      roas: t.marketing ? t.revenue / t.marketing : 0,           // return on ad spend
      ctr: t.impressions ? t.clicks / t.impressions : 0,         // click-through rate
      cac: t.newCust ? t.marketing / t.newCust : 0,              // customer acquisition cost
      customers: customers,
      repeat: customers ? t.retCust / customers : 0,             // repeat-customer rate
      rpc: customers ? t.revenue / customers : 0,                // revenue per customer
      onTimePct: t.orders ? t.onTime / t.orders : 0,             // on-time delivery %
      returnRate: t.orders ? t.returns / t.orders : 0,
      avgDelivery: t.orders ? t.delDays / t.orders : 0           // average delivery days
    });
  }

  // Total of all rows -> one derived object (used for KPI cards).
  function total(rows) {
    const t = emptyTotals();
    for (let i = 0; i < rows.length; i++) addRow(t, rows[i]);
    return derive(t);
  }

  // GROUP BY: like SQL "GROUP BY". Returns Map(key -> raw totals).
  function group(rows, keyFn) {
    const map = new Map();
    for (let i = 0; i < rows.length; i++) {
      const k = keyFn(rows[i]);
      let t = map.get(k);
      if (!t) { t = emptyTotals(); map.set(k, t); }
      addRow(t, rows[i]);
    }
    return map;
  }

  // Group, then line the results up with a fixed list of buckets (so empty buckets show as 0).
  function groupAligned(rows, buckets, keyFn) {
    const map = group(rows, keyFn);
    return buckets.map(b => derive(map.get(b.key) || emptyTotals()));
  }

  /* ======================================================================
     3. TIME LOGIC  -  drill levels and trend buckets
     ====================================================================== */

  // Which level of the hierarchy are we on right now?
  function drillLevel(f) {
    return f.month !== null ? 'day'
         : f.quarter !== null ? 'month'
         : f.year !== null ? 'quarter'
         : 'year';
  }

  // The bars (buckets) the drill chart should show at the current level.
  function drillBuckets(f) {
    const level = drillLevel(f);
    if (level === 'year')
      return { level, buckets: YEARS.map(y => ({ key: y, label: String(y) })), keyFn: r => r.y };
    if (level === 'quarter')
      return { level, buckets: [1, 2, 3, 4].map(q => ({ key: q, label: 'Q' + q })), keyFn: r => r.q };
    if (level === 'month') {
      const ms = [1, 2, 3].map(i => (f.quarter - 1) * 3 + i);      // the 3 months of the chosen quarter
      return { level, buckets: ms.map(m => ({ key: m, label: MONTHS[m - 1] })), keyFn: r => r.m };
    }
    const dim = new Date(f.year, f.month, 0).getDate();            // days in the chosen month
    const days = [];
    for (let d = 1; d <= dim; d++) days.push({ key: d, label: String(d) });
    return { level, buckets: days, keyFn: r => r.d };
  }

  // The time-series used by trend charts. It does NOT follow the drill level:
  //   - a month is selected -> one point per DAY
  //   - otherwise           -> one point per MONTH over the selected period
  function trendBuckets(f) {
    if (f.month !== null) {
      const dim = new Date(f.year, f.month, 0).getDate();
      const b = [];
      for (let d = 1; d <= dim; d++) b.push({ key: d, label: String(d) });
      return { buckets: b, keyFn: r => r.d };
    }
    const years = f.year !== null ? [f.year] : YEARS;
    const months = f.quarter !== null ? [1, 2, 3].map(i => (f.quarter - 1) * 3 + i) : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const b = [];
    years.forEach(y => months.forEach(m =>
      b.push({ key: y * 100 + m, label: MONTHS[m - 1] + (f.year !== null ? '' : " '" + String(y).slice(2)) })));
    return { buckets: b, keyFn: r => r.y * 100 + r.m };
  }

  /* ======================================================================
     4. FILTER ACTIONS
     ====================================================================== */

  const quarterOf = m => Math.ceil(m / 3);

  // The ONE function that changes filters. It also keeps the hierarchy valid.
  function setFilter(key, value) {
    const f = state.f;
    if (value === '' || value === undefined) value = null;
    else if (key === 'year' || key === 'quarter' || key === 'month') value = +value;   // dropdown gives text -> number

    // Quarter / Month only make sense inside a Year.
    if ((key === 'quarter' || key === 'month') && value !== null && f.year === null) return;

    f[key] = value;

    if (key === 'year' && value === null) { f.quarter = null; f.month = null; }          // clearing Year clears below
    if (key === 'quarter') {
      if (value === null) f.month = null;
      else if (f.month !== null && quarterOf(f.month) !== value) f.month = null;          // month must belong to quarter
    }
    if (key === 'month' && value !== null) f.quarter = quarterOf(value);                  // picking a month fixes its quarter

    refresh();
  }

  // Clicking the same chart item twice removes the filter (toggle).
  function toggleFilter(key, value) { setFilter(key, state.f[key] === value ? null : value); }

  // Called when the user clicks a bar of the drill chart.
  function drillInto(level, key) {
    if (level === 'day') return;                     // days are the lowest level
    setFilter(level, key);                           // level name == filter name (year / quarter / month)
  }

  function resetFilters() {
    Object.keys(state.f).forEach(k => { state.f[k] = null; });
    refresh();
  }

  /* ======================================================================
     5. METRIC DEFINITIONS  (label + how to format + is "down" good?)
     ====================================================================== */
  const M = {
    revenue:     { label: 'Revenue',           fmt: Fmt.money },
    cost:        { label: 'COGS',              fmt: Fmt.money, invert: true },
    grossProfit: { label: 'Gross Profit',      fmt: Fmt.money },
    marketing:   { label: 'Marketing Spend',   fmt: Fmt.money },
    opex:        { label: 'Operating Expense', fmt: Fmt.money, invert: true },
    profit:      { label: 'Net Profit',        fmt: Fmt.money },
    gm:          { label: 'Gross Margin',      fmt: Fmt.pct, ratio: true },
    nm:          { label: 'Net Margin',        fmt: Fmt.pct, ratio: true },
    orders:      { label: 'Orders',            fmt: Fmt.compact },
    units:       { label: 'Units Sold',        fmt: Fmt.compact },
    aov:         { label: 'Avg Order Value',   fmt: Fmt.money },
    impressions: { label: 'Impressions',       fmt: Fmt.compact },
    clicks:      { label: 'Clicks',            fmt: Fmt.compact },
    ctr:         { label: 'Click-through Rate', fmt: v => Fmt.pct(v, 2), ratio: true },
    roas:        { label: 'ROAS',              fmt: Fmt.x },
    cac:         { label: 'Cost per New Customer', fmt: Fmt.money, invert: true },
    onTimePct:   { label: 'On-time Delivery',  fmt: Fmt.pct, ratio: true },
    returnRate:  { label: 'Return Rate',       fmt: Fmt.pct, ratio: true, invert: true },
    avgDelivery: { label: 'Avg Delivery Days', fmt: v => v.toFixed(1) + ' d', invert: true },
    customers:   { label: 'Customers',         fmt: Fmt.compact },
    newCust:     { label: 'New Customers',     fmt: Fmt.compact },
    retCust:     { label: 'Returning Customers', fmt: Fmt.compact },
    repeat:      { label: 'Repeat Rate',       fmt: Fmt.pct, ratio: true },
    rpc:         { label: 'Revenue / Customer', fmt: Fmt.money }
  };

  /* ======================================================================
     6. CONTEXT  -  all numbers one page needs, calculated once per refresh
     ====================================================================== */

  // Names of the columns we can group by.
  const DIMS = {
    year: r => r.y, quarter: r => r.q, month: r => r.m, dow: r => r.dow,
    region: r => r.region, category: r => r.category, channel: r => r.channel
  };

  function buildContext() {
    const f = Object.assign({}, state.f);               // copy so it cannot change mid-render
    const rows = filterRows(f);
    const tot = total(rows);

    // Previous-period comparison (year over year). Only possible when a year is chosen.
    let prev = null, prevLabel = '';
    if (f.year !== null && f.year > YEARS[0]) {
      prev = total(filterRows(Object.assign({}, f, { year: f.year - 1 })));
      prevLabel = 'vs ' + (f.year - 1);
    }

    const drill = drillBuckets(f);
    const trend = trendBuckets(f);
    const cache = {};

    const ctx = {
      f, rows, tot, prev, prevLabel,
      drill, drillTotals: groupAligned(rows, drill.buckets, drill.keyFn),
      trend, trendTotals: groupAligned(rows, trend.buckets, trend.keyFn),

      // by('region') or by('category|channel') -> Map(key -> derived totals). Cached per refresh.
      by(name) {
        if (!cache[name]) {
          const parts = name.split('|');
          const keyFn = r => parts.map(p => DIMS[p](r)).join('|');
          const out = new Map();
          // Weekday ("dow") only exists in the daily rows, not in the monthly roll-up.
          if (parts.includes('dow') && !cache.__daily) cache.__daily = filterRows(f, D.rows);
          const source = parts.includes('dow') ? cache.__daily : rows;
          group(source, keyFn).forEach((t, k) => out.set(k, derive(t)));
          cache[name] = out;
        }
        return cache[name];
      },

      // Per-item trend: Map("Amazon|202403" -> totals). Used by multi-line and scatter charts.
      trendBy(dim) {
        const out = new Map();
        group(rows, r => DIMS[dim](r) + '|' + trend.keyFn(r)).forEach((t, k) => out.set(k, derive(t)));
        return out;
      }
    };
    return ctx;
  }

  /* Small helpers that turn a Map into chart-ready arrays */

  // [{key,label,value,color}] in the natural order of `names`.
  function itemsFrom(ctx, dim, names, metric) {
    const map = ctx.by(dim);
    return names.map(n => ({
      key: n, label: n,
      value: map.has(n) ? map.get(n)[metric] : 0,
      color: colorOf(names, n)
    }));
  }
  const sortedDesc = arr => arr.slice().sort((a, b) => b.value - a.value);

  /* ======================================================================
     7. UI BUILDING BLOCKS  (cards, KPI tiles, tables)
     ====================================================================== */

  // A white card with a title and an empty chart container (id) inside it.
  function card(id, title, opts) {
    opts = opts || {};
    return `<section class="card span-${opts.span || 6}">` +
      `<header class="card-h"><h3>${title}</h3>${opts.sub ? `<span class="sub">${opts.sub}</span>` : ''}</header>` +
      `<div class="chart" id="${id}"></div></section>`;
  }

  // A row of KPI tiles. Each tile: label, big number, change vs last year, sparkline.
  function kpiRow(ctx, keys) {
    return `<div class="kpis">` + keys.map(k => {
      const m = M[k], cur = ctx.tot[k];
      let delta = '';
      if (ctx.prev) {
        const old = ctx.prev[k];
        let txt, up;
        if (m.ratio) { const diff = (cur - old) * 100; up = diff >= 0; txt = (up ? '+' : '') + diff.toFixed(1) + ' pp'; }   // pp = percentage points
        else { const ch = old ? (cur - old) / old : 0; up = ch >= 0; txt = (up ? '+' : '') + (ch * 100).toFixed(1) + '%'; }
        const good = m.invert ? !up : up;                      // for costs, "down" is good
        delta = `<span class="delta ${good ? 'good' : 'bad'}">${up ? '\u25B2' : '\u25BC'} ${txt} <em>${ctx.prevLabel}</em></span>`;
      } else {
        delta = `<span class="delta neutral">Select a year to compare</span>`;
      }
      return `<div class="kpi"><div class="kpi-l">${m.label}</div><div class="kpi-v">${m.fmt(cur)}</div>${delta}<div class="spark" id="sp-${k}"></div></div>`;
    }).join('') + `</div>`;
  }

  // Draw the little sparkline in every KPI tile (after the HTML exists in the page).
  function drawSparks(ctx, keys) {
    keys.forEach((k, i) => Charts.spark($('sp-' + k), ctx.trendTotals.map(t => t[k]), PALETTE[i % PALETTE.length]));
  }

  /* ---- Data table: sortable, paginated, with in-cell data bars ---- */
  const tstate = {};       // remembers sort + page for each table id

  function renderTable(el, cfg) {
    const st = tstate[el.id] || (tstate[el.id] = { key: cfg.sortKey || cfg.columns[1].key, dir: cfg.sortDir || 'desc', page: 0 });
    let rows = cfg.rows.slice();
    if (cfg.search) {
      const q = cfg.search.toLowerCase();
      rows = rows.filter(r => String(r.label).toLowerCase().includes(q));
    }
    // Sorting: strings with localeCompare, numbers with subtraction.
    rows.sort((a, b) => {
      const x = a[st.key], y = b[st.key];
      const c = typeof x === 'string' ? x.localeCompare(y) : x - y;
      return st.dir === 'asc' ? c : -c;
    });
    const ps = cfg.pageSize || 8;
    const pages = Math.max(1, Math.ceil(rows.length / ps));
    if (st.page >= pages) st.page = pages - 1;
    const slice = rows.slice(st.page * ps, st.page * ps + ps);

    // Largest value of each "bar" column -> used for the in-cell bar width.
    const maxOf = {};
    cfg.columns.filter(c => c.bar).forEach(c => { maxOf[c.key] = Math.max(...cfg.rows.map(r => r[c.key]), 1e-9); });

    const head = cfg.columns.map(c =>
      `<th data-sort="${c.key}" class="${c.key === 'label' ? '' : 'num'}">${c.label}${st.key === c.key ? (st.dir === 'asc' ? ' \u25B2' : ' \u25BC') : ''}</th>`).join('');

    const body = slice.map(r => '<tr>' + cfg.columns.map(c => {
      const txt = c.key === 'label' ? esc(r.label) : c.fmt(r[c.key]);
      const style = c.bar ? ` style="background:linear-gradient(90deg,rgba(17,141,255,.2) ${(r[c.key] / maxOf[c.key] * 100).toFixed(1)}%,transparent 0)"` : '';
      return `<td class="${c.key === 'label' ? '' : 'num'}"${style}>${txt}</td>`;
    }).join('') + '</tr>').join('');

    // Grand-total row (always shows totals of ALL rows, not just this page).
    let foot = '';
    if (cfg.totals) {
      foot = '<tfoot><tr>' + cfg.columns.map(c =>
        `<td class="${c.key === 'label' ? '' : 'num'}">${c.key === 'label' ? 'Total' : (cfg.totals[c.key] == null ? '' : c.fmt(cfg.totals[c.key]))}</td>`).join('') + '</tr></tfoot>';
    }

    const pager = pages > 1
      ? `<div class="pager"><button class="btn sm" data-pg="-1" ${st.page === 0 ? 'disabled' : ''}>\u2039 Prev</button>` +
        `<span>Page ${st.page + 1} of ${pages}</span>` +
        `<button class="btn sm" data-pg="1" ${st.page >= pages - 1 ? 'disabled' : ''}>Next \u203A</button></div>` : '';

    el.innerHTML = `<div class="table-wrap"><table class="dt"><thead><tr>${head}</tr></thead><tbody>${body || '<tr><td colspan="99" class="empty">No rows match.</td></tr>'}</tbody>${foot}</table></div>${pager}`;

    // One click handler for sorting (header click) and paging (buttons).
    el.onclick = e => {
      const th = e.target.closest('th[data-sort]');
      if (th) {
        const k = th.getAttribute('data-sort');
        if (st.key === k) st.dir = st.dir === 'asc' ? 'desc' : 'asc';
        else { st.key = k; st.dir = k === 'label' ? 'asc' : 'desc'; }
        renderTable(el, cfg);
        return;
      }
      const b = e.target.closest('button[data-pg]');
      if (b) { st.page = Math.min(pages - 1, Math.max(0, st.page + Number(b.getAttribute('data-pg')))); renderTable(el, cfg); }
    };
  }

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Build table columns from metric keys:  col('revenue', true) = revenue with a data bar.
  const col = (key, bar) => ({ key, label: M[key].label, fmt: M[key].fmt, bar: !!bar });
  const labelCol = name => ({ key: 'label', label: name, fmt: String });

  // Turn a Map into table rows: [{label, ...metrics}]
  function rowsFromMap(map, labeler) {
    return [...map.entries()].map(([k, d]) => Object.assign({ label: labeler(k) }, d));
  }

  /* ======================================================================
     8. PAGES  -  each returns { html, draw }.
        html = the layout (cards with ids), draw() = fills the cards with charts
     ====================================================================== */

  /* ---------- 8.1 EXECUTIVE OVERVIEW ---------- */
  function pageExecutive(ctx) {
    const keys = ['revenue', 'profit', 'orders', 'aov', 'customers', 'nm'];
    const lvlName = { year: 'Year', quarter: 'Quarter', month: 'Month', day: 'Day' }[ctx.drill.level];

    const html = kpiRow(ctx, keys) + '<div class="grid">' +
      card('c-drill', 'Revenue by ' + lvlName, { span: 8, sub: ctx.drill.level === 'day' ? 'Lowest level reached' : 'Click a bar to drill down' }) +
      card('c-cat', 'Revenue by Category', { span: 4, sub: 'Click to filter' }) +
      card('c-trend', 'Revenue vs Net Profit', { span: 7 }) +
      card('c-region', 'Revenue by Region', { span: 5, sub: 'Click to filter' }) +
      card('c-map', 'Revenue by City', { span: 6, sub: 'Bubble size = revenue' }) +
      card('c-table', 'Region performance', { span: 6 }) + '</div>';

    const draw = () => {
      drawSparks(ctx, keys);

      // Drill-down column chart: clicking a bar calls drillInto(level, key)
      Charts.column($('c-drill'), {
        labels: ctx.drill.buckets.map(b => b.label),
        keys: ctx.drill.buckets.map(b => b.key),
        series: [{ name: 'Revenue', values: ctx.drillTotals.map(t => t.revenue), color: PALETTE[0] }],
        fmt: Fmt.money,
        onClick: key => drillInto(ctx.drill.level, key)
      });

      Charts.donut($('c-cat'), {
        data: itemsFrom(ctx, 'category', CATEGORY_NAMES, 'revenue'), fmt: Fmt.money,
        centerValue: Fmt.money(ctx.tot.revenue), centerLabel: 'Revenue',
        selectedKey: ctx.f.category, onClick: k => toggleFilter('category', k)
      });

      Charts.line($('c-trend'), {
        labels: ctx.trend.buckets.map(b => b.label),
        series: [{ name: 'Revenue', values: ctx.trendTotals.map(t => t.revenue), color: PALETTE[0] },
                 { name: 'Net Profit', values: ctx.trendTotals.map(t => t.profit), color: PALETTE[2] }],
        area: true, fmt: Fmt.money
      });

      Charts.hbar($('c-region'), {
        data: sortedDesc(itemsFrom(ctx, 'region', REGION_NAMES, 'revenue')).map(d => Object.assign(d, { color: PALETTE[0] })),
        fmt: Fmt.money, selectedKey: ctx.f.region, onClick: k => toggleFilter('region', k)
      });

      const rmap = ctx.by('region');
      Charts.geoMap($('c-map'), {
        points: REGIONS.map(r => ({ key: r.name, name: r.name, lat: r.lat, lon: r.lon, value: rmap.has(r.name) ? rmap.get(r.name).revenue : 0 })),
        fmt: Fmt.money, selectedKey: ctx.f.region, onClick: k => toggleFilter('region', k)
      });

      renderTable($('c-table'), {
        columns: [labelCol('Region'), col('revenue', true), col('profit'), col('nm'), col('aov')],
        rows: rowsFromMap(ctx.by('region'), k => k), totals: ctx.tot, pageSize: 6
      });
    };
    return { html, draw };
  }

  /* ---------- 8.2 SALES ANALYTICS ---------- */
  function pageSales(ctx) {
    const keys = ['revenue', 'units', 'orders', 'aov', 'gm'];
    const html = kpiRow(ctx, keys) + '<div class="grid">' +
      card('s-line', 'Revenue trend by Channel', { span: 8 }) +
      card('s-cat', 'Revenue by Category', { span: 4, sub: 'Click to filter' }) +
      card('s-heat', 'Seasonality heatmap: weekday x month (revenue)', { span: 12 }) +
      card('s-table', 'Sales detail: Category x Channel', { span: 12 }) + '</div>';

    const draw = () => {
      drawSparks(ctx, keys);

      // One line per channel. trendBy() gives totals for each (channel, time bucket).
      const tb = ctx.trendBy('channel');
      Charts.line($('s-line'), {
        labels: ctx.trend.buckets.map(b => b.label),
        series: CHANNEL_NAMES.map(n => ({
          name: n, color: colorOf(CHANNEL_NAMES, n),
          values: ctx.trend.buckets.map(b => (tb.get(n + '|' + b.key) || { revenue: 0 }).revenue)
        })),
        fmt: Fmt.money
      });

      Charts.hbar($('s-cat'), {
        data: sortedDesc(itemsFrom(ctx, 'category', CATEGORY_NAMES, 'revenue')), fmt: Fmt.money,
        selectedKey: ctx.f.category, onClick: k => toggleFilter('category', k)
      });

      // Heatmap values[row][col]: row = weekday (Mon..Sun), col = month (Jan..Dec)
      const dm = ctx.by('dow|month');
      const dowOrder = [1, 2, 3, 4, 5, 6, 0];
      Charts.heatmap($('s-heat'), {
        rows: dowOrder.map(d => WEEKDAYS[d]), cols: MONTHS,
        values: dowOrder.map(d => MONTHS.map((_, mi) => { const t = dm.get(d + '|' + (mi + 1)); return t ? t.revenue : null; })),
        fmt: Fmt.money, cellH: 34
      });

      renderTable($('s-table'), {
        columns: [labelCol('Category / Channel'), col('units'), col('revenue', true), col('aov'), col('gm')],
        rows: rowsFromMap(ctx.by('category|channel'), k => k.replace('|', ' \u00B7 ')), totals: ctx.tot, pageSize: 8
      });
    };
    return { html, draw };
  }

  /* ---------- 8.3 MARKETING ANALYTICS ---------- */
  function pageMarketing(ctx) {
    const keys = ['marketing', 'impressions', 'clicks', 'ctr', 'roas', 'cac'];
    const html = kpiRow(ctx, keys) + '<div class="grid">' +
      card('m-funnel', 'Conversion funnel', { span: 5, sub: 'Log-scaled widths' }) +
      card('m-spend', 'Marketing spend trend', { span: 7 }) +
      card('m-roas', 'ROAS by Channel', { span: 4, sub: 'Click to filter' }) +
      card('m-scatter', 'Spend vs revenue (each dot = channel x period)', { span: 8 }) +
      card('m-table', 'Channel performance', { span: 12 }) + '</div>';

    const draw = () => {
      drawSparks(ctx, keys);

      Charts.funnel($('m-funnel'), { stages: [
        { label: 'Impressions', value: ctx.tot.impressions },
        { label: 'Clicks', value: ctx.tot.clicks },
        { label: 'Add to cart', value: ctx.tot.leads },
        { label: 'Orders', value: ctx.tot.orders }
      ] });

      Charts.line($('m-spend'), {
        labels: ctx.trend.buckets.map(b => b.label),
        series: [{ name: 'Marketing spend', values: ctx.trendTotals.map(t => t.marketing), color: PALETTE[3] }],
        area: true, fmt: Fmt.money
      });

      Charts.hbar($('m-roas'), {
        data: sortedDesc(itemsFrom(ctx, 'channel', CHANNEL_NAMES, 'roas')), fmt: Fmt.x,
        selectedKey: ctx.f.channel, onClick: k => toggleFilter('channel', k)
      });

      // Scatter: one dot for every (channel, time bucket)
      const tb = ctx.trendBy('channel'), pts = [];
      CHANNEL_NAMES.forEach(n => ctx.trend.buckets.forEach(b => {
        const t = tb.get(n + '|' + b.key);
        if (t && t.marketing > 0) pts.push({ x: t.marketing, y: t.revenue, label: n + ' - ' + b.label, group: n, color: colorOf(CHANNEL_NAMES, n) });
      }));
      Charts.scatter($('m-scatter'), { points: pts, xFmt: Fmt.money, yFmt: Fmt.money, xTitle: 'Marketing spend', yTitle: 'Revenue' });

      renderTable($('m-table'), {
        columns: [labelCol('Channel'), col('marketing'), col('impressions'), col('clicks'), col('ctr'), col('orders'), col('roas', true), col('cac')],
        rows: rowsFromMap(ctx.by('channel'), k => k), totals: ctx.tot, pageSize: 8
      });
    };
    return { html, draw };
  }

  /* ---------- 8.4 OPERATIONS ---------- */
  function pageOperations(ctx) {
    const keys = ['orders', 'units', 'onTimePct', 'returnRate', 'avgDelivery'];
    const html = kpiRow(ctx, keys) + '<div class="grid">' +
      card('o-line', 'On-time delivery trend', { span: 7 }) +
      card('o-ret', 'Return rate by Category', { span: 5, sub: 'Click to filter' }) +
      card('o-heat', 'On-time delivery %: Region x Category', { span: 7 }) +
      card('o-table', 'Regional operations', { span: 5 }) + '</div>';

    const draw = () => {
      drawSparks(ctx, keys);

      Charts.line($('o-line'), {
        labels: ctx.trend.buckets.map(b => b.label),
        series: [{ name: 'On-time delivery', values: ctx.trendTotals.map(t => t.orders ? t.onTimePct : null).map(v => v == null ? 0 : v), color: PALETTE[0] }],
        area: true, zeroBased: false, fmt: v => Fmt.pct(v, 0)
      });

      Charts.hbar($('o-ret'), {
        data: sortedDesc(itemsFrom(ctx, 'category', CATEGORY_NAMES, 'returnRate')), fmt: Fmt.pct,
        selectedKey: ctx.f.category, onClick: k => toggleFilter('category', k)
      });

      const rc = ctx.by('region|category');
      Charts.heatmap($('o-heat'), {
        rows: REGION_NAMES, cols: CATEGORY_NAMES.map(c => c.split(' ')[0]),
        values: REGION_NAMES.map(r => CATEGORY_NAMES.map(c => { const t = rc.get(r + '|' + c); return t && t.orders ? t.onTimePct : null; })),
        fmt: v => Fmt.pct(v, 1), cellH: 30
      });

      renderTable($('o-table'), {
        columns: [labelCol('Region'), col('orders'), col('onTimePct'), col('returnRate'), col('avgDelivery')],
        rows: rowsFromMap(ctx.by('region'), k => k), totals: ctx.tot, pageSize: 6
      });
    };
    return { html, draw };
  }

  /* ---------- 8.5 FINANCE ---------- */
  function pageFinance(ctx) {
    const keys = ['revenue', 'cost', 'gm', 'marketing', 'profit', 'nm'];
    const html = kpiRow(ctx, keys) + '<div class="grid">' +
      card('f-water', 'Profit & loss bridge', { span: 6, sub: 'Revenue to Net Profit' }) +
      card('f-stack', 'Cost structure over time', { span: 6 }) +
      card('f-margin', 'Margin trend', { span: 6 }) +
      card('f-cat', 'Net profit by Category', { span: 6, sub: 'Click to filter' }) +
      card('f-table', 'Profit & loss statement', { span: 12 }) + '</div>';

    const draw = () => {
      drawSparks(ctx, keys);
      const t = ctx.tot;

      Charts.waterfall($('f-water'), { fmt: Fmt.money, items: [
        { label: 'Revenue', value: t.revenue, type: 'total', color: PALETTE[0] },
        { label: 'COGS', value: -t.cost, type: 'delta', color: PALETTE[7] },
        { label: 'Marketing', value: -t.marketing, type: 'delta', color: PALETTE[7] },
        { label: 'Opex', value: -t.opex, type: 'delta', color: PALETTE[7] },
        { label: 'Net Profit', value: t.profit, type: 'total', color: '#2E9E6B' }
      ] });

      Charts.line($('f-stack'), {
        labels: ctx.trend.buckets.map(b => b.label), stacked: true, fmt: Fmt.money,
        series: [{ name: 'COGS', values: ctx.trendTotals.map(x => x.cost), color: PALETTE[1] },
                 { name: 'Marketing', values: ctx.trendTotals.map(x => x.marketing), color: PALETTE[2] },
                 { name: 'Opex', values: ctx.trendTotals.map(x => x.opex), color: PALETTE[6] }]
      });

      Charts.line($('f-margin'), {
        labels: ctx.trend.buckets.map(b => b.label), fmt: v => Fmt.pct(v, 0),
        series: [{ name: 'Gross margin', values: ctx.trendTotals.map(x => x.gm), color: PALETTE[0] },
                 { name: 'Net margin', values: ctx.trendTotals.map(x => x.nm), color: '#2E9E6B' }]
      });

      Charts.hbar($('f-cat'), {
        data: sortedDesc(itemsFrom(ctx, 'category', CATEGORY_NAMES, 'profit')), fmt: Fmt.money,
        selectedKey: ctx.f.category, onClick: k => toggleFilter('category', k)
      });

      // P&L table: one row per trend bucket (month or day)
      const plRows = ctx.trend.buckets.map((b, i) => Object.assign({ label: b.label, ord: i }, ctx.trendTotals[i]));
      renderTable($('f-table'), {
        columns: [labelCol('Period'), col('revenue', true), col('cost'), col('grossProfit'), col('marketing'), col('opex'), col('profit'), col('nm')],
        rows: plRows, totals: ctx.tot, pageSize: 12, sortKey: 'ord', sortDir: 'asc'
      });
    };
    return { html, draw };
  }

  /* ---------- 8.6 CUSTOMER ANALYTICS ---------- */
  function pageCustomers(ctx) {
    const keys = ['customers', 'newCust', 'retCust', 'repeat', 'rpc', 'cac'];
    const lvlName = { year: 'Year', quarter: 'Quarter', month: 'Month', day: 'Day' }[ctx.drill.level];
    const html = kpiRow(ctx, keys) + '<div class="grid">' +
      card('u-drill', 'New vs returning customers by ' + lvlName, { span: 7, sub: ctx.drill.level === 'day' ? 'Lowest level reached' : 'Click a bar to drill down' }) +
      card('u-ch', 'Customers by Channel', { span: 5, sub: 'Click to filter' }) +
      card('u-scatter', 'Region bubbles: customers vs order value', { span: 6, sub: 'Bubble size = revenue' }) +
      card('u-heat', 'Repeat-customer rate: Region x Channel', { span: 6 }) +
      card('u-table', 'Customer detail by Region', { span: 12 }) + '</div>';

    const draw = () => {
      drawSparks(ctx, keys);

      Charts.column($('u-drill'), {
        labels: ctx.drill.buckets.map(b => b.label), keys: ctx.drill.buckets.map(b => b.key),
        series: [{ name: 'New', values: ctx.drillTotals.map(t => t.newCust), color: PALETTE[0] },
                 { name: 'Returning', values: ctx.drillTotals.map(t => t.retCust), color: PALETTE[2] }],
        fmt: Fmt.compact, onClick: key => drillInto(ctx.drill.level, key)
      });

      Charts.donut($('u-ch'), {
        data: itemsFrom(ctx, 'channel', CHANNEL_NAMES, 'customers'), fmt: Fmt.compact,
        centerValue: Fmt.compact(ctx.tot.customers), centerLabel: 'Customers',
        selectedKey: ctx.f.channel, onClick: k => toggleFilter('channel', k)
      });

      const rm = ctx.by('region');
      Charts.scatter($('u-scatter'), {
        points: REGION_NAMES.filter(n => rm.has(n)).map(n => ({
          x: rm.get(n).customers, y: rm.get(n).aov, r: rm.get(n).revenue, label: n, group: n, color: colorOf(REGION_NAMES, n)
        })),
        xFmt: Fmt.compact, yFmt: Fmt.money, xTitle: 'Customers', yTitle: 'Avg order value', height: 320
      });

      const rch = ctx.by('region|channel');
      Charts.heatmap($('u-heat'), {
        rows: REGION_NAMES, cols: CHANNEL_NAMES.map(c => c.split(' ')[0]),
        values: REGION_NAMES.map(r => CHANNEL_NAMES.map(c => { const t = rch.get(r + '|' + c); return t && t.customers ? t.repeat : null; })),
        fmt: v => Fmt.pct(v, 1), cellH: 27
      });

      renderTable($('u-table'), {
        columns: [labelCol('Region'), col('customers', true), col('newCust'), col('retCust'), col('repeat'), col('rpc'), col('cac')],
        rows: rowsFromMap(ctx.by('region'), k => k), totals: ctx.tot, pageSize: 10
      });
    };
    return { html, draw };
  }

  /* ---------- 8.7 REPORTS ---------- */
  // Which columns each report template shows
  const TEMPLATES = {
    all:        { name: 'Overview',   cols: ['orders', 'revenue', 'profit', 'nm', 'aov', 'roas', 'onTimePct', 'returnRate', 'customers'] },
    sales:      { name: 'Sales',      cols: ['orders', 'units', 'revenue', 'aov', 'gm'] },
    marketing:  { name: 'Marketing',  cols: ['marketing', 'impressions', 'clicks', 'ctr', 'orders', 'roas', 'cac'] },
    operations: { name: 'Operations', cols: ['orders', 'onTimePct', 'returnRate', 'avgDelivery'] },
    finance:    { name: 'Finance',    cols: ['revenue', 'cost', 'marketing', 'opex', 'profit', 'nm'] },
    customers:  { name: 'Customers',  cols: ['customers', 'newCust', 'retCust', 'repeat', 'rpc'] }
  };
  const GROUPS = {
    region: 'Region', category: 'Category', channel: 'Channel', year: 'Year', quarter: 'Quarter',
    month: 'Month', dow: 'Weekday', 'region|category': 'Region x Category', 'category|channel': 'Category x Channel'
  };

  // Turn a group key (like 3 or "Mumbai|Makhana") into readable text.
  function labelFor(groupName, key) {
    const names = groupName.split('|'), parts = String(key).split('|');
    return parts.map((p, i) => {
      const n = names[i];
      if (n === 'month') return MONTHS[p - 1];
      if (n === 'quarter') return 'Q' + p;
      if (n === 'dow') return WEEKDAYS[p];
      return p;
    }).join(' \u00B7 ');
  }

  function pageReports(ctx) {
    const opts = (obj, sel) => Object.keys(obj).map(k => `<option value="${k}"${k === sel ? ' selected' : ''}>${typeof obj[k] === 'string' ? obj[k] : obj[k].name}</option>`).join('');
    const html = `<div class="grid"><section class="card span-12"><div class="report-controls">` +
      `<label>Group by <select id="r-group">${opts(GROUPS, reportState.group)}</select></label>` +
      `<label>Columns <select id="r-template">${opts(TEMPLATES, reportState.template)}</select></label>` +
      `<label>Search <input id="r-search" type="search" placeholder="Type to search rows" value="${esc(reportState.search)}"></label>` +
      `<span class="grow"></span>` +
      `<button class="btn" id="r-csv">Export CSV</button><button class="btn" id="r-print">Print</button>` +
      `</div></section>` + card('r-table', 'Report', { span: 12, sub: 'Respects the filters above. Click a column header to sort.' }) + '</div>';

    // Build the config for the current report settings.
    const config = () => {
      const g = reportState.group;
      const rows = rowsFromMap(ctx.by(g), k => labelFor(g, k)).map((r, i) => Object.assign(r, { ord: i }));
      const isTime = ['year', 'quarter', 'month', 'dow'].includes(g);
      const cols = [labelCol(GROUPS[g])].concat(TEMPLATES[reportState.template].cols.map((k, i) => col(k, i === 1)));
      if (isTime) rows.sort((a, b) => String(a.label).localeCompare(b.label, undefined, { numeric: true }));
      // For month / weekday, use calendar order instead of alphabetical.
      if (g === 'month') rows.sort((a, b) => MONTHS.indexOf(a.label) - MONTHS.indexOf(b.label));
      if (g === 'dow') rows.sort((a, b) => WEEKDAYS.indexOf(a.label) - WEEKDAYS.indexOf(b.label));
      rows.forEach((r, i) => { r.ord = i; });
      return { columns: cols, rows, totals: ctx.tot, pageSize: 12, search: reportState.search, sortKey: isTime ? 'ord' : cols[1].key, sortDir: isTime ? 'asc' : 'desc' };
    };

    const paint = (resetSort) => {
      if (resetSort) delete tstate['r-table'];
      renderTable($('r-table'), config());
    };

    const draw = () => {
      paint(false);
      $('r-group').onchange = e => { reportState.group = e.target.value; paint(true); };
      $('r-template').onchange = e => { reportState.template = e.target.value; paint(true); };
      $('r-search').oninput = e => { reportState.search = e.target.value; paint(false); };
      $('r-print').onclick = () => window.print();
      $('r-csv').onclick = () => {
        const c = config();
        const q = reportState.search.toLowerCase();
        const rows = q ? c.rows.filter(r => String(r.label).toLowerCase().includes(q)) : c.rows;
        downloadCSV('report-' + reportState.group.replace('|', '-') + '.csv', c.columns, rows);
      };
    };
    return { html, draw };
  }

  // Export rows as a CSV file the browser downloads (no server needed).
  function downloadCSV(filename, columns, rows) {
    const cell = v => '"' + String(v).replace(/"/g, '""') + '"';          // quote every value, double inner quotes
    const lines = [columns.map(c => cell(c.label)).join(',')];
    rows.forEach(r => lines.push(columns.map(c => cell(c.key === 'label' ? r.label : +(+r[c.key]).toFixed(4))).join(',')));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });   // an in-memory file
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);                                    // temporary download link
    a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ======================================================================
     9. PAGE REGISTRY  (this list also builds the sidebar menu)
     ====================================================================== */
  const PAGES = [
    { id: 'executive',  title: 'Executive Overview',  icon: '\u25A6', render: pageExecutive },
    { id: 'sales',      title: 'Sales Analytics',     icon: '\u25B2', render: pageSales },
    { id: 'marketing',  title: 'Marketing Analytics', icon: '\u25C9', render: pageMarketing },
    { id: 'operations', title: 'Operations',          icon: '\u2699', render: pageOperations },
    { id: 'finance',    title: 'Finance',             icon: '\u20B9', render: pageFinance },
    { id: 'customers',  title: 'Customer Analytics',  icon: '\u263A', render: pageCustomers },
    { id: 'reports',    title: 'Reports',             icon: '\u2630', render: pageReports }
  ];

  /* ======================================================================
     10. RENDERING  -  put everything on screen
     ====================================================================== */

  // Fill one <select> with options.
  function fillSelect(id, options, selected, allLabel, disabled) {
    const el = $(id);
    el.innerHTML = `<option value="">${allLabel}</option>` +
      options.map(o => `<option value="${o.value}"${String(o.value) === String(selected) ? ' selected' : ''}>${o.label}</option>`).join('');
    el.disabled = !!disabled;
  }

  // Keep the dropdowns in sync with state.f (they change when a chart is clicked).
  function syncFilterUI() {
    const f = state.f;
    fillSelect('f-year', YEARS.map(y => ({ value: y, label: y })), f.year, 'All years');
    fillSelect('f-quarter', [1, 2, 3, 4].map(q => ({ value: q, label: 'Q' + q })), f.quarter, 'All quarters', f.year === null);
    const months = (f.quarter === null ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [1, 2, 3].map(i => (f.quarter - 1) * 3 + i));
    fillSelect('f-month', months.map(m => ({ value: m, label: MONTHS[m - 1] })), f.month, 'All months', f.year === null);
    fillSelect('f-region', REGION_NAMES.map(n => ({ value: n, label: n })), f.region, 'All regions');
    fillSelect('f-category', CATEGORY_NAMES.map(n => ({ value: n, label: n })), f.category, 'All categories');
    fillSelect('f-channel', CHANNEL_NAMES.map(n => ({ value: n, label: n })), f.channel, 'All channels');
  }

  // The breadcrumb ("All years > 2024 > Q2") and the removable filter chips.
  function renderSubbar() {
    const f = state.f;
    const crumbs = [{ id: 'all', label: 'All years' }];
    if (f.year !== null) crumbs.push({ id: 'year', label: String(f.year) });
    if (f.quarter !== null) crumbs.push({ id: 'quarter', label: 'Q' + f.quarter });
    if (f.month !== null) crumbs.push({ id: 'month', label: MONTHS[f.month - 1] });

    const path = crumbs.map((c, i) => i === crumbs.length - 1
      ? `<b class="crumb here">${c.label}</b>`
      : `<a href="#" class="crumb" data-crumb="${c.id}">${c.label}</a>`).join('<span class="sep">\u203A</span>');

    const chips = ['region', 'category', 'channel'].filter(k => f[k] !== null).map(k =>
      `<button class="chip" data-clear="${k}">${k.charAt(0).toUpperCase() + k.slice(1)}: ${esc(f[k])} \u2715</button>`).join('');

    $('subbar').innerHTML = `<div class="path"><span class="path-l">Drill path</span>${path}</div><div class="chips">${chips}</div>`;
  }

  function renderPage() {
    const page = PAGES.find(p => p.id === state.page);
    const ctx = buildContext();
    $('pageTitle').textContent = page.title;
    const out = page.render(ctx);
    $('main').innerHTML = out.html;       // 1) put the layout in the page...
    out.draw();                           // 2) ...then draw charts (they need the real container width)
    document.querySelectorAll('.nav-item').forEach(a => a.classList.toggle('active', a.getAttribute('data-id') === state.page));
  }

  // Re-draw everything that depends on the filters.
  function refresh() {
    syncFilterUI();
    renderSubbar();
    renderPage();
  }

  /* ======================================================================
     11. EVENTS & START-UP
     ====================================================================== */

  function route() {                                    // read the page name from the URL hash: index.html#/sales
    const id = (location.hash || '').replace('#/', '');
    state.page = PAGES.some(p => p.id === id) ? id : 'executive';
    document.body.classList.remove('nav-open');
    refresh();
  }

  function init() {
    $('nav').innerHTML = PAGES.map(p =>
      `<a class="nav-item" href="#/${p.id}" data-id="${p.id}"><span class="ico">${p.icon}</span>${p.title}</a>`).join('');

    // Dropdown filters
    ['year', 'quarter', 'month', 'region', 'category', 'channel'].forEach(k =>
      $('f-' + k).addEventListener('change', e => setFilter(k, e.target.value)));
    $('resetBtn').addEventListener('click', resetFilters);

    // Breadcrumb and chip clicks (event delegation on the sub bar)
    $('subbar').addEventListener('click', e => {
      const c = e.target.closest('[data-crumb]');
      if (c) {
        e.preventDefault();
        const id = c.getAttribute('data-crumb');
        if (id === 'all') setFilter('year', null);          // clears year, quarter, month
        else if (id === 'year') setFilter('quarter', null);  // clears quarter, month
        else if (id === 'quarter') setFilter('month', null);
        return;
      }
      const x = e.target.closest('[data-clear]');
      if (x) setFilter(x.getAttribute('data-clear'), null);
    });

    $('menuBtn').addEventListener('click', () => document.body.classList.toggle('nav-open'));
    window.addEventListener('hashchange', route);

    // Re-draw charts when the window size changes (debounced so it runs once after resizing stops).
    let timer;
    window.addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(renderPage, 150); });

    route();
  }

  init();
})();
