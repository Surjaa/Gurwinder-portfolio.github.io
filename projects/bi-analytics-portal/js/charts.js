/* ==========================================================================
   charts.js  -  OUR OWN MINI CHART LIBRARY (no Chart.js, no D3, no Power BI)
   ==========================================================================
   Every chart is drawn as SVG (Scalable Vector Graphics). SVG is just text
   like <rect>, <circle>, <path>, <text> that the browser turns into shapes.
   So a "chart" here = a function that builds an SVG string and puts it
   inside a container element:   Charts.column(element, options)

   WHY build our own?  1) the project has zero dependencies,
                       2) you can explain exactly how every pixel is made,
                       3) it proves you understand charts, not just a library.

   Shared ideas used by all charts:
     - SCALE: a formula that converts a data value (e.g. Rs 5,00,000) into a
       pixel position (e.g. y = 120px).
     - data-tip attribute: text shown by the tooltip when you hover a shape.
     - data-key attribute: an id sent back to app.js when a shape is clicked
       (this is what powers drill-down and cross-filtering).
   ========================================================================== */

/* --------------------------------------------------------------------------
   Fmt: number formatting helpers (Indian style: K = thousand, L = lakh,
   Cr = crore).  They are used by KPI cards, axes, tooltips and tables.
   -------------------------------------------------------------------------- */
const Fmt = {
  // 1250000 -> "12.5L" ; 25000000 -> "2.5Cr"
  compact(v) {
    const a = Math.abs(v);
    if (a >= 1e7) return +(v / 1e7).toFixed(2) + 'Cr';
    if (a >= 1e5) return +(v / 1e5).toFixed(2) + 'L';
    if (a >= 1e3) return +(v / 1e3).toFixed(1) + 'K';
    return String(+v.toFixed(a < 10 ? 1 : 0));
  },
  money(v) { return (v < 0 ? '-' : '') + '\u20B9' + Fmt.compact(Math.abs(v)); },   // \u20B9 = the rupee sign
  pct(v, d = 1) { return (v * 100).toFixed(d) + '%'; },                          // 0.1234 -> "12.3%"
  x(v) { return v.toFixed(1) + 'x'; },                                           // 6.4 -> "6.4x"
  dec(v) { return v.toFixed(1); },                                               // 2.345 -> "2.3"
  full(v) { return Math.round(v).toLocaleString('en-IN'); }                      // 1234567 -> "12,34,567"
};

