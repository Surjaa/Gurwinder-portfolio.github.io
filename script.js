/* ==========================================================
   Gurwinder Parhar | Portfolio interactions
   Every line below has a comment that explains what it does.
   ========================================================== */
(function () { // wrap everything in a function so our variables stay private and do not clash with other scripts
  'use strict'; // strict mode turns silent mistakes (like typos in variable names) into real errors

  var $ = function (s, c) { return (c || document).querySelector(s); }; // shortcut: find the first element that matches a CSS selector (inside c, or the whole page)
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }; // shortcut: find all matches and turn them into a real array
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; // true when the visitor asked their device to cut down on animation
  var finePointer = window.matchMedia('(pointer: fine)').matches; // true on devices with a mouse or trackpad (false on touch phones)
  var accent = '#FFC53D'; // the current accent colour (sunflower yellow by default)

  function esc(str) { // makes text safe to place inside HTML so it can never run as code
    return String(str).replace(/[&<>"']/g, function (c) { // find each special character
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; // swap it for its safe HTML version
    }); // end of replace
  } // end of esc

  /* Tiny syntax highlighter that colours the code cards */
  function hl(src) { // takes plain code text and returns HTML with coloured spans
    var re = /(\/\/.*|\/\*[\s\S]*?\*\/)|('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*")|(<\/?[a-zA-Z][a-zA-Z0-9-]*|\/?>)|\b(const|let|function|return|if|else|true|false|new|forEach|querySelectorAll)\b|(\b\d+(?:\.\d+)?(?:px|rem|ms|s|%)?)|([a-z-]+)(?=\s*:)/g; // one regular expression that finds comments, strings, tags, keywords, numbers and property names
    var out = '', last = 0, m; // out = the HTML we build, last = where the previous match ended, m = the current match
    while ((m = re.exec(src))) { // loop over every match found in the code
      out += esc(src.slice(last, m.index)); // add the plain text before this match (escaped)
      var cls = m[1] ? 't-c' : m[2] ? 't-s' : m[3] ? 't-k' : m[4] ? 't-k' : m[5] ? 't-n' : 't-p'; // choose a colour class depending on which group matched
      out += '<span class="' + cls + '">' + esc(m[0]) + '</span>'; // wrap the match in a coloured span
      last = m.index + m[0].length; // remember where this match ended
    } // end of loop
    return out + esc(src.slice(last)); // add whatever text is left after the final match
  } // end of hl

  /* ---------- Preloader ---------- */
  function runLoader() { // animates the loading screen counter from 0 to 100
    var loader = $('#loader'), count = $('#loaderCount'), bar = $('#loaderBar'); // grab the three loader elements
    var start = null, duration = reduceMotion ? 1 : 1400; // start time and total length in ms (almost instant for reduced motion)
    function finish() { // runs when the counter reaches 100
      loader.classList.add('done'); // slide the loading screen away
      document.body.classList.add('ready'); // tell the CSS the page is ready so hero animations can start
      document.documentElement.classList.add('ready'); // same flag on the html element
      typeHeroCode(); // start typing the code card in the hero
    } // end of finish
    function step(ts) { // runs on every animation frame (ts = current time in ms)
      if (start === null) start = ts; // remember when the first frame happened
      var p = Math.min((ts - start) / duration, 1); // progress from 0 to 1
      var v = Math.round((1 - Math.pow(1 - p, 3)) * 100); // ease the progress so it slows down near the end, as a number 0-100
      count.textContent = v; bar.style.width = v + '%'; // show the number and widen the bar
      if (p < 1) requestAnimationFrame(step); else setTimeout(finish, 250); // keep going until done, then wait a moment and finish
    } // end of step
    requestAnimationFrame(step); // kick off the first frame
  } // end of runLoader

  /* ---------- Hero text ---------- */
  function splitLetters() { // splits the big name into one span per letter so each letter can animate
    $$('.split').forEach(function (el) { // for each element marked with the class "split"
      var text = el.textContent; el.textContent = ''; // read its text, then empty it
      text.split('').forEach(function (ch, i) { // loop over every character
        var s = document.createElement('span'); // create a span for the letter
        s.className = 'ch'; s.setAttribute('aria-hidden', 'true'); // style class, and hide the single letters from screen readers
        s.style.setProperty('--i', i); s.textContent = ch; el.appendChild(s); // store the letter number for the delay, set the letter, add it
      }); // end of character loop
    }); // end of element loop
    $$('[data-hero]').forEach(function (el, i) { el.style.setProperty('--d', i * 110); }); // give each hero block a staggered delay (110 ms apart)
  } // end of splitLetters

  function roleTyper() { // types and deletes the changing words under the name
    var el = $('#role'); // the span that holds the changing words
    var roles = ['responsive websites.', 'BI dashboards.', 'MIS reports.', 'data visualizations.', 'React applications.']; // the phrases to cycle through
    if (reduceMotion) { el.textContent = roles[0]; return; } // with reduced motion, just show the first phrase and stop
    var r = 0, c = 0, deleting = false; // r = phrase number, c = characters shown, deleting = typing or erasing
    function tick() { // one typing or erasing step
      var word = roles[r]; // the phrase we are working on
      if (!deleting) { // typing forward
        c++; el.textContent = word.slice(0, c); // show one more character
        if (c === word.length) { deleting = true; return setTimeout(tick, 1700); } // finished typing: pause, then start erasing
        return setTimeout(tick, 70); // otherwise type the next character soon
      } // end of typing branch
      c--; el.textContent = word.slice(0, c); // erasing: show one character less
      if (c === 0) { deleting = false; r = (r + 1) % roles.length; return setTimeout(tick, 350); } // fully erased: move to the next phrase
      setTimeout(tick, 35); // erase the next character quickly
    } // end of tick
    setTimeout(tick, 1800); // wait for the intro animation before starting
  } // end of roleTyper

  var HERO_CODE = "const developer = {\n  name: 'Gurwinder Parhar',\n  role: 'Front-End Analytics Engineer',\n  stack: ['HTML5', 'CSS3', 'JS', 'React'],\n  openToWork: true,\n};"; // the code text typed into the hero card
  var heroCodeStarted = false; // makes sure the typing only starts once
  function typeHeroCode() { // types the hero code card one character at a time
    if (heroCodeStarted) return; heroCodeStarted = true; // stop if it already started, otherwise mark it as started
    var pre = $('#heroCode'); // the <pre> element that shows the code
    if (reduceMotion) { pre.innerHTML = hl(HERO_CODE); return; } // reduced motion: show everything at once
    var i = 0; // how many characters are visible
    (function tick() { // a small self-running function
      i++; pre.innerHTML = hl(HERO_CODE.slice(0, i)); // show one more character, highlighted
      if (i < HERO_CODE.length) setTimeout(tick, 28); // keep going until all characters are shown
    })(); // run it immediately
  } // end of typeHeroCode

  /* ---------- Hero particle network ---------- */
  function heroCanvas() { // draws the moving dots and lines behind the hero
    var cv = $('#heroCanvas'), ctx = cv.getContext('2d'), hero = $('#home'); // the canvas, its drawing tool, and the hero section
    var dots = [], w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2); // dot list, canvas size, and screen sharpness (capped at 2 for speed)
    var mouse = { x: -999, y: -999 }, visible = true; // mouse position (off-screen at first) and whether the hero is on screen
    var colors = [accent, '#7C5CFF', '#2EC4A0', '#FF6B5B']; // the four dot colours

    function resize() { // sets the canvas size and creates the dots
      w = hero.clientWidth; h = hero.clientHeight; // match the hero size
      cv.width = w * dpr; cv.height = h * dpr; // make the canvas sharp on high-density screens
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // scale drawing so one unit equals one CSS pixel
      var n = Math.min(Math.floor(w * h / 15000), 90); // number of dots grows with area, but never above 90
      dots = []; // start with an empty list
      for (var i = 0; i < n; i++) { // create n dots
        dots.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4, r: Math.random() * 2 + 1, k: i % 4 }); // random position, speed, size and colour index
      } // end of loop
    } // end of resize
    function draw() { // paints one frame
      ctx.clearRect(0, 0, w, h); // wipe the previous frame
      for (var i = 0; i < dots.length; i++) { // go through every dot
        var d = dots[i]; // the current dot
        var dx = d.x - mouse.x, dy = d.y - mouse.y, dist = Math.sqrt(dx * dx + dy * dy); // distance between the dot and the mouse
        if (dist < 140 && dist > 0) { d.x += dx / dist * 1.6; d.y += dy / dist * 1.6; } // push the dot away when the mouse is close
        d.x += d.vx; d.y += d.vy; // move the dot by its own speed
        if (d.x < 0 || d.x > w) d.vx *= -1; // bounce off the left and right edges
        if (d.y < 0 || d.y > h) d.vy *= -1; // bounce off the top and bottom edges
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.283); ctx.fillStyle = colors[d.k]; ctx.globalAlpha = .8; ctx.fill(); // draw the dot as a filled circle
        for (var j = i + 1; j < dots.length; j++) { // compare with every later dot
          var o = dots[j], lx = d.x - o.x, ly = d.y - o.y, ld = Math.sqrt(lx * lx + ly * ly); // distance between the two dots
          if (ld < 110) { // only connect dots that are near each other
            ctx.globalAlpha = (1 - ld / 110) * .35; ctx.strokeStyle = '#F6F3FF'; ctx.lineWidth = 1; // closer dots get a stronger, whiter line
            ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(o.x, o.y); ctx.stroke(); // draw the line between them
          } // end of if
        } // end of inner loop
      } // end of outer loop
      ctx.globalAlpha = 1; // reset transparency for the next frame
    } // end of draw
    var lite = false; // becomes true when the page switches to lite (fast) mode
    function loop() { if (visible && !lite) draw(); requestAnimationFrame(loop); } // draw only when the hero is visible and lite mode is off, then repeat
    document.addEventListener('litemode', function () { lite = true; dots.length = Math.min(dots.length, 28); draw(); }); // in lite mode keep only 28 dots and draw one still frame
    resize(); // build the dots once at the start
    window.addEventListener('resize', resize); // rebuild them when the window size changes
    hero.addEventListener('pointermove', function (e) { // follow the mouse or finger over the hero
      var r = hero.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; // store its position relative to the hero
    }); // end of pointermove
    hero.addEventListener('pointerleave', function () { mouse.x = mouse.y = -999; }); // when the pointer leaves, move the "mouse" far away
    document.addEventListener('accentchange', function (e) { colors[0] = e.detail; if (reduceMotion) draw(); }); // update the first dot colour when the accent colour changes
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(hero); // track whether the hero is on screen
    if (reduceMotion) draw(); else loop(); // draw once for reduced motion, otherwise animate continuously
  } // end of heroCanvas

  /* ---------- Accent colour picker ---------- */
  function accentPicker() { // lets the visitor choose the highlight colour
    var box = $('#accent'), toggle = $('#accentToggle'); // the widget and its main button
    toggle.addEventListener('click', function () { // when the main button is clicked
      var open = !box.classList.contains('open'); // work out whether the swatches should open or close
      box.classList.toggle('open', open); toggle.setAttribute('aria-expanded', open); // show or hide them and tell screen readers
    }); // end of click
    $$('#accentList button').forEach(function (b) { // for each colour swatch
      b.addEventListener('click', function () { // when a swatch is clicked
        accent = b.dataset.color; // remember the chosen colour
        document.documentElement.style.setProperty('--sun', accent); // change the CSS variable so the whole page updates
        $$('#accentList button').forEach(function (x) { x.classList.toggle('is-active', x === b); }); // mark only the chosen swatch as active
        document.dispatchEvent(new CustomEvent('accentchange', { detail: accent })); // tell other parts of the script (canvas, game) about the change
      }); // end of swatch click
    }); // end of swatch loop
    document.addEventListener('click', function (e) { // clicking anywhere else...
      if (!box.contains(e.target)) { box.classList.remove('open'); toggle.setAttribute('aria-expanded', false); } // ...closes the swatches
    }); // end of outside click
  } // end of accentPicker

  /* ---------- Light and dark theme ---------- */
  function themeToggle() { // switches between the light and dark theme
    var btn = $('#themeToggle'), root = document.documentElement; // the toggle button and the <html> element
    function paint() { // updates the button state to match the current theme
      btn.setAttribute('aria-pressed', root.getAttribute('data-theme') === 'dark'); // tell assistive tech whether dark mode is on
      var meta = $('meta[name="theme-color"]'); // the browser address-bar colour tag
      if (meta) meta.setAttribute('content', root.getAttribute('data-theme') === 'dark' ? '#100E26' : '#1E1B3F'); // keep the address bar in step with the theme
    } // end of paint
    btn.addEventListener('click', function () { // when the button is clicked
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; // pick the opposite theme
      root.setAttribute('data-theme', next); // apply it (the CSS reacts to this attribute)
      try { localStorage.setItem('gp-theme', next); } catch (e) { /* storage may be blocked, ignore */ } // remember the choice for next visit
      paint(); // refresh the button state
    }); // end of click
    paint(); // set the correct state when the page loads
  } // end of themeToggle

  /* ---------- Cursor, progress, nav ---------- */
  function cursor() { // draws a soft ring that follows the mouse (desktop only)
    if (!finePointer || reduceMotion) return; // skip on touch devices and for reduced motion
    var wrap = $('.cursor'), dot = $('.cursor-dot'), ring = $('.cursor-ring'); // the cursor container, inner dot and outer ring
    var x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, running = false; // target position (x,y), ring position (rx,ry), and whether the loop is running
    function loop() { // moves the ring a little closer to the mouse each frame
      rx += (x - rx) * .16; ry += (y - ry) * .16; // ease the ring towards the target
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)'; // apply the new ring position
      if (Math.abs(x - rx) > .1 || Math.abs(y - ry) > .1) requestAnimationFrame(loop); else running = false; // keep going until it arrives, then sleep to save battery
    } // end of loop
    window.addEventListener('pointermove', function (e) { // whenever the mouse moves
      x = e.clientX; y = e.clientY; dot.style.transform = 'translate(' + x + 'px,' + y + 'px)'; // update the target and move the dot instantly
      if (!running) { running = true; requestAnimationFrame(loop); } // wake up the ring loop if it was sleeping
    }); // end of pointermove
    document.addEventListener('pointerover', function (e) { // when the pointer enters any element
      wrap.classList.toggle('is-link', !!e.target.closest('a, button, input, textarea, select, .panel-head')); // enlarge the ring over clickable things
    }); // end of pointerover
  } // end of cursor

  function scrollUI() { // scroll progress bar, sticky nav, active nav link and the mobile menu
    var nav = $('#nav'), bar = $('#progressBar'); // the header and the top progress bar
    var links = $$('.nav-links a[href^="#"]'), ticking = false; // nav links that point to sections, and a flag to limit work per frame
    function update() { // refreshes the progress bar and the nav background
      var max = document.documentElement.scrollHeight - innerHeight; // the furthest the page can scroll
      bar.style.transform = 'scaleX(' + (max > 0 ? scrollY / max : 0) + ')'; // stretch the bar to the scrolled fraction
      nav.classList.toggle('is-stuck', scrollY > 30); // give the nav a solid background after a little scrolling
      ticking = false; // allow the next update
    } // end of update
    window.addEventListener('scroll', function () { if (!ticking) { requestAnimationFrame(update); ticking = true; } }, { passive: true }); // run update at most once per frame while scrolling
    update(); // run once at the start

    var map = {}; // will map a section id to its nav link
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; }); // fill the map, removing the "#" from each href
    var spy = new IntersectionObserver(function (entries) { // watches which section crosses the middle of the screen
      entries.forEach(function (e) { // for each change
        if (e.isIntersecting && map[e.target.id]) { // when a section reaches the middle and has a nav link
          links.forEach(function (l) { l.classList.remove('is-current'); }); // clear the highlight from every link
          map[e.target.id].classList.add('is-current'); // highlight the link of the current section
        } // end of if
      }); // end of entries loop
    }, { rootMargin: '-45% 0px -50% 0px' }); // only count the thin band in the middle of the screen
    $$('main section[id]').forEach(function (s) { spy.observe(s); }); // watch every section that has an id

    var toggle = $('#navToggle'), menu = $('#navLinks'); // the hamburger button and the link list
    function setMenu(open) { // opens or closes the mobile menu
      menu.classList.toggle('is-open', open); // slide the menu in or out
      toggle.setAttribute('aria-expanded', open); // keep the button state correct for screen readers
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); // update the button label
      document.body.style.overflow = open ? 'hidden' : ''; // stop the page scrolling behind an open menu
    } // end of setMenu
    toggle.addEventListener('click', function () { setMenu(!menu.classList.contains('is-open')); }); // toggle the menu on click
    links.forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); }); // close the menu after choosing a link
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); }); // pressing Esc closes the menu
  } // end of scrollUI

  /* ---------- Reveal on scroll + counters ---------- */
  function reveals() { // fades elements in when they scroll into view, and counts numbers up
    var io = new IntersectionObserver(function (entries) { // watches elements marked data-reveal
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); // when visible, add the "in" class once and stop watching
    }, { threshold: .12 }); // trigger when 12% of the element is visible
    $$('[data-reveal]').forEach(function (el) { io.observe(el); }); // start watching every marked element

    var cio = new IntersectionObserver(function (entries) { // watches the animated numbers
      entries.forEach(function (e) { // for each change
        if (!e.isIntersecting) return; // ignore numbers that are not visible yet
        cio.unobserve(e.target); // only count up once
        var el = e.target, end = +el.dataset.count, suffix = el.dataset.suffix || ''; // the element, the final number and an optional "+" suffix
        if (reduceMotion) { el.textContent = end + suffix; return; } // reduced motion: show the final number immediately
        var t0 = null; // start time of the count
        (function step(ts) { // runs every animation frame
          if (t0 === null) t0 = ts; // remember when counting began
          var p = Math.min((ts - t0) / 1600, 1); // progress over 1.6 seconds
          el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * end) + suffix; // show the eased number
          if (p < 1) requestAnimationFrame(step); // continue until finished
        })(performance.now()); // start the counting loop now
      }); // end of entries loop
    }, { threshold: .6 }); // start counting when 60% of the number is visible
    $$('[data-count]').forEach(function (el) { cio.observe(el); }); // watch every counter
  } // end of reveals

  function magnetic() { // makes some buttons lean slightly towards the mouse
    if (!finePointer || reduceMotion) return; // only for mouse users who allow motion
    $$('[data-magnetic]').forEach(function (b) { // for each magnetic button
      b.addEventListener('pointermove', function (e) { // while the pointer moves over it
        var r = b.getBoundingClientRect(); // the button's size and position
        b.style.transform = 'translate(' + (e.clientX - r.left - r.width / 2) * .25 + 'px,' + (e.clientY - r.top - r.height / 2) * .35 + 'px)'; // shift it a fraction of the distance from its centre
      }); // end of pointermove
      b.addEventListener('pointerleave', function () { b.style.transform = ''; }); // snap back when the pointer leaves
    }); // end of loop
  } // end of magnetic

  /* Generic accessible tab widget (used by About and the Lab) */
  function tabs(listSel) { // turns a row of buttons into tabs that show and hide panels
    var list = $(listSel), tabEls = $$('[role="tab"]', list); // the tab list and the tab buttons inside it
    function select(tab) { // shows the panel that belongs to a tab
      tabEls.forEach(function (t) { // go through every tab
        var on = t === tab, p = $('#' + t.getAttribute('aria-controls')); // is it the chosen one, and which panel does it control
        t.classList.toggle('is-active', on); t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; // style it, tell screen readers, and manage keyboard focus
        p.hidden = !on; p.classList.toggle('is-active', on); // show only the chosen panel
      }); // end of loop
    } // end of select
    tabEls.forEach(function (t, i) { // add behaviour to each tab
      t.addEventListener('click', function () { select(t); }); // clicking selects it
      t.addEventListener('keydown', function (e) { // keyboard support
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { // left and right arrows move between tabs
          var n = tabEls[(i + (e.key === 'ArrowRight' ? 1 : tabEls.length - 1)) % tabEls.length]; // find the next or previous tab, wrapping around
          select(n); n.focus(); // select it and move keyboard focus to it
        } // end of if
      }); // end of keydown
    }); // end of loop
  } // end of tabs

  function panels() { // the expanding service cards
    var items = $$('.panel'); // all service panels
    items.forEach(function (p) { // for each panel
      $('.panel-head', p).addEventListener('click', function () { // when its header is clicked
        items.forEach(function (o) { // update every panel
          var on = o === p; o.classList.toggle('is-active', on); // only the clicked one stays open
          $('.panel-head', o).setAttribute('aria-expanded', on); // keep screen readers informed
        }); // end of inner loop
      }); // end of click
    }); // end of outer loop
  } // end of panels

  /* ---------- Project data ---------- */
  var GROUPS = { apps: 'Business apps and dashboards', web: 'Websites and smaller apps' }; // headings that group the projects
  var FEATURED = ['erp', 'project-management', 'saas-dashboard', 'bi', 'larder']; // the top 5 projects shown in full on the main Projects section

  /* Every GitHub repository, shown in the animated list under the Projects section */
  var REPOS = [ // name, repo folder on GitHub, language, and whether a live demo exists
    { title: 'ERP Business Management System', repo: 'ERP---Business-Management-System.github.io', lang: 'JavaScript', live: true },
    { title: 'Portfolio Website', repo: 'Gurwinder-portfolio.github.io', lang: 'HTML', live: true },
    { title: 'Project Management Application', repo: 'Project-Management-Application.github.io', lang: 'JavaScript', live: true },
    { title: 'BI Analytics Portal', repo: 'BI-Analytics-Portal.github.io', lang: 'JavaScript', live: true },
    { title: 'Larder Store', repo: 'Larder-store.github.io', lang: 'CSS', live: true },
    { title: 'Blogging Dashboard', repo: 'Blogging-Dashboard.github.io', lang: 'HTML', live: true },
    { title: 'Enterprise SaaS Dashboard', repo: 'Enterprise-SaaS-Dashboard.github.io', lang: 'JavaScript', live: true },
    { title: 'Security Score App', repo: 'Security-Score-App.github.io', lang: 'JavaScript', live: true },
    { title: 'Music App', repo: 'Music-app', lang: 'JavaScript', live: true },
    { title: 'Rock Paper Scissor', repo: 'Rock-Paper-Scissor.github.io', lang: 'JavaScript', live: true },
    { title: 'Snake Game', repo: 'Snake-Game', lang: 'Python', live: false },
    { title: 'Canon Armed', repo: 'Canon-Armed', lang: 'Python', live: false },
    { title: 'Coffee Website', repo: 'Coffee-website.github.io', lang: 'JavaScript', live: true },
    { title: 'GitHub Profile', repo: 'Surjaa', lang: 'Profile README', live: false }
  ]; // all 14 repositories, including the profile README
  var REPO_TONES = ['coral', 'sun', 'teal', 'violet']; // colours cycled across the repo cards
  var PROJECTS = [ // the list of projects shown in the Projects section
    { // ---- ERP business management system ----
      id: 'erp', group: 'apps', title: 'ERP Business Management System', kind: 'ERP system', status: 'Live', tone: 'teal', // identity and colour
      img: 'Images/shots/erp-dashboard.jpg', live: 'https://surjaa.github.io/ERP---Business-Management-System.github.io/', links: [], // main screenshot and the runnable demo path
      shots: [['Images/shots/erp-dashboard.jpg', 'Dashboard'], ['Images/shots/erp-inventory.jpg', 'Inventory'], ['Images/shots/erp-sales.jpg', 'Sales'], ['Images/shots/erp-purchasing.jpg', 'Purchasing'], ['Images/shots/erp-employees.jpg', 'Employees']], // gallery: image path and tab label
      peek: [['Images/previews/erp-1.jpg', 'Dashboard'], ['Images/previews/erp-2.jpg', 'Inventory']], // two clickable screenshots under the preview: image path and caption
      summary: 'A browser-based ERP demo for a small trading company. Buying from suppliers, stock in warehouses, sales and invoices, accounting, manufacturing, staff attendance and leave all run in one place, instead of many spreadsheets. Plain HTML, CSS and JavaScript with local Bootstrap 5 and no build step.', // description
      features: ['Eleven modules in one sidebar: sales, purchasing, inventory, accounting, manufacturing, people, maintenance, FMS, contacts, documents and reports', 'Stock levels, warehouses and stock movements, with low-stock alerts on the dashboard', 'Sales orders and invoices with overdue and pending flags, plus purchase orders and supplier delivery tracking', 'Employee directory, attendance and leave requests that are approved from the dashboard', 'Ctrl+K search and jump, notifications, dark mode and CSV export on every table', 'Sign-up with a password strength meter and a one-click demo account'], // bullet points
      stack: ['HTML5', 'CSS3', 'JavaScript', 'Bootstrap 5'], // technologies
      run: '// No install needed\nOpen index.html in any browser\n\n// On the sign-in screen press\n// \"Try the demo account\"' // run commands
    },
    { // ---- project 1 ----
      id: 'project-management', group: 'apps', title: 'Project Management Application', kind: 'Kanban board', status: 'No dependencies', tone: 'coral', // id for links, group, name, label, status badge and colour
      img: 'Images/shots/project-management-board.jpg', live: 'https://surjaa.github.io/Project-Management-Application.github.io/', links: [], // main screenshot and the runnable demo path
      shots: [['Images/shots/project-management-board.jpg', 'Kanban'], ['Images/shots/project-management-workspace.jpg', 'Workspace'], ['Images/shots/project-management-calendar.jpg', 'Calendar'], ['Images/shots/project-management-timeline.jpg', 'Timeline'], ['Images/shots/project-management-reports.jpg', 'Reports']], // gallery: image path and tab label
      peek: [['Images/previews/project-management-1.jpg', 'Kanban board'], ['Images/previews/project-management-2.jpg', 'Reports']], // two clickable screenshots under the preview: image path and caption
      summary: 'A project board with a pulse. Think Jira, Trello and Monday.com, with one difference: every task knows how much attention it needs right now, and its card glows from cool teal to blazing red-orange. Built in plain HTML, CSS and JavaScript, with no framework and no build step.', // short description
      features: ['Heat engine: each task scores 0 to 100 from its priority, due date and how long it has sat untouched, and the card colour shows it', 'Time Machine slider that rewinds the whole board, so cards move back to the columns they were in last week', 'One-click standup writer and a report that shows where work waits in each column', 'Drag and drop between five columns with work-in-progress limits, subtasks, filters, a Ctrl+K command palette and undo', 'Animated login and sign-up with live validation, a password heat meter, a demo account and guest mode', 'Calendar, timeline, team and reports pages, light and dark themes, and JSON backup and restore'], // bullet points
      stack: ['HTML5', 'CSS3', 'JavaScript', 'Canvas', 'Drag and Drop API'], // technologies used
      run: '// No install needed\nOpen index.html in any browser\n\n// On the login screen press\n// \"Try the demo account\"' // commands shown in the \"Run it locally\" card
    }, // end of project 1
    { // ---- project 2 ----
      id: 'saas-dashboard', group: 'apps', title: 'Enterprise SaaS Dashboard', kind: 'Commerce dashboard', status: 'No dependencies', tone: 'violet', // identity and colour
      img: 'Images/shots/saas-dashboard-dashboard.jpg', live: 'https://surjaa.github.io/Enterprise-SaaS-Dashboard.github.io/', links: [], // main screenshot and the runnable demo path
      shots: [['Images/shots/saas-dashboard-dashboard.jpg', 'Dashboard'], ['Images/shots/saas-dashboard-analytics.jpg', 'Analytics'], ['Images/shots/saas-dashboard-customers.jpg', 'Customers'], ['Images/shots/saas-dashboard-orders.jpg', 'Orders'], ['Images/shots/saas-dashboard-products.jpg', 'Products']], // gallery: image path and tab label
      peek: [['Images/previews/saas-dashboard-1.jpg', 'Dashboard'], ['Images/previews/saas-dashboard-2.jpg', 'Analytics']], // two clickable screenshots under the preview: image path and caption
      summary: 'A B2B commerce dashboard that shows how the business feels, not just what it earned. A live pulse line speeds up whenever an order arrives, and one score sums up the health of the business. Plain HTML, CSS and JavaScript, with hand-drawn SVG charts and no libraries.', // description
      features: ['Business pulse score from 5 to 99, built from revenue growth, conversion change, churned customers and unpaid orders', 'A new order lands every 7 to 13 seconds and appears in the live list, timeline, orders table and notification bell', 'Ctrl+K command palette with Ask the dashboard, which answers plain-English questions such as \"top product\" or \"low stock\"', 'Line, bar, donut, heatmap, funnel and tile-map charts drawn with SVG, and date ranges that update every chart and KPI', 'Fifteen views with sortable, paginated tables, detail modals, form validation, four accent colours and light, dark or system themes', 'Keyboard shortcuts, labelled controls, focus return in dialogs and reduced-motion support'], // bullet points
      stack: ['HTML5', 'CSS3', 'JavaScript', 'SVG'], // technologies
      run: '// No install needed\nOpen index.html in any browser\n\n// On the login screen press\n// \"Use the demo account\"' // run commands
    }, // end of project 2
    { // ---- project 3 ----
      id: 'bi', group: 'apps', title: 'BI Analytics Portal', kind: 'Dashboard', status: 'No dependencies', tone: 'sun', // identity and colour
      img: 'Images/shots/bi-executive.jpg', live: 'https://surjaa.github.io/BI-Analytics-Portal.github.io/', links: [], // main screenshot and the runnable demo path
      shots: [['Images/shots/bi-executive.jpg', 'Overview'], ['Images/shots/bi-sales.jpg', 'Sales'], ['Images/shots/bi-marketing.jpg', 'Marketing'], ['Images/shots/bi-operations.jpg', 'Operations'], ['Images/shots/bi-finance.jpg', 'Finance'], ['Images/shots/bi-customers.jpg', 'Customers'], ['Images/shots/bi-reports.jpg', 'Reports']], // gallery: image path and tab label
      peek: [['Images/previews/bi-1.jpg', 'Executive overview'], ['Images/previews/bi-2.jpg', 'Sales analytics']], // two clickable screenshots under the preview: image path and caption
      summary: 'A Power BI style analytics portal built from scratch in plain HTML, CSS and JavaScript. It has its own SVG chart library and no frameworks, so it opens with a double-click.', // description
      features: ['Seven pages: Executive Overview, Sales, Marketing, Operations, Finance, Customer Analytics and Reports', 'Hand-written SVG charts: columns, lines, areas, donut, funnel, heatmap, scatter, map and waterfall', 'Year, quarter, month and day drill-down built as ordinary filters, with cross-filtering and year-over-year KPI cards', '219,200 daily rows plus a monthly roll-up, so pages refresh quickly', 'Group-by reports with search, CSV export and a print layout'], // bullet points
      stack: ['HTML5', 'CSS3', 'JavaScript'], // technologies
      run: '// No install needed\nOpen index.html in any browser' // run commands
    }, // end of project 3
    { // ---- project 4 ----
      id: 'larder', group: 'apps', title: 'Larder Store', kind: 'E-commerce', status: 'Node backend', tone: 'coral', // identity and colour
      img: 'Images/shots/larder-home.jpg', live: 'https://surjaa.github.io/Larder-store.github.io/', links: [], // main screenshot and the runnable demo path
      shots: [['Images/shots/larder-home.jpg', 'Home'], ['Images/shots/larder-shop.jpg', 'Shop'], ['Images/shots/larder-product.jpg', 'Product'], ['Images/shots/larder-cart.jpg', 'Cart'], ['Images/shots/larder-checkout.jpg', 'Checkout']], // gallery: image path and tab label
      peek: [['Images/previews/larder-1.jpg', 'Home page'], ['Images/previews/larder-2.jpg', 'Product page']], // two clickable screenshots under the preview: image path and caption
      summary: 'A complete online store for everyday staples: browsing, filters, cart, checkout and order tracking. A small Node.js server with no packages saves customers and orders, and re-checks prices so they cannot be changed from the browser.', // description
      features: ['Mega menu, search suggestions, multi-select filters with removable chips, compare for up to 3 products and quick view', 'Cart drawer with undo and coupon codes, a four-step checkout and an animated order tracking timeline', 'Sixteen products in five aisles, each with its own illustrated packaging', 'Admin page that lists customers and orders, protected by a key', 'Skip link, dialog roles and live regions for keyboard and screen reader users'], // bullet points
      stack: ['HTML5', 'CSS3', 'JavaScript', 'Node.js'], // technologies
      run: 'node server.js\n\n// Store:  http://localhost:3000\n// Admin:  http://localhost:3000/admin.html' // run commands
    }, // end of project 4
    { // ---- project 5 ----
      id: 'music', group: 'web', title: 'Music Streaming App', kind: 'Web app', status: 'Live', tone: 'coral', // identity and colour
      img: 'Images/Music-app.png', live: 'https://surjaa.github.io/Music-app/', links: [], // screenshot and live address
      peek: [['Images/Music-app.png', 'Player'], ['Images/previews/music-2.jpg', 'Playlists']], // two clickable screenshots under the preview: image path and caption
      summary: 'A browser-based media player. Upload or link your own music and videos, organize them into personal playlists, and control playback smoothly, online or offline.', // description
      features: ['Upload files or paste a URL', 'Personal playlists you create yourself', 'Smooth playback controls for audio and video', 'Online and offline playback'], // bullet points
      stack: ['React.js', 'HTML5', 'CSS3', 'Bootstrap 5', 'JavaScript'] // technologies
    }, // end of project 5
    { // ---- project 6 ----
      id: 'coffee', group: 'web', title: 'Coffee Brand Website', kind: 'Website', status: 'Live', tone: 'sun', // identity and colour
      img: 'Images/Coffee-website.png', live: 'https://surjaa.github.io/Coffee-website.github.io/', links: [], // screenshot and live address
      peek: [['Images/Coffee-website.png', 'Home page'], ['Images/previews/coffee-2.jpg', 'Products']], // two clickable screenshots under the preview: image path and caption
      summary: 'A fully responsive, e-commerce style website for a fictional coffee brand. It tells the brand story through scroll animations and interactive product sections.', // description
      features: ['Scroll animations that guide the story', 'Interactive product sections', 'Fully responsive from phone to desktop', 'Modern brand storytelling'], // bullet points
      stack: ['HTML5', 'CSS3', 'JavaScript'] // technologies
    }, // end of project 6
    { // ---- project 7 ----
      id: 'blog', group: 'web', title: 'Community Blogging Platform', kind: 'Web app', status: 'Live', tone: 'violet', // identity and colour
      img: 'Images/previews/blog-1.jpg', live: 'https://surjaa.github.io/Blogging-Dashboard.github.io/', links: [['Original version', 'https://surjaa.github.io/Blogging-platform.github.io/']], // main screenshot, the runnable demo and a link to the first version
      shots: [['Images/previews/blog-1.jpg', 'Dashboard'], ['Images/previews/blog-2.jpg', 'Community']], // gallery: image path and tab label
      peek: [['Images/previews/blog-1.jpg', 'Dashboard'], ['Images/previews/blog-2.jpg', 'Community feed']], // two clickable screenshots under the preview: image path and caption
      summary: 'A writing dashboard for a community blog. People sign in, write and publish posts, track their streak, and read what others have shared. It runs in plain HTML, CSS and JavaScript, and can switch to real accounts with Firebase.', // description
      features: ['Overview with a writing-streak heatmap, post counts and recent comments', 'Post editor with drafts, tags and cover images', 'Community feed with search, tag filters, likes and comments', 'Local mode stores data in the browser; Firebase mode adds synced accounts with security rules'], // bullet points
      stack: ['HTML5', 'CSS3', 'JavaScript', 'Firebase'], // technologies
      run: '// No install needed\nOpen preview.html in any browser\n\n// The demo account is filled in,\n// so press \"Log in\"' // commands shown in the \"Run it locally\" card
    }, // end of project 7
    { // ---- project 8 ----
      id: 'security', group: 'web', title: 'Security Score Web App', kind: 'Web app', status: 'Dashboard', tone: 'teal', // identity and colour
      img: 'Images/Security-score.png', live: 'https://surjaa.github.io/Security-Score-App.github.io/', links: [], // screenshot, no live demo, a GitHub button
      peek: [['Images/Security-score.png', 'Dashboard'], ['Images/previews/security-2.jpg', 'Results']], // two clickable screenshots under the preview: image path and caption
      summary: 'A responsive web app that evaluates password and email security, then shows the results on an interactive dashboard with clear recommendations.', // description
      features: ['Password strength indicator', 'Breach status, password reuse and two-factor indicators', 'Interactive dashboard with a modern UI', 'Clear security recommendations'], // bullet points
      stack: ['HTML5', 'CSS3', 'JavaScript'] // technologies
    }, // end of project 8
    { // ---- project 9 ----
      id: 'portfolio', group: 'web', title: 'This Portfolio', kind: 'Website', status: 'You are here', tone: 'coral', // identity and colour
      img: '', live: 'https://surjaa.github.io/Gurwinder-portfolio.github.io/', links: [], // no screenshot, no live demo, a GitHub button
      peek: [['Images/previews/portfolio-1.jpg', 'Home'], ['Images/previews/portfolio-2.jpg', 'CSS lab']], // two clickable screenshots under the preview: image path and caption
      peekHref: 'https://surjaa.github.io/Gurwinder-portfolio.github.io/', // where the screenshots open when there is no live demo button
      summary: 'The site you are on. It is built without frameworks to show what plain HTML, CSS and JavaScript can do: animation, interaction and a layout that adapts to every screen.', // description
      features: ['Loader, particle hero and scroll progress', 'Project pages with a resizable device frame', 'A live CSS lab with Flexbox, card and easing tools', 'Keyboard friendly, with reduced-motion support'], // bullet points
      stack: ['HTML5', 'CSS3', 'JavaScript'] // technologies
    } // end of project 9
  ]; // end of PROJECTS

  /* Drawn stand-ins, shown until a real screenshot loads on top */
  function art(id) { // returns an SVG picture for a project id
    var open = '<svg class="art" viewBox="0 0 800 500" preserveAspectRatio="xMidYMin slice" aria-hidden="true">'; // opening svg tag shared by every picture
    var eq = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) { return '<rect style="--n:' + n + '" x="' + (330 + n * 15) + '" y="350" width="9" height="46" rx="4"/>'; }).join(''); // ten animated equaliser bars for the music picture
    var shapes = { // one entry per project id
      'project-management': '<rect width=\"800\" height=\"500\" fill=\"#141830\"/>' + // dark background of the Project Management Application picture
        '<rect x=\"0\" y=\"0\" width=\"150\" height=\"500\" fill=\"#1B2040\"/><path d=\"M40 30 q6 14 -4 26 q16 -4 14 -22 q10 14 2 28 q-14 10 -24 -4 q-4 -14 12 -28z\" fill=\"#FF7A45\"/><rect x=\"62\" y=\"36\" width=\"56\" height=\"12\" rx=\"6\" fill=\"#F6F3FF\"/>' + // sidebar with a flame logo
        [0, 1, 2, 3, 4, 5].map(function (n) { return '<rect x=\"18\" y=\"' + (84 + n * 40) + '\" width=\"114\" height=\"22\" rx=\"8\" fill=\"' + (n === 3 ? '#3355FF' : '#262C55') + '\"/>'; }).join('') + // six menu items, Kanban highlighted
        '<rect x=\"170\" y=\"14\" width=\"620\" height=\"34\" rx=\"10\" fill=\"#1B2040\"/><rect x=\"186\" y=\"26\" width=\"130\" height=\"10\" rx=\"5\" fill=\"#3A4180\"/><rect x=\"690\" y=\"22\" width=\"80\" height=\"18\" rx=\"9\" fill=\"#3355FF\"/>' + // top bar with search and button
        [['#2EC4A0', 3], ['#FFC53D', 4], ['#FF7A45', 3], ['#FF4D3D', 2]].map(function (c, i) { // four kanban columns, each with cards of rising heat
          return '<rect x=\"' + (170 + i * 158) + '\" y=\"68\" width=\"146\" height=\"416\" rx=\"14\" fill=\"#1B2040\"/>' + [0, 1, 2, 3].slice(0, c[1]).map(function (n) { return '<g class=\"float\" style=\"animation-delay:' + ((i + n) * .3) + 's\"><rect x=\"' + (180 + i * 158) + '\" y=\"' + (84 + n * 96) + '\" width=\"126\" height=\"84\" rx=\"10\" fill=\"#262C55\" stroke=\"' + c[0] + '\" stroke-width=\"3\"/><rect x=\"' + (192 + i * 158) + '\" y=\"' + (98 + n * 96) + '\" width=\"80\" height=\"9\" rx=\"4\" fill=\"#B9B3E6\"/><rect x=\"' + (192 + i * 158) + '\" y=\"' + (118 + n * 96) + '\" width=\"54\" height=\"9\" rx=\"4\" fill=\"#5A6199\"/><rect x=\"' + (192 + i * 158) + '\" y=\"' + (142 + n * 96) + '\" width=\"40\" height=\"12\" rx=\"6\" fill=\"' + c[0] + '\"/></g>'; }).join(''); // the cards in that column
        }).join(''), // end of columns
      'saas-dashboard': '<rect width=\"800\" height=\"500\" fill=\"#F1F2F8\"/>' + // light background of the Enterprise SaaS Dashboard picture
        '<rect x=\"0\" y=\"0\" width=\"150\" height=\"500\" fill=\"#1B1B35\"/><circle cx=\"34\" cy=\"34\" r=\"12\" fill=\"#3D3DF2\"/><rect x=\"54\" y=\"28\" width=\"60\" height=\"12\" rx=\"6\" fill=\"#F6F3FF\"/>' + // dark sidebar with logo
        [0, 1, 2, 3, 4, 5].map(function (n) { return '<rect x=\"18\" y=\"' + (84 + n * 40) + '\" width=\"114\" height=\"22\" rx=\"8\" fill=\"' + (n === 0 ? '#3D3DF2' : '#2A2A52') + '\"/>'; }).join('') + // six menu items, first one active
        '<rect x=\"170\" y=\"14\" width=\"620\" height=\"34\" rx=\"10\" fill=\"#fff\"/><rect x=\"186\" y=\"26\" width=\"140\" height=\"10\" rx=\"5\" fill=\"#D5D7EA\"/><circle cx=\"750\" cy=\"31\" r=\"10\" fill=\"#3D3DF2\"/>' + // top bar
        '<rect x=\"170\" y=\"66\" width=\"400\" height=\"190\" rx=\"18\" fill=\"#3D3DF2\"/><circle cx=\"236\" cy=\"140\" r=\"36\" fill=\"none\" stroke=\"#6B6BF7\" stroke-width=\"12\"/><circle class=\"ring\" cx=\"236\" cy=\"140\" r=\"36\" fill=\"none\" stroke=\"#fff\" stroke-width=\"12\" transform=\"rotate(-90 236 140)\"/><rect x=\"296\" y=\"112\" width=\"190\" height=\"14\" rx=\"7\" fill=\"#fff\"/><rect x=\"296\" y=\"138\" width=\"140\" height=\"9\" rx=\"4\" fill=\"#A9A9FA\"/><path class=\"draw\" d=\"M186 228 L250 228 L266 206 L282 240 L298 214 L314 228 L400 228 L416 200 L432 244 L448 222 L470 228 L554 228\" fill=\"none\" stroke=\"#fff\" stroke-width=\"4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>' + // pulse card with score ring and heartbeat line
        '<rect x=\"590\" y=\"66\" width=\"200\" height=\"190\" rx=\"18\" fill=\"#fff\"/>' + [0, 1, 2, 3].map(function (n) { return '<circle cx=\"620\" cy=\"' + (96 + n * 40) + '\" r=\"12\" fill=\"' + ['#B23A5A', '#A55A32', '#4A9A2E', '#3A3A9A'][n] + '\"/><rect x=\"644\" y=\"' + (88 + n * 40) + '\" width=\"80\" height=\"9\" rx=\"4\" fill=\"#C9CCE4\"/><rect x=\"744\" y=\"' + (90 + n * 40) + '\" width=\"30\" height=\"9\" rx=\"4\" fill=\"#1B1B35\"/>'; }).join('') + // live orders list
        [0, 1, 2, 3].map(function (n) { return '<g class=\"float\" style=\"animation-delay:' + (n * .35) + 's\"><rect x=\"' + (170 + n * 158) + '\" y=\"274\" width=\"146\" height=\"76\" rx=\"14\" fill=\"#fff\"/><rect x=\"' + (184 + n * 158) + '\" y=\"290\" width=\"60\" height=\"9\" rx=\"4\" fill=\"#C9CCE4\"/><rect x=\"' + (184 + n * 158) + '\" y=\"310\" width=\"90\" height=\"20\" rx=\"6\" fill=\"#1B1B35\"/></g>'; }).join('') + // four KPI cards
        '<rect x=\"170\" y=\"368\" width=\"620\" height=\"116\" rx=\"16\" fill=\"#fff\"/><g class=\"eq\" fill=\"#3D3DF2\">' + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function (n) { return '<rect style=\"--n:' + n + '\" x=\"' + (194 + n * 48) + '\" y=\"' + (440 - (n % 5) * 10) + '\" width=\"26\" height=\"' + (32 + (n % 5) * 10) + '\" rx=\"6\"/>'; }).join('') + '</g>', // revenue bar chart with animated bars
      music: '<rect width="800" height="500" fill="#1E1B3F"/>' + // dark background of the music app picture
        '<rect x="0" y="0" width="800" height="52" fill="#2B2760"/><circle cx="34" cy="26" r="10" fill="#FF6B5B"/><rect x="60" y="20" width="90" height="12" rx="6" fill="#B9B3E6"/>' + // top bar with logo dot
        '<rect x="40" y="90" width="190" height="14" rx="7" fill="#3B3689"/><rect x="40" y="124" width="150" height="14" rx="7" fill="#3B3689"/><rect x="40" y="158" width="170" height="14" rx="7" fill="#3B3689"/><rect x="40" y="192" width="130" height="14" rx="7" fill="#3B3689"/>' + // left playlist lines
        '<rect x="570" y="90" width="190" height="14" rx="7" fill="#3B3689"/><rect x="570" y="124" width="150" height="14" rx="7" fill="#3B3689"/><rect x="570" y="158" width="170" height="14" rx="7" fill="#3B3689"/>' + // right playlist lines
        '<g class="float"><rect x="300" y="78" width="200" height="200" rx="26" fill="#FF6B5B"/><circle cx="400" cy="178" r="56" fill="#1E1B3F"/><circle cx="400" cy="178" r="16" fill="#FFC53D"/></g>' + // floating album cover with a record
        '<rect x="330" y="300" width="140" height="14" rx="7" fill="#F6F3FF"/><rect x="355" y="324" width="90" height="10" rx="5" fill="#B9B3E6"/>' + // song title and artist lines
        '<g class="eq" fill="#2EC4A0">' + eq + '</g>' + // animated equaliser bars
        '<rect x="260" y="420" width="280" height="8" rx="4" fill="#3B3689"/><rect x="260" y="420" width="130" height="8" rx="4" fill="#FFC53D"/>' + // progress bar with filled part
        '<circle cx="360" cy="460" r="14" fill="#F6F3FF"/><circle cx="400" cy="460" r="20" fill="#FFC53D"/><circle cx="440" cy="460" r="14" fill="#F6F3FF"/>', // previous, play and next buttons
      coffee: '<rect width="800" height="500" fill="#F3E4D0"/>' + // cream background of the coffee site picture
        '<rect x="0" y="0" width="800" height="52" fill="#4A2C1A"/><rect x="40" y="20" width="80" height="12" rx="6" fill="#F3E4D0"/><rect x="520" y="20" width="50" height="12" rx="6" fill="#C9A57C"/><rect x="590" y="20" width="50" height="12" rx="6" fill="#C9A57C"/><rect x="660" y="20" width="50" height="12" rx="6" fill="#C9A57C"/>' + // brown nav bar with menu items
        '<rect x="290" y="96" width="220" height="26" rx="13" fill="#4A2C1A"/><rect x="330" y="134" width="140" height="14" rx="7" fill="#8B5E3C"/>' + // headline and subtitle bars
        '<g class="float"><path d="M330 220 h140 v70 a70 60 0 0 1 -140 0z" fill="#4A2C1A"/><path d="M470 236 h26 a26 26 0 0 1 0 52 h-30" fill="none" stroke="#4A2C1A" stroke-width="14"/><ellipse cx="400" cy="222" rx="70" ry="14" fill="#8B5E3C"/></g>' + // floating coffee cup with handle
        '<g fill="none" stroke="#8B5E3C" stroke-width="6" stroke-linecap="round"><path class="steam" d="M370 190 q-14 -20 0 -40 q14 -20 0 -40" style="animation-delay:0s"/><path class="steam" d="M400 190 q-14 -20 0 -40 q14 -20 0 -40" style="animation-delay:.5s"/><path class="steam" d="M430 190 q-14 -20 0 -40 q14 -20 0 -40" style="animation-delay:1s"/></g>' + // three rising steam lines
        '<rect x="340" y="350" width="120" height="38" rx="19" fill="#C9743A"/><rect x="368" y="364" width="64" height="10" rx="5" fill="#F3E4D0"/>' + // call-to-action button
        '<rect x="60" y="420" width="200" height="50" rx="14" fill="#E6CDAE"/><rect x="300" y="420" width="200" height="50" rx="14" fill="#E6CDAE"/><rect x="540" y="420" width="200" height="50" rx="14" fill="#E6CDAE"/>', // three product tiles
      blog: '<rect width="800" height="500" fill="#F6F3FF"/>' + // light background of the blog picture
        '<rect x="0" y="0" width="800" height="52" fill="#fff"/><rect x="40" y="18" width="90" height="16" rx="8" fill="#7C5CFF"/><rect x="640" y="14" width="120" height="26" rx="13" fill="#7C5CFF"/>' + // white header with logo and sign-in button
        '<g class="float"><rect x="250" y="80" width="300" height="190" rx="18" fill="#fff" stroke="#E0D9FF" stroke-width="3"/><rect x="266" y="96" width="268" height="90" rx="12" fill="#B9A8FF"/><circle cx="290" cy="216" r="14" fill="#FF6B5B"/><rect x="314" y="206" width="110" height="10" rx="5" fill="#1E1B3F"/><rect x="266" y="238" width="220" height="10" rx="5" fill="#CFC8F0"/></g>' + // floating featured post card
        '<rect x="40" y="310" width="220" height="150" rx="16" fill="#fff" stroke="#E0D9FF" stroke-width="3"/><rect x="54" y="324" width="192" height="60" rx="10" fill="#FFC53D"/><rect x="54" y="400" width="140" height="10" rx="5" fill="#1E1B3F"/><rect x="54" y="424" width="170" height="10" rx="5" fill="#CFC8F0"/>' + // first small post card
        '<rect x="290" y="310" width="220" height="150" rx="16" fill="#fff" stroke="#E0D9FF" stroke-width="3"/><rect x="304" y="324" width="192" height="60" rx="10" fill="#2EC4A0"/><rect x="304" y="400" width="140" height="10" rx="5" fill="#1E1B3F"/><rect x="304" y="424" width="170" height="10" rx="5" fill="#CFC8F0"/>' + // second small post card
        '<rect x="540" y="310" width="220" height="150" rx="16" fill="#fff" stroke="#E0D9FF" stroke-width="3"/><rect x="554" y="324" width="192" height="60" rx="10" fill="#FF6B5B"/><rect x="554" y="400" width="140" height="10" rx="5" fill="#1E1B3F"/><rect x="554" y="424" width="170" height="10" rx="5" fill="#CFC8F0"/>', // third small post card
      security: '<rect width="800" height="500" fill="#14122E"/>' + // dark background of the security picture
        '<rect x="0" y="0" width="800" height="52" fill="#1E1B3F"/><rect x="40" y="20" width="110" height="12" rx="6" fill="#2EC4A0"/>' + // header bar
        '<g class="float"><circle cx="400" cy="170" r="84" fill="#1E1B3F"/><circle cx="400" cy="170" r="50" fill="none" stroke="#2B2760" stroke-width="16"/><circle class="ring" cx="400" cy="170" r="50" fill="none" stroke="#2EC4A0" stroke-width="16" stroke-linecap="round" transform="rotate(-90 400 170)"/><rect x="380" y="160" width="40" height="20" rx="6" fill="#F6F3FF"/></g>' + // floating score ring with a lock
        '<rect x="200" y="290" width="400" height="44" rx="12" fill="#1E1B3F"/><circle cx="226" cy="312" r="10" fill="#2EC4A0"/><rect x="250" y="306" width="200" height="12" rx="6" fill="#B9B3E6"/>' + // first check row (green)
        '<rect x="200" y="346" width="400" height="44" rx="12" fill="#1E1B3F"/><circle cx="226" cy="368" r="10" fill="#FFC53D"/><rect x="250" y="362" width="160" height="12" rx="6" fill="#B9B3E6"/>' + // second check row (yellow)
        '<rect x="200" y="402" width="400" height="44" rx="12" fill="#1E1B3F"/><circle cx="226" cy="424" r="10" fill="#FF6B5B"/><rect x="250" y="418" width="220" height="12" rx="6" fill="#B9B3E6"/>', // third check row (red)
      portfolio: '<rect width="800" height="500" fill="#1E1B3F"/>' + // dark background of the portfolio picture
        '<rect x="0" y="0" width="800" height="52" fill="#2B2760"/><rect x="40" y="16" width="26" height="22" rx="7" fill="#FFC53D"/><rect x="420" y="20" width="50" height="12" rx="6" fill="#B9B3E6"/><rect x="490" y="20" width="50" height="12" rx="6" fill="#B9B3E6"/><rect x="560" y="20" width="50" height="12" rx="6" fill="#B9B3E6"/><rect x="650" y="14" width="100" height="26" rx="13" fill="#FFC53D"/>' + // nav bar with logo, links and resume button
        '<g fill="#7C5CFF"><circle cx="90" cy="130" r="4"/><circle cx="160" cy="210" r="3"/><circle cx="700" cy="150" r="4"/><circle cx="640" cy="260" r="3"/><circle cx="120" cy="330" r="3"/><circle cx="720" cy="360" r="4"/></g>' + // scattered particle dots
        '<g stroke="#F6F3FF" stroke-opacity=".25" stroke-width="2"><path d="M90 130 L160 210 L120 330"/><path d="M700 150 L640 260 L720 360"/></g>' + // faint lines joining the dots
        '<g class="float"><circle cx="400" cy="220" r="104" fill="#3B3689" stroke="#FFC53D" stroke-width="6"/><text x="400" y="250" text-anchor="middle" font-family="Poppins, sans-serif" font-weight="800" font-size="92" fill="#FFC53D">GP</text></g>' + // floating avatar circle with the letters GP
        '<rect x="260" y="360" width="280" height="22" rx="11" fill="#F6F3FF"/><rect x="310" y="396" width="180" height="14" rx="7" fill="#B9B3E6"/><rect x="330" y="430" width="140" height="36" rx="18" fill="#FFC53D"/>' // headline bars and a button
    }; // end of shapes
    return open + shapes[id] + '</svg>'; // join the opening tag, the shapes for this project and the closing tag
  } // end of art

  /* ---------- Skills ---------- */
  var SKILLS = { // tabs of skills; each skill is [name, level 1-3, optional note]
    'Core skills': [['HTML5', 3], ['CSS3', 3], ['JavaScript', 3], ['React.js', 3], ['Bootstrap 5', 3], ['Power BI', 2], ['SQL', 2, 'MySQL and reporting queries'], ['Advanced Excel', 3, 'MIS reporting and management reporting'], ['Power Query', 2, 'Data preparation and repeatable reporting'], ['Figma', 2, 'Layouts and prototypes'], ['WordPress', 2, 'Front-end and content work'], ['Linux', 2, 'Kali Linux and Ubuntu'], ['AWS', 1, 'Cloud topics from technical writing']], // the essentials
    'Dashboards and data': [ // skills used in the dashboard projects
      ['Recharts', 2], // charting library
      ['Data visualization', 3, 'Hand-built SVG charts in the BI portal and the Enterprise SaaS Dashboard'], // charts
      ['Data tables', 3, 'Search, sort, filter, paginate and export in the Enterprise SaaS Dashboard and the BI portal'], // tables
      ['State without a framework', 3, 'Store, views and controller kept apart in the Project Management Application'], // React state
      ['Command palettes and shortcuts', 2, 'Ctrl+K and keyboard navigation in the Project Management Application and the Enterprise SaaS Dashboard'], // filters in the address bar
      ['Live and time-based interfaces', 2, 'Live orders in the Enterprise SaaS Dashboard, the Time Machine in the Project Management Application'], // permissions
      ['CSV export', 2, 'Table and report export in the Enterprise SaaS Dashboard'], // exporting data
      ['SheetJS', 2] // spreadsheet library
    ], // end of dashboards tab
    'Layout and motion': [['Flexbox', 3, 'Try it in the CSS lab'], ['CSS Grid', 3, 'Page layouts across this portfolio'], ['Responsive design', 3, 'Resize any project in its device frame'], ['CSS animations', 3, 'Loader, orbit and marquee on this page'], ['Canvas', 2, 'Hero network and the Snake game'], ['Accessibility basics', 2, 'Skip links, dialog roles and live regions in Larder Store']], // layout and animation skills
    'Back-end and data': [['Python', 2], ['Flask', 2], ['SQLite', 2], ['Node.js', 2], ['REST API design', 2, 'Node API in Larder Store'], ['PHP', 2, 'Built at my Ansh Infotech internship'], ['MySQL', 2]], // server-side skills
    'Tools and design': [['VS Code', 3], ['Git and GitHub', 3], ['Adobe XD', 2, 'Wireframes and prototypes'], ['Power BI', 2], ['Microsoft Office', 3], ['Advanced Excel', 3, 'MIS and management reporting'], ['Power Query', 2, 'Data transformation and reporting'], ['ChatGPT, Claude, Gemini', 3, 'AI-assisted tools']], // tools
    'Content and SEO': [['SEO copywriting', 3], ['Keyword research', 3], ['Technical documentation', 3], ['Google Analytics', 2], ['Search Console', 2], ['Grammarly', 3], ['MIS reporting', 3, 'Management information and KPI reporting'], ['KPI reporting', 3, 'Performance and management dashboards'], ['Business operations', 2, 'Reporting, coordination and process visibility'], ['MDO leadership', 2, 'Management information and execution support']] // writing skills
  }; // end of SKILLS
  var TIER = { 3: 'Daily', 2: 'Comfortable', 1: 'Growing' }; // words that describe each level

  function skills() { // builds the skill tabs and cards
    var tabsEl = $('#skillTabs'), grid = $('#skillGrid'), names = Object.keys(SKILLS); // the tab row, the card grid and the list of tab names
    names.forEach(function (n, i) { // create one tab button per category
      var b = document.createElement('button'); // new button
      b.type = 'button'; b.setAttribute('role', 'tab'); b.textContent = n; // plain button, tab role, category name as text
      b.className = i === 0 ? 'is-active' : ''; b.setAttribute('aria-selected', i === 0); // the first tab starts active
      b.addEventListener('click', function () { // when a tab is clicked
        $$('button', tabsEl).forEach(function (x) { x.classList.remove('is-active'); x.setAttribute('aria-selected', false); }); // deactivate all tabs
        b.classList.add('is-active'); b.setAttribute('aria-selected', true); render(n); // activate this one and draw its cards
      }); // end of click
      tabsEl.appendChild(b); // add the tab to the page
    }); // end of tab loop
    function note(s) { // text shown under a skill name
      var used = PROJECTS.filter(function (p) { return p.stack.indexOf(s[0]) !== -1; }).length; // how many projects list this skill in their stack
      if (used) return 'Used in <b>' + used + '</b> of ' + PROJECTS.length + ' projects'; // show the project count when there is one
      return s[2] ? esc(s[2]) : ''; // otherwise show the custom note, or nothing
    } // end of note
    function render(name) { // draws the cards for one category
      grid.innerHTML = SKILLS[name].map(function (s, i) { // build one card per skill
        var dots = ''; // the three level dots
        for (var k = 1; k <= 3; k++) dots += '<i class="' + (k <= s[1] ? 'on' : '') + '" style="--k:' + k + '"></i>'; // filled dots up to the level
        var n = note(s); // the note for this skill
        return '<div class="skill" style="--i:' + i + '"><h3>' + esc(s[0]) + '</h3><div class="skill-meter" aria-label="' + TIER[s[1]] + '">' + dots + '<span>' + TIER[s[1]] + '</span></div>' + (n ? '<p class="skill-note">' + n + '</p>' : '') + '</div>'; // the card HTML
      }).join(''); // join all cards into one string
    } // end of render
    render(names[0]); // show the first category at the start
  } // end of skills

  /* ---------- Process stepper ---------- */
  var STEPS = [ // the five steps shown in "How a page gets built"
    { t: 'Plan the layout', file: 'layout-plan.txt', d: 'I sketch the structure on a small screen first: sections, navigation and the order of content. Figma or paper, whichever is quicker.', // title, file name, explanation
      code: '// Small screen first\nheader: logo + menu\nmain:   hero, projects, contact\nfooter: links + copyright' }, // code card text
    { t: 'Structure with HTML', file: 'index.html', d: 'Semantic elements give the page meaning for browsers, search engines and screen readers before any styling is applied.', // step 2
      code: '<main>\n  <section id="projects">\n    <h2>Projects</h2>\n    <article class="card">...</article>\n  </section>\n</main>' }, // code card text
    { t: 'Style with CSS', file: 'style.css', d: 'Grid and Flexbox handle the layout, a small set of variables keeps colour and spacing consistent, and media queries adapt it to wider screens.', // step 3
      code: '.card {\n  display: grid;\n  gap: 1rem;\n  border-radius: 24px;\n  transition: transform .3s;\n}\n@media (min-width: 768px) {\n  .card { grid-template-columns: 1fr 1fr; }\n}' }, // code card text
    { t: 'Add behavior with JavaScript', file: 'script.js', d: 'Only after structure and style work do I add scripts: scroll reveals, filters, tabs and interactive widgets.', // step 4
      code: "const cards = document.querySelectorAll('.card');\nconst io = new IntersectionObserver(entries => {\n  entries.forEach(e => e.isIntersecting && e.target.classList.add('in'));\n});\ncards.forEach(card => io.observe(card));" }, // code card text
    { t: 'Test and refine', file: 'checklist.txt', d: 'Before I ship, I check every screen size, every control with a keyboard, and what happens when motion is turned off.', // step 5
      code: '// Before I ship\nphone     no sideways scrolling\ntablet    layout adapts\ndesktop   hover and focus states\nkeyboard  every control reachable\nmotion    reduced-motion respected' } // code card text
  ]; // end of STEPS

  function process() { // controls the step list and the card that explains each step
    var list = $('#steps'), view = $('.step-view'), bar = $('#stepBar'); // the step buttons, the explanation card and its progress bar
    var cur = 0, timer = null, visible = false; // current step, auto-advance timer, and whether the section is on screen
    STEPS.forEach(function (s, i) { // create a button for each step
      var li = document.createElement('li'); // list item
      li.innerHTML = '<button type="button"><span>' + (i + 1) + '</span>' + esc(s.t) + '</button>'; // numbered button with the step title
      $('button', li).addEventListener('click', function () { show(i); }); // clicking jumps to that step
      list.appendChild(li); // add it to the list
    }); // end of loop
    function restartBar() { // restarts the 6-second progress bar
      bar.style.transition = 'none'; bar.style.transform = 'scaleX(0)'; void bar.offsetWidth; // reset it to empty without animation (reading offsetWidth forces the browser to apply it)
      if (reduceMotion) return; // no animated bar for reduced motion
      bar.style.transition = 'transform 6s linear'; bar.style.transform = 'scaleX(1)'; // fill it over 6 seconds
    } // end of restartBar
    function fill(s) { // puts a step's text and code into the card
      $('#stepTitle').textContent = s.t; $('#stepText').textContent = s.d; // title and explanation
      $('#stepFile').textContent = s.file; $('#stepCode').innerHTML = hl(s.code); // file name and highlighted code
    } // end of fill
    function show(i) { // shows step number i
      cur = i; var s = STEPS[i]; // remember it and get its data
      $$('button', list).forEach(function (b, k) { b.classList.toggle('is-active', k === i); b.setAttribute('aria-current', k === i ? 'step' : 'false'); }); // highlight the matching button
      fill(s); // update the card content
      view.classList.remove('swap'); void view.offsetWidth; view.classList.add('swap'); // replay the small slide-in animation
      clearTimeout(timer); restartBar(); // cancel the old timer and restart the bar
      if (!reduceMotion && visible) timer = setTimeout(function () { show((cur + 1) % STEPS.length); }, 6000); // after 6 seconds move to the next step (looping)
    } // end of show
    function lockHeight() { // makes the card as tall as its tallest step so the page below never jumps
      view.style.minHeight = ''; // clear any previous lock
      var max = 0; // the tallest height found so far
      STEPS.forEach(function (s) { fill(s); max = Math.max(max, view.offsetHeight); }); // try every step and measure the card
      view.style.minHeight = max + 'px'; // lock to the tallest
      fill(STEPS[cur]); // put the current step back
    } // end of lockHeight
    var lockTimer = 0; // timer used to wait until resizing stops
    window.addEventListener('resize', function () { clearTimeout(lockTimer); lockTimer = setTimeout(lockHeight, 200); }); // re-measure 200 ms after the window stops resizing
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(lockHeight); // re-measure once the web fonts have loaded
    new IntersectionObserver(function (en) { // watch the section
      visible = en[0].isIntersecting; // remember if it is on screen
      if (visible) show(cur); else clearTimeout(timer); // start auto-advance when visible, pause when not
    }, { threshold: .3 }).observe($('#process')); // trigger at 30% visibility
    show(0); // show the first step
    lockHeight(); // lock the card height
  } // end of process

  /* ---------- Project chapters ---------- */
  function hostOf(u) { return u.replace(/^https?:\/\//, '').replace(/\/$/, ''); } // turns a full web address into a short one for the fake address bar
  function byId(id) { return PROJECTS.filter(function (x) { return x.id === id; })[0]; } // finds a project by its id

  var DEV_W = { desktop: 1280, tablet: 820, phone: 390 }; // the real page widths used when a live demo is shown at each device size
  function fitFrame(stage) { // scales the live demo iframe so it fits inside the preview frame
    var view = $('.bview', stage), frame = $('iframe', view); // the viewing area and the iframe inside it
    if (!frame) return; // nothing to do when no live demo is loaded
    var lw = DEV_W[stage.dataset.device] || 1280, scale = view.clientWidth / lw; // the true width to render at, and the shrink factor
    frame.style.width = lw + 'px'; // render the page at its real width
    frame.style.height = (view.clientHeight / scale) + 'px'; // give it matching height so it fills the frame after shrinking
    frame.style.transform = 'scale(' + scale + ')'; // shrink it visually
  } // end of fitFrame

  var BARS = { portfolio: 'surjaa.github.io/Gurwinder-portfolio' }; // fake address-bar text for projects without a live address

  function projects() { // builds every project section
    var wrap = $('#chapters'), lastGroup = '', n = 0; // the container, the previous group name, and a counter for left/right alternation
    wrap.innerHTML = PROJECTS.filter(function (p) { return FEATURED.indexOf(p.id) !== -1; }).map(function (p) { // create the HTML for each project
      var head = ''; // optional group heading
      if (p.group !== lastGroup) { lastGroup = p.group; head = '<h3 class="group-title" data-reveal>' + esc(GROUPS[p.group]) + '</h3>'; } // add a heading when the group changes
      var list = p.shots || (p.img ? [[p.img, '']] : []); // the screenshots: a gallery, a single image, or none
      var shot = list.map(function (s, i) { return '<img class="shot' + (i === 0 ? ' on' : '') + '" src="' + s[0] + '" alt="' + esc(p.title) + (s[1] ? ', ' + esc(s[1]) + ' screen' : ' screenshot') + '" loading="lazy" onerror="this.remove()">'; }).join(''); // image tags (removed if the file is missing, so the drawn preview shows)
      var tabsRow = p.shots ? '<div class="shot-tabs" role="group" aria-label="Screens of ' + esc(p.title) + '">' + p.shots.map(function (s, i) { return '<button type="button" data-shot="' + i + '" class="' + (i === 0 ? 'is-active' : '') + '">' + esc(s[1]) + '</button>'; }).join('') + '</div>' : ''; // the row of gallery tabs
      var go = p.peekHref || p.live || (p.links[0] ? p.links[0][1] : ''); // where a screenshot click should lead: the live demo first, then a link
      var peekRow = (p.peek && go) ? '<div class="peek" role="group" aria-label="Screenshots of ' + esc(p.title) + '"><p class="peek-label">Click a screenshot to open the live demo</p>' + p.peek.map(function (s) { return '<a class="peek-card" href="' + go + '" target="_blank" rel="noopener" aria-label="Open the live demo of ' + esc(p.title) + ': ' + esc(s[1]) + '"><img src="' + s[0] + '" alt="' + esc(p.title) + ', ' + esc(s[1]) + ' screenshot" loading="lazy" onerror="var c=this.closest(\'.peek-card\');c.remove()"><span class="peek-tag">Live &#8599;</span><span class="peek-cap">' + esc(s[1]) + '</span><span class="peek-go">Open the live demo &#8599;</span></a>'; }).join('') + '</div>' : ''; // the row of two screenshot links (a card removes itself if its image file is missing)
      var url = BARS[p.id] || (p.live ? (/^https?:/.test(p.live) ? hostOf(p.live) : p.live) : 'project preview'); // text for the fake address bar
      var btns = ''; // the action buttons
      if (p.live) btns += '<a class="btn btn-primary" href="' + p.live + '" target="_blank" rel="noopener">Open the live demo</a>'; // main button for projects with a live demo
      btns += p.links.map(function (l) { return '<a class="btn ' + (btns ? 'btn-ghost' : 'btn-primary') + '" href="' + l[1] + '" target="_blank" rel="noopener">' + esc(l[0]) + '</a>'; }).join(''); // extra link buttons
      var run = p.run ? '<div class="codecard run"><div class="codecard-bar"><i></i><i></i><i></i><span>Run it locally</span></div><pre>' + hl(p.run) + '</pre></div>' : ''; // the "Run it locally" code card
      return head + '<article class="chapter' + (n++ % 2 ? ' flip' : '') + '" id="proj-' + p.id + '" data-id="' + p.id + '" data-tone="' + p.tone + '" data-reveal>' + // open the project section, alternating sides
        '<div class="chapter-info">' + // left column with the text
          '<div class="badges"><span class="badge">' + esc(p.kind) + '</span><span class="badge outline">' + esc(p.status) + '</span></div>' + // kind and status badges
          '<h3>' + esc(p.title) + '</h3><p>' + esc(p.summary) + '</p>' + // title and description
          '<ul class="feat">' + p.features.map(function (f, k) { return '<li style="--k:' + k + '">' + esc(f) + '</li>'; }).join('') + '</ul>' + // feature list
          '<ul class="tags">' + p.stack.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>' + // technology tags
          (btns ? '<div class="chapter-links">' + btns + '</div>' : '') + run + // buttons and the run card
        '</div>' + // end of text column
        '<div class="stage" data-device="desktop">' + // right column with the device preview
          '<div class="tilt"><div class="bframe"><div class="bbar"><i></i><i></i><i></i><span>' + esc(url) + '</span></div>' + // browser frame with a fake address bar
          '<div class="bview">' + art(p.id) + shot + '</div></div></div>' + tabsRow + peekRow + // the picture area: drawn preview plus screenshots, then the gallery tabs
          '<div class="stage-ctrl" role="group" aria-label="Preview size for ' + esc(p.title) + '">' + // device size buttons
            '<button type="button" data-device="desktop" class="is-active">Desktop</button>' + // desktop size
            '<button type="button" data-device="tablet">Tablet</button>' + // tablet size
            '<button type="button" data-device="phone">Phone</button>' + // phone size
            (p.live ? '<button type="button" data-live="1">Load live demo</button>' : '') + // button that loads the live site in the frame
          '</div>' + // end of device buttons
          '<p class="stage-note" aria-live="polite"></p>' + // small status message
        '</div></article>'; // end of the preview column and the project section
    }).join(''); // join all projects into one string

    wrap.addEventListener('click', function (e) { // one click handler for every button inside the projects
      var sb = e.target.closest('.shot-tabs button'); // was a gallery tab clicked?
      if (sb) { // yes
        var st = sb.closest('.stage'), idx = +sb.dataset.shot; // the preview column and which screenshot number
        $$('.shot-tabs button', st).forEach(function (b) { b.classList.toggle('is-active', b === sb); }); // highlight the chosen tab
        $$('.bview img.shot', st).forEach(function (im, k) { im.classList.toggle('on', k === idx); }); // show only the matching screenshot
        return; // done
      } // end of gallery branch
      var btn = e.target.closest('.stage-ctrl button'); // was a device or live-demo button clicked?
      if (!btn) return; // neither, so ignore the click
      var stage = btn.closest('.stage'), ch = btn.closest('.chapter'), p = byId(ch.dataset.id); // the preview column, the whole project section, and its data
      if (btn.dataset.device) { // a device size button
        stage.dataset.device = btn.dataset.device; // tell the CSS which size to use
        $$('button[data-device]', $('.stage-ctrl', stage)).forEach(function (b) { b.classList.toggle('is-active', b === btn); }); // highlight the chosen size
        $('.stage-note', stage).textContent = btn.dataset.device === 'desktop' ? '' : 'Previewing the ' + btn.dataset.device + ' width.'; // show a short message
        fitFrame(stage); setTimeout(function () { fitFrame(stage); }, 800); // re-fit a live demo now and again after the size animation ends
      } else if (btn.dataset.live) { // the live demo button
        var view = $('.bview', stage), frame = $('iframe', view); // the picture area and any existing iframe
        if (frame) { // a demo is already loaded
          frame.remove(); btn.textContent = 'Load live demo'; $('.stage-note', stage).textContent = ''; // close it
        } else { // no demo loaded yet
          frame = document.createElement('iframe'); // create the iframe
          frame.src = p.live; frame.title = 'Live demo of ' + p.title; frame.loading = 'lazy'; // point it at the demo and give it an accessible name
          frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups'); // restrict what the embedded page may do
          view.appendChild(frame); fitFrame(stage); btn.textContent = 'Close live demo'; // add it, scale it, and change the button text
          $('.stage-note', stage).textContent = 'Live demo loaded. Switch sizes to test it. If the frame stays blank, use Open the live demo.'; // help message
        } // end of load or close
      } // end of live branch
    }); // end of click handler

    window.addEventListener('resize', function () { $$('.stage', wrap).forEach(fitFrame); }); // re-fit live demos when the window changes size

    if (finePointer && !reduceMotion) { // gentle 3D tilt only for mouse users
      $$('.stage', wrap).forEach(function (stage) { // for each preview column
        var tilt = $('.tilt', stage), raf = 0; // the element that tilts and a frame-request id
        stage.addEventListener('pointermove', function (e) { // while the mouse moves over it
          if (document.documentElement.classList.contains('lite') || raf) return; // skip in lite mode or if a frame is already queued
          raf = requestAnimationFrame(function () { // do the work on the next frame
            raf = 0; // allow another request
            var r = stage.getBoundingClientRect(); // position and size of the column
            tilt.style.setProperty('--ry', (((e.clientX - r.left) / r.width - .5) * 6).toFixed(2) + 'deg'); // turn left or right depending on the mouse x position
            tilt.style.setProperty('--rx', ((.5 - (e.clientY - r.top) / r.height) * 5).toFixed(2) + 'deg'); // turn up or down depending on the mouse y position
          }); // end of frame callback
        }); // end of pointermove
        stage.addEventListener('pointerleave', function () { tilt.style.setProperty('--rx', '0deg'); tilt.style.setProperty('--ry', '0deg'); }); // settle flat when the mouse leaves
      }); // end of loop
    } // end of tilt block

    var techs = []; // list of every technology used
    PROJECTS.forEach(function (p) { p.stack.forEach(function (s) { if (techs.indexOf(s) === -1) techs.push(s); }); }); // collect each technology once
    techs.sort(function (a, b) { // sort by how many projects use it, most first
      var ca = PROJECTS.filter(function (p) { return p.stack.indexOf(a) !== -1; }).length; // projects using a
      var cb = PROJECTS.filter(function (p) { return p.stack.indexOf(b) !== -1; }).length; // projects using b
      return cb - ca; // bigger count first
    }); // end of sort
    var chips = $('#techChips'), active = null; // the chip container and the currently chosen technology
    chips.innerHTML = techs.map(function (t) { // build a chip per technology
      var c = PROJECTS.filter(function (p) { return p.stack.indexOf(t) !== -1; }).length; // how many projects use it
      return '<button type="button" data-tech="' + esc(t) + '" aria-pressed="false">' + esc(t) + ' (' + c + ')</button>'; // the chip HTML
    }).join(''); // join them
    chips.addEventListener('click', function (e) { // when a chip is clicked
      var b = e.target.closest('button'); if (!b) return; // ignore clicks that are not on a chip
      active = active === b.dataset.tech ? null : b.dataset.tech; // clicking the chosen chip again clears the choice
      $$('button', chips).forEach(function (x) { var on = x.dataset.tech === active; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', on); }); // update chip highlights
      $$('.chapter', wrap).forEach(function (c) { // dim the projects that do not use the technology
        c.classList.toggle('is-dim', !!active && byId(c.dataset.id).stack.indexOf(active) === -1); // dim when a chip is active and this project lacks it
      }); // end of loop
      if (active) { var first = $('.chapter:not(.is-dim)', wrap); if (first) first.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' }); } // scroll to the first matching project
    }); // end of chip click
  } // end of projects

  /* ---------- All repositories (animated list under the Projects section) ---------- */
  function allRepos() {
    var btn = $('#allToggle'), panel = $('#allPanel'), grid = $('#allGrid'); // the button, the panel that opens, and the grid inside it
    if (!btn || !panel || !grid) return; // stop if the markup is missing
    grid.innerHTML = REPOS.map(function (r, i) { // one card per repository
      var live = r.live ? '<a href="https://surjaa.github.io/' + r.repo + '/" target="_blank" rel="noopener">Live demo</a>' : ''; // live demo link only when the repo has one
      return '<article class="repo" data-tone="' + REPO_TONES[i % REPO_TONES.length] + '" style="--i:' + i + '">' + // the card, with its colour and stagger position
        '<span class="repo-num">' + String(i + 1).padStart(2, '0') + '</span>' + // number, 01 to 13
        '<h3>' + esc(r.title) + '</h3>' + // repository title
        '<p class="repo-lang"><i aria-hidden="true"></i>' + esc(r.lang) + '</p>' + // language
        '<div class="repo-links"><a href="https://github.com/surjaa/' + r.repo + '" target="_blank" rel="noopener">Code</a>' + live + '</div>' + // links
        '</article>'; // end of card
    }).join('');
    btn.addEventListener('click', function () { // open or close the list
      var open = !panel.classList.contains('is-open'); // the new state
      panel.classList.toggle('is-open', open); // animate the panel
      panel.setAttribute('aria-hidden', String(!open)); // tell screen readers whether it is visible
      btn.classList.toggle('is-open', open); // rotate the arrow and swap the label
      btn.setAttribute('aria-expanded', String(open)); // announce the state
      $('.all-cta-label', btn).textContent = open ? 'Hide All Projects' : 'View All Projects'; // update the text
    });
  }

  /* ---------- CSS lab ---------- */
  function lab() { // the four interactive tools in the Lab section
    tabs('#labTabs'); // make the tab buttons work

    /* Flexbox playground */
    var COLORS = ['#FFC53D', '#FF6B5B', '#2EC4A0', '#7C5CFF', '#8FD0FF', '#FF8FC7', '#FFC53D']; // colours of the demo boxes
    var box = $('#fxBox'); // the container the flex rules are applied to
    function flex() { // reads the controls and updates the preview and the code
      var dir = $('#fxDir').value, j = $('#fxJustify').value, a = $('#fxAlign').value; // direction, justify-content, align-items
      var gap = $('#fxGap').value, n = +$('#fxCount').value, wrapOn = $('#fxWrap').checked; // gap size, number of boxes, wrap on or off
      $('#fxGapOut').textContent = gap + 'px'; $('#fxCountOut').textContent = n; // show the current slider values
      box.style.flexDirection = dir; box.style.justifyContent = j; box.style.alignItems = a; // apply the chosen flex rules
      box.style.gap = gap + 'px'; box.style.flexWrap = wrapOn ? 'wrap' : 'nowrap'; // apply gap and wrapping
      if (box.children.length !== n) { // the number of boxes changed
        box.innerHTML = ''; // clear the old boxes
        for (var i = 0; i < n; i++) { // create the new ones
          var it = document.createElement('div'); // a box
          it.className = 'fx-item'; it.textContent = i + 1; // class and number label
          it.style.setProperty('--c', COLORS[i]); it.style.setProperty('--k', i % 3); // colour and a size variation
          box.appendChild(it); // add it
        } // end of loop
      } // end of if
      var css = '.container {\n  display: flex;\n  flex-direction: ' + dir + ';\n  justify-content: ' + j + ';\n  align-items: ' + a + ';\n  gap: ' + gap + 'px;' + (wrapOn ? '\n  flex-wrap: wrap;' : '') + '\n}'; // the matching CSS text
      $('#fxCode').innerHTML = hl(css); // show it with colours
    } // end of flex
    $$('#lp-flex select, #lp-flex input').forEach(function (el) { el.addEventListener('input', flex); }); // update whenever a control changes
    flex(); // run once at the start

    /* Card styler */
    function card() { // reads the sliders and restyles the glass card
      var r = $('#cdRadius').value, b = $('#cdBlur').value, al = $('#cdAlpha').value / 100, sh = $('#cdShadow').value, bw = $('#cdBorder').value; // radius, blur, opacity, shadow and border width
      $('#cdRadiusOut').textContent = r + 'px'; $('#cdBlurOut').textContent = b + 'px'; // show radius and blur values
      $('#cdAlphaOut').textContent = al.toFixed(2); $('#cdShadowOut').textContent = sh + 'px'; $('#cdBorderOut').textContent = bw + 'px'; // show opacity, shadow and border values
      var c = $('#cdCard'); // the card being styled
      c.style.borderRadius = r + 'px'; c.style.backdropFilter = c.style.webkitBackdropFilter = 'blur(' + b + 'px)'; // rounded corners and frosted-glass blur
      c.style.background = 'rgba(255,255,255,' + al + ')'; c.style.borderWidth = bw + 'px'; // see-through white fill and border thickness
      c.style.boxShadow = '0 ' + sh + 'px ' + (sh * 2) + 'px rgba(20,17,52,.35)'; // soft drop shadow
      var css = '.card {\n  border-radius: ' + r + 'px;\n  background: rgba(255, 255, 255, ' + al.toFixed(2) + ');\n  backdrop-filter: blur(' + b + 'px);\n  border: ' + bw + 'px solid rgba(255, 255, 255, .5);\n  box-shadow: 0 ' + sh + 'px ' + (sh * 2) + 'px rgba(20, 17, 52, .35);\n}'; // the matching CSS text
      $('#cdCode').innerHTML = hl(css); // show it with colours
    } // end of card
    $$('#lp-card input').forEach(function (el) { el.addEventListener('input', card); }); // update on every slider move
    card(); // run once at the start

    /* Easing playground */
    var BEZ = { 'ease': [.25, .1, .25, 1], 'linear': [0, 0, 1, 1], 'ease-in-out': [.42, 0, .58, 1] }; // numbers behind the named easings
    var ball = $('#ezBall'); // the ball that moves along the track
    $('#ezCurve').setAttribute('viewBox', '0 -30 120 160'); // leave room above and below for curves that overshoot
    function bez(v) { // returns the four numbers of an easing
      if (BEZ[v]) return BEZ[v]; // named easing: look it up
      return v.replace(/cubic-bezier\(|\)/g, '').split(',').map(Number); // custom easing: pull the numbers out of the text
    } // end of bez
    function ease() { // redraws the curve and the code for the chosen easing
      var v = $('#ezType').value, d = $('#ezDur').value, b = bez(v); // chosen easing, duration, and its four numbers
      $('#ezDurOut').textContent = d + 'ms'; // show the duration
      $('#ezCurve path').setAttribute('d', 'M10 110 C ' + (10 + b[0] * 100) + ' ' + (110 - b[1] * 100) + ', ' + (10 + b[2] * 100) + ' ' + (110 - b[3] * 100) + ', 110 10'); // draw the bezier curve
      $('#ezCode').innerHTML = hl('.ball {\n  transition: left ' + d + 'ms ' + v + ';\n}'); // show the matching CSS
    } // end of ease
    function play() { // runs the ball across the track
      var v = $('#ezType').value, d = $('#ezDur').value; // chosen easing and duration
      ball.style.transition = 'none'; ball.style.left = '4px'; void ball.offsetWidth; // put the ball back at the start without animating
      ball.style.transition = 'left ' + d + 'ms ' + v; // switch the animation on
      ball.style.left = 'calc(100% - 48px)'; // move it to the far end
    } // end of play
    $('#ezType').addEventListener('input', function () { ease(); play(); }); // changing the easing redraws and replays
    $('#ezDur').addEventListener('input', ease); // changing the duration only redraws
    $('#ezPlay').addEventListener('click', play); // the Play button replays
    ease(); // draw once at the start

    /* Live HTML and CSS editor (the preview runs in a sandboxed iframe with no scripts) */
    var PRESETS = { // starting examples
      card: '<div class="card">\n  <h3>Hover me</h3>\n  <p>Edit the CSS and watch this change.</p>\n</div>\n\n<style>\n  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #1E1B3F; font-family: sans-serif; }\n  .card { padding: 28px 32px; border-radius: 24px; background: #FFC53D; color: #1E1B3F; transition: transform .3s, box-shadow .3s; }\n  .card:hover { transform: translateY(-8px) rotate(-2deg); box-shadow: 0 20px 40px rgba(0, 0, 0, .4); }\n  h3 { margin: 0 0 6px; }\n  p { margin: 0; }\n</style>', // a card that lifts on hover
      dots: '<div class="dots"><i></i><i></i><i></i></div>\n\n<style>\n  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #1E1B3F; }\n  .dots { display: flex; gap: 12px; }\n  .dots i { width: 20px; height: 20px; border-radius: 50%; background: #2EC4A0; animation: hop 1s ease-in-out infinite; }\n  .dots i:nth-child(2) { animation-delay: .15s; background: #FFC53D; }\n  .dots i:nth-child(3) { animation-delay: .3s; background: #FF6B5B; }\n  @keyframes hop { 50% { transform: translateY(-22px); } }\n</style>', // three hopping loading dots
      button: '<button class="pulse">Say hello</button>\n\n<style>\n  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #1E1B3F; }\n  .pulse { padding: 16px 32px; border: 0; border-radius: 999px; background: #FFC53D; color: #1E1B3F; font: 700 18px sans-serif; animation: ring 1.8s infinite; cursor: pointer; }\n  @keyframes ring { 0% { box-shadow: 0 0 0 0 rgba(255, 197, 61, .6); } 80%, 100% { box-shadow: 0 0 0 26px rgba(255, 197, 61, 0); } }\n</style>' // a button with a pulsing ring
    }; // end of PRESETS
    var edCode = $('#edCode'), edOut = $('#edOut'), edTimer = 0; // the text box, the preview iframe and a timer for waiting while typing
    function edRun() { edOut.srcdoc = edCode.value; } // puts the typed code into the preview iframe
    function edLoad() { edCode.value = PRESETS[$('#edPreset').value]; edRun(); } // loads the chosen example and shows it
    edCode.addEventListener('input', function () { clearTimeout(edTimer); edTimer = setTimeout(edRun, 250); }); // update the preview 250 ms after typing stops
    $('#edPreset').addEventListener('input', edLoad); // choosing an example loads it
    $('#edReset').addEventListener('click', edLoad); // the Reset button reloads the current example
    edCode.addEventListener('keydown', function (e) { // handle the Tab key inside the editor
      if (e.key === 'Tab' && !e.shiftKey) { // plain Tab (Shift+Tab still leaves the box)
        e.preventDefault(); // stop the browser from moving focus away
        var s = edCode.selectionStart; edCode.setRangeText('  ', s, edCode.selectionEnd, 'end'); // insert two spaces at the cursor
        edCode.dispatchEvent(new Event('input')); // trigger the live preview update
      } // end of if
    }); // end of keydown
    edLoad(); // load the first example at the start
  } // end of lab

  /* ---------- Component shelf ---------- */
  function uiKit() { // makes the nine small demo components work
    var sw = $('#uiSwitch'), swl = $('#uiSwitchLabel'); // the toggle switch and its label
    sw.addEventListener('click', function () { // when the switch is clicked
      var on = sw.getAttribute('aria-checked') !== 'true'; // work out the new state
      sw.setAttribute('aria-checked', on); swl.textContent = on ? 'Notifications on' : 'Notifications off'; // update the state and the label
    }); // end of click

    $$('.acc-item').forEach(function (item) { // each accordion row
      var b = $('button', item); // its header button
      b.addEventListener('click', function () { b.setAttribute('aria-expanded', item.classList.toggle('open')); }); // open or close and keep aria in sync
    }); // end of loop

    var stars = $$('#uiStars button'), rate = 0, rt = $('#uiRateText'); // star buttons, the saved rating and the text under them
    var NAMES = ['', 'Needs work', 'Fair', 'Good', 'Great', 'Excellent']; // words for each rating
    function paint(n) { stars.forEach(function (s, i) { s.classList.toggle('lit', i < n); }); } // lights up the first n stars
    stars.forEach(function (s, i) { // for each star
      s.addEventListener('mouseenter', function () { paint(i + 1); }); // hovering previews the rating
      s.addEventListener('focus', function () { paint(i + 1); }); // keyboard focus previews it too
      s.addEventListener('click', function () { // clicking saves the rating
        rate = i + 1; stars.forEach(function (x, k) { x.setAttribute('aria-checked', k === i); }); // remember it and mark the radio state
        rt.textContent = 'You rated it ' + rate + ' of 5: ' + NAMES[rate]; paint(rate); // show the message and light the stars
      }); // end of click
    }); // end of loop
    $('#uiStars').addEventListener('mouseleave', function () { paint(rate); }); // when the mouse leaves, show the saved rating again
    $('#uiStars').addEventListener('focusout', function () { paint(rate); }); // same when keyboard focus leaves

    var like = $('#uiLike'), lc = $('#uiLikeCount'), n = 12; // the like button, its counter element and the count
    like.addEventListener('click', function () { // when it is clicked
      var on = like.getAttribute('aria-pressed') !== 'true'; // new liked state
      like.setAttribute('aria-pressed', on); n += on ? 1 : -1; lc.textContent = n; // update state and counter
      if (on && !reduceMotion && !document.documentElement.classList.contains('lite')) { // burst only when liking and when motion is allowed
        for (var k = 0; k < 8; k++) { // eight particles
          var p = document.createElement('i'); p.className = 'burst'; p.style.setProperty('--a', (k * 45) + 'deg'); // each flies off at its own angle
          like.appendChild(p); p.addEventListener('animationend', function () { this.remove(); }); // add it and remove it when its animation ends
        } // end of loop
      } // end of if
    }); // end of click

    var tmsgs = ['Saved to your list', 'Message sent', 'Copied to clipboard', 'Profile updated'], ti = 0, box = $('#uiToastBox'); // toast texts, a counter, and the toast container
    $('#uiToast').addEventListener('click', function () { // when the button is clicked
      var t = document.createElement('div'); t.className = 'ui-toast'; t.textContent = tmsgs[ti++ % tmsgs.length]; // create a toast with the next message
      box.appendChild(t); // show it
      while (box.children.length > 3) box.removeChild(box.firstChild); // keep at most three toasts
      setTimeout(function () { t.remove(); }, 2700); // remove it after 2.7 seconds
    }); // end of click

    var slot = $('#uiSkSlot'), skBtn = $('#uiSkBtn'), skBusy = false; // the loader area, its button, and a busy flag
    function row(cls, real) { // builds the profile row (placeholder or real)
      return '<div class="sk-row ' + cls + '"><div class="sk-av' + (real ? ' real' : '') + '">' + (real ? 'GP' : '') + '</div><div class="sk-lines' + (real ? ' real' : '') + '">' + (real ? '<b>Gurwinder Parhar</b><span>Front-End Analytics Engineer</span>' : '<i></i><i></i>') + '</div></div>'; // avatar plus text lines
    } // end of row
    skBtn.addEventListener('click', function () { // when the button is clicked
      if (skBusy) return; skBusy = true; skBtn.textContent = 'Loading...'; // ignore clicks while loading
      slot.innerHTML = row('loading', false); // show the shimmering placeholder
      setTimeout(function () { slot.innerHTML = row('', true); skBtn.textContent = 'Load again'; skBusy = false; }, 1400); // after 1.4 seconds show the real content
    }); // end of click

    var pw = $('#uiPw'), bar = $('#uiPwBar'), pt = $('#uiPwText'); // password box, strength bar and message
    var LEVELS = [['Waiting for input', 0, '#FF6B5B'], ['Too short', .2, '#FF6B5B'], ['Weak', .4, '#FF8A6B'], ['Okay', .6, '#FFC53D'], ['Good', .8, '#8FD0FF'], ['Strong', 1, '#2EC4A0']]; // message, bar fill and colour per level
    pw.addEventListener('input', function () { // whenever the password text changes
      var v = pw.value, sc = 0; // the text and its score
      if (v.length) { // only score when something is typed
        sc = v.length >= 8 ? 1 : 0; // one point for 8 or more characters
        if (v.length >= 12) sc++; // one for 12 or more
        if (/[a-z]/.test(v) && /[A-Z]/.test(v)) sc++; // one for mixed upper and lower case
        if (/\d/.test(v)) sc++; // one for a digit
        if (/[^A-Za-z0-9]/.test(v)) sc++; // one for a symbol
      } // end of if
      var L = v.length ? LEVELS[Math.max(1, Math.min(5, sc || 1))] : LEVELS[0]; // pick the level that matches the score
      bar.style.transform = 'scaleX(' + L[1] + ')'; bar.style.background = L[2]; pt.textContent = L[0]; // fill the bar, colour it and show the message
    }); // end of input

    var cmp = $('#uiCmp'); // the before/after box
    $('#uiCmpRange').addEventListener('input', function (e) { cmp.style.setProperty('--p', e.target.value + '%'); }); // the slider sets how much of the unstyled card shows

    var dlg = $('#uiDialog'); // the dialog element
    $('#uiOpen').addEventListener('click', function () { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }); // open it (with a fallback for old browsers)
    $('#uiClose').addEventListener('click', function () { dlg.close(); }); // the Close button closes it
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); }); // clicking the dark backdrop closes it
  } // end of uiKit

  /* ---------- Snake playground ---------- */
  function snakeGame() { // the playable Snake game that collects skill tiles
    var cv = $('#snake'), ctx = cv.getContext('2d'); // the canvas and its drawing tool
    var overlay = $('#overlay'), title = $('#overlayTitle'), startBtn = $('#startBtn'); // the start/game-over screen and its parts
    var N = 16, CELL = cv.width / N; // the board is 16 by 16 cells; CELL is the size of one cell in pixels
    var LABELS = ['HTML', 'CSS', 'JS', 'TS', 'REACT', 'GIT', 'UX', 'BS5', 'PHP', 'SQL', 'PY', 'FIGMA']; // the twelve skill tiles to collect
    var COLORS = [null, '#2EC4A0', '#FF6B5B', '#7C5CFF']; // tile colours (null means "use the accent colour")
    var snake, dir, queue, tile, score, found, running = false, timer = null, speed, best = 0; // game state: snake body, direction, queued turns, current tile, score, collected set, running flag, timer, speed, best score
    try { best = +localStorage.getItem('gp-snake-best') || 0; } catch (e) { /* storage may be blocked */ } // load the saved best score
    $('#best').textContent = best; // show the best score

    function placeTile() { // puts a new skill tile on a free cell
      var spot; // the chosen cell
      do { spot = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) }; } // pick a random cell...
      while (snake.some(function (s) { return s.x === spot.x && s.y === spot.y; })); // ...and repeat if the snake is on it
      var remaining = LABELS.filter(function (l) { return !found.has(l); }); // the skills not collected yet
      var pool = remaining.length ? remaining : LABELS; // choose from the missing ones first, or from all when finished
      spot.label = pool[Math.floor(Math.random() * pool.length)]; // pick a random label
      spot.ci = Math.floor(Math.random() * COLORS.length); // pick a random colour
      tile = spot; // remember the tile
    } // end of placeTile
    function reset() { // prepares a fresh game
      snake = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }]; // a three-cell snake in the middle
      dir = { x: 1, y: 0 }; queue = []; score = 0; found = new Set(); speed = 150; // moving right, no queued turns, score 0, nothing collected, 150 ms per step
      $('#score').textContent = 0; $('#found').textContent = 0; // reset the on-screen numbers
      $('#collected').innerHTML = ''; $('#unlock').hidden = true; // clear the collected list and hide the unlock message
      placeTile(); draw(); // place the first tile and paint the board
    } // end of reset
    function setDir(name) { // queues a turn (up, down, left or right)
      var map = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }; // direction vectors
      var d = map[name], last = queue.length ? queue[queue.length - 1] : dir; // the requested direction and the one it follows
      if (d.x === -last.x && d.y === -last.y) return; // ignore a 180-degree turn (it would hit the snake's own neck)
      if (queue.length < 3) queue.push(d); // remember at most three queued turns
    } // end of setDir
    function tick() { // moves the snake one step
      if (queue.length) dir = queue.shift(); // use the next queued turn if there is one
      var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y }; // where the head will be
      var hitWall = head.x < 0 || head.y < 0 || head.x >= N || head.y >= N; // did it leave the board?
      var hitSelf = snake.some(function (s) { return s.x === head.x && s.y === head.y; }); // did it run into itself?
      if (hitWall || hitSelf) return gameOver(); // end the game on a crash
      snake.unshift(head); // add the new head
      if (head.x === tile.x && head.y === tile.y) { // the snake reached the tile
        score += 10; $('#score').textContent = score; // add points
        if (!found.has(tile.label)) { // a new skill
          found.add(tile.label); // remember it
          var li = document.createElement('li'); li.textContent = tile.label; // create a badge for it
          $('#collected').appendChild(li); $('#found').textContent = found.size; // show the badge and the count
        } // end of if
        if (found.size === LABELS.length) $('#unlock').hidden = false; // all twelve collected: reveal the message
        speed = Math.max(80, speed - 3); placeTile(); // speed up a little and place the next tile
      } else { snake.pop(); } // no tile: remove the tail so the snake keeps its length
      draw(); timer = setTimeout(tick, speed); // repaint and schedule the next step
    } // end of tick
    function roundRect(x, y, w, h, r) { // draws a rounded rectangle path
      ctx.beginPath(); ctx.moveTo(x + r, y); // start at the top edge after the corner
      ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); // top-right and bottom-right corners
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); // bottom-left and top-left corners, then close
    } // end of roundRect
    function draw() { // paints the whole board
      ctx.fillStyle = '#2B2760'; ctx.fillRect(0, 0, cv.width, cv.height); // fill the background
      ctx.fillStyle = 'rgba(246,243,255,.08)'; // very faint colour for the grid dots
      for (var gx = 0; gx < N; gx++) for (var gy = 0; gy < N; gy++) { // for every cell
        ctx.beginPath(); ctx.arc(gx * CELL + CELL / 2, gy * CELL + CELL / 2, 2, 0, 6.283); ctx.fill(); // draw a small dot in its centre
      } // end of grid loop
      roundRect(tile.x * CELL + 2, tile.y * CELL + 2, CELL - 4, CELL - 4, 8); // outline of the skill tile
      ctx.fillStyle = COLORS[tile.ci] || accent; ctx.fill(); // fill it with its colour (or the accent)
      ctx.fillStyle = '#1E1B3F'; ctx.font = '700 ' + (tile.label.length > 3 ? 10 : 12) + 'px "Poppins", sans-serif'; // dark text, smaller for long labels
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; // centre the label
      ctx.fillText(tile.label, tile.x * CELL + CELL / 2, tile.y * CELL + CELL / 2 + 1); // write the label on the tile
      snake.forEach(function (s, i) { // draw every snake segment
        roundRect(s.x * CELL + 2, s.y * CELL + 2, CELL - 4, CELL - 4, i === 0 ? 10 : 7); // rounder head, slightly less round body
        ctx.fillStyle = i === 0 ? '#FF6B5B' : (i % 2 ? accent : '#F6F3FF'); ctx.fill(); // coral head, striped body
      }); // end of segment loop
    } // end of draw
    function start() { reset(); running = true; overlay.classList.add('hide'); clearTimeout(timer); timer = setTimeout(tick, speed); } // begins a new game
    function stop() { running = false; clearTimeout(timer); } // pauses the game loop
    function gameOver() { // runs when the snake crashes
      stop(); // stop moving
      if (score > best) { best = score; $('#best').textContent = best; try { localStorage.setItem('gp-snake-best', best); } catch (e) { /* ignore */ } } // save a new best score
      title.textContent = found.size === LABELS.length ? 'All skills collected!' : 'Game over. Score ' + score; // message depends on the result
      startBtn.textContent = 'Play again'; overlay.classList.remove('hide'); // show the overlay again
    } // end of gameOver
    startBtn.addEventListener('click', start); // the Start button begins the game
    document.addEventListener('keydown', function (e) { // keyboard controls
      var keys = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' }; // arrow keys and WASD
      if (!running || !keys[e.key]) return; // ignore other keys, or any key while the game is not running
      if (/^(input|textarea|select)$/i.test(e.target.tagName)) return; // never steal keys while the visitor is typing in a form field
      e.preventDefault(); setDir(keys[e.key]); // stop the page from scrolling and queue the turn
    }); // end of keydown
    var board = $('.board-wrap'), ax = 0, ay = 0, touching = false, STEP = 16; // the board, the swipe start point, a touch flag and the minimum swipe distance (px)
    board.addEventListener('touchstart', function (e) { // a finger touches the board
      var t = e.touches[0]; ax = t.clientX; ay = t.clientY; touching = true; // remember where the swipe started
    }, { passive: true }); // passive = we never block scrolling here
    board.addEventListener('touchmove', function (e) { // the finger moves
      if (!touching) return; // ignore moves that did not start on the board
      if (running) e.preventDefault(); // while playing, stop the page from scrolling
      var t = e.touches[0], dx = t.clientX - ax, dy = t.clientY - ay; // how far the finger moved
      if (!running || Math.max(Math.abs(dx), Math.abs(dy)) < STEP) return; // ignore tiny movements and swipes when not playing
      setDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')); // turn in the direction of the bigger movement
      ax = t.clientX; ay = t.clientY; // restart measuring so swipes can be chained
    }, { passive: false }); // not passive: we need preventDefault above
    board.addEventListener('touchend', function () { touching = false; }, { passive: true }); // the finger lifted
    board.addEventListener('touchcancel', function () { touching = false; }, { passive: true }); // the touch was interrupted
    new IntersectionObserver(function (en) { // pause when the board scrolls out of view
      if (!en[0].isIntersecting && running) { stop(); title.textContent = 'Paused'; startBtn.textContent = 'Restart'; overlay.classList.remove('hide'); } // stop and show a Restart button
    }, { threshold: .1 }).observe(cv); // trigger when less than 10% is visible
    document.addEventListener('accentchange', function () { if (!running) draw(); }); // repaint with the new accent colour when idle
    reset(); // prepare the first game
  } // end of snakeGame

  /* ---------- Timeline fill ---------- */
  function timeline() { // fills the line beside the timeline as you scroll
    var tl = $('#timeline'); // the timeline list
    function update() { // recalculates how much of the line is filled
      var r = tl.getBoundingClientRect(); // its position on screen
      tl.style.setProperty('--fill', Math.max(0, Math.min(1, (innerHeight * .6 - r.top) / r.height))); // fraction of the list that has passed 60% of the screen height
    } // end of update
    window.addEventListener('scroll', update, { passive: true }); // update while scrolling
    window.addEventListener('resize', update); // and when the window changes size
    update(); // run once at the start
  } // end of timeline

  /* ---------- Contact ---------- */
  function contact() { // the copy-email button and the message form
    var copyBtn = $('#copyEmail'), state = $('#copyState'); // the copy button and its small label
    copyBtn.addEventListener('click', function () { // when the button is clicked
      var email = copyBtn.dataset.email; // the address to copy
      function done(msg) { state.textContent = msg; setTimeout(function () { state.textContent = 'Copy'; }, 1800); } // shows a message, then goes back to "Copy"
      if (navigator.clipboard && navigator.clipboard.writeText) { // modern browsers
        navigator.clipboard.writeText(email).then(function () { done('Copied'); }, function () { done('Press Ctrl+C'); }); // copy, then report success or failure
      } else { // older browsers
        var t = document.createElement('textarea'); t.value = email; document.body.appendChild(t); t.select(); // use a hidden text box to select the address
        try { document.execCommand('copy'); done('Copied'); } catch (e) { done('Press Ctrl+C'); } // try the old copy command
        t.remove(); // clean up the hidden box
      } // end of if
    }); // end of click
    var EMAILJS = { publicKey: 'hjDYho1Zz-aNreUSw', service: 'service_9fwxm5x', template: 'template_5uucrae' }; // your EmailJS account details (the public key is designed to be visible in the browser)
    var form = $('#contactForm'), note = $('#formNote'), sendBtn = $('button[type="submit"]', form); // the form, the status message area and the send button
    var ready = false; // becomes true once EmailJS has started
    function startEmailJS() { try { if (window.emailjs) { emailjs.init({ publicKey: EMAILJS.publicKey }); ready = true; } } catch (err) { ready = false; } return ready; } // start EmailJS when its script has loaded
    startEmailJS(); // try once now
    function say(kind, text) { note.className = 'form-note ' + kind; note.textContent = text; } // shows a status message in the matching colour
    form.addEventListener('submit', function (e) { // when the form is sent
      e.preventDefault(); // stop the page from reloading
      var name = form.elements['name'].value.trim(), email = form.elements['email'].value.trim(), message = form.elements['message'].value.trim(); // what the visitor typed
      if (form.elements['website'].value) return; // a robot filled the hidden trap field, so ignore it
      if (!ready && !startEmailJS()) { // EmailJS did not load (offline or blocked), so fall back to the visitor's email app
        window.location.href = 'mailto:gurwinderanusurja@gmail.com?subject=' + encodeURIComponent('Portfolio message from ' + name) + '&body=' + encodeURIComponent(message + '\n\nFrom: ' + name + ' (' + email + ')'); // open a ready-made email
        say('busy', 'Opening your email app. If nothing opens, copy my email address above.'); // explain what is happening
        return; // stop here
      } // end of fallback
      var params = { // the values sent to your EmailJS template, under every common variable name
        name: name, from_name: name, user_name: name, // the sender's name
        email: email, from_email: email, user_email: email, reply_to: email, // the sender's email
        message: message, user_message: message, // the message text
        subject: 'Portfolio message from ' + name, title: 'Portfolio message from ' + name, // a subject line
        time: new Date().toLocaleString() // when it was sent
      }; // end of params
      sendBtn.disabled = true; sendBtn.textContent = 'Sending...'; // stop double clicks and show progress
      say('busy', 'Sending your message...'); // tell the visitor it is in progress
      emailjs.send(EMAILJS.service, EMAILJS.template, params).then(function () { // send it through EmailJS
        say('ok', 'Message sent. Thank you, I will reply to ' + email + ' soon.'); // success message
        form.reset(); // clear the form
      }, function (err) { // if EmailJS reports a problem
        console.error('EmailJS error:', err); // keep the details in the browser console for debugging
        var code = err && err.status, why; // the HTTP status code that EmailJS sent back
        if (/^(file|content):$/.test(location.protocol)) why = 'You opened the page from a file on your device. Open the published site instead.'; // local files have no real web address, so EmailJS can refuse them
        else if (code === 0 || code === undefined) why = 'Network problem. Check your internet connection or ad blocker.'; // no answer from EmailJS
        else if (code === 400) why = 'EmailJS rejected the keys or IDs (' + ((err && err.text) || 'bad request') + ').'; // wrong public key, service ID or template ID
        else if (code === 403) why = 'EmailJS does not allow this website address. Add it under Account > Security.'; // domain restriction
        else if (code === 412) why = 'The Gmail connection in EmailJS has expired. Reconnect it under Email Services.'; // Gmail login expired
        else if (code === 422) why = 'The EmailJS template has no recipient. Fill in "To Email" in the template.'; // template misconfigured
        else if (code === 429) why = 'Too many messages were sent. Please wait a little and try again.'; // rate limit
        else why = 'EmailJS error ' + code + ': ' + ((err && err.text) || 'unknown'); // anything else
        note.className = 'form-note err'; note.textContent = 'The message could not be sent. ' + why + ' You can also email me at '; // the visible message
        var a = document.createElement('a'); a.href = 'mailto:gurwinderanusurja@gmail.com?subject=' + encodeURIComponent('Portfolio message from ' + name) + '&body=' + encodeURIComponent(message + '\n\nFrom: ' + name + ' (' + email + ')'); a.textContent = 'gurwinderanusurja@gmail.com'; // a link that opens a ready-made email with what was typed
        note.appendChild(a); note.appendChild(document.createTextNode('.')); // add the link and a full stop
      }).then(function () { // runs after success or failure
        sendBtn.disabled = false; sendBtn.textContent = 'Send message'; // make the button usable again
      }); // end of the promise chain
    }); // end of submit
  } // end of contact

  /* ---------- Signature at the end of the page ---------- */
  function signature() { // draws the signature when the visitor reaches the bottom
    var sig = $('#sig'); // the signature element
    if (!sig) return; // nothing to do if it is missing
    if (reduceMotion || !('IntersectionObserver' in window)) { sig.classList.add('in'); return; } // show it immediately when motion is reduced
    var io = new IntersectionObserver(function (en) { // watch it
      if (en[0].isIntersecting) { sig.classList.add('in'); io.disconnect(); } // start the drawing animation once it is visible
    }, { threshold: .5 }); // when half of it is on screen
    io.observe(sig); // start watching
  } // end of signature

  /* ---------- Focus mode: only the section you are reading stays sharp ----------
     Performance: only sections that are on screen get the blur (never the whole page),
     and it switches off automatically if the device scrolls slowly. */
  var focusOn = true; // whether focus mode is switched on
  function focusMode() { // softens the sections next to the one being read
    var btn = $('#focusToggle'), root = document.documentElement; // the toggle button and the <html> element
    var secs = $$('main > section[id]'), visible = [], active = null; // all sections, the ones currently on screen, and the one being read
    var saved = 'on'; // default setting
    try { saved = localStorage.getItem('gp-focus') || 'on'; } catch (e) { /* storage may be blocked */ } // load the saved setting
    focusOn = saved !== 'off' && !reduceMotion; // on unless the visitor switched it off or prefers less motion

    function apply() { // updates the classes on every section
      var atTop = window.scrollY < 80; // are we at the very top of the page?
      var current = atTop ? secs[0] : active; // at the top the first section counts as the one being read
      root.classList.toggle('focus-on', focusOn); // tell the CSS whether the effect is on
      btn.setAttribute('aria-pressed', focusOn); // keep the button state accurate
      secs.forEach(function (s) { // for each section
        s.classList.toggle('is-focus', s === current); // mark the one being read
        s.classList.toggle('is-soft', focusOn && !atTop && s !== current && visible.indexOf(s) !== -1); // soften the others, but only the ones on screen and never at the top
      }); // end of loop
    } // end of apply
    var seen = new IntersectionObserver(function (es) { // tracks which sections are on screen
      es.forEach(function (e) { // for each change
        var i = visible.indexOf(e.target); // is it already in the list?
        if (e.isIntersecting && i === -1) visible.push(e.target); // add it when it appears
        if (!e.isIntersecting && i !== -1) visible.splice(i, 1); // remove it when it leaves
      }); // end of loop
      apply(); // refresh the classes
    }); // end of observer
    var center = new IntersectionObserver(function (es) { // finds the section on the "reading line"
      es.forEach(function (e) { if (e.isIntersecting) active = e.target; }); // the section crossing the line is the one being read
      apply(); // refresh the classes
    }, { rootMargin: '-42% 0px -58% 0px' }); // the reading line sits a little above the middle of the screen
    secs.forEach(function (s) { seen.observe(s); center.observe(s); }); // watch every section with both observers

    var wasTop = true, tick = false; // remember if we were at the top, and limit work per frame
    window.addEventListener('scroll', function () { // while scrolling
      if (tick) return; tick = true; // do at most one check per frame
      requestAnimationFrame(function () { // on the next frame
        tick = false; // allow the next check
        var top = window.scrollY < 80; // are we at the top now?
        if (top !== wasTop) { wasTop = top; apply(); } // refresh only when we cross the top boundary
      }); // end of frame callback
    }, { passive: true }); // passive so scrolling is never blocked

    btn.addEventListener('click', function () { // the toggle button
      focusOn = !focusOn; // flip the setting
      try { localStorage.setItem('gp-focus', focusOn ? 'on' : 'off'); } catch (e) { /* ignore */ } // remember it
      apply(); // apply it now
    }); // end of click
    document.addEventListener('litemode', function () { focusOn = false; apply(); }); // lite mode switches the effect off
    apply(); // set the correct classes at the start
  } // end of focusMode

  /* ---------- Performance guard: switches to "lite" mode if scrolling is choppy ---------- */
  function perfGuard() { // watches frame times while the visitor scrolls
    if (reduceMotion) return; // not needed when motion is already reduced
    var last = 0, lastScroll = 0, frames = 0, slow = 0, running = false, started = 0, done = false; // timing counters and flags
    function sample(ts) { // runs every frame while sampling
      if (done) return; // stop once a decision was made
      if (ts - lastScroll < 160 && last) { // only count frames that happen while scrolling
        frames++; // one more sampled frame
        if (ts - last > 45) slow++; // a frame slower than 45 ms counts as slow
      } // end of if
      last = ts; // remember this frame's time
      if (frames >= 70) { // enough frames collected
        done = true; // decide only once
        if (slow / frames > .3) { // more than 30% of frames were slow
          document.documentElement.classList.add('lite'); // switch on lite mode in the CSS
          document.dispatchEvent(new CustomEvent('litemode')); // tell the other parts of the script
        } // end of if
        return; // finished
      } // end of if
      if (ts - started > 12000) { done = true; return; } // give up after 12 seconds
      requestAnimationFrame(sample); // check the next frame
    } // end of sample
    window.addEventListener('scroll', function () { // when scrolling begins
      lastScroll = performance.now(); // note the time
      if (!running) { running = true; started = lastScroll; requestAnimationFrame(sample); } // start sampling once
    }, { passive: true }); // passive so scrolling is never blocked
  } // end of perfGuard

  /* ---------- Pause animations that are off screen ---------- */
  function pauseOffscreen() { // stops CSS animations in sections the visitor cannot see
    var io = new IntersectionObserver(function (es) { // watches sections and project cards
      es.forEach(function (e) { e.target.classList.toggle('is-off', !e.isIntersecting); }); // mark the ones that are off screen
    }, { rootMargin: '120px 0px' }); // treat things just outside the screen as visible so they are already running when they arrive
    $$('main > section, .chapter').forEach(function (el) { io.observe(el); }); // watch every section and project card
  } // end of pauseOffscreen

  /* ---------- Headings reveal word by word ---------- */
  function splitHeadings() { // splits big headings into words that slide up one after another
    var io = new IntersectionObserver(function (es) { // watches the headings
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); // start the reveal once, when visible
    }, { threshold: .3 }); // when 30% of the heading is visible
    $$('.h2, .statement, .contact-title').forEach(function (el) { // each large heading
      var words = el.textContent.trim().split(/\s+/); // split its text into words
      el.textContent = ''; // empty the heading
      el.removeAttribute('data-reveal'); // this heading uses its own reveal instead of the generic one
      el.classList.add('rv-h'); // class that the CSS uses for the word animation
      words.forEach(function (w, i) { // rebuild it word by word
        var outer = document.createElement('span'), inner = document.createElement('span'); // an outer clip box and an inner moving word
        outer.className = 'w'; inner.textContent = w; inner.style.setProperty('--wi', i); // set the word and its delay order
        outer.appendChild(inner); el.appendChild(outer); // put the word into the heading
        if (i < words.length - 1) el.appendChild(document.createTextNode(' ')); // add a space between words
      }); // end of word loop
      io.observe(el); // start watching this heading
    }); // end of heading loop
  } // end of splitHeadings

  /* ---------- Gentle scroll effects: hero parallax and marquee skew (transform only) ---------- */
  function scrollFX() { // small effects tied to scrolling
    if (reduceMotion) return; // skip for reduced motion
    var portrait = $('.portrait'), copy = $('.hero-copy'), marquee = $('.marquee'); // the hero photo, the hero text and the scrolling strip
    var lastY = scrollY, skew = 0, ticking = false, heroOn = true, mqOn = false, lite = false; // last scroll position, current skew, frame flag, visibility flags and lite flag
    new IntersectionObserver(function (en) { heroOn = en[0].isIntersecting; }).observe($('#home')); // track whether the hero is on screen
    new IntersectionObserver(function (en) { mqOn = en[0].isIntersecting; }).observe(marquee); // track whether the strip is on screen
    document.addEventListener('litemode', function () { // lite mode removes these effects
      lite = true; portrait.style.transform = ''; copy.style.transform = ''; marquee.style.setProperty('--skew', '0deg'); // reset everything to flat
    }); // end of litemode handler
    function frame() { // runs once per animation frame while scrolling
      var y = scrollY, vel = y - lastY; lastY = y; // current position and how far we moved since the last frame
      if (lite) { ticking = false; return; } // do nothing in lite mode
      if (heroOn) { // only move the hero while it is visible
        portrait.style.transform = 'translate3d(0,' + (y * .07).toFixed(1) + 'px,0)'; // the photo drifts down slowly
        copy.style.transform = 'translate3d(0,' + (-y * .04).toFixed(1) + 'px,0)'; // the text drifts up slightly
      } // end of if
      if (mqOn) { // only lean the strip while it is visible
        var target = Math.max(-4, Math.min(4, vel * .25)); // lean angle follows scroll speed, limited to 4 degrees
        skew += (target - skew) * .2; // ease towards that angle
        marquee.style.setProperty('--skew', skew.toFixed(2) + 'deg'); // apply it through a CSS variable
      } // end of if
      if (Math.abs(vel) > .2 || Math.abs(skew) > .05) requestAnimationFrame(frame); else ticking = false; // keep running while things are still moving, then sleep
    } // end of frame
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true }); // wake the loop when the visitor scrolls
  } // end of scrollFX

  /* ---------- Button ripple ---------- */
  function ripples() { // adds a ripple circle where a button is pressed
    if (reduceMotion) return; // skip for reduced motion
    document.addEventListener('pointerdown', function (e) { // listen for presses anywhere
      var b = e.target.closest('.btn'); // was it on a button?
      if (!b) return; // no, ignore
      var r = b.getBoundingClientRect(), s = document.createElement('span'), d = Math.max(r.width, r.height) * 1.6; // button size, the ripple element, and the ripple diameter
      s.className = 'ripple'; // CSS class that animates the circle
      s.style.cssText = 'width:' + d + 'px;height:' + d + 'px;left:' + (e.clientX - r.left - d / 2) + 'px;top:' + (e.clientY - r.top - d / 2) + 'px'; // size it and centre it on the press point
      b.appendChild(s); // add it to the button
      s.addEventListener('animationend', function () { s.remove(); }); // remove it when its animation ends
    }); // end of pointerdown
  } // end of ripples

  /* ---------- Start everything once the page has loaded ---------- */
  document.addEventListener('DOMContentLoaded', function () { // wait until the HTML is ready
    splitLetters(); // split the big name into letters
    runLoader(); // start the loading screen
    roleTyper(); // start the typing line
    heroCanvas(); // start the particle background
    accentPicker(); // make the colour picker work
    themeToggle(); // make the light and dark switch work
    cursor(); // start the cursor ring
    scrollUI(); // progress bar, nav and mobile menu
    magnetic(); // magnetic buttons
    tabs('.switch-tabs'); // the About tabs
    panels(); // the service panels
    skills(); // the skill tabs and cards
    process(); // the build-steps card
    projects(); // the featured project sections
    allRepos(); // the animated list of every repository
    lab(); // the CSS lab tools
    uiKit(); // the component shelf
    snakeGame(); // the Snake game
    timeline(); // the timeline line
    contact(); // copy-email and the form
    signature(); // the animated signature
    splitHeadings(); // word-by-word headings
    reveals(); // scroll reveals and counters
    focusMode(); // soften neighbouring sections
    pauseOffscreen(); // pause off-screen animations
    scrollFX(); // parallax and marquee lean
    ripples(); // button ripples
    perfGuard(); // switch to lite mode if scrolling is choppy
  }); // end of DOMContentLoaded handler
})(); // end of the wrapper function, which runs immediately
