/* ==========================================================================
   data.js  -  THE DATA LAYER
   ==========================================================================
   A BI tool needs data. Instead of connecting to a database, we GENERATE a
   realistic fake dataset in the browser. This keeps the project 100%
   self-contained (no backend, no API keys).

   CONCEPT: "Fact table"
   Each object in `rows` is ONE row of a fact table. One row = one day for one
   Region + one Category + one Sales Channel. It stores numbers (orders,
   revenue, cost ...) plus "dimension" columns (date parts, region, category,
   channel) that we can filter and group by.
       3 years x 365 days x 10 regions x 5 categories x 4 channels
       = about 219,000 rows

   CONCEPT: "Seeded random"
   Math.random() gives different numbers on every refresh. A BI demo should
   always show the SAME numbers, so we use a tiny seeded random generator
   (mulberry32). Same seed -> same dataset every time.
   ========================================================================== */

const DataStore = (function () {
  'use strict';   // strict mode catches silly mistakes (like undeclared variables)

  /* ---------- 1. Dimension lists (the "lookup" values) ---------- */

  const YEARS    = [2023, 2024, 2025];
  const MONTHS   = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];  // index = JS Date.getDay()

  // w     = "weight": how big this city is (bigger weight -> more orders)
  // delay = how slow deliveries are in that city (used for the Operations page)
  // lat/lon are real coordinates, used to place bubbles on the map
  const REGIONS = [
    { name: 'Mumbai',    lat: 19.08, lon: 72.88, w: 1.5, delay: 0.1 },
    { name: 'Delhi',     lat: 28.61, lon: 77.21, w: 1.6, delay: 0.2 },
    { name: 'Bengaluru', lat: 12.97, lon: 77.59, w: 1.4, delay: 0.1 },
    { name: 'Chennai',   lat: 13.08, lon: 80.27, w: 1.0, delay: 0.3 },
    { name: 'Kolkata',   lat: 22.57, lon: 88.36, w: 0.9, delay: 0.8 },
    { name: 'Hyderabad', lat: 17.38, lon: 78.48, w: 1.1, delay: 0.3 },
    { name: 'Ahmedabad', lat: 23.02, lon: 72.57, w: 0.9, delay: 0.4 },
    { name: 'Pune',      lat: 18.52, lon: 73.86, w: 0.8, delay: 0.2 },
    { name: 'Jaipur',    lat: 26.91, lon: 75.79, w: 0.7, delay: 0.6 },
    { name: 'Lucknow',   lat: 26.85, lon: 80.95, w: 0.6, delay: 0.9 }
  ];

  // price = typical price per unit (INR), cost = cost-of-goods share of revenue,
  // ret = typical return rate
  const CATEGORIES = [
    { name: 'Soya Products',    price: 180, w: 1.3, cost: 0.62, ret: 0.030 },
    { name: 'Makhana',          price: 320, w: 1.0, cost: 0.55, ret: 0.045 },
    { name: 'Besan & Flours',   price: 110, w: 1.2, cost: 0.68, ret: 0.025 },
    { name: 'Poha & Cereals',   price:  90, w: 0.9, cost: 0.66, ret: 0.028 },
    { name: 'Sachets & Snacks', price:  40, w: 1.1, cost: 0.60, ret: 0.050 }
  ];

  // mkt = how much marketing money this channel needs (Retail needs little)
  // ret = how often its customers come back (Website customers are loyal)
  const CHANNELS = [
    { name: 'Amazon',          w: 1.2, mkt: 1.00, ret: 0.9 },
    { name: 'Flipkart',        w: 1.0, mkt: 0.90, ret: 0.8 },
    { name: 'Retail Stores',   w: 1.4, mkt: 0.35, ret: 1.2 },
    { name: 'Company Website', w: 0.5, mkt: 1.10, ret: 1.3 }
  ];

  /* ---------- 2. Seeded random number generator ---------- */

  // mulberry32: a very small, fast pseudo random generator.
  // Call the returned function repeatedly to get numbers between 0 and 1.
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- 3. Build the fact table ---------- */

  function generateRows() {
    const rand = mulberry32(20240607);   // fixed seed = same data every time
    const rows = [];
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

    for (const y of YEARS) {
      for (let m = 0; m < 12; m++) {                       // m = 0..11 (JS months)
        const daysInMonth = new Date(y, m + 1, 0).getDate(); // day 0 of next month = last day of this month

        for (let d = 1; d <= daysInMonth; d++) {
          const date = new Date(y, m, d);
          const dow  = date.getDay();                                   // 0 = Sunday
          const doy  = Math.floor((date - new Date(y, 0, 0)) / 86400000); // day of year (1..366)
          const tIdx = (y - YEARS[0]) + doy / 365;                      // time in "years since 2023"

          // ---- Day level factors: these create realistic patterns ----
          const growth   = 1 + 0.20 * tIdx;                                       // business grows ~20% a year
          const season   = 1 + 0.18 * Math.sin(2 * Math.PI * (doy - 60) / 365)   // gentle yearly wave
                             + (m === 9 || m === 10 ? 0.25 : 0);                  // festive boost in Oct/Nov
          const dowBoost = [1.12, 0.95, 0.97, 1.0, 1.0, 1.05, 1.15][dow];        // weekends sell more
          const dayFactor = growth * season * dowBoost;

          // ---- One row for every Region x Category x Channel ----
          for (const reg of REGIONS) {
            for (const cat of CATEGORIES) {
              for (const ch of CHANNELS) {
                const base   = 5.2 * dayFactor * reg.w * cat.w * ch.w;
                const orders = Math.max(0, Math.round(base * (0.7 + 0.6 * rand())));
                const units  = orders ? Math.round(orders * (1.4 + 1.2 * rand())) : 0;

                const price   = cat.price * (1 + 0.03 * tIdx) * (0.96 + 0.08 * rand()); // mild inflation
                const revenue = Math.round(units * price);
                const cost    = Math.round(revenue * cat.cost * (0.97 + 0.06 * rand()));
                const marketing = Math.round(revenue * 0.15 * ch.mkt * (0.7 + 0.6 * rand()));
                const opex    = Math.round(revenue * (0.09 + 0.03 * rand()));

                // Marketing funnel, built backwards from orders so that it is always
                // Impressions > Clicks > Add-to-cart > Orders (a proper funnel shape)
                const leads       = Math.round(orders / (0.32 + 0.12 * rand()));
                const clicks      = Math.round(leads / (0.20 + 0.08 * rand()));
                const impressions = Math.round(clicks / (0.014 + 0.012 * rand()));

                // Customers
                const newCust = Math.round(orders * (0.45 + 0.20 * rand()));
                const retCust = Math.round(orders * 0.20 * ch.ret * (0.7 + 0.6 * rand()));

                // Operations
                const pOnTime = clamp(0.93 - reg.delay * 0.06 - (season > 1.2 ? 0.04 : 0) + (rand() - 0.5) * 0.08, 0.6, 0.99);
                const onTime  = Math.round(orders * pOnTime);
                const returns = Math.round(orders * cat.ret * (0.5 + rand()));
                const delDays = Math.round(orders * (1.8 + reg.delay * 1.6 + rand() * 1.2)); // total delivery days

                rows.push({
                  // --- dimensions (what we group and filter by) ---
                  y: y, q: Math.floor(m / 3) + 1, m: m + 1, d: d, dow: dow,
                  region: reg.name, category: cat.name, channel: ch.name,
                  // --- measures (numbers we add up) ---
                  orders, units, revenue, cost, marketing, opex,
                  impressions, clicks, leads, newCust, retCust,
                  onTime, returns, delDays
                });
              }
            }
          }
        }
      }
    }
    return rows;
  }

  /* ---------- 4. Public API ---------- */

  // The names of every numeric column we add up. app.js loops over this list.
  const FIELDS = ['orders', 'units', 'revenue', 'cost', 'marketing', 'opex',
                  'impressions', 'clicks', 'leads', 'newCust', 'retCust',
                  'onTime', 'returns', 'delDays'];

  /* ---------- 5. Aggregation table (a classic BI speed trick) ----------
     Charts at Year / Quarter / Month level do not need every single day.
     So we also build a MONTHLY roll-up: the same facts, but each day is added
     into its month. That is about 7,200 rows instead of 219,000, so filters
     feel instant. Power BI calls this an "aggregation table".
     The daily rows are still used for the Day level and the weekday heatmap. */
  function rollupMonthly(dailyRows) {
    const map = new Map();
    for (const r of dailyRows) {
      const key = r.y * 100 + r.m + '|' + r.region + '|' + r.category + '|' + r.channel;
      let t = map.get(key);
      if (!t) {
        t = { y: r.y, q: r.q, m: r.m, region: r.region, category: r.category, channel: r.channel };
        FIELDS.forEach(f => { t[f] = 0; });
        map.set(key, t);
      }
      FIELDS.forEach(f => { t[f] += r[f]; });
    }
    return [...map.values()];
  }

  const rows = generateRows();       // generated once when the page loads
  return {
    YEARS, MONTHS, WEEKDAYS, REGIONS, CATEGORIES, CHANNELS, FIELDS,
    rows,                            // daily facts (~219,000 rows)
    monthlyRows: rollupMonthly(rows) // monthly roll-up (~7,200 rows)
  };
})();   // <- the "(function(){...})()" pattern is an IIFE: it runs immediately and keeps
        //    its inner variables private. Only what we `return` is visible to other files.
