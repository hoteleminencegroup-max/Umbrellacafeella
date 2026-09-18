/* ==========================================================================
   UMBRELLA CAFE — admin web panel
   Orders · Bookings · Menu & prices · Settings
   Works with the Node panel API, and falls back to LOCAL MODE (browser
   storage) when the site is hosted without the server.
   ========================================================================== */
(function () {
  'use strict';

  var C = window.UC_CONFIG, I = window.UC_I18N, M = window.UC_MENU;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  var money = function (v) { return C.currencySymbol + ' ' + Math.round(Number(v) || 0).toLocaleString('en-US'); };

  var ORDER_STATUS = ['new', 'accepted', 'preparing', 'ready', 'done', 'cancelled'];
  var BOOKING_STATUS = ['new', 'confirmed', 'seated', 'done', 'cancelled'];
  var NEXT_ORDER = { 'new': 'accepted', accepted: 'preparing', preparing: 'ready', ready: 'done' };
  var NEXT_BOOKING = { 'new': 'confirmed', confirmed: 'seated', seated: 'done' };
  var LABEL = {
    new: '🆕 New', accepted: '👍 Accepted', preparing: '👨‍🍳 Preparing', ready: '🔔 Ready', done: '✅ Done', cancelled: '✖ Cancelled',
    confirmed: '✔ Confirmed', seated: '🪑 Seated',
    dineIn: '🍽️ Dine-in', takeaway: '🥡 Takeaway', delivery: '🛵 Delivery',
    indoor: 'Indoor', outdoor: 'Terrace', any: 'No preference'
  };

  var S = {
    token: null, api: false, view: 'dashboard',
    orders: [], bookings: [], summary: null, settings: null, overrides: {},
    orderFilter: 'all', orderQ: '', orderSort: 'new',
    bookingFilter: 'all', bookingQ: '', bookingSort: 'date',
    menuQ: '', menuCat: 'all', onlyChanged: false,
    editing: {}, timer: null
  };

  /* ------------------------------------------------------------ storage */
  function lsGet(k, f) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch (e) { return f; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  /* --------------------------------------------------------------- toast */
  function toast(msg, kind) {
    var el = document.createElement('div');
    el.className = 'tst' + (kind === 'err' ? ' err' : '');
    el.textContent = msg;
    $('#toasts').appendChild(el);
    setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 320); }, 3000);
  }

  /* ----------------------------------------------------------------- api */
  async function api(path, opts) {
    opts = opts || {};
    var headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (S.token) headers.Authorization = 'Bearer ' + S.token;
    var ctrl = new AbortController();
    var to = setTimeout(function () { ctrl.abort(); }, 12000);
    try {
      var r = await fetch(path, { method: opts.method || 'GET', headers: headers, body: opts.body ? JSON.stringify(opts.body) : undefined, signal: ctrl.signal });
      clearTimeout(to);
      if (r.status === 401) { logout(true); throw new Error('unauthorized'); }
      var data = await r.json();
      if (!r.ok) throw new Error(data.error || ('HTTP ' + r.status));
      return data;
    } catch (e) { clearTimeout(to); throw e; }
  }

  /* --------------------------------------------------------- local mode */
  function localOrders() { return lsGet('uc_orders', []); }
  function localBookings() { return lsGet('uc_bookings', []); }
  function localSaveOrders(list) { lsSet('uc_orders', list); }
  function localSaveBookings(list) { lsSet('uc_bookings', list); }

  /* ================================================================ AUTH */
  async function tryLogin(pin) {
    // 1) real API
    try {
      var r = await fetch('api/health', { headers: { Accept: 'application/json' } });
      if (r.ok) {
        var res = await api('api/admin/login', { method: 'POST', body: { pin: pin } });
        if (res && res.token) { S.api = true; S.token = res.token; sessionStorage.setItem('uc_admin_token', res.token); return true; }
      }
    } catch (e) { /* fall through to local */ }

    // 2) local demo mode
    var localPin = String(lsGet('uc_admin_pin', C.admin.defaultPin));
    if (String(pin) === localPin) {
      S.api = false; S.token = 'local';
      S.overrides = lsGet('uc_overrides', {});
      S.settings = lsGet('uc_settings', { prepMinutes: C.delivery.prepMinutes || 25, deliveryFee: 0, serviceCharge: C.serviceCharge, acceptOrders: true, acceptBookings: true });
      sessionStorage.setItem('uc_admin_local', '1');
      return true;
    }
    return false;
  }

  function logout(silent) {
    S.token = null; S.api = false;
    sessionStorage.removeItem('uc_admin_token');
    sessionStorage.removeItem('uc_admin_local');
    if (S.timer) clearInterval(S.timer);
    $('#shell').hidden = true; $('#gate').hidden = false;
    if (!silent) toast('Panel locked');
  }

  async function restoreSession() {
    var token = sessionStorage.getItem('uc_admin_token');
    if (token) {
      S.token = token;
      try { await api('api/health'); S.api = true; return true; }
      catch (e) { S.token = null; sessionStorage.removeItem('uc_admin_token'); }
    }
    if (sessionStorage.getItem('uc_admin_local')) {
      S.api = false; S.token = 'local';
      S.overrides = lsGet('uc_overrides', {});
      S.settings = lsGet('uc_settings', {});
      return true;
    }
    return false;
  }

  /* ============================================================ DATA LOAD */
  async function loadAll() {
    if (S.api) {
      try {
        var sum = await api('api/admin/summary');
        S.summary = sum;
        S.settings = sum.settings;
        var o = await api('api/admin/orders?status=all&limit=300');
        var b = await api('api/admin/bookings?status=all');
        var ov = await api('api/admin/overrides');
        S.orders = o.items || []; S.bookings = b.items || []; S.overrides = ov.overrides || {};
        setModeBanner(true);
      } catch (e) {
        if (String(e.message) === 'unauthorized') return;
        console.warn(e); setModeBanner(false, 'Could not reach the panel API — showing local data.');
        S.orders = localOrders(); S.bookings = localBookings();
      }
    } else {
      S.orders = localOrders(); S.bookings = localBookings();
      S.overrides = lsGet('uc_overrides', {});
      S.settings = lsGet('uc_settings', { prepMinutes: 25, deliveryFee: 0, serviceCharge: C.serviceCharge, acceptOrders: true, acceptBookings: true });
      setModeBanner(false);
    }
    computeSummary();
    render();
  }

  function setModeBanner(online, custom) {
    var pill = $('#apiPill'), banner = $('#modeBanner');
    if (online) {
      pill.className = 'pill ok'; pill.innerHTML = '<span class="dot"></span> panel API online';
      banner.hidden = true;
    } else {
      pill.className = 'pill warn'; pill.innerHTML = '<span class="dot"></span> local mode';
      banner.hidden = false;
      banner.innerHTML = '💾 <div><b>Local demo mode.</b> ' + esc(custom || 'This page is running without the Node panel server, so orders &amp; bookings are read from this browser (the ones placed on this device). Run <code>npm start</code> and open <code>/admin.html</code> to collect every order from every visitor in one place.</div>');
    }
  }

  /* summary for local mode (mirrors the server calculation) */
  function computeSummary() {
    if (S.api && S.summary) return;
    var today = new Date().toISOString().slice(0, 10);
    var todays = S.orders.filter(function (o) { return (o.createdAt || '').slice(0, 10) === today; });
    var byStatus = {};
    S.orders.forEach(function (o) { byStatus[o.status] = (byStatus[o.status] || 0) + 1; });
    var top = {};
    S.orders.forEach(function (o) { (o.lines || []).forEach(function (l) { top[l.name] = (top[l.name] || 0) + (l.qty || 1); }); });
    var last7 = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      var dayO = S.orders.filter(function (o) { return (o.createdAt || '').slice(0, 10) === d; });
      last7.push({ date: d, count: dayO.length, revenue: dayO.reduce(function (s, o) { return s + (Number(o.total) || 0); }, 0) });
    }
    S.summary = {
      orders: { total: S.orders.length, today: todays.length, new: byStatus.new || 0, preparing: byStatus.preparing || 0, ready: byStatus.ready || 0, done: byStatus.done || 0, cancelled: byStatus.cancelled || 0 },
      revenue: { today: todays.reduce(function (s, o) { return s + (Number(o.total) || 0); }, 0), total: S.orders.reduce(function (s, o) { return s + (Number(o.total) || 0); }, 0) },
      bookings: {
        total: S.bookings.length, new: S.bookings.filter(function (b) { return b.status === 'new'; }).length,
        today: S.bookings.filter(function (b) { return b.date === today; }).length,
        guestsToday: S.bookings.filter(function (b) { return b.date === today; }).reduce(function (s, b) { return s + (Number(b.guests) || 0); }, 0)
      },
      last7: last7,
      topItems: Object.keys(top).map(function (k) { return { name: k, qty: top[k] }; }).sort(function (a, b) { return b.qty - a.qty; }).slice(0, 8),
      upcoming: S.bookings.filter(function (b) { return b.date >= today && b.status !== 'cancelled'; }).sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); }).slice(0, 10)
    };
  }

  /* ============================================================ RENDERING */
  function fmtWhen(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
  function ago(iso) {
    var d = new Date(iso); if (isNaN(d)) return '';
    var m = Math.round((Date.now() - d.getTime()) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    var h = Math.round(m / 60);
    if (h < 24) return h + ' h ago';
    return Math.round(h / 24) + ' d ago';
  }
  function stChip(st) { return '<span class="st st-' + esc(st) + '">' + esc(LABEL[st] || st) + '</span>'; }

  function render() {
    renderBadges();
    if (S.view === 'dashboard') renderDashboard();
    if (S.view === 'orders') renderOrders();
    if (S.view === 'bookings') renderBookings();
    if (S.view === 'menu') renderMenuEditor();
    if (S.view === 'settings') renderSettings();
  }

  function renderBadges() {
    var newOrders = S.orders.filter(function (o) { return o.status === 'new'; }).length;
    var newBookings = S.bookings.filter(function (b) { return b.status === 'new'; }).length;
    var b1 = $('#badgeOrders'), b2 = $('#badgeBookings');
    b1.textContent = newOrders; b1.hidden = !newOrders;
    b2.textContent = newBookings; b2.hidden = !newBookings;
    document.title = (newOrders || newBookings ? '(' + (newOrders + newBookings) + ') ' : '') + '☔ Umbrella Cafe · Web Panel';
  }

  function renderDashboard() {
    var s = S.summary;
    if (!s) return;
    var cards = [
      { k: 'Orders today', v: s.orders.today, s: s.orders.total + ' all time', c: '' },
      { k: 'Revenue today', v: money(s.revenue.today), s: money(s.revenue.total) + ' total', c: 'y' },
      { k: 'New orders', v: s.orders.new, s: (s.orders.preparing || 0) + ' preparing · ' + (s.orders.ready || 0) + ' ready', c: 'b' },
      { k: 'Bookings today', v: s.bookings.today, s: s.bookings.guestsToday + ' guests · ' + s.bookings.new + ' unconfirmed', c: '' }
    ];
    $('#statCards').innerHTML = cards.map(function (c) {
      return '<div class="stat-card ' + c.c + '"><div class="k">' + esc(c.k) + '</div><div class="v">' + esc(c.v) + '</div><div class="s">' + esc(c.s) + '</div></div>';
    }).join('');

    var max = Math.max.apply(null, s.last7.map(function (d) { return d.count; }).concat([1]));
    var maxRev = Math.max.apply(null, s.last7.map(function (d) { return d.revenue; }).concat([1]));
    $('#chartSub').textContent = money(s.last7.reduce(function (a, b) { return a + b.revenue; }, 0)) + ' · ' + s.last7.reduce(function (a, b) { return a + b.count; }, 0) + ' orders';
    $('#chart').innerHTML = s.last7.map(function (d) {
      var h = Math.round((d.count / max) * 100);
      var hr = Math.round((d.revenue / maxRev) * 100);
      var lbl = new Date(d.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short' });
      return '<div class="bar" title="' + esc(d.date) + ' · ' + d.count + ' orders · ' + money(d.revenue) + '">' +
        '<span class="val">' + (d.count || '') + '</span>' +
        '<div style="display:flex;gap:3px;align-items:flex-end;width:100%;justify-content:center;height:100%">' +
        '<span class="col" style="height:' + Math.max(4, h) + '%"></span>' +
        '<span class="col alt" style="height:' + Math.max(4, hr) + '%;max-width:14px;opacity:.85"></span>' +
        '</div><span class="lbl">' + esc(lbl) + '</span></div>';
    }).join('');

    var tmax = Math.max.apply(null, s.topItems.map(function (i) { return i.qty; }).concat([1]));
    $('#topList').innerHTML = s.topItems.length ? s.topItems.map(function (i) {
      return '<div class="top-row"><span class="n">' + esc(i.name) + '</span><span class="track"><span class="fill" style="width:' + Math.round(i.qty / tmax * 100) + '%"></span></span><span class="q">' + i.qty + '</span></div>';
    }).join('') : '<div class="empty" style="padding:20px"><span class="e">🍽️</span>No sales yet — orders placed on the website will appear here.</div>';

    $('#dashOrders').innerHTML = S.orders.slice(0, 5).map(orderRow).join('') || '<div class="empty" style="padding:20px"><span class="e">🧾</span>No orders yet.</div>';
    $('#dashBookings').innerHTML = (s.upcoming || []).slice(0, 5).map(bookingRow).join('') || '<div class="empty" style="padding:20px"><span class="e">📅</span>No upcoming bookings.</div>';
  }

  /* ------------------------------------------------------------- orders */
  function orderRow(o) {
    var lines = (o.lines || []).map(function (l) {
      return '<tr><td class="qty">' + (l.qty || 1) + '×</td><td>' + esc(l.nameLocal || l.name) + (l.extra ? ' <span class="extra">(' + esc(l.extra) + ')</span>' : '') + '</td><td class="amt">' + money(l.lineTotal || (l.qty || 1) * (l.unit || 0)) + '</td></tr>';
    }).join('');
    var next = NEXT_ORDER[o.status];
    var contact = [
      '<a class="btn btn-o btn-sm" href="tel:' + esc(String(o.phone || '').replace(/[^\d+]/g, '')) + '">📞 Call</a>',
      '<a class="btn btn-o btn-sm" target="_blank" rel="noopener" href="https://wa.me/' + esc(String(o.phone || '').replace(/[^\d]/g, '')) + '?text=' + encodeURIComponent('Hello ' + (o.name || '') + ', this is Umbrella Cafe about your order ' + (o.code || '') + '.') + '">💬 WhatsApp</a>'
    ].join('');

    return '<div class="row-item' + (o.status === 'new' ? ' fresh' : '') + '" data-id="' + esc(o.id || o.code) + '">' +
      '<div class="row-head"><div style="min-width:200px;flex:1">' +
        '<div class="row-title">' + stChip(o.status) + ' ' + esc(o.code || '—') + ' · ' + esc(o.name || 'Guest') + '</div>' +
        '<div class="row-meta">' +
          '<span>' + esc(LABEL[o.type] || o.type || '') + (o.table ? ' · table ' + esc(o.table) : '') + (o.address ? ' · ' + esc(o.address) : '') + '</span>' +
          '<span>🕒 ' + esc(fmtWhen(o.createdAt)) + ' (' + esc(ago(o.createdAt)) + ')</span>' +
          (o.when ? '<span>⏱ wanted ' + esc(o.when) + '</span>' : '') +
          '<span>📞 ' + esc(o.phone || '—') + '</span>' +
          '<span>🌐 ' + esc((o.lang || 'en').toUpperCase()) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="row-actions">' +
        (next ? '<button class="btn btn-g btn-sm" data-status="' + next + '" data-kind="order" data-id="' + esc(o.id || o.code) + '">' + esc(LABEL[next] || next) + ' →</button>' : '') +
        (o.status !== 'cancelled' && o.status !== 'done' ? '<button class="btn btn-d btn-sm" data-status="cancelled" data-kind="order" data-id="' + esc(o.id || o.code) + '" title="Cancel order">✖</button>' : '') +
        '<button class="btn btn-o btn-sm" data-toggle="1">▾ items</button>' +
        '<button class="btn btn-o btn-sm" data-del="order" data-id="' + esc(o.id || o.code) + '" title="Delete order">🗑</button>' +
        contact +
      '</div></div>' +
      '<div class="row-body" hidden>' +
        '<table>' + lines + '</table>' +
        '<div style="display:flex;justify-content:flex-end;gap:18px;margin-top:8px;font-size:13px;color:var(--ink-soft)">' +
          '<span>Subtotal <b>' + money(o.subtotal) + '</b></span><span>Service <b>' + money(o.service) + '</b></span>' +
        '</div>' +
        '<div class="row-total"><span>Total</span><span>' + money(o.total) + '</span></div>' +
        (o.notes ? '<div class="row-note">📝 ' + esc(o.notes) + '</div>' : '') +
        (o.note ? '<div class="row-note">🏷️ Staff note: ' + esc(o.note) + '</div>' : '') +
      '</div></div>';
  }

  function renderOrders() {
    var tabs = [{ id: 'all', label: 'All', c: S.orders.length }].concat(ORDER_STATUS.map(function (st) {
      return { id: st, label: LABEL[st], c: S.orders.filter(function (o) { return o.status === st; }).length };
    }));
    $('#orderTabs').innerHTML = tabs.map(function (x) {
      return '<button class="tab' + (S.orderFilter === x.id ? ' on' : '') + '" data-filter="' + x.id + '">' + esc(x.label) + '<span class="c">' + x.c + '</span></button>';
    }).join('');

    var q = S.orderQ.toLowerCase();
    var list = S.orders.filter(function (o) {
      if (S.orderFilter !== 'all' && o.status !== S.orderFilter) return false;
      if (!q) return true;
      return [o.code, o.name, o.phone, o.table, o.address, o.notes, (o.lines || []).map(function (l) { return l.name; }).join(' ')].join(' ').toLowerCase().indexOf(q) >= 0;
    });
    if (S.orderSort === 'old') list = list.slice().reverse();
    if (S.orderSort === 'total') list = list.slice().sort(function (a, b) { return (b.total || 0) - (a.total || 0); });

    $('#orderList').innerHTML = list.length ? list.map(orderRow).join('')
      : '<div class="empty"><span class="e">🧾</span><h3>No orders here</h3><p>Orders placed on the website appear instantly. ' + (S.api ? '' : 'In local mode only orders made in this browser are visible.') + '</p></div>';
  }

  /* ----------------------------------------------------------- bookings */
  function bookingRow(b) {
    var next = NEXT_BOOKING[b.status];
    return '<div class="row-item' + (b.status === 'new' ? ' fresh' : '') + '" data-id="' + esc(b.id || b.code) + '">' +
      '<div class="row-head"><div style="min-width:200px;flex:1">' +
        '<div class="row-title">' + stChip(b.status) + ' ' + esc(b.code || '—') + ' · ' + esc(b.name || 'Guest') + '</div>' +
        '<div class="row-meta">' +
          '<span>📅 <b>' + esc(b.date || '') + '</b> at <b>' + esc(b.time || '') + '</b></span>' +
          '<span>👥 ' + esc(b.guests || 2) + ' guests</span>' +
          '<span>💺 ' + esc(LABEL[b.area] || b.areaLabel || '') + '</span>' +
          '<span>📞 ' + esc(b.phone || '—') + '</span>' +
          (b.occasion ? '<span>🎉 ' + esc(b.occasion) + '</span>' : '') +
          '<span>🕒 booked ' + esc(ago(b.createdAt)) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="row-actions">' +
        (next ? '<button class="btn btn-g btn-sm" data-status="' + next + '" data-kind="booking" data-id="' + esc(b.id || b.code) + '">' + esc(LABEL[next] || next) + ' →</button>' : '') +
        (b.status !== 'cancelled' ? '<button class="btn btn-d btn-sm" data-status="cancelled" data-kind="booking" data-id="' + esc(b.id || b.code) + '" title="Cancel booking">✖</button>' : '') +
        '<button class="btn btn-o btn-sm" data-del="booking" data-id="' + esc(b.id || b.code) + '" title="Delete booking">🗑</button>' +
        '<a class="btn btn-o btn-sm" href="tel:' + esc(String(b.phone || '').replace(/[^\d+]/g, '')) + '">📞</a>' +
        '<a class="btn btn-o btn-sm" target="_blank" rel="noopener" href="https://wa.me/' + esc(String(b.phone || '').replace(/[^\d]/g, '')) + '?text=' + encodeURIComponent('Hello ' + (b.name || '') + ', Umbrella Cafe here about your table booking ' + (b.code || '') + ' for ' + (b.date || '') + ' ' + (b.time || '') + '.') + '">💬</a>' +
        '<button class="btn btn-o btn-sm" data-toggle="1">▾</button>' +
      '</div></div>' +
      '<div class="row-body" hidden>' +
        '<div><b>' + esc(b.name) + '</b> · ' + esc(b.phone) + (b.email ? ' · ' + esc(b.email) : '') + '</div>' +
        '<div>' + esc(b.date) + ' · ' + esc(b.time) + ' · ' + esc(b.guests) + ' guests · ' + esc(LABEL[b.area] || '') + '</div>' +
        (b.occasion ? '<div>🎉 ' + esc(b.occasion) + '</div>' : '') +
        (b.notes ? '<div class="row-note">📝 ' + esc(b.notes) + '</div>' : '') +
        (b.note ? '<div class="row-note">🏷️ Staff note: ' + esc(b.note) + '</div>' : '') +
      '</div></div>';
  }

  function renderBookings() {
    var tabs = [{ id: 'all', label: 'All', c: S.bookings.length }].concat(BOOKING_STATUS.map(function (st) {
      return { id: st, label: LABEL[st], c: S.bookings.filter(function (b) { return b.status === st; }).length };
    }));
    $('#bookingTabs').innerHTML = tabs.map(function (x) {
      return '<button class="tab' + (S.bookingFilter === x.id ? ' on' : '') + '" data-filter="' + x.id + '">' + esc(x.label) + '<span class="c">' + x.c + '</span></button>';
    }).join('');

    var q = S.bookingQ.toLowerCase();
    var list = S.bookings.filter(function (b) {
      if (S.bookingFilter !== 'all' && b.status !== S.bookingFilter) return false;
      if (!q) return true;
      return [b.code, b.name, b.phone, b.email, b.occasion, b.notes].join(' ').toLowerCase().indexOf(q) >= 0;
    });
    list = list.slice().sort(function (a, b) {
      if (S.bookingSort === 'new') return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
      return String(a.date + a.time).localeCompare(String(b.date + b.time));
    });

    $('#bookingList').innerHTML = list.length ? list.map(bookingRow).join('')
      : '<div class="empty"><span class="e">📅</span><h3>No bookings yet</h3><p>Table reservations from the website show up here.</p></div>';
  }

  /* -------------------------------------------------------- menu editor */
  function renderMenuEditor() {
    var cats = $('#menuCatAdmin');
    if (!cats.options.length) {
      cats.innerHTML = '<option value="all">All categories</option>' + M.categories.map(function (c) {
        return '<option value="' + c.id + '">' + esc(c.emoji + ' ' + I.L(c.n)) + '</option>';
      }).join('');
    }
    var q = S.menuQ.toLowerCase();
    var host = $('#menuEditor');
    var html = '';
    M.categories.forEach(function (c) {
      if (S.menuCat !== 'all' && S.menuCat !== c.id) return;
      var items = M.items.filter(function (i) { return i.cat === c.id; });
      if (q) items = items.filter(function (i) { return (i.n.en + ' ' + i.n[I.getLang()] + ' ' + i.id).toLowerCase().indexOf(q) >= 0; });
      if (S.onlyChanged) items = items.filter(function (i) { return S.editing[i.id] || S.overrides[i.id]; });
      if (!items.length) return;
      html += '<div class="me-cat">' + c.emoji + ' ' + esc(I.L(c.n)) + ' <span style="color:var(--ink-soft);font-weight:700">(' + items.length + ')</span></div>';
      html += items.map(function (i) {
        var ov = S.overrides[i.id] || {};
        var ed = S.editing[i.id] || {};
        var price = ed.price !== undefined ? ed.price : (ov.price !== undefined ? ov.price : '');
        var avail = ed.available !== undefined ? ed.available : (ov.available !== undefined ? ov.available : true);
        var changed = (price !== '' && Number(price) !== i.price) || avail === false || ed.available !== undefined || ed.price !== undefined;
        var opts = i.options ? i.options.map(function (o) { return I.L(o.n) + ' ' + money(o.price); }).join(' / ') : '';
        return '<div class="me-row' + (avail ? '' : ' off') + (changed ? ' changed' : '') + '" data-item="' + i.id + '">' +
          '<span class="em">' + i.emoji + '</span>' +
          '<span class="nm"><b>' + esc(I.L(i.n)) + '</b><small>' + esc(i.n.en) + (opts ? ' · ' + esc(opts) : '') + '</small></span>' +
          '<span class="base">base ' + money(i.price) + '</span>' +
          '<input type="number" min="0" step="50" placeholder="' + i.price + '" value="' + esc(price) + '" data-price="' + i.id + '" aria-label="Price override for ' + esc(i.n.en) + '">' +
          '<button class="switch' + (avail ? '' : ' off') + '" data-avail="' + i.id + '" aria-label="Available" title="' + (avail ? 'Available' : 'Sold out') + '"></button>' +
        '</div>';
      }).join('');
    });
    host.innerHTML = html || '<div class="empty"><span class="e">🔍</span>No dishes match.</div>';
  }

  async function saveOverrides() {
    // build clean override map from editing state
    var out = {};
    M.items.forEach(function (i) {
      var ed = S.editing[i.id] || {};
      var base = S.overrides[i.id] || {};
      var price = ed.price !== undefined ? ed.price : base.price;
      var avail = ed.available !== undefined ? ed.available : base.available;
      var entry = {};
      if (price !== undefined && price !== null && price !== '' && Number(price) !== i.price) entry.price = Math.max(0, Math.round(Number(price)));
      if (avail === false) entry.available = false;
      if (Object.keys(entry).length) out[i.id] = entry;
    });
    var btn = $('#saveOverrides');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      if (S.api) { var r = await api('api/admin/overrides', { method: 'PUT', body: { overrides: out } }); S.overrides = r.overrides || out; }
      else { S.overrides = out; lsSet('uc_overrides', out); }
      S.editing = {};
      toast('Menu updated — the website now shows these prices (' + Object.keys(out).length + ' changed)');
      renderMenuEditor();
    } catch (e) { toast('Save failed: ' + e.message, 'err'); }
    btn.disabled = false; btn.textContent = '💾 Save changes';
  }

  /* ----------------------------------------------------------- settings */
  function renderSettings() {
    var s = S.settings || {};
    $('#profileBox').innerHTML =
      '<div class="set-row"><div class="t"><b>' + esc(C.name) + '</b><small>' + esc(C.legalName) + '</small></div><span class="pill ok">live</span></div>' +
      '<div class="set-row"><div class="t"><b>Address</b><small>' + esc(C.addressLine) + '</small></div></div>' +
      '<div class="set-row"><div class="t"><b>Phone / WhatsApp</b><small>' + esc(C.phone) + (C.phoneAlt ? ' · ' + esc(C.phoneAlt) : '') + '</small></div>' +
        '<a class="btn btn-o btn-sm" href="https://wa.me/' + esc(C.whatsapp) + '" target="_blank" rel="noopener">💬</a></div>' +
      '<div class="set-row"><div class="t"><b>Opening hours</b><small>Mon–Fri &amp; Sun 09:00–21:00 · Sat 09:00–18:00</small></div></div>' +
      '<div class="set-row"><div class="t"><b>Social</b><small>@cafe_umbrella_ · Facebook · Google Maps</small></div>' +
        '<span style="display:flex;gap:6px">' +
        '<a class="btn btn-o btn-sm" target="_blank" rel="noopener" href="' + esc(C.social.instagram) + '">📷</a>' +
        '<a class="btn btn-o btn-sm" target="_blank" rel="noopener" href="' + esc(C.social.facebook) + '">📘</a>' +
        '<a class="btn btn-o btn-sm" target="_blank" rel="noopener" href="' + esc(C.social.google) + '">📍</a></span></div>';

    $('#setGrid').innerHTML =
      '<div class="set-field"><label for="setPrep">Preparation time (minutes)</label><input id="setPrep" type="number" min="1" max="240" value="' + esc(s.prepMinutes || 25) + '"></div>' +
      '<div class="set-field"><label for="setFee">Delivery fee (Rs.)</label><input id="setFee" type="number" min="0" step="50" value="' + esc(s.deliveryFee || 0) + '"></div>' +
      '<div class="set-field"><label for="setService">Service charge (%)</label><input id="setService" type="number" min="0" max="50" step="1" value="' + Math.round((s.serviceCharge != null ? s.serviceCharge : C.serviceCharge) * 100) + '"></div>';

    var sw1 = $('#swOrders'), sw2 = $('#swBookings');
    sw1.className = 'switch' + (s.acceptOrders === false ? ' off' : '');
    sw2.className = 'switch' + (s.acceptBookings === false ? ' off' : '');
    sw1.onclick = function () { sw1.classList.toggle('off'); };
    sw2.onclick = function () { sw2.classList.toggle('off'); };
  }

  async function saveSettings() {
    var body = {
      prepMinutes: Number($('#setPrep').value) || 25,
      deliveryFee: Number($('#setFee').value) || 0,
      serviceCharge: (Number($('#setService').value) || 10) / 100,
      acceptOrders: !$('#swOrders').classList.contains('off'),
      acceptBookings: !$('#swBookings').classList.contains('off')
    };
    try {
      if (S.api) { var r = await api('api/admin/settings', { method: 'PUT', body: body }); S.settings = r.settings; }
      else { S.settings = body; lsSet('uc_settings', body); }
      toast('Settings saved');
      renderSettings();
    } catch (e) { toast('Could not save settings: ' + e.message, 'err'); }
  }

  async function changePin() {
    var a = $('#newPin').value.trim(), b = $('#newPin2').value.trim();
    if (a.length < 4) return toast('PIN must be at least 4 characters', 'err');
    if (a !== b) return toast('PINs do not match', 'err');
    try {
      if (S.api) {
        var r = await api('api/admin/settings', { method: 'PUT', body: { pin: a } });
        if (r.newToken) { S.token = r.newToken; sessionStorage.setItem('uc_admin_token', r.newToken); }
      } else { lsSet('uc_admin_pin', a); }
      $('#newPin').value = ''; $('#newPin2').value = '';
      toast('PIN changed ✔');
    } catch (e) { toast(e.message === 'pin_locked_by_env' ? 'PIN is locked by the UC_ADMIN_PIN environment variable' : 'Could not change PIN: ' + e.message, 'err'); }
  }

  /* -------------------------------------------------------------- export */
  function download(name, text, type) {
    var blob = new Blob([text], { type: type || 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
  }
  function csv(rows, cols) {
    var e = function (v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    return [cols.map(function (c) { return e(c[0]); }).join(',')].concat(rows.map(function (r) {
      return cols.map(function (c) { return e(typeof c[1] === 'function' ? c[1](r) : r[c[1]]); }).join(',');
    })).join('\n');
  }
  function exportOrders() {
    if (S.api) { window.open('api/admin/export?type=orders', '_blank'); return; }
    download('umbrella-cafe-orders.csv', csv(S.orders, [['code', 'code'], ['created', 'createdAt'], ['status', 'status'], ['type', 'type'], ['name', 'name'], ['phone', 'phone'], ['table', 'table'], ['address', 'address'],
      ['items', function (o) { return (o.lines || []).map(function (l) { return l.qty + 'x ' + l.name; }).join(' | '); }], ['subtotal', 'subtotal'], ['service', 'service'], ['total', 'total'], ['notes', 'notes']]), 'text/csv');
    toast('Orders CSV downloaded');
  }
  function exportBookings() {
    if (S.api) { window.open('api/admin/export?type=bookings', '_blank'); return; }
    download('umbrella-cafe-bookings.csv', csv(S.bookings, [['code', 'code'], ['created', 'createdAt'], ['status', 'status'], ['date', 'date'], ['time', 'time'], ['guests', 'guests'], ['name', 'name'], ['phone', 'phone'], ['email', 'email'], ['seating', 'area'], ['occasion', 'occasion'], ['notes', 'notes']]), 'text/csv');
    toast('Bookings CSV downloaded');
  }

  /* ============================================================ EVENTS */
  function setView(v) {
    S.view = v;
    $$('.side-link').forEach(function (b) { b.classList.toggle('on', b.dataset.view === v); });
    ['dashboard', 'orders', 'bookings', 'menu', 'settings'].forEach(function (x) { $('#view-' + x).hidden = x !== v; });
    $('#viewTitle').textContent = ({ dashboard: 'Dashboard', orders: 'Orders', bookings: 'Table Bookings', menu: 'Menu & Prices', settings: 'Settings' })[v];
    $('#sidebar').classList.remove('open'); $('#scrim').classList.remove('show');
    render();
  }

  async function setStatus(kind, id, status) {
    try {
      if (S.api) {
        await api('api/admin/' + kind + 's/' + encodeURIComponent(id), { method: 'PATCH', body: { status: status } });
      } else {
        if (kind === 'order') {
          var list = localOrders();
          var o = list.filter(function (x) { return (x.id || x.code) === id; })[0];
          if (o) { o.status = status; o.updatedAt = new Date().toISOString(); localSaveOrders(list); }
        } else {
          var lb = localBookings();
          var b = lb.filter(function (x) { return (x.id || x.code) === id; })[0];
          if (b) { b.status = status; b.updatedAt = new Date().toISOString(); localSaveBookings(lb); }
        }
      }
      toast((kind === 'order' ? 'Order ' : 'Booking ') + id + ' → ' + (LABEL[status] || status));
      await loadAll();
    } catch (e) { toast('Update failed: ' + e.message, 'err'); }
  }

  var bound = false;

  /* the PIN gate must be wired before any login can happen */
  function bindGate() {
    var form = $('#gateForm');
    if (form.dataset.bound) return;
    form.dataset.bound = '1';
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var pin = $('#pinInput').value.trim();
      $('#gateError').textContent = '';
      if (!pin) { $('#gateError').textContent = 'Enter your PIN'; return; }
      var btn = form.querySelector('button[type=submit]');
      btn.disabled = true; btn.textContent = 'Checking…';
      var ok = false;
      try { ok = await tryLogin(pin); }
      catch (err) { console.warn('login error', err); }
      btn.disabled = false; btn.textContent = '🔓 Unlock panel';
      if (ok) { $('#pinInput').value = ''; await enterPanel(); }
      else $('#gateError').textContent = 'Wrong PIN — try again';
    });
  }

  async function deleteRecord(kind, id) {
    if (!window.confirm('Delete this ' + kind + ' (' + id + ')? This cannot be undone.')) return;
    try {
      if (S.api) {
        await api('api/admin/' + kind + 's/' + encodeURIComponent(id), { method: 'DELETE' });
      } else if (kind === 'order') {
        localSaveOrders(localOrders().filter(function (x) { return (x.id || x.code) !== id; }));
      } else {
        localSaveBookings(localBookings().filter(function (x) { return (x.id || x.code) !== id; }));
      }
      toast((kind === 'order' ? 'Order ' : 'Booking ') + id + ' deleted');
      await loadAll();
    } catch (e) { toast('Delete failed: ' + e.message, 'err'); }
  }

  function bind() {
    if (bound) return;
    bound = true;

    /* navigation */
    $$('.side-link').forEach(function (b) { b.onclick = function () { setView(b.dataset.view); }; });
    $('#burgerAdmin').onclick = function () { $('#sidebar').classList.add('open'); $('#scrim').classList.add('show'); };
    $('#scrim').onclick = function () { $('#sidebar').classList.remove('open'); $('#scrim').classList.remove('show'); };
    $('#btnLogout').onclick = function () { logout(); };
    $('#btnRefresh').onclick = async function () { toast('Refreshing…'); await loadAll(); toast('Up to date'); };
    $('#btnPrint').onclick = function () { window.print(); };
    document.addEventListener('click', function (e) {
      var g = e.target.closest('[data-goto]');
      if (g) { e.preventDefault(); setView(g.dataset.goto); }
    });

    /* delegated: status changes + row expand */
    document.addEventListener('click', function (e) {
      var st = e.target.closest('[data-status]');
      if (st) { setStatus(st.dataset.kind, st.dataset.id, st.dataset.status); return; }
      var del = e.target.closest('[data-del]');
      if (del && del.dataset.id) { deleteRecord(del.dataset.del, del.dataset.id); return; }
      var tg = e.target.closest('[data-toggle]');
      if (tg) {
        var body = tg.closest('.row-item').querySelector('.row-body');
        if (body) { body.hidden = !body.hidden; tg.textContent = body.hidden ? '▾ items' : '▴ hide'; }
      }
    });

    /* order filters */
    $('#orderTabs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-filter]'); if (!b) return;
      S.orderFilter = b.dataset.filter; renderOrders();
    });
    $('#orderSearch').addEventListener('input', function (e) { S.orderQ = e.target.value; renderOrders(); });
    $('#orderSort').addEventListener('change', function (e) { S.orderSort = e.target.value; renderOrders(); });
    $('#exportOrders').onclick = exportOrders;

    /* booking filters */
    $('#bookingTabs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-filter]'); if (!b) return;
      S.bookingFilter = b.dataset.filter; renderBookings();
    });
    $('#bookingSearch').addEventListener('input', function (e) { S.bookingQ = e.target.value; renderBookings(); });
    $('#bookingSort').addEventListener('change', function (e) { S.bookingSort = e.target.value; renderBookings(); });
    $('#exportBookings').onclick = exportBookings;

    /* menu editor */
    $('#menuSearchAdmin').addEventListener('input', function (e) { S.menuQ = e.target.value; renderMenuEditor(); });
    $('#menuCatAdmin').addEventListener('change', function (e) { S.menuCat = e.target.value; renderMenuEditor(); });
    $('#onlyChanged').onclick = function () { S.onlyChanged = !S.onlyChanged; this.classList.toggle('btn-g', S.onlyChanged); renderMenuEditor(); };
    $('#saveOverrides').onclick = saveOverrides;
    $('#resetOverrides').onclick = async function () {
      if (!confirm('Reset all price overrides and sold-out flags?')) return;
      S.editing = {};
      try {
        if (S.api) { var r = await api('api/admin/overrides', { method: 'PUT', body: { overrides: {} } }); S.overrides = r.overrides || {}; }
        else { S.overrides = {}; lsSet('uc_overrides', {}); }
        toast('All overrides cleared'); renderMenuEditor();
      } catch (e) { toast('Reset failed: ' + e.message, 'err'); }
    };
    $('#menuEditor').addEventListener('input', function (e) {
      var inp = e.target.closest('[data-price]');
      if (!inp) return;
      var id = inp.dataset.price;
      S.editing[id] = S.editing[id] || {};
      S.editing[id].price = inp.value === '' ? '' : Number(inp.value);
      var row = inp.closest('.me-row');
      var item = M.items.filter(function (i) { return i.id === id; })[0];
      row.classList.toggle('changed', inp.value !== '' && Number(inp.value) !== (item ? item.price : -1));
    });
    $('#menuEditor').addEventListener('click', function (e) {
      var sw = e.target.closest('[data-avail]');
      if (!sw) return;
      var id = sw.dataset.avail;
      var cur = S.editing[id] && S.editing[id].available !== undefined ? S.editing[id].available
        : (S.overrides[id] && S.overrides[id].available !== undefined ? S.overrides[id].available : true);
      S.editing[id] = S.editing[id] || {};
      S.editing[id].available = !cur;
      sw.classList.toggle('off', cur);
      sw.closest('.me-row').classList.toggle('off', cur);
      sw.closest('.me-row').classList.add('changed');
    });

    /* settings */
    $('#saveSettings').onclick = saveSettings;
    $('#savePin').onclick = changePin;
    $('#dlOrders').onclick = exportOrders;
    $('#dlBookings').onclick = exportBookings;
    $('#dlJSON').onclick = function () {
      download('umbrella-cafe-data.json', JSON.stringify({ exportedAt: new Date().toISOString(), orders: S.orders, bookings: S.bookings, overrides: S.overrides, settings: S.settings }, null, 2), 'application/json');
      toast('Raw JSON downloaded');
    };

    /* keyboard shortcuts */
    document.addEventListener('keydown', function (e) {
      if ($('#gate').hidden === false) return;
      if (e.target.matches('input,textarea,select')) return;
      if (e.key === '1') setView('dashboard');
      if (e.key === '2') setView('orders');
      if (e.key === '3') setView('bookings');
      if (e.key === '4') setView('menu');
      if (e.key === '5') setView('settings');
      if (e.key.toLowerCase() === 'r') { e.preventDefault(); loadAll(); }
    });
  }

  /* ------------------------------------------------------------ clock */
  function tickClock() {
    var el = $('#clockPill');
    if (!el || $('#shell').hidden) return;
    var now = new Date();
    var utc = now.getTime() + now.getTimezoneOffset() * 60000;
    var cafe = new Date(utc + C.utcOffsetHours * 3600000);
    var DAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    var h = cafe.getHours() * 60 + cafe.getMinutes();
    var hh = C.hours[DAY[cafe.getDay()]] || ['09:00', '21:00'];
    var toMin = function (s) { var p = s.split(':'); return (+p[0]) * 60 + (+p[1]); };
    var open = h >= toMin(hh[0]) && h < toMin(hh[1]);
    el.className = 'pill ' + (open ? 'ok' : 'err');
    el.innerHTML = '<span class="dot"></span> Ella ' + cafe.toTimeString().slice(0, 5) + ' · ' + (open ? 'open until ' + hh[1] : 'closed');
  }

  /* ------------------------------------------------------------- boot */
  async function enterPanel() {
    $('#gate').hidden = true;
    $('#shell').hidden = false;
    bind();
    await loadAll();
    tickClock();
    if (!enterPanel.clockTimer) enterPanel.clockTimer = setInterval(tickClock, 30000);
    if (S.timer) clearInterval(S.timer);
    S.timer = setInterval(loadAll, 25000);           // live kitchen updates
    if (!enterPanel.visBound) {
      enterPanel.visBound = true;
      document.addEventListener('visibilitychange', function () { if (!document.hidden && $('#shell').hidden === false) loadAll(); });
    }
  }

  async function boot() {
    try { I.init(); } catch (e) {}
    bindGate();
    var restored = await restoreSession();
    if (restored) await enterPanel();
    else { var p = $('#pinInput'); if (p) p.focus(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
