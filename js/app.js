/* LedgeRays Systems — site behaviour
   tabs · theme · interactive dashboard (Chart.js) · portfolio · contact form */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var hasBS = function () { return typeof window.bootstrap !== 'undefined'; };
  var hasChart = function () { return typeof window.Chart !== 'undefined'; };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  $('#yr').textContent = new Date().getFullYear();

  /* =========================================================
     Tabs / single-page navigation
     ========================================================= */
  var TABS = ['dashboard', 'build', 'samples', 'features', 'process', 'packages', 'faq', 'contact'];
  var currentTab = null;

  function go(id, push) {
    if (TABS.indexOf(id) < 0) id = 'dashboard';
    var pane = document.getElementById('tab-' + id);
    $$('.content > .tab-pane').forEach(function (p) {
      if (p === pane) { p.classList.add('active'); requestAnimationFrame(function () { p.classList.add('show'); }); }
      else p.classList.remove('active', 'show');
    });
    $$('.side-nav [data-go], .bottom-nav [data-go]').forEach(function (a) {
      var on = a.getAttribute('data-go') === id;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    $('#pageTitle').textContent = pane.getAttribute('data-title');
    $('#pageSub').textContent = pane.getAttribute('data-sub');
    document.title = id === 'dashboard' ? 'LedgeRays Systems | Custom Business Systems for Any Industry' : pane.getAttribute('data-title') + ' | LedgeRays Systems';
    if (push !== false && location.hash !== '#' + id) history.pushState(null, '', '#' + id);

    var side = document.getElementById('sidebar');
    if (hasBS() && side.classList.contains('show')) bootstrap.Offcanvas.getOrCreateInstance(side).hide();
    window.scrollTo(0, 0);

    if (id === 'dashboard' && currentTab && currentTab !== 'dashboard') replayDashboard();
    currentTab = id;
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-go]');
    if (!a) return;
    e.preventDefault();
    go(a.getAttribute('data-go'));
  });
  window.addEventListener('popstate', function () { go(location.hash.replace('#', ''), false); });

  /* =========================================================
     Theme (top bar button + sidebar switch stay in sync)
     ========================================================= */
  if (!store.get('lr-theme') && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) {
    root.setAttribute('data-bs-theme', 'dark');
  }
  function syncSwitch() { $('#themeSwitch').setAttribute('aria-checked', root.getAttribute('data-bs-theme') === 'dark' ? 'true' : 'false'); }
  function toggleTheme() {
    var next = root.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-bs-theme', next);
    store.set('lr-theme', next);
    syncSwitch();
    recolorCharts();
  }
  $('#themeToggle').addEventListener('click', toggleTheme);
  $('#themeSwitch').addEventListener('click', toggleTheme);
  syncSwitch();

  /* =========================================================
     Animated number counters
     ========================================================= */
  function fmt(n, el) {
    return (el.getAttribute('data-prefix') || '') + Math.round(n).toLocaleString('en-US') + (el.getAttribute('data-suffix') || '');
  }
  function countUp(el, to, from, ms) {
    if (reduce) { el.textContent = fmt(to, el); return; }
    var t0 = null; from = from || 0; ms = ms || 1500;
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / ms, 1), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(from + (to - from) * e, el);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function runCounters() { $$('#tab-dashboard .count').forEach(function (el) { countUp(el, +el.getAttribute('data-to')); }); }

  /* =========================================================
     Dashboard data (sample only)
     ========================================================= */
  var months = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
  var sales = [820, 910, 760, 880, 940, 1010, 980, 1060, 1120, 1090, 1180, 1284.5];
  var target = [850, 900, 850, 900, 950, 1000, 1000, 1050, 1100, 1100, 1150, 1200];
  var cats = { labels: ['Products', 'Services', 'Rentals', 'Others'], data: [42, 31, 17, 10] };
  var days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var weeks = [[412, 468, 455, 520, 584, 610, 433], [380, 421, 446, 470, 512, 560, 401]];
  var range = 6, week = 0;
  var lineChart, donutChart, barChart;

  function cssVar(v) { return getComputedStyle(root).getPropertyValue(v).trim(); }
  function palette() {
    var dark = root.getAttribute('data-bs-theme') === 'dark';
    return {
      text: cssVar('--muted') || '#5D7568', grid: dark ? 'rgba(255,255,255,.07)' : 'rgba(11,61,46,.08)',
      brand: '#16A34A', lime: '#A3E635', deep: dark ? '#4ADE80' : '#0B3D2E', soft: dark ? '#2F6B52' : '#BFE3CC',
      card: cssVar('--card') || '#fff'
    };
  }
  var tooltip = { backgroundColor: '#0B3D2E', titleColor: '#A3E635', padding: 10, cornerRadius: 10, displayColors: true, boxPadding: 4 };

  function buildCharts() {
    if (!hasChart()) return;
    var c = palette();
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.font.size = 12;
    Chart.defaults.color = c.text;
    Chart.defaults.animation.duration = reduce ? 0 : 1200;
    Chart.defaults.animation.easing = 'easeOutQuart';

    // Line: sales vs target
    var lctx = $('#lineChart').getContext('2d');
    var grad = lctx.createLinearGradient(0, 0, 0, 260);
    grad.addColorStop(0, 'rgba(22,163,74,.35)'); grad.addColorStop(1, 'rgba(22,163,74,0)');
    lineChart = new Chart(lctx, {
      type: 'line',
      data: {
        labels: months.slice(-range),
        datasets: [
          { label: 'Sales', data: sales.slice(-range), borderColor: c.brand, backgroundColor: grad, fill: true, tension: .4, borderWidth: 3, pointRadius: 3, pointHoverRadius: 7, pointBackgroundColor: c.card, pointBorderWidth: 2 },
          { label: 'Target', data: target.slice(-range), borderColor: c.lime, borderDash: [6, 5], fill: false, tension: .4, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false, layout: { padding: { left: 4, right: 6, top: 6 } }, interaction: { mode: 'index', intersect: false },
        animations: { y: { from: function (ctx) { return ctx.chart.scales.y ? ctx.chart.scales.y.getPixelForValue(0) : 0; }, duration: reduce ? 0 : 1300, easing: 'easeOutQuart' } },
        plugins: {
          legend: { display: false },
          tooltip: Object.assign({}, tooltip, { callbacks: { label: function (x) { return ' ' + x.dataset.label + ': ₱' + Math.round(x.parsed.y * 1000).toLocaleString('en-US'); } } })
        },
        scales: {
          x: { grid: { display: false }, border: { display: false } },
          y: { suggestedMin: 600, grid: { color: c.grid }, border: { display: false }, ticks: { maxTicksLimit: 5, padding: 6, callback: function (v) { return '₱' + (v / 1000).toFixed(1) + 'M'; } } }
        }
      }
    });

    // Donut: sales by category. Center text is drawn inside the hole, so it can never overlap the ring.
    donutChart = new Chart($('#donutChart'), {
      type: 'doughnut',
      data: { labels: cats.labels, datasets: [{ data: cats.data, backgroundColor: [c.brand, c.lime, c.deep, c.soft], borderColor: c.card, borderWidth: 3, hoverOffset: 6 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '70%', layout: { padding: 8 },
        animation: { animateRotate: true, animateScale: true, duration: reduce ? 0 : 1400 },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        onHover: function (e, els) {
          if (els.length) { var i = els[0].index; donutCenter = [cats.data[i] + '%', cats.labels[i]]; }
          else donutCenter = null;
          donutChart.draw();
        }
      },
      plugins: [centerTextPlugin]
    });
    buildDonutLegend();

    // Bar: records per day (this week / last week)
    barChart = new Chart($('#barChart'), {
      type: 'bar',
      data: { labels: days, datasets: [{ label: 'Records', data: weeks[week], backgroundColor: barColors(weeks[week]), borderRadius: 8, borderSkipped: false, maxBarThickness: 34 }] },
      options: {
        responsive: true, maintainAspectRatio: false, layout: { padding: { left: 4, top: 6 } },
        animation: { delay: function (ctx) { return reduce || ctx.type !== 'data' || ctx.mode !== 'default' ? 0 : ctx.dataIndex * 90; } },
        plugins: { legend: { display: false }, tooltip: Object.assign({}, tooltip, { callbacks: { label: function (x) { return ' ' + x.parsed.y.toLocaleString('en-US') + ' records'; } } }) },
        scales: { x: { grid: { display: false }, border: { display: false } }, y: { beginAtZero: true, grid: { color: c.grid }, border: { display: false }, ticks: { maxTicksLimit: 4, padding: 6 } } }
      }
    });
  }
  function barColors(arr) {
    var max = Math.max.apply(null, arr), c = palette();
    return arr.map(function (v) { return v === max ? c.lime : c.brand; });
  }
  var donutCenter = null;
  function visibleShare() {
    var t = 0;
    cats.data.forEach(function (v, i) { if (!donutChart || donutChart.getDataVisibility(i)) t += v; });
    return t;
  }
  var centerTextPlugin = {
    id: 'centerText',
    afterDraw: function (chart) {
      var meta = chart.getDatasetMeta(0);
      if (!meta.data.length) return;
      var arc = meta.data[0], r = arc.innerRadius;
      if (!r || r < 18) return;
      var x = arc.x, y = arc.y, ctx = chart.ctx, c = palette();
      var big = donutCenter ? donutCenter[0] : visibleShare() + '%';
      var small = donutCenter ? donutCenter[1] : 'of sales';
      var fam = Chart.defaults.font.family;
      var bigSize = Math.round(r * 0.46), smallSize = Math.max(10, Math.round(r * 0.2));
      ctx.save();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '800 ' + bigSize + 'px ' + fam;
      // shrink the text if it would be wider than the hole
      while (ctx.measureText(big).width > r * 1.5 && bigSize > 10) { bigSize--; ctx.font = '800 ' + bigSize + 'px ' + fam; }
      ctx.fillStyle = cssVar('--text') || '#0E2A20';
      ctx.fillText(big, x, y - smallSize * 0.55);
      ctx.font = '600 ' + smallSize + 'px ' + fam;
      while (ctx.measureText(small).width > r * 1.6 && smallSize > 8) { smallSize--; ctx.font = '600 ' + smallSize + 'px ' + fam; }
      ctx.fillStyle = c.text;
      ctx.fillText(small, x, y + bigSize * 0.55);
      ctx.restore();
    }
  };
  function buildDonutLegend() {
    var c = palette(), cols = [c.brand, c.lime, c.deep, c.soft];
    $('#donutLegend').innerHTML = cats.labels.map(function (l, i) {
      var off = donutChart && !donutChart.getDataVisibility(i);
      return '<li><button type="button" data-seg="' + i + '"' + (off ? ' class="off"' : '') + ' aria-pressed="' + (!off) + '"><i style="background:' + cols[i] + '"></i>' + l + '<b>' + cats.data[i] + '%</b></button></li>';
    }).join('');
  }
  $('#donutLegend').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || !donutChart) return;
    var i = +b.getAttribute('data-seg');
    donutChart.toggleDataVisibility(i);
    donutChart.update();
    buildDonutLegend();
  });
  $('#donutLegend').addEventListener('mouseover', function (e) {
    var b = e.target.closest('button'); if (!b || !donutChart) return;
    var i = +b.getAttribute('data-seg');
    donutCenter = [cats.data[i] + '%', cats.labels[i]]; donutChart.draw();
  });
  $('#donutLegend').addEventListener('mouseleave', function () { donutCenter = null; if (donutChart) donutChart.draw(); });
  function recolorCharts() {
    if (!lineChart) return;
    [lineChart, donutChart, barChart].forEach(function (ch) { ch.destroy(); });
    buildCharts();
  }
  function replayDashboard() {
    runCounters();
    $$('#tab-dashboard .spark path, #tab-dashboard .progress-bar.grow').forEach(function (el) {
      el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    });
    if (!lineChart) return;
    [lineChart, donutChart, barChart].forEach(function (ch) { ch.reset(); ch.update(); });
  }
  window.addEventListener('resize', function () {
    clearTimeout(window.__lrT);
    window.__lrT = setTimeout(function () { if (lineChart) { lineChart.resize(); donutChart.resize(); barChart.resize(); } }, 120);
  });

  // range & week toggles
  $$('[data-range]').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('[data-range]').forEach(function (x) { x.classList.toggle('on', x === b); });
      range = +b.getAttribute('data-range');
      if (!lineChart) return;
      lineChart.data.labels = months.slice(-range);
      lineChart.data.datasets[0].data = sales.slice(-range);
      lineChart.data.datasets[1].data = target.slice(-range);
      lineChart.update();
    });
  });
  $$('[data-week]').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('[data-week]').forEach(function (x) { x.classList.toggle('on', x === b); });
      week = +b.getAttribute('data-week');
      if (!barChart) return;
      barChart.data.datasets[0].data = weeks[week];
      barChart.data.datasets[0].backgroundColor = barColors(weeks[week]);
      barChart.update();
    });
  });

  /* ---------- Monthly goals ---------- */
  var GOALS = [['Sales target', 92, '#16A34A'], ['New clients', 76, '#84CC16'], ['Orders completed', 64, '#0EA5E9'], ['Customer rating', 96, '#A3E635']];
  $('#goals').innerHTML = GOALS.map(function (g) {
    return '<div class="goal"><div class="gt"><span>' + g[0] + '</span><b class="count" data-to="' + g[1] + '" data-suffix="%">0%</b></div>' +
      '<div class="progress" role="progressbar" aria-label="' + g[0] + '" aria-valuenow="' + g[1] + '" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar grow" style="--w:' + g[1] + '%;--c:' + g[2] + '"></div></div></div>';
  }).join('');

  /* ---------- Today's tasks (tick them off) ---------- */
  var TASKS = [['Follow up new inquiries', 'Today', 0, 1], ['Approve purchase order', 'Urgent', 1, 0], ['Review weekly report', '3 PM', 0, 0], ['Update stock count', '4 PM', 0, 0], ['Send client updates', '5 PM', 0, 0]];
  $('#tasks').innerHTML = TASKS.map(function (t, i) {
    return '<label class="task form-check"><input class="form-check-input" type="checkbox"' + (t[3] ? ' checked' : '') + ' data-t="' + i + '"><span>' + t[0] + '</span><em' + (t[2] ? ' class="hi"' : '') + '>' + t[1] + '</em></label>';
  }).join('');
  function taskCount() {
    var all = $$('#tasks input'), done = all.filter(function (x) { return x.checked; }).length;
    $('#taskCount').textContent = done + ' of ' + all.length + ' done';
  }
  $('#tasks').addEventListener('change', taskCount);
  taskCount();

  /* ---------- Tasks / Goals switch ---------- */
  $$('[data-tg]').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-tg');
      $$('[data-tg]').forEach(function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); });
      $('#tgTasks').classList.toggle('on', k === 'tasks');
      $('#tgGoals').classList.toggle('on', k === 'goals');
      $('#tgTitle').textContent = k === 'tasks' ? "Today's Tasks" : 'Monthly Goals';
      if (k === 'goals') {
        $$('#goals .progress-bar.grow').forEach(function (el) { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; });
        $$('#goals .count').forEach(function (el) { countUp(el, +el.getAttribute('data-to'), 0, 900); });
      }
    });
  });

  /* ---------- Live activity feed ---------- */
  var EVENTS = [
    ['New client added', 'Emily Carter', '#i-users', '#16A34A'],
    ['Order recorded', 'Order #2048 · 12 items', '#i-receipt', '#0EA5E9'],
    ['Job completed', 'Job #1187 marked done', '#i-check', '#84CC16'],
    ['Stock updated', '120 items restocked', '#i-box', '#0B3D2E'],
    ['Booking confirmed', 'Nov 14 · 150 guests', '#i-cal', '#16A34A'],
    ['Report generated', 'October sales summary', '#i-chart', '#0EA5E9'],
    ['Invoice sent', 'Invoice #INV-3391', '#i-mail', '#84CC16'],
    ['New project started', 'Warehouse extension', '#i-clip', '#0B3D2E'],
    ['Client updated', 'Michael Brown · new address', '#i-users', '#16A34A']
  ];
  var feed = $('#feed'), ev = 0, secs = [8, 25, 47, 72];
  function feedItem(e, t, isNew) {
    var li = document.createElement('li');
    if (isNew) li.className = 'new';
    li.innerHTML = '<span class="f-ic" style="background:' + e[3] + '"><svg class="ic"><use href="' + e[2] + '"/></svg></span><span class="f-tx"><b>' + e[0] + '</b><span class="t">' + e[1] + '</span></span><span class="t when">' + t + '</span>';
    return li;
  }
  for (var k = 0; k < 4; k++) feed.appendChild(feedItem(EVENTS[k], secs[k] + 's ago'));
  ev = 4;
  function pushEvent() {
    var li = feedItem(EVENTS[ev % EVENTS.length], 'just now', true);
    ev++;
    feed.insertBefore(li, feed.firstChild);
    $$('li', feed).forEach(function (x, i) {
      if (i > 0) { x.classList.remove('new'); var w = $('.when', x); if (w) w.textContent = i === 1 ? '5s ago' : (i * 18) + 's ago'; }
    });
    while (feed.children.length > 6) feed.removeChild(feed.lastChild);
  }

  // real-time ticker: records counter, latest sales point, activity feed
  var rec = $('#liveRecords'), tick = 0;
  setInterval(function () {
    if (document.hidden || currentTab !== 'dashboard') return;
    tick++;
    var cur = +rec.getAttribute('data-to'), add = 1 + Math.floor(Math.random() * 4);
    rec.setAttribute('data-to', cur + add);
    countUp(rec, cur + add, cur, 700);
    if (lineChart) {
      sales[sales.length - 1] = Math.round((sales[sales.length - 1] + Math.random() * 1.6) * 10) / 10;
      lineChart.data.datasets[0].data = sales.slice(-range);
      lineChart.update('none');
    }
    if (barChart && week === 0) {
      weeks[0][4] += add;
      barChart.data.datasets[0].data = weeks[0];
      barChart.update('none');
    }
    if (tick % 2 === 0) pushEvent();
  }, 3000);

  /* =========================================================
     Portfolio (8 sample designs)
     ========================================================= */
  var P = [
    { f: '01-lending', t: 'Sterling Peak Lending', i: 'Lending & Financing', c: 'finance', d: '#C9A24B' },
    { f: '02-vehicles', t: 'Torque Point Moto Works', i: 'Vehicles & Motorcycles', c: 'services', d: '#FF5A1F' },
    { f: '03-rentals', t: 'Palmcrest Residences', i: 'Rentals & Property', c: 'property', d: '#0F766E' },
    { f: '04-education', t: 'Tamarind Grove Academy', i: 'Education & Training', c: 'education', d: '#2547D0' },
    { f: '05-contractors', t: 'Ironframe Builders', i: 'Contractors & Projects', c: 'property', d: '#F59E0B' },
    { f: '06-wholesale', t: 'Harvest Field Agri Supply', i: 'Wholesale & Distribution', c: 'trade', d: '#4F6228' },
    { f: '07-bookings', t: 'Coralbay Events & Catering', i: 'Events & Bookings', c: 'services', d: '#FF6F61' },
    { f: '08-organizations', t: 'Harborlight Community Church', i: 'Organizations', c: 'education', d: '#5B2A4A' }
  ];
  var FILTERS = [['all', 'All'], ['finance', 'Finance'], ['services', 'Services'], ['property', 'Property & Projects'], ['trade', 'Trade'], ['education', 'Schools & Orgs']];
  var grid = $('#portfolio');
  grid.innerHTML = P.map(function (p, n) {
    return '<button type="button" class="card-x pf" data-i="' + n + '" data-c="' + p.c + '" aria-label="Open ' + p.t + ' sample design">' +
      '<span class="pf-img"><img src="assets/img/portfolio/' + p.f + '-thumb.webp" alt="' + p.t + ' sample system design" loading="lazy" width="800" height="500">' +
      '<span class="pf-zoom"><svg class="ic"><use href="#i-expand"/></svg></span></span>' +
      '<span class="pf-cap"><i class="pf-dot" style="background:' + p.d + '"></i><span style="min-width:0"><b>' + p.t + '</b><small>' + p.i + '</small></span></span></button>';
  }).join('');
  $('#filters').innerHTML = FILTERS.map(function (f, n) {
    return '<button type="button" data-f="' + f[0] + '"' + (n ? '' : ' class="on"') + '>' + f[1] + '</button>';
  }).join('');
  $('#filters').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    $$('#filters button').forEach(function (x) { x.classList.toggle('on', x === b); });
    var f = b.getAttribute('data-f');
    $$('.pf').forEach(function (card) { card.classList.toggle('hide', f !== 'all' && card.getAttribute('data-c') !== f); });
  });
  var cur = 0;
  function openViewer(n) {
    cur = (n + P.length) % P.length;
    var p = P[cur];
    $('#viewerImg').src = 'assets/img/portfolio/' + p.f + '.webp';
    $('#viewerImg').alt = p.t + ' sample system design';
    $('#viewerTitle').textContent = p.t;
    $('#viewerSub').textContent = p.i;
  }
  grid.addEventListener('click', function (e) {
    var card = e.target.closest('.pf'); if (!card) return;
    openViewer(+card.getAttribute('data-i'));
    if (hasBS()) bootstrap.Modal.getOrCreateInstance('#viewer').show();
  });
  $('#prevBtn').addEventListener('click', function () { openViewer(cur - 1); });
  $('#nextBtn').addEventListener('click', function () { openViewer(cur + 1); });
  document.addEventListener('keydown', function (e) {
    if (!$('#viewer').classList.contains('show')) return;
    if (e.key === 'ArrowLeft') openViewer(cur - 1);
    if (e.key === 'ArrowRight') openViewer(cur + 1);
  });

  /* =========================================================
     Contact form → ledgerays@outlook.com (via FormSubmit)
     ========================================================= */
  var EMAIL = 'ledgerays@outlook.com';
  var CODES = [
    ['+63', 'PH'], ['+61', 'AU'], ['+1', 'US/CA'], ['+44', 'UK'], ['+64', 'NZ'], ['+65', 'SG'], ['+60', 'MY'], ['+62', 'ID'],
    ['+66', 'TH'], ['+84', 'VN'], ['+852', 'HK'], ['+81', 'JP'], ['+82', 'KR'], ['+86', 'CN'], ['+91', 'IN'], ['+971', 'AE'],
    ['+966', 'SA'], ['+974', 'QA'], ['+965', 'KW'], ['+973', 'BH'], ['+968', 'OM'], ['+49', 'DE'], ['+33', 'FR'], ['+39', 'IT'],
    ['+34', 'ES'], ['+31', 'NL'], ['+41', 'CH'], ['+353', 'IE'], ['+27', 'ZA'], ['+234', 'NG'], ['+55', 'BR'], ['+52', 'MX']
  ];
  $('#countryCode').innerHTML = CODES.map(function (c) { return '<option value="' + c[0] + '">' + c[1] + ' ' + c[0] + '</option>'; }).join('');

  var answer = 0;
  function newQuestion() {
    var a = 1 + Math.floor(Math.random() * 9), b = 1 + Math.floor(Math.random() * 9);
    answer = a + b;
    $('#captchaQ').textContent = 'What is ' + a + ' + ' + b + '?';
  }
  newQuestion();

  var form = $('#contactForm'), msg = $('#formMsg'), btn = $('#sendBtn');
  function say(t, cls) { msg.textContent = t; msg.className = 'form-msg ' + (cls || ''); }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (form._honey.value) return; // bot trap
    var name = form.name.value.trim(), email = form.email.value.trim(), text = form.message.value.trim();
    if (!name || !text) return say('Please add your name and a short message.', 'err');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return say('Please enter a valid email so we can reply.', 'err');
    if (parseInt(form.captcha.value, 10) !== answer) {
      form.captcha.value = ''; newQuestion();
      return say('Security answer is not correct. Please try the new question.', 'err');
    }
    var mobile = form.mobile.value.trim() ? form.code.value + ' ' + form.mobile.value.trim() : '';
    var data = {
      name: name, email: email, business: form.business.value.trim(), type_of_business: form.type.value.trim(),
      mobile: mobile, message: text,
      _subject: 'New inquiry from ' + (form.business.value.trim() || name) + ' (LedgeRays website)',
      _template: 'table', _captcha: 'false'
    };
    btn.disabled = true; say('Sending…');
    fetch('https://formsubmit.co/ajax/' + EMAIL, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data)
    }).then(function (r) { return r.json(); }).then(function (res) {
      var ok = res && (res.success === true || res.success === 'true');
      if (ok) {
        say('Message sent! We\'ll get back to you within 24 hours.', 'ok');
        form.reset(); newQuestion();
      } else if (res && /activat/i.test(res.message || '')) {
        // first-time setup only: FormSubmit emails an activation link to the site owner
        say('Form setup pending: check ledgerays@outlook.com for the "Activate Form" email, then send again.', 'err');
      } else {
        throw new Error((res && res.message) || 'send failed');
      }
    }).catch(function () {
      msg.innerHTML = 'Sorry, the message could not be sent. Please try again or <a href="https://m.me/LedgeRays" target="_blank" rel="noopener">message us on Messenger</a>.';
      msg.className = 'form-msg err';
    }).then(function () { btn.disabled = false; });
  });

  /* =========================================================
     Start
     ========================================================= */
  buildDonutLegend();
  buildCharts();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { [lineChart, donutChart, barChart].forEach(function (ch) { if (ch) ch.update("none"); }); });
  go(location.hash.replace('#', '') || 'dashboard', false);
  runCounters();
})();