const Charts = (function () {
  'use strict';

  // Power BI's default colour palette, used in order for series / slices.
  const PALETTE = ['#118DFF', '#12239E', '#E66C37', '#6B007B', '#E044A7', '#744EC2', '#D9B300', '#D64550'];

  /* ---------- small helpers ---------- */

  // Escape text so that user/data text can never inject HTML (security habit).
  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Width of the container in pixels (never smaller than 280 so charts stay readable).
  const widthOf = el => Math.max(el.clientWidth || 600, 280);

  // Pick a "nice" step size for an axis: 1, 2, 2.5, 5, 10 x a power of ten.
  function niceStep(raw) {
    const exp = Math.pow(10, Math.floor(Math.log10(raw)));
    const f = raw / exp;
    const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return nf * exp;
  }

  // Build an axis scale: returns {min, max, ticks[]} with round numbers.
  // Example: data 0..437000 -> ticks 0, 100000, ..., 500000
  function scale(min, max, count) {
    if (!isFinite(min) || !isFinite(max)) { min = 0; max = 1; }
    if (max === min) max = min + 1;
    const step = niceStep((max - min) / count);
    const lo = Math.floor(min / step + 1e-9) * step;
    const hi = Math.ceil(max / step - 1e-9) * step;
    const n = Math.round((hi - lo) / step);
    const ticks = [];
    for (let i = 0; i <= n; i++) ticks.push(+(lo + i * step).toFixed(10));
    return { min: lo, max: hi, ticks };
  }

  // The <svg> wrapper. viewBox makes the drawing scale with its container.
  const svgOpen = (w, h) => `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;display:block" role="img">`;

  // Horizontal grid lines + y-axis labels (shared by column / line / waterfall).
  function yGrid(sc, yPos, m, W, fmt) {
    return sc.ticks.map(t => {
      const y = yPos(t);
      return `<line class="gl" x1="${m.l}" x2="${W - m.r}" y1="${y}" y2="${y}"/>` +
             `<text class="axis" x="${m.l - 8}" y="${y + 4}" text-anchor="end">${esc(fmt(t))}</text>`;
    }).join('');
  }

  // Draw only every Nth x-label so they never overlap.
  function xLabels(labels, xPos, y, plotW) {
    const every = Math.max(1, Math.ceil(labels.length / Math.max(1, Math.floor(plotW / 48))));
    return labels.map((l, i) => i % every === 0
      ? `<text class="axis" x="${xPos(i)}" y="${y}" text-anchor="middle">${esc(l)}</text>` : '').join('');
  }

  // A row of coloured dots + names under a chart.
  const legend = items => `<div class="legend-row">${items.map(i =>
    `<span><i style="background:${i.color}"></i>${esc(i.name)}</span>`).join('')}</div>`;

  // Attach ONE click handler to the chart container. When any element that has a
  // data-key attribute is clicked, we call opts.onClick(key).
  // (Setting el.onclick REPLACES the old handler, so re-drawing never stacks handlers.)
  function wireClick(el, onClick) {
    el.onclick = onClick ? (e => {
      const t = e.target.closest('[data-key]');
      if (t) onClick(t.getAttribute('data-key'));
    }) : null;
  }

  /* ======================================================================
     1) COLUMN CHART  (single series, or stacked when several series given)
        Used for the DRILL-DOWN chart: click a bar to go Year > Quarter > ...
        o = { labels[], keys[], series:[{name, values[], color}], fmt, onClick, height }
     ====================================================================== */
  function column(el, o) {
    const W = widthOf(el), H = o.height || 270;
    const m = { l: 56, r: 10, t: 16, b: 28 };             // margins around the plot area
    const n = o.labels.length;
    const fmt = o.fmt || Fmt.compact;
    const stacked = o.series.length > 1;

    // Total height of each column (sum over series) -> decides the y scale.
    const totals = o.labels.map((_, i) => o.series.reduce((s, se) => s + se.values[i], 0));
    const sc = scale(0, Math.max(...totals, 0), 4);

    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const band = pw / n;                                   // horizontal space for one column
    const bw = Math.min(band * 0.7, 56);                   // bar width
    const y = v => m.t + ph - (v - sc.min) / (sc.max - sc.min) * ph;   // value -> pixel (the SCALE)
    const xc = i => m.l + band * i + band / 2;             // centre x of column i

    let s = svgOpen(W, H) + yGrid(sc, y, m, W, fmt);

    o.labels.forEach((lab, i) => {
      let acc = 0;                                         // running total, used when stacking
      o.series.forEach((se, si) => {
        const v = se.values[i];
        const y0 = y(acc), y1 = y(acc + v);
        acc += v;
        s += `<rect class="bar${o.onClick ? ' clickable' : ''}" x="${xc(i) - bw / 2}" y="${y1}" width="${bw}" ` +
             `height="${Math.max(0, y0 - y1)}" rx="3" fill="${se.color || PALETTE[si]}" ` +
             `data-key="${esc(o.keys ? o.keys[i] : i)}" data-tip="${esc(lab + '\n' + se.name + ': ' + fmt(v))}"/>`;
      });
      // Value label on top of each bar (only when there are few bars)
      if (n <= 12) s += `<text class="val" x="${xc(i)}" y="${y(totals[i]) - 5}" text-anchor="middle">${esc(fmt(totals[i]))}</text>`;
    });

    s += xLabels(o.labels, xc, H - 8, pw) + '</svg>';
    if (stacked) s += legend(o.series.map((se, i) => ({ name: se.name, color: se.color || PALETTE[i] })));
    el.innerHTML = s;
    wireClick(el, o.onClick);
  }

  /* ======================================================================
     2) HORIZONTAL BAR CHART  (ranking: "top regions", "top categories")
        o = { data:[{key,label,value,color}], fmt, onClick, selectedKey }
     ====================================================================== */
  function hbar(el, o) {
    const W = widthOf(el), rowH = o.rowH || 30;
    const data = o.data, fmt = o.fmt || Fmt.compact;
    const H = data.length * rowH + 8;
    const labelW = Math.min(140, Math.max(...data.map(d => d.label.length)) * 6.6 + 10);
    const m = { l: labelW, r: 74, t: 4, b: 4 };
    const maxV = Math.max(...data.map(d => d.value), 1e-9);
    const pw = W - m.l - m.r;

    let s = svgOpen(W, H);
    data.forEach((d, i) => {
      const yy = m.t + i * rowH;
      const w = Math.max(0, d.value / maxV * pw);
      // Dim the bars that are NOT the currently selected (cross-filtered) item.
      const dim = o.selectedKey != null && o.selectedKey !== d.key ? ' dim' : '';
      s += `<text class="axis" x="${m.l - 8}" y="${yy + rowH / 2 + 4}" text-anchor="end">${esc(d.label)}</text>` +
           `<rect class="bar${o.onClick ? ' clickable' : ''}${dim}" x="${m.l}" y="${yy + 4}" width="${w}" height="${rowH - 10}" rx="3" ` +
           `fill="${d.color || PALETTE[0]}" data-key="${esc(d.key)}" data-tip="${esc(d.label + '\n' + fmt(d.value))}"/>` +
           `<text class="val" x="${m.l + w + 6}" y="${yy + rowH / 2 + 4}">${esc(fmt(d.value))}</text>`;
    });
    el.innerHTML = s + '</svg>';
    wireClick(el, o.onClick);
  }

  /* ======================================================================
     3) LINE / AREA CHART  (trends over time; multi-series; optional stacking)
        o = { labels[], series:[{name,values[],color}], area, stacked, fmt,
              zeroBased, height, keys, onClick }
     ====================================================================== */
  function line(el, o) {
    const W = widthOf(el), H = o.height || 260;
    const m = { l: 56, r: 16, t: 14, b: 28 };
    const n = o.labels.length, fmt = o.fmt || Fmt.compact;
    const pw = W - m.l - m.r, ph = H - m.t - m.b;

    // "upper" holds the top edge of every series at every x; "lower" the bottom edge.
    // For normal lines lower = baseline; for STACKED areas lower = top of previous series.
    const upper = [], lower = [];
    const run = new Array(n).fill(0);
    o.series.forEach(se => {
      const lo = o.stacked ? run.slice() : null;
      const up = se.values.map((v, i) => (o.stacked ? run[i] + v : v));
      if (o.stacked) up.forEach((v, i) => { run[i] = v; });
      upper.push(up); lower.push(lo);
    });

    // y-scale: zero-based by default; for percentages we pass zeroBased:false so the line is not flat.
    const allTop = upper.flat();
    const maxV = Math.max(...allTop, 0);
    const minV = o.zeroBased === false ? Math.min(...allTop) : 0;
    const sc = scale(minV, maxV, 4);

    const y = v => m.t + ph - (v - sc.min) / (sc.max - sc.min) * ph;
    const x = i => m.l + (n === 1 ? pw / 2 : i * pw / (n - 1));

    let s = svgOpen(W, H) + yGrid(sc, y, m, W, fmt);

    o.series.forEach((se, si) => {
      const color = se.color || PALETTE[si];
      const top = upper[si].map((v, i) => `${x(i)},${y(v)}`);
      if (o.area || o.stacked) {
        // Polygon = top edge (left -> right) + bottom edge (right -> left)
        const bottom = (lower[si] ? lower[si].map((v, i) => `${x(i)},${y(v)}`) : upper[si].map((_, i) => `${x(i)},${y(sc.min)}`)).reverse();
        s += `<polygon points="${top.concat(bottom).join(' ')}" fill="${color}" fill-opacity="${o.stacked ? 0.75 : 0.16}"/>`;
      }
      s += `<polyline points="${top.join(' ')}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linejoin="round"/>`;
      if (n <= 14) upper[si].forEach((v, i) => { s += `<circle cx="${x(i)}" cy="${y(v)}" r="3.2" fill="${color}"/>`; });
    });

    // Invisible hover strips: one per x-position. Hovering shows ALL series values.
    const sw = n === 1 ? pw : pw / (n - 1);
    o.labels.forEach((lab, i) => {
      const tip = lab + '\n' + o.series.map(se => se.name + ': ' + fmt(se.values[i])).join('\n');
      s += `<rect class="strip${o.onClick ? ' clickable' : ''}" x="${x(i) - sw / 2}" y="${m.t}" width="${sw}" height="${ph}" ` +
           `fill="transparent" data-key="${esc(o.keys ? o.keys[i] : i)}" data-tip="${esc(tip)}"/>`;
    });

    s += xLabels(o.labels, x, H - 8, pw) + '</svg>';
    if (o.series.length > 1) s += legend(o.series.map((se, i) => ({ name: se.name, color: se.color || PALETTE[i] })));
    el.innerHTML = s;
    wireClick(el, o.onClick);
  }

  /* ======================================================================
     4) DONUT CHART  (share of total: category mix, channel mix)
        o = { data:[{key,label,value,color}], fmt, centerLabel, centerValue,
              onClick, selectedKey }
        Maths: each slice gets an angle = (value / total) x 360 degrees.
               Points on a circle:  x = cx + R x cos(a),  y = cy + R x sin(a)
     ====================================================================== */
  function donut(el, o) {
    const fmt = o.fmt || Fmt.compact;
    const total = o.data.reduce((s, d) => s + d.value, 0) || 1;
    const S = 180, cx = 90, cy = 90, R = 82, r = 54;       // outer and inner radius
    const pt = (rad, a) => `${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`;

    let a0 = -Math.PI / 2;                                  // start at 12 o'clock
    let svg = `<svg viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" role="img">`;
    const live = o.data.filter(d => d.value > 0);

    o.data.forEach(d => {
      const frac = d.value / total;
      const a1 = a0 + frac * 2 * Math.PI;
      const dim = o.selectedKey != null && o.selectedKey !== d.key ? ' dim' : '';
      const common = `class="slice${o.onClick ? ' clickable' : ''}${dim}" data-key="${esc(d.key)}" ` +
                     `data-tip="${esc(d.label + '\n' + fmt(d.value) + ' (' + Fmt.pct(frac) + ')')}"`;
      if (frac > 0.9999 && live.length === 1) {
        // A single 100% slice cannot be drawn with an arc path, so draw a thick ring instead.
        svg += `<circle cx="${cx}" cy="${cy}" r="${(R + r) / 2}" fill="none" stroke="${d.color}" stroke-width="${R - r}" ${common}/>`;
      } else if (frac > 0) {
        const large = frac > 0.5 ? 1 : 0;                   // SVG arc flag: is the arc bigger than 180 degrees?
        svg += `<path d="M${pt(R, a0)} A${R},${R} 0 ${large} 1 ${pt(R, a1)} L${pt(r, a1)} A${r},${r} 0 ${large} 0 ${pt(r, a0)} Z" ` +
               `fill="${d.color}" stroke="#fff" stroke-width="1.5" ${common}/>`;
      }
      a0 = a1;
    });
    // Text in the middle of the donut
    svg += `<text x="${cx}" y="${cy + 2}" text-anchor="middle" class="donut-val">${esc(o.centerValue || '')}</text>` +
           `<text x="${cx}" y="${cy + 18}" text-anchor="middle" class="axis">${esc(o.centerLabel || '')}</text></svg>`;

    // Legend list (also clickable)
    const items = o.data.map(d => {
      const dim = o.selectedKey != null && o.selectedKey !== d.key ? ' dim' : '';
      return `<li class="${o.onClick ? 'clickable' : ''}${dim}" data-key="${esc(d.key)}">` +
             `<i style="background:${d.color}"></i><span class="lg-name">${esc(d.label)}</span>` +
             `<span class="lg-val">${Fmt.pct(d.value / total, 0)}</span></li>`;
    }).join('');

    el.innerHTML = `<div class="donut-wrap">${svg}<ul class="legend-list">${items}</ul></div>`;
    wireClick(el, o.onClick);
  }

  /* ======================================================================
     5) FUNNEL CHART  (marketing: Impressions > Clicks > Add to cart > Orders)
        o = { stages:[{label,value}] }
        Widths use a LOG scale, otherwise "Orders" would be a 0.2% sliver.
     ====================================================================== */
  function funnel(el, o) {
    const W = widthOf(el), rowH = 62, H = o.stages.length * rowH + 6;
    const fw = W - 120;                                    // funnel area; right side holds conversion %
    const first = Math.max(o.stages[0].value, 1);
    const wOf = v => fw * (0.28 + 0.72 * (Math.log10(v + 1) / Math.log10(first + 1)));
    const cx = fw / 2;
    const shades = ['#118DFF', '#0F6FCC', '#12239E', '#0B1A6B'];
    let s = svgOpen(W, H);

    o.stages.forEach((st, i) => {
      const top = wOf(st.value);
      const next = i < o.stages.length - 1 ? wOf(o.stages[i + 1].value) : top * 0.8;
      const y0 = 3 + i * rowH, y1 = y0 + rowH - 5;
      // A funnel stage is a trapezoid: wide top edge, narrower bottom edge.
      s += `<polygon points="${cx - top / 2},${y0} ${cx + top / 2},${y0} ${cx + next / 2},${y1} ${cx - next / 2},${y1}" ` +
           `fill="${shades[i % shades.length]}" data-tip="${esc(st.label + '\n' + Fmt.full(st.value))}"/>` +
           `<text x="${cx}" y="${y0 + 22}" text-anchor="middle" class="funnel-t">${esc(st.label)}</text>` +
           `<text x="${cx}" y="${y0 + 40}" text-anchor="middle" class="funnel-v">${esc(Fmt.compact(st.value))}</text>`;
      // Conversion rate vs the previous stage, written on the right side
      if (i > 0) {
        const conv = o.stages[i - 1].value ? st.value / o.stages[i - 1].value : 0;
        s += `<text x="${fw + 14}" y="${y0 + 8}" class="axis">${Fmt.pct(conv)}</text>` +
             `<text x="${fw + 14}" y="${y0 + 22}" class="axis small">of previous</text>`;
      }
    });
    el.innerHTML = s + '</svg>';
  }

  /* ======================================================================
     6) HEATMAP  (a grid where colour intensity = value)
        o = { rows[], cols[], values[row][col], fmt }
     ====================================================================== */
  function heatmap(el, o) {
    const W = widthOf(el), fmt = o.fmt || Fmt.compact;
    const rowLabelW = 92, headH = 26, ch = o.cellH || 32;
    const cw = (W - rowLabelW - 4) / o.cols.length;
    const H = headH + o.rows.length * ch + 4;

    const flat = o.values.flat().filter(v => v != null);
    const vmin = Math.min(...flat), vmax = Math.max(...flat), span = (vmax - vmin) || 1;

    let s = svgOpen(W, H);
    o.cols.forEach((c, j) => {
      s += `<text class="axis" x="${rowLabelW + j * cw + cw / 2}" y="${headH - 9}" text-anchor="middle">${esc(c)}</text>`;
    });
    o.rows.forEach((r, i) => {
      const yy = headH + i * ch;
      s += `<text class="axis" x="${rowLabelW - 8}" y="${yy + ch / 2 + 4}" text-anchor="end">${esc(r)}</text>`;
      o.cols.forEach((c, j) => {
        const v = o.values[i][j];
        const t = v == null ? 0 : (v - vmin) / span;       // 0 (lowest) .. 1 (highest)
        s += `<rect x="${rowLabelW + j * cw + 1}" y="${yy + 1}" width="${cw - 2}" height="${ch - 2}" rx="3" ` +
             `fill="#118DFF" fill-opacity="${(0.08 + 0.92 * t).toFixed(3)}" data-tip="${esc(r + ' / ' + c + '\n' + (v == null ? 'No data' : fmt(v)))}"/>`;
        if (cw >= 44 && v != null) {
          s += `<text x="${rowLabelW + j * cw + cw / 2}" y="${yy + ch / 2 + 4}" text-anchor="middle" ` +
               `class="cell-t" fill="${t > 0.55 ? '#fff' : '#252423'}">${esc(fmt(v))}</text>`;
        }
      });
    });
    el.innerHTML = s + '</svg>';
  }

  /* ======================================================================
     7) SCATTER / BUBBLE PLOT  (relationship between two numbers)
        o = { points:[{x,y,r,label,group,color}], xFmt, yFmt, xTitle, yTitle }
        If a point has `r` it becomes a bubble (bigger value = bigger bubble).
     ====================================================================== */
  function scatter(el, o) {
    const W = widthOf(el), H = o.height || 300;
    const m = { l: 62, r: 18, t: 14, b: 44 };
    const xf = o.xFmt || Fmt.compact, yf = o.yFmt || Fmt.compact;
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const pts = o.points;

    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const padFix = (lo, hi) => { const p = (hi - lo) * 0.06 || 1; return [Math.max(0, lo - p), hi + p]; };
    const [x0, x1] = padFix(Math.min(...xs), Math.max(...xs));
    const [y0, y1] = padFix(Math.min(...ys), Math.max(...ys));
    const sx = scale(x0, x1, 5), sy = scale(y0, y1, 4);
    const X = v => m.l + (v - sx.min) / (sx.max - sx.min) * pw;
    const Y = v => m.t + ph - (v - sy.min) / (sy.max - sy.min) * ph;

    const rs = pts.filter(p => p.r != null).map(p => p.r);
    const rMax = rs.length ? Math.max(...rs) : 1;
    const R = p => p.r == null ? 5 : 5 + 13 * Math.sqrt(p.r / rMax);   // area ~ value

    let s = svgOpen(W, H);
    s += yGrid(sy, Y, m, W, yf);
    s += sx.ticks.map(t => `<text class="axis" x="${X(t)}" y="${H - m.b + 16}" text-anchor="middle">${esc(xf(t))}</text>`).join('');
    s += `<text class="axis" x="${m.l + pw / 2}" y="${H - 6}" text-anchor="middle">${esc(o.xTitle || '')}</text>`;
    s += `<text class="axis" transform="translate(13 ${m.t + ph / 2}) rotate(-90)" text-anchor="middle">${esc(o.yTitle || '')}</text>`;

    pts.forEach((p, i) => {
      s += `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="${R(p)}" fill="${p.color || PALETTE[0]}" fill-opacity="0.72" stroke="#fff" stroke-width="1" ` +
           `data-tip="${esc(p.label + '\n' + (o.xTitle || 'x') + ': ' + xf(p.x) + '\n' + (o.yTitle || 'y') + ': ' + yf(p.y))}"/>`;
    });
    s += '</svg>';

    // Legend built from the unique groups
    const seen = new Map();
    pts.forEach(p => { if (p.group && !seen.has(p.group)) seen.set(p.group, p.color); });
    if (seen.size > 1) s += legend([...seen].map(([name, color]) => ({ name, color })));
    el.innerHTML = s;
  }

  /* ======================================================================
     8) GEOGRAPHIC BUBBLE MAP  (circle size = value at each city's lat/lon)
        o = { points:[{key,name,lat,lon,value}], fmt, onClick, selectedKey }
        We convert latitude/longitude into x/y with a simple linear projection.
        The grey India outline is a SIMPLIFIED hand-made polygon (for demo).
        In a production app you would load GeoJSON/TopoJSON map files.
     ====================================================================== */
  const INDIA_OUTLINE = [
    [68.2, 23.7], [69.0, 22.2], [70.6, 20.8], [72.7, 21.2], [72.8, 19.0], [73.8, 15.4], [74.8, 12.9],
    [76.2, 9.9], [77.5, 8.1], [78.2, 8.8], [79.3, 9.3], [80.3, 13.1], [80.1, 15.2], [83.3, 17.7],
    [85.8, 19.8], [86.9, 21.0], [88.1, 21.6], [89.0, 22.2], [88.9, 24.0], [88.4, 26.4], [89.8, 26.7],
    [92.0, 26.8], [94.5, 27.0], [96.5, 28.2], [95.0, 29.3], [92.0, 27.9], [88.8, 28.0], [84.5, 27.2],
    [81.0, 28.9], [80.2, 30.3], [78.8, 31.2], [78.5, 33.5], [77.5, 35.5], [75.0, 36.8], [74.0, 34.5],
    [74.8, 32.8], [74.4, 31.0], [72.0, 29.8], [70.2, 28.0], [70.6, 25.6], [68.8, 24.3]
  ];

  function geoMap(el, o) {
    const W = widthOf(el), H = Math.min(430, Math.max(300, W * 1.02));
    const fmt = o.fmt || Fmt.compact;
    const LON0 = 67, LON1 = 98, LAT0 = 6, LAT1 = 38;        // visible geographic window
    const px = lon => 10 + (lon - LON0) / (LON1 - LON0) * (W - 20);
    const py = lat => 8 + (LAT1 - lat) / (LAT1 - LAT0) * (H - 16);

    const maxV = Math.max(...o.points.map(p => p.value), 1e-9);
    let s = svgOpen(W, H);
    s += `<polygon class="geo-land" points="${INDIA_OUTLINE.map(p => px(p[0]) + ',' + py(p[1])).join(' ')}"/>`;

    // Biggest bubbles first so small ones stay visible on top.
    [...o.points].sort((a, b) => b.value - a.value).forEach(p => {
      const rad = 7 + 24 * Math.sqrt(p.value / maxV);
      const dim = o.selectedKey != null && o.selectedKey !== p.key ? ' dim' : '';
      s += `<circle class="bubble${o.onClick ? ' clickable' : ''}${dim}" cx="${px(p.lon)}" cy="${py(p.lat)}" r="${rad}" ` +
           `data-key="${esc(p.key)}" data-tip="${esc(p.name + '\n' + fmt(p.value))}"/>` +
           `<text class="geo-t" x="${px(p.lon)}" y="${py(p.lat) + rad + 11}" text-anchor="middle">${esc(p.name)}</text>`;
    });
    el.innerHTML = s + '</svg>';
    wireClick(el, o.onClick);
  }

  /* ======================================================================
     9) WATERFALL  (Finance: Revenue - COGS - Marketing - Opex = Net Profit)
        o = { items:[{label, value, type:'total'|'delta', color}], fmt }
        'total' bars start at zero; 'delta' bars float from the running total.
     ====================================================================== */
  function waterfall(el, o) {
    const W = widthOf(el), H = o.height || 270;
    const m = { l: 56, r: 10, t: 16, b: 28 };
    const fmt = o.fmt || Fmt.compact;
    const n = o.items.length, pw = W - m.l - m.r, ph = H - m.t - m.b;

    // Work out each bar's start (from) and end (to).
    let run = 0;
    const bars = o.items.map(it => {
      if (it.type === 'total') { run = it.value; return { from: 0, to: it.value, it }; }
      const from = run; run += it.value; return { from, to: run, it };
    });
    const top = Math.max(...bars.map(b => Math.max(b.from, b.to)), 0);
    const sc = scale(0, top, 4);
    const y = v => m.t + ph - (v - sc.min) / (sc.max - sc.min) * ph;
    const band = pw / n, bw = Math.min(band * 0.62, 62), xc = i => m.l + band * i + band / 2;

    let s = svgOpen(W, H) + yGrid(sc, y, m, W, fmt);
    bars.forEach((b, i) => {
      const yTop = y(Math.max(b.from, b.to)), yBot = y(Math.min(b.from, b.to));
      s += `<rect class="bar" x="${xc(i) - bw / 2}" y="${yTop}" width="${bw}" height="${Math.max(1, yBot - yTop)}" rx="3" ` +
           `fill="${b.it.color}" data-tip="${esc(b.it.label + '\n' + fmt(b.it.value))}"/>` +
           `<text class="val" x="${xc(i)}" y="${yTop - 5}" text-anchor="middle">${esc(fmt(b.it.value))}</text>`;
      // thin connector line to the next bar
      if (i < n - 1) s += `<line class="gl" x1="${xc(i) + bw / 2}" x2="${xc(i + 1) - bw / 2}" y1="${y(b.to)}" y2="${y(b.to)}"/>`;
    });
    s += o.items.map((it, i) => `<text class="axis" x="${xc(i)}" y="${H - 8}" text-anchor="middle">${esc(it.label)}</text>`).join('');
    el.innerHTML = s + '</svg>';
  }

  /* ======================================================================
     10) SPARKLINE  (tiny trend line inside KPI cards)
     ====================================================================== */
  function spark(el, values, color) {
    const W = 120, H = 34, n = values.length;
    if (n < 2) { el.innerHTML = ''; return; }
    const lo = Math.min(...values), hi = Math.max(...values), span = (hi - lo) || 1;
    const pts = values.map((v, i) => `${(i / (n - 1) * (W - 4) + 2).toFixed(1)},${(H - 4 - (v - lo) / span * (H - 8)).toFixed(1)}`);
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="width:100%;height:34px;display:block">` +
      `<polygon points="2,${H} ${pts.join(' ')} ${W - 2},${H}" fill="${color}" fill-opacity="0.14"/>` +
      `<polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
  }

  /* ======================================================================
     TOOLTIP  -  one shared <div id="tooltip"> that follows the mouse.
     We use "event delegation": ONE mousemove listener on the whole document
     checks if the element under the mouse (or its parent) has a data-tip.
     ====================================================================== */
  if (typeof document !== 'undefined') {
    const tip = document.getElementById('tooltip');
    if (tip) {
      document.addEventListener('mousemove', e => {
        const t = e.target.closest ? e.target.closest('[data-tip]') : null;
        if (!t) { tip.hidden = true; return; }
        // esc() prevents HTML injection; then we turn "\n" into <br> for line breaks.
        tip.innerHTML = esc(t.getAttribute('data-tip')).replace(/\n/g, '<br>');
        tip.hidden = false;
        const pad = 14, box = tip.getBoundingClientRect();
        let x = e.clientX + pad, y = e.clientY + pad;
        if (x + box.width > window.innerWidth - 8) x = e.clientX - box.width - pad;    // flip if off-screen
        if (y + box.height > window.innerHeight - 8) y = e.clientY - box.height - pad;
        tip.style.left = x + 'px';
        tip.style.top = y + 'px';
      });
    }
  }

  // Public API: only these names are usable from app.js
  return { PALETTE, column, hbar, line, donut, funnel, heatmap, scatter, geoMap, waterfall, spark };
})();
