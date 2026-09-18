/* ==========================================================================
   UMBRELLA CAFE — ELLA · front-end application
   3D menu panel · multilingual (EN/FR/RU/DE) · ordering · table booking
   Zero dependencies. Works as a static site (WhatsApp mode) or with the
   bundled Node panel API (orders & bookings are stored server-side).
   ========================================================================== */
(function () {
  'use strict';

  var C = window.UC_CONFIG;
  var I = window.UC_I18N;
  var M = window.UC_MENU;
  var t = I.t, L = I.L, money = I.money;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ------------------------------------------------------------- state */
  var state = {
    lang: 'en',
    cat: 'all',
    tag: null,
    q: '',
    sort: 'popular',
    cart: [],
    overrides: {},      // itemId -> {price, available}
    api: false,         // panel API reachable?
    orderType: 'dineIn',
    guests: 2,
    area: 'any',
    booking: null
  };

  var CAT_BY_ID = {};
  M.categories.forEach(function (c) { CAT_BY_ID[c.id] = c; });
  var ITEM_BY_ID = {};
  M.items.forEach(function (it) { ITEM_BY_ID[it.id] = it; });

  /* ------------------------------------------------------- persistence */
  function save(key, val) { try { localStorage.setItem('uc_' + key, JSON.stringify(val)); } catch (e) {} }
  function load(key, fallback) {
    try { var v = localStorage.getItem('uc_' + key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }

  /* ------------------------------------------------------------- toasts */
  function toast(msg, kind) {
    var wrap = $('#toastWrap');
    var el = document.createElement('div');
    el.className = 'toast' + (kind ? ' ' + kind : '');
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 320); }, 2600);
  }

  /* ============================================================ TIME / OPEN */
  function cafeNow() {
    // current time in Asia/Colombo (UTC+5:30) independent of device timezone
    var now = new Date();
    var utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + C.utcOffsetHours * 3600000);
  }
  var DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  function openState() {
    var now = cafeNow();
    var key = DAY_KEYS[now.getDay()];
    var hhmm = C.hours[key];
    var mins = now.getHours() * 60 + now.getMinutes();
    if (!hhmm) return { open: false, today: key };
    var o = toMin(hhmm[0]), c = toMin(hhmm[1]);
    return { open: mins >= o && mins < c, today: key, opens: hhmm[0], closes: hhmm[1], mins: mins, o: o, c: c };
  }
  function toMin(s) { var p = String(s).split(':'); return (+p[0]) * 60 + (+p[1]); }
  function fmtTime(s) { return s; }

  function renderStatus() {
    var st = openState();
    var pill = $('#openStatus'), txt = $('#openStatusText');
    pill.classList.toggle('is-open', st.open);
    pill.classList.toggle('is-closed', !st.open);
    if (st.open) {
      txt.textContent = t('status.open') + ' · ' + t('status.openUntil', { time: fmtTime(st.closes) });
    } else {
      txt.textContent = t('status.closed') + ' · ' + t('status.opensAt', { time: fmtTime(st.opens) });
    }
  }

  function renderHours() {
    var st = openState();
    [['#hoursList', true], ['#hoursList2', true], ['#footerHours', false]].forEach(function (pair) {
      var host = $(pair[0]); if (!host) return;
      var isList = pair[1];
      host.innerHTML = '';
      C.hoursOrder.forEach(function (k) {
        var h = C.hours[k];
        var label = t('hours.' + k);
        var val = h ? h[0] + ' – ' + h[1] : '—';
        var row;
        if (isList) {
          row = document.createElement('div');
          row.className = 'hours-row' + (k === st.today ? ' today' : '');
          row.innerHTML = '<span>' + label + (k === st.today ? ' · ' + t('status.today') : '') + '</span><span>' + val + '</span>';
        } else {
          row = document.createElement('li');
          row.innerHTML = '<span style="color:' + (k === st.today ? '#ffc21f' : '#cfe4da') + '">' + label + '</span> ' + val;
        }
        host.appendChild(row);
      });
    });
  }

  /* =============================================================== I18N UI */
  function applyTranslations() {
    $$('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    $$('[data-i18n-html]').forEach(function (el) { el.innerHTML = t(el.getAttribute('data-i18n-html')); });
    $('#menuSearch').setAttribute('placeholder', t('menu.search'));
    $('#bkOccasion').setAttribute('placeholder', t('booking.occasion') + ' — birthday, anniversary…');
    $('#bkNotes').setAttribute('placeholder', t('checkout.notes'));
    document.title = '☔ ' + C.name + ' Ella · ' + t('brand.tagline') + ' — ' + t('nav.menu') + ', ' + t('nav.order') + ' & ' + t('nav.booking');
    var meta = I.meta();
    var ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', t('hero.subtitle'));
    document.documentElement.lang = meta.code;
    renderStatus(); renderHours(); renderSortOptions(); renderFilters(); renderLangUI();
  }

  function renderLangUI() {
    var langs = I.available();
    var cur = I.getLang();
    $('#langCurrent').textContent = cur.toUpperCase();

    var menu = $('#langMenu');
    menu.innerHTML = '';
    langs.forEach(function (l) {
      var b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'menuitemradio');
      b.setAttribute('aria-checked', l.code === cur ? 'true' : 'false');
      b.innerHTML = '<span style="font-size:17px">' + l.flag + '</span><span>' + l.label + '</span>';
      b.onclick = function () { setLanguage(l.code); closeLangMenu(); };
      menu.appendChild(b);
    });

    var fl = $('#footerLang');
    fl.innerHTML = '';
    langs.forEach(function (l) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-pressed', l.code === cur ? 'true' : 'false');
      b.textContent = l.flag + ' ' + l.short;
      b.onclick = function () { setLanguage(l.code); };
      fl.appendChild(b);
    });
  }

  function setLanguage(code) { I.setLang(code); }

  /* any language change (UI or programmatic) re-renders the whole page */
  I.onChange(function (code) {
    state.lang = code;
    applyTranslations();
    renderCarousel(); renderMenu(); renderCart(); renderGallery();
    carIndex = 0; layoutCarousel();
  });

  function closeLangMenu() { $('#langMenu').classList.remove('open'); $('#langBtn').setAttribute('aria-expanded', 'false'); }

  /* ============================================================ 3D CAROUSEL */
  var carIndex = 0, carItems = [], carTimer = null, dragging = false, dragX = 0, dragDelta = 0;

  function signatureItems() {
    var sig = M.items.filter(function (i) { return i.signature; });
    var pop = M.items.filter(function (i) { return i.popular && !i.signature; });
    return sig.concat(pop).slice(0, 8);
  }

  function renderCarousel() {
    carItems = signatureItems();
    var host = $('#carousel3d'), dots = $('#carDots');
    host.innerHTML = ''; dots.innerHTML = '';
    carItems.forEach(function (item, idx) {
      var card = document.createElement('article');
      card.className = 'sig-card';
      card.dataset.idx = idx;
      card.innerHTML =
        '<div class="sig-media">' +
          '<span class="sig-badge">' + (item.tags.indexOf('chef') >= 0 ? '⭐ ' + t('menu.filter.chef') : (CAT_BY_ID[item.cat].emoji + ' ' + L(CAT_BY_ID[item.cat].n))) + '</span>' +
          mediaHTML(item, 'sig') +
          '<div class="sig-price">' + money(price(item)) + '</div>' +
        '</div>' +
        '<div class="sig-body">' +
          '<h3>' + esc(L(item.n)) + '</h3>' +
          '<p>' + esc(item.d ? L(item.d) : '') + '</p>' +
          '<button class="btn btn-primary btn-block" data-add="' + item.id + '">' + t('menu.add') + ' · ' + money(price(item)) + '</button>' +
        '</div>';
      host.appendChild(card);

      var d = document.createElement('span');
      dots.appendChild(d);
    });
    layoutCarousel();
    bindCarouselDrag();
    startCarouselTimer();
  }

  function layoutCarousel() {
    var cards = $$('.sig-card', $('#carousel3d'));
    var dots = $$('#carDots span');
    var total = cards.length;
    if (!total) return;
    var isMobile = window.matchMedia('(max-width: 900px)').matches;
    cards.forEach(function (card, i) {
      var off = i - carIndex;
      if (off > total / 2) off -= total;
      if (off < -total / 2) off += total;
      var abs = Math.abs(off);
      var x = off * (isMobile ? 74 : 62);           // % of card width
      var z = -abs * (isMobile ? 130 : 210);
      var rot = off * (isMobile ? 22 : 26);
      var scale = abs === 0 ? 1 : (abs === 1 ? .88 : .8);
      var op = abs > 2 ? 0 : (abs === 0 ? 1 : (abs === 1 ? .78 : .35));
      card.style.transform = 'translateX(' + x + '%) translateZ(' + z + 'px) rotateY(' + (-rot) + 'deg) scale(' + scale + ')';
      card.style.opacity = op;
      card.style.zIndex = 100 - abs;
      card.style.pointerEvents = abs === 0 ? 'auto' : 'none';
      card.setAttribute('aria-hidden', abs === 0 ? 'false' : 'true');
    });
    dots.forEach(function (d, i) { d.classList.toggle('on', i === carIndex); });
  }

  function carGo(dir) {
    var total = carItems.length;
    carIndex = (carIndex + dir + total) % total;
    layoutCarousel(); startCarouselTimer();
  }
  function startCarouselTimer() {
    if (carTimer) clearInterval(carTimer);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    carTimer = setInterval(function () { if (!dragging && !document.hidden) carGo(1); }, 6500);
  }

  function bindCarouselDrag() {
    var host = $('#carousel3d');
    if (host.dataset.bound) return;
    host.dataset.bound = '1';
    var startX = 0;
    host.addEventListener('pointerdown', function (e) { dragging = true; startX = e.clientX; dragDelta = 0; host.setPointerCapture(e.pointerId); });
    host.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      dragDelta = e.clientX - startX;
      var cards = $$('.sig-card', host);
      var cur = cards[carIndex];
      if (cur) cur.style.transform += ' translateX(' + dragDelta * 0.35 + 'px)';
    });
    var end = function () {
      if (!dragging) return;
      dragging = false;
      if (Math.abs(dragDelta) > 46) carGo(dragDelta < 0 ? 1 : -1);
      else layoutCarousel();
    };
    host.addEventListener('pointerup', end);
    host.addEventListener('pointercancel', end);
    host.addEventListener('pointerleave', end);
    $('#carPrev').onclick = function () { carGo(-1); };
    $('#carNext').onclick = function () { carGo(1); };
    $('#carDots').onclick = function (e) {
      var idx = $$('#carDots span').indexOf(e.target);
      if (idx >= 0) { carIndex = idx; layoutCarousel(); startCarouselTimer(); }
    };
    host.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { e.preventDefault(); carGo(e.deltaX > 0 ? 1 : -1); }
    }, { passive: false });
    document.addEventListener('keydown', function (e) {
      if (!isSectionVisible('#signature')) return;
      if (e.key === 'ArrowLeft') carGo(-1);
      if (e.key === 'ArrowRight') carGo(1);
    });
  }

  function isSectionVisible(sel) {
    var el = $(sel); if (!el) return false;
    var r = el.getBoundingClientRect();
    return r.top < window.innerHeight * 0.7 && r.bottom > window.innerHeight * 0.3;
  }

  /* =============================================================== MENU UI */
  function price(item) {
    var o = state.overrides[item.id];
    if (o && typeof o.price === 'number') return o.price;
    if (item.options && item.options.length) return Math.min.apply(null, item.options.map(function (x) { return x.price; }));
    return item.price;
  }
  function isAvailable(item) {
    var o = state.overrides[item.id];
    return o && o.available === false ? false : true;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }

  /* tint group used by the placeholder tile while a dish photo is loading/missing */
  function tintOf(cat) {
    if (['juice', 'lassi', 'milkshake', 'tea', 'iced', 'softdrinks'].indexOf(cat) >= 0) return 'blue';
    if (['pancakes', 'sweet', 'icecream'].indexOf(cat) >= 0) return 'yellow';
    if (['soup', 'starters', 'omelette', 'boiled', 'chopsey'].indexOf(cat) >= 0) return 'amber';
    return 'green';
  }

  function mediaHTML(item, size) {
    return '<div class="fallback t-' + tintOf(item.cat) + '" aria-hidden="true"><span>' + (item.emoji || '🍽️') + '</span></div>' +
      '<img src="' + item.img + '" alt="' + esc(t('a11y.dishImage', { name: L(item.n) })) + '" loading="lazy" decoding="async" onerror="this.remove()">';
  }

  function renderCatChips() {
    var host = $('#catChips');
    host.innerHTML = '';
    var all = document.createElement('button');
    all.className = 'chip' + (state.cat === 'all' ? ' on' : '');
    all.type = 'button'; all.setAttribute('role', 'tab');
    all.innerHTML = '✨ ' + t('menu.all');
    all.onclick = function () { state.cat = 'all'; renderCatChips(); renderMenu(); };
    host.appendChild(all);

    M.categories.forEach(function (c) {
      var b = document.createElement('button');
      b.className = 'chip' + (state.cat === c.id ? ' on ' + (c.id === 'juice' || c.id === 'sweet' ? 'yellow' : (c.id === 'tea' || c.id === 'iced' || c.id === 'softdrinks' ? 'blue' : '')) : '');
      b.type = 'button'; b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', state.cat === c.id ? 'true' : 'false');
      b.innerHTML = c.emoji + ' ' + L(c.n);
      b.onclick = function () { state.cat = c.id; renderCatChips(); renderMenu(); scrollToMenu(); };
      host.appendChild(b);
    });
  }

  var TAGS = ['veg', 'vegan', 'chicken', 'prawns', 'cheese', 'chef'];
  function renderFilters() {
    var host = $('#filterChips');
    host.innerHTML = '';
    TAGS.concat(['popular']).forEach(function (tag) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (state.tag === tag ? ' on ' + (tag === 'chef' || tag === 'popular' ? 'yellow' : (tag === 'prawns' || tag === 'chicken' ? 'blue' : '')) : '');
      var label = tag === 'popular' ? t('menu.filter.popular') : t('menu.filter.' + tag);
      var icon = tag === 'veg' ? '🥬' : tag === 'vegan' ? '🌱' : tag === 'chicken' ? '🍗' : tag === 'prawns' ? '🍤' : tag === 'cheese' ? '🧀' : tag === 'chef' ? '⭐' : '❤️';
      b.innerHTML = icon + ' ' + label;
      b.onclick = function () { state.tag = state.tag === tag ? null : tag; renderFilters(); renderMenu(); };
      host.appendChild(b);
    });
  }

  function renderSortOptions() {
    var sel = $('#menuSort');
    var cur = state.sort;
    sel.innerHTML = '';
    [['popular', 'menu.sort.popular'], ['priceAsc', 'menu.sort.priceAsc'], ['priceDesc', 'menu.sort.priceDesc'], ['name', 'menu.sort.name']].forEach(function (o) {
      var op = document.createElement('option');
      op.value = o[0]; op.textContent = t('menu.sort.label') + ': ' + t(o[1]);
      sel.appendChild(op);
    });
    sel.value = cur;
  }

  function filteredItems() {
    var q = state.q.trim().toLowerCase();
    var list = M.items.filter(function (it) {
      if (state.cat !== 'all' && it.cat !== state.cat) return false;
      if (state.tag === 'popular') { if (!it.popular && !it.signature) return false; }
      else if (state.tag && (it.tags || []).indexOf(state.tag) < 0) return false;
      if (!isAvailable(it)) return false;
      if (!q) return true;
      var hay = [it.n.en, it.n.fr, it.n.ru, it.n.de, it.id, CAT_BY_ID[it.cat].n.en, CAT_BY_ID[it.cat].n[I.getLang()],
                 it.d ? (it.d.en + ' ' + it.d[I.getLang()]) : ''].join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });

    var lang = I.getLang();
    list.sort(function (a, b) {
      if (state.sort === 'priceAsc') return price(a) - price(b);
      if (state.sort === 'priceDesc') return price(b) - price(a);
      if (state.sort === 'name') return L(a.n).localeCompare(L(b.n), lang);
      var sa = (a.signature ? 2 : 0) + (a.popular ? 1 : 0);
      var sb = (b.signature ? 2 : 0) + (b.popular ? 1 : 0);
      if (sb !== sa) return sb - sa;
      return M.items.indexOf(a) - M.items.indexOf(b);
    });
    return list;
  }

  function renderMenu() {
    var host = $('#menuContent');
    var list = filteredItems();
    host.innerHTML = '';
    $('#resultsCount').textContent = t('menu.results', { count: list.length });

    if (!list.length) {
      host.innerHTML = '<div class="no-results"><span class="emoji">🔍</span><p>' + esc(t('menu.noResults')) + '</p>' +
        '<button class="btn btn-ghost" id="resetFilters">' + esc(t('menu.resetFilters')) + '</button></div>';
      $('#resetFilters').onclick = function () { state.q = ''; state.tag = null; state.cat = 'all'; $('#menuSearch').value = ''; $('#searchClear').classList.remove('show'); renderFilters(); renderCatChips(); renderMenu(); };
      return;
    }

    // group by category (keeps menu order) unless a sort overrides grouping
    var grouped = state.sort === 'popular' && state.cat === 'all';
    var blocks = [];
    if (grouped) {
      var byCat = {};
      list.forEach(function (it) { (byCat[it.cat] = byCat[it.cat] || []).push(it); });
      M.categories.forEach(function (c) { if (byCat[c.id]) blocks.push({ cat: c, items: byCat[c.id] }); });
    } else {
      blocks.push({ cat: null, items: list });
    }

    blocks.forEach(function (block) {
      if (block.cat) {
        var head = document.createElement('div');
        head.className = 'cat-head';
        head.innerHTML =
          '<span class="cat-emoji">' + block.cat.emoji + '</span>' +
          '<div><h3>' + esc(L(block.cat.n)) + '</h3>' + (block.cat.blurb ? '<p>' + esc(L(block.cat.blurb)) + '</p>' : '') + '</div>' +
          '<span class="cat-line"></span>';
        head.id = 'cat-' + block.cat.id;
        host.appendChild(head);
      }
      var grid = document.createElement('div');
      grid.className = 'menu-grid';
      block.items.forEach(function (item) { grid.appendChild(dishCard(item)); });
      host.appendChild(grid);
    });

    bindTilt();
  }

  function dishCard(item) {
    var card = document.createElement('article');
    card.className = 'dish-card' + (isAvailable(item) ? '' : ' soldout');
    card.dataset.id = item.id;

    var tags = (item.tags || []).slice(0, 3).map(function (tg) {
      var label = tg === 'chef' ? '⭐ ' + t('menu.filter.chef') : (tg === 'veg' ? '🥬 ' + t('menu.filter.veg') : tg === 'vegan' ? '🌱 ' + t('menu.filter.vegan') : tg === 'chicken' ? '🍗' : tg === 'prawns' ? '🍤' : tg === 'cheese' ? '🧀' : tg);
      return '<span class="tag ' + tg + '">' + esc(label) + '</span>';
    }).join('');
    if (item.popular) tags += '<span class="tag popular">❤️</span>';

    var hasOptions = (item.options && item.options.length) || (item.addons && item.addons.length);
    var inCart = cartQty(item.id);
    var priceLabel = (item.options && item.options.length ? '<small>' + esc(t('menu.from')) + '</small> ' : '') + money(price(item));

    card.innerHTML =
      '<div class="dish-media">' + mediaHTML(item) + '<div class="gloss"></div><div class="dish-tags">' + tags + '</div></div>' +
      '<div class="dish-body">' +
        '<h3 class="dish-name">' + esc(L(item.n)) + '</h3>' +
        (item.d ? '<p class="dish-desc">' + esc(L(item.d)) + '</p>' : '') +
        '<div class="dish-foot">' +
          '<span class="price-coin">' + priceLabel + '</span>' +
          (isAvailable(item)
            ? (inCart
              ? '<span class="qty-stepper" data-step="' + item.id + '"><button data-dec="' + item.id + '" aria-label="−">−</button><span class="qty">' + inCart + '</span><button data-inc="' + item.id + '" aria-label="+">+</button></span>'
              : '<button class="add-btn' + (hasOptions ? ' select' : '') + '" data-add="' + item.id + '">' + (hasOptions ? esc(t('menu.select')) + ' ▸' : '+ ' + esc(t('menu.add'))) + '</button>')
            : '') +
        '</div>' +
      '</div>' +
      (isAvailable(item) ? '' : '<div class="soldout-flag">' + esc(t('menu.unavailable')) + '</div>');

    if (!isAvailable(item)) card.querySelector('.add-btn, .qty-stepper') || null;
    return card;
  }

  function scrollToMenu() {
    var el = $('#menu');
    if (el) window.scrollTo({ top: el.offsetTop - 78, behavior: 'smooth' });
  }

  /* ------------------------------------------------------- 3D tilt effect */
  function bindTilt() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    $$('.dish-card').forEach(function (card) {
      if (card.dataset.tilt) return;
      card.dataset.tilt = '1';
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - .5;
        var py = (e.clientY - r.top) / r.height - .5;
        card.style.transform = 'perspective(900px) rotateY(' + (px * 9) + 'deg) rotateX(' + (-py * 9) + 'deg) translateZ(10px) scale(1.018)';
      });
      card.addEventListener('mouseleave', function () { card.style.transform = ''; });
    });
  }

  /* ========================================================= ITEM MODAL */
  var modalItem = null, modalOption = null, modalAddons = {}, modalQty = 1;

  function openItemModal(id) {
    var item = ITEM_BY_ID[id];
    if (!item) return;
    modalItem = item;
    modalQty = 1;
    modalAddons = {};
    modalOption = item.options && item.options.length ? item.options[0].id : null;

    var modal = $('#optionModal');
    modal.innerHTML =
      '<div class="modal-head">' + mediaHTML(item) +
        '<button class="modal-close" id="optClose" aria-label="' + esc(t('common.close')) + '"><svg width="17" height="17"><use href="#i-close"/></svg></button>' +
        '<h3 class="modal-title" id="optTitle">' + esc(L(item.n)) + '</h3>' +
      '</div>' +
      '<div class="modal-body">' +
        (item.d ? '<p style="color:var(--ink-soft);font-size:13.6px;margin:0 0 6px">' + esc(L(item.d)) + '</p>' : '') +
        '<p style="font-size:12.5px;color:var(--ink-soft);margin:0">' + esc(L(CAT_BY_ID[item.cat].n)) + ' · ' + (item.tags || []).map(function (x) { return esc(t('menu.filter.' + x) || x); }).join(' · ') + '</p>' +
        optionsHTML(item) + addonsHTML(item) +
        '<div class="modal-qty">' +
          '<span style="font-weight:800">' + esc(t('common.qty')) + '</span>' +
          '<span class="qty-stepper"><button id="mQtyMinus" aria-label="−">−</button><span class="qty" id="mQty">1</span><button id="mQtyPlus" aria-label="+">+</button></span>' +
          '<span class="modal-total" id="mTotal">' + money(price(item)) + '</span>' +
        '</div>' +
        '<button class="btn btn-primary btn-block btn-lg" id="mAdd"><svg width="18" height="18"><use href="#i-cart"/></svg> ' + esc(t('menu.add')) + '</button>' +
      '</div>';

    showModal(modal);
    $('#optClose').onclick = closeModals;
    $('#mQtyMinus').onclick = function () { modalQty = Math.max(1, modalQty - 1); syncModal(); };
    $('#mQtyPlus').onclick = function () { modalQty = Math.min(30, modalQty + 1); syncModal(); };
    $('#mAdd').onclick = function () {
      addItemToCart(modalItem, modalOption, Object.keys(modalAddons).filter(function (k) { return modalAddons[k]; }), modalQty);
      closeModals();
    };
    $$('#optionModal .option-row').forEach(function (row) {
      row.onclick = function () { modalOption = row.dataset.opt; syncModal(); };
    });
    $$('#optionModal .addon-row').forEach(function (row) {
      row.onclick = function () { modalAddons[row.dataset.addon] = !modalAddons[row.dataset.addon]; syncModal(); };
    });
    syncModal();
  }

  function optionsHTML(item) {
    if (!item.options || !item.options.length) return '';
    return '<p class="subhead">' + esc(t('menu.select')) + '</p><div class="option-list">' +
      item.options.map(function (o) {
        return '<button type="button" class="option-row' + (modalOption === o.id ? ' on' : '') + '" data-opt="' + o.id + '">' +
          '<span class="radio"></span><span class="oname">' + esc(L(o.n)) + '</span><span class="oprice">' + money(o.price) + '</span></button>';
      }).join('') + '</div>';
  }
  function addonsHTML(item) {
    if (!item.addons || !item.addons.length) return '';
    return '<p class="subhead">+ ' + esc(t('menu.add')) + '</p>' +
      item.addons.map(function (a) {
        return '<button type="button" class="addon-row' + (modalAddons[a.id] ? ' on' : '') + '" data-addon="' + a.id + '">' +
          '<span class="switch"></span><span class="oname">' + a.emoji + ' ' + esc(L(a.n)) + '</span><span class="oprice">+' + money(a.price) + '</span></button>';
      }).join('');
  }
  function modalUnitPrice() {
    if (!modalItem) return 0;
    var base = modalItem.price;
    if (modalItem.options && modalItem.options.length) {
      var o = modalItem.options.filter(function (x) { return x.id === modalOption; })[0];
      base = o ? o.price : modalItem.price;
    }
    var add = 0;
    Object.keys(modalAddons).forEach(function (k) {
      if (!modalAddons[k]) return;
      var a = (modalItem.addons || []).filter(function (x) { return x.id === k; })[0];
      if (a) add += a.price;
    });
    return base + add;
  }
  function syncModal() {
    $$('#optionModal .option-row').forEach(function (r) { r.classList.toggle('on', r.dataset.opt === modalOption); });
    $$('#optionModal .addon-row').forEach(function (r) { r.classList.toggle('on', !!modalAddons[r.dataset.addon]); });
    $('#mQty').textContent = modalQty;
    $('#mTotal').textContent = money(modalUnitPrice() * modalQty);
    $('#mAdd').innerHTML = '<svg width="18" height="18"><use href="#i-cart"/></svg> ' + esc(t('menu.add')) + ' · ' + money(modalUnitPrice() * modalQty);
  }

  function showModal(el) {
    $('#overlay').classList.add('show');
    el.classList.add('show');
    document.body.classList.add('no-scroll');
  }
  function closeModals() {
    $('#overlay').classList.remove('show');
    $$('.modal').forEach(function (m) { m.classList.remove('show'); });
    $('#cartDrawer').classList.remove('show');
    document.body.classList.remove('no-scroll');
  }

  /* ============================================================== CART */
  function lineKey(id, opt, addons) { return id + '|' + (opt || '') + '|' + (addons || []).slice().sort().join(','); }

  function addItemToCart(item, opt, addons, qty) {
    var unit = 0;
    var base = item.price;
    if (item.options && item.options.length && opt) {
      var o = item.options.filter(function (x) { return x.id === opt; })[0];
      if (o) base = o.price;
    }
    unit = base;
    (addons || []).forEach(function (aid) {
      var a = (item.addons || []).filter(function (x) { return x.id === aid; })[0] ||
              M.addons.filter(function (x) { return x.id === aid; })[0];
      if (a) unit += a.price;
    });
    var ov = state.overrides[item.id];
    if (ov && typeof ov.price === 'number') {
      var diff = ov.price - item.price;
      unit = Math.max(0, unit + diff);
    }

    var key = lineKey(item.id, opt, addons);
    var existing = state.cart.filter(function (l) { return l.key === key; })[0];
    if (existing) existing.qty += qty;
    else state.cart.push({ key: key, id: item.id, opt: opt || null, addons: addons || [], qty: qty, unit: unit });

    save('cart', state.cart);
    renderCart(); renderMenu(); bumpCart();
    toast(t('toast.added', { name: L(item.n) }), 'ok');
  }

  function setQty(key, qty) {
    var line = state.cart.filter(function (l) { return l.key === key; })[0];
    if (!line) return;
    line.qty = Math.max(0, qty);
    if (!line.qty) state.cart = state.cart.filter(function (l) { return l.key !== key; });
    save('cart', state.cart); renderCart(); renderMenu(); bumpCart();
  }

  function cartQty(id) {
    return state.cart.filter(function (l) { return l.id === id; }).reduce(function (s, l) { return s + l.qty; }, 0);
  }
  function cartCount() { return state.cart.reduce(function (s, l) { return s + l.qty; }, 0); }

  function totals() {
    var sub = state.cart.reduce(function (s, l) { return s + l.qty * l.unit; }, 0);
    var service = Math.round(sub * C.serviceCharge);
    return { sub: sub, service: service, total: sub + service, count: cartCount() };
  }

  function lineLabel(line) {
    var item = ITEM_BY_ID[line.id];
    var parts = [];
    if (line.opt && item.options) {
      var o = item.options.filter(function (x) { return x.id === line.opt; })[0];
      if (o) parts.push(L(o.n));
    }
    (line.addons || []).forEach(function (aid) {
      var a = (item.addons || []).filter(function (x) { return x.id === aid; })[0];
      if (a) parts.push(L(a.n).replace(/^(Add-on:|Supplément|Добавка|Extra)\s*/i, '+ '));
    });
    return parts.join(' · ');
  }

  function renderCart() {
    var body = $('#cartBody'), foot = $('#cartFoot');
    var tt = totals();
    $('#cartCount').textContent = tt.count; $('#cartCount').hidden = !tt.count;
    $('#mbCartCount').textContent = tt.count; $('#mbCartCount').hidden = !tt.count;
    $('#topCartCount').textContent = tt.count ? '(' + tt.count + ')' : '';

    if (!state.cart.length) {
      body.innerHTML = '<div class="empty-cart"><span class="emoji">🛒</span><h3 style="color:var(--ink);font-size:17px">' + esc(t('cart.empty')) + '</h3>' +
        '<p>' + esc(t('cart.emptyHint')) + '</p><button class="btn btn-primary" id="emptyBrowse">' + esc(t('cart.browse')) + '</button></div>';
      foot.innerHTML = '';
      $('#emptyBrowse').onclick = function () { closeModals(); scrollToMenu(); };
      return;
    }

    body.innerHTML = state.cart.map(function (line) {
      var item = ITEM_BY_ID[line.id];
      var lbl = lineLabel(line);
      return '<div class="cart-line" data-key="' + line.key + '">' +
        '<div class="cart-thumb">' + mediaHTML(item) + '</div>' +
        '<div class="cart-info">' +
          '<h4>' + esc(L(item.n)) + '</h4>' +
          (lbl ? '<p class="variant">' + esc(lbl) + '</p>' : '') +
          '<div class="cart-controls">' +
            '<span class="mini-stepper"><button data-dec-line="' + line.key + '" aria-label="−">−</button><span class="qty">' + line.qty + '</span><button data-inc-line="' + line.key + '" aria-label="+">+</button></span>' +
            '<button class="line-remove" data-del="' + line.key + '">' + esc(t('cart.remove')) + '</button>' +
          '</div>' +
        '</div>' +
        '<div style="text-align:right"><span class="line-total">' + money(line.qty * line.unit) + '</span><div style="font-size:11.5px;color:var(--ink-soft)">' + money(line.unit) + ' ' + esc(t('menu.perItem')) + '</div></div>' +
      '</div>';
    }).join('');

    foot.innerHTML =
      '<div class="totals">' +
        '<div class="row"><span>' + esc(t('cart.subtotal')) + '</span><span>' + money(tt.sub) + '</span></div>' +
        '<div class="row"><span>' + esc(t('cart.service')) + '</span><span>' + money(tt.service) + '</span></div>' +
        '<div class="row grand"><span>' + esc(t('cart.total')) + '</span><span>' + money(tt.total) + '</span></div>' +
      '</div>' +
      '<button class="btn btn-primary btn-block btn-lg" id="goCheckout">' + esc(t('cart.checkout')) + ' · ' + money(tt.total) + '</button>' +
      '<button class="btn btn-ghost btn-block" id="clearCart" style="margin-top:8px">' + esc(t('cart.clear')) + '</button>';

    $('#goCheckout').onclick = function () { openCheckout(); };
    $('#clearCart').onclick = function () { state.cart = []; save('cart', state.cart); renderCart(); renderMenu(); toast(t('toast.cartEmpty')); };
  }

  function bumpCart() {
    var b = $('#cartBtn');
    b.animate ? b.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 320 }) : null;
  }

  /* ============================================================ CHECKOUT */
  function openCheckout() {
    if (!state.cart.length) { toast(t('toast.cartEmpty'), 'err'); return; }
    var tt = totals();
    var modal = $('#checkoutModal');
    var saved = load('customer', {});

    modal.innerHTML =
      '<div class="drawer-head" style="border-radius:var(--r-xl) var(--r-xl) 0 0">' +
        '<svg width="22" height="22"><use href="#i-cart"/></svg><h2 id="coTitle" style="color:#fff">' + esc(t('checkout.title')) + '</h2>' +
        '<button class="icon-btn" id="coClose" aria-label="' + esc(t('common.close')) + '"><svg width="18" height="18"><use href="#i-close"/></svg></button>' +
      '</div>' +
      '<div class="modal-body">' +
        '<div class="totals" style="margin-bottom:14px">' +
          '<div class="row"><span>' + esc(t('cart.items', { count: tt.count })) + '</span><span>' + money(tt.sub) + '</span></div>' +
          '<div class="row"><span>' + esc(t('cart.service')) + '</span><span>' + money(tt.service) + '</span></div>' +
          '<div class="row grand"><span>' + esc(t('cart.total')) + '</span><span>' + money(tt.total) + '</span></div>' +
        '</div>' +
        '<p class="subhead">' + esc(t('cart.orderType')) + '</p>' +
        '<div class="seg" id="coType">' +
          '<button type="button" data-val="dineIn" class="' + (state.orderType === 'dineIn' ? 'on' : '') + '">🍽️ ' + esc(t('cart.dineIn')) + '</button>' +
          '<button type="button" data-val="takeaway" class="' + (state.orderType === 'takeaway' ? 'on' : '') + '">🥡 ' + esc(t('cart.takeaway')) + '</button>' +
          '<button type="button" data-val="delivery" class="' + (state.orderType === 'delivery' ? 'on' : '') + '">🛵 ' + esc(t('cart.delivery')) + '</button>' +
        '</div>' +
        '<div class="form-grid">' +
          '<div class="field full" id="fTableWrap" ' + (state.orderType === 'dineIn' ? '' : 'hidden') + '><label for="coTable">' + esc(t('cart.table')) + '</label><input id="coTable" type="text" inputmode="numeric" placeholder="1–12"></div>' +
          '<div class="field full" id="fAddrWrap" ' + (state.orderType === 'delivery' ? '' : 'hidden') + '><label for="coAddr">' + esc(t('cart.address')) + ' <span class="req">*</span></label><input id="coAddr" type="text" value="' + esc(saved.address || '') + '" placeholder="Hotel / guest house, Ella"></div>' +
          '<div class="field"><label for="coName">' + esc(t('checkout.name')) + ' <span class="req">*</span></label><input id="coName" type="text" required value="' + esc(saved.name || '') + '" autocomplete="name"></div>' +
          '<div class="field"><label for="coPhone">' + esc(t('checkout.phone')) + ' <span class="req">*</span></label><input id="coPhone" type="tel" required value="' + esc(saved.phone || '') + '" autocomplete="tel" placeholder="+94 …"></div>' +
          '<div class="field"><label for="coTime">' + esc(t('cart.time')) + '</label><input id="coTime" type="time"></div>' +
          '<div class="field"><label for="coEmail">' + esc(t('checkout.email')) + '</label><input id="coEmail" type="email" value="' + esc(saved.email || '') + '"></div>' +
          '<div class="field full"><label for="coNotes">' + esc(t('checkout.notes')) + '</label><textarea id="coNotes" rows="2" placeholder="Less spicy, no onion…"></textarea></div>' +
        '</div>' +
        '<button class="btn btn-primary btn-block btn-lg" id="coSubmit" style="margin-top:14px"><svg width="18" height="18"><use href="#i-check"/></svg> ' + esc(t('checkout.submit')) + '</button>' +
        '<p class="form-note">💛 ' + esc(t('menu.serviceNote')) + '</p>' +
      '</div>';

    $('#cartDrawer').classList.remove('show');
    showModal(modal);
    $('#coClose').onclick = closeModals;

    $$('#coType button').forEach(function (b) {
      b.onclick = function () {
        state.orderType = b.dataset.val;
        $$('#coType button').forEach(function (x) { x.classList.toggle('on', x === b); });
        $('#fTableWrap').hidden = state.orderType !== 'dineIn';
        $('#fAddrWrap').hidden = state.orderType !== 'delivery';
      };
    });
    $('#coSubmit').onclick = submitOrder;
  }

  function orderCode() {
    var s = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var out = '';
    for (var i = 0; i < 5; i++) out += s[Math.floor(Math.random() * s.length)];
    return 'UC-' + out;
  }

  function buildOrderLines(lang) {
    return state.cart.map(function (line) {
      var item = ITEM_BY_ID[line.id];
      var nameL = lang === 'en' ? item.n.en : L(item.n);
      var extra = [];
      if (line.opt && item.options) {
        var o = item.options.filter(function (x) { return x.id === line.opt; })[0];
        if (o) extra.push(lang === 'en' ? o.n.en : L(o.n));
      }
      (line.addons || []).forEach(function (aid) {
        var a = (item.addons || []).filter(function (x) { return x.id === aid; })[0];
        if (a) extra.push('+ ' + (lang === 'en' ? a.n.en : L(a.n)).replace(/^(Add-on:|Supplément|Добавка|Extra)\s*/i, ''));
      });
      return {
        id: item.id, name: nameL, nameLocal: L(item.n),
        option: line.opt, addons: line.addons, extra: extra.join(', '),
        qty: line.qty, unit: line.unit, lineTotal: line.qty * line.unit
      };
    });
  }

  function whatsappText(payload, kind) {
    var lines = [];
    if (kind === 'order') {
      lines.push('*UMBRELLA CAFE — NEW ORDER / අලුත් ඔර්ඩර්*');
      lines.push('Order code: *' + payload.code + '*');
      lines.push('Type: ' + payload.typeLabel + (payload.table ? ' · Table ' + payload.table : '') + (payload.address ? ' · ' + payload.address : ''));
      lines.push('Name: ' + payload.name + ' · Phone: ' + payload.phone + (payload.email ? ' · ' + payload.email : ''));
      lines.push(payload.when ? 'Preferred time: ' + payload.when : 'Time: ASAP');
      lines.push('');
      lines.push('*Items:*');
      payload.lines.forEach(function (l) {
        lines.push('• ' + l.qty + ' × ' + l.name + (l.extra ? ' (' + l.extra + ')' : '') + ' — Rs. ' + l.lineTotal.toLocaleString('en-US'));
      });
      lines.push('');
      lines.push('Subtotal: Rs. ' + payload.subtotal.toLocaleString('en-US'));
      lines.push('Service charge (10%): Rs. ' + payload.service.toLocaleString('en-US'));
      lines.push('*TOTAL: Rs. ' + payload.total.toLocaleString('en-US') + '*');
      if (payload.notes) lines.push('');
      if (payload.notes) lines.push('Notes: ' + payload.notes);
      lines.push('');
      lines.push('Language / Langue / Язык / Sprache: ' + I.meta().label);
    } else {
      lines.push('*UMBRELLA CAFE — TABLE BOOKING / ටේබල් බුකින්*');
      lines.push('Booking ref: *' + payload.code + '*');
      lines.push('Name: ' + payload.name + ' · Phone: ' + payload.phone + (payload.email ? ' · ' + payload.email : ''));
      lines.push('Date: ' + payload.date + ' · Time: ' + payload.time);
      lines.push('Guests: ' + payload.guests + ' · Seating: ' + payload.areaLabel);
      if (payload.occasion) lines.push('Occasion: ' + payload.occasion);
      if (payload.notes) lines.push('Notes: ' + payload.notes);
      lines.push('');
      lines.push('Language: ' + I.meta().label);
    }
    return lines.join('\n');
  }

  function waLink(text) { return 'https://wa.me/' + C.whatsapp + '?text=' + encodeURIComponent(text); }

  async function apiPost(path, body) {
    var ctrl = new AbortController();
    var to = setTimeout(function () { ctrl.abort(); }, 7000);
    try {
      var r = await fetch(path, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(body), signal: ctrl.signal
      });
      clearTimeout(to);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) { clearTimeout(to); throw e; }
  }

  async function submitOrder() {
    var name = $('#coName').value.trim();
    var phone = $('#coPhone').value.trim();
    var addr = ($('#coAddr') ? $('#coAddr').value.trim() : '');
    if (!name) { markInvalid('#coName'); return; }
    if (!phone) { markInvalid('#coPhone'); return; }
    if (state.orderType === 'delivery' && !addr) { markInvalid('#coAddr'); return; }

    save('customer', { name: name, phone: phone, email: $('#coEmail').value.trim(), address: addr });

    var tt = totals();
    var code = orderCode();
    var typeLabel = t('cart.' + state.orderType);
    var payload = {
      code: code, type: state.orderType, typeLabel: typeLabel,
      table: $('#coTable') ? $('#coTable').value.trim() : '',
      address: addr, when: $('#coTime').value, notes: $('#coNotes').value.trim(),
      name: name, phone: phone, email: $('#coEmail').value.trim(),
      lang: I.getLang(), currency: C.currency,
      subtotal: tt.sub, service: tt.service, total: tt.total,
      lines: buildOrderLines('en'), linesLocal: buildOrderLines(I.getLang())
    };

    var btn = $('#coSubmit');
    btn.disabled = true; btn.innerHTML = t('checkout.submitting');

    var stored = false;
    if (state.api) {
      try { var res = await apiPost('/api/orders', payload); if (res && (res.ok || res.code)) stored = true; if (res && res.code) payload.code = res.code; }
      catch (e) { console.warn('API order failed, falling back to WhatsApp', e); }
    }
    if (!stored) {
      var local = load('orders', []); local.unshift(Object.assign({ createdAt: new Date().toISOString(), status: 'new', channel: 'local' }, payload));
      save('orders', local.slice(0, 60));
    }

    var msg = whatsappText(payload, 'order');
    var url = waLink(msg);
    window.open(url, '_blank', 'noopener');

    state.cart = [];
    save('cart', state.cart);
    renderCart(); renderMenu();

    showSuccess('#checkoutModal', {
      title: t('checkout.success'),
      body: t('checkout.successBody', { name: esc(name), code: payload.code }),
      code: payload.code, wa: url,
      extra: orderSummaryHTML(payload)
    });
  }

  function orderSummaryHTML(p) {
    return '<div style="text-align:left;background:var(--paper);border:1px solid var(--line);border-radius:var(--r-md);padding:12px 14px;margin-bottom:14px;font-size:13.4px">' +
      p.linesLocal.map(function (l) { return '<div style="display:flex;justify-content:space-between;gap:10px;padding:3px 0"><span>' + l.qty + ' × ' + esc(l.nameLocal) + (l.extra ? ' <small style="color:var(--ink-soft)">(' + esc(l.extra) + ')</small>' : '') + '</span><b>' + money(l.lineTotal) + '</b></div>'; }).join('') +
      '<div style="display:flex;justify-content:space-between;border-top:1px dashed var(--line);margin-top:7px;padding-top:7px"><span>' + esc(t('cart.subtotal')) + '</span><b>' + money(p.subtotal) + '</b></div>' +
      '<div style="display:flex;justify-content:space-between"><span>' + esc(t('cart.service')) + '</span><b>' + money(p.service) + '</b></div>' +
      '<div style="display:flex;justify-content:space-between;font-size:16px;color:var(--green-deep)"><span>' + esc(t('cart.total')) + '</span><b>' + money(p.total) + '</b></div>' +
      '</div>';
  }

  function showSuccess(hostSel, o) {
    var host = $(hostSel);
    host.innerHTML =
      '<div class="modal-body"><div class="success-panel">' +
        '<div class="tick"><svg width="34" height="34"><use href="#i-check"/></svg></div>' +
        '<h3>' + esc(o.title) + '</h3>' +
        '<div class="code-box">' + esc(o.code) + '</div>' +
        '<p>' + o.body + '</p>' +
        (o.extra || '') +
        '<div class="success-actions">' +
          '<a class="btn btn-primary btn-lg" href="' + o.wa + '" target="_blank" rel="noopener"><svg width="18" height="18"><use href="#i-whatsapp"/></svg> ' + esc(t('common.confirmWhatsapp')) + '</a>' +
          '<button class="btn btn-ghost btn-lg" id="succClose">' + esc(t('common.close')) + '</button>' +
        '</div>' +
      '</div></div>';
    $('#succClose').onclick = function () { closeModals(); if (o.onClose) o.onClose(); };
  }

  function markInvalid(sel) {
    var el = $(sel); if (!el) return;
    el.closest('.field').classList.add('invalid');
    el.focus();
    toast(t('common.required'), 'err');
    el.addEventListener('input', function () { el.closest('.field').classList.remove('invalid'); }, { once: true });
  }

  /* ============================================================ BOOKING */
  function initBooking() {
    var dateEl = $('#bkDate'), timeEl = $('#bkTime');
    var today = new Date(cafeNow());
    var iso = today.toISOString().slice(0, 10);
    dateEl.min = iso; dateEl.value = iso;
    var max = new Date(today.getTime() + 60 * 86400000);
    dateEl.max = max.toISOString().slice(0, 10);
    var st = openState();
    timeEl.value = st.open ? nextSlot(st.mins) : (st.opens || '09:00');

    $('#guestMinus').onclick = function () { setGuests(state.guests - 1); };
    $('#guestPlus').onclick = function () { setGuests(state.guests + 1); };
    $$('#bkArea button').forEach(function (b) {
      b.onclick = function () { state.area = b.dataset.val; $$('#bkArea button').forEach(function (x) { x.classList.toggle('on', x === b); }); };
    });
    $('#bookingForm').addEventListener('submit', submitBooking);
    setGuests(load('guests', 2));
  }
  function nextSlot(mins) {
    var m = Math.ceil((mins + 20) / 15) * 15;
    if (m > 20 * 60 + 45) m = 9 * 60;
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  }
  function setGuests(v) {
    state.guests = Math.max(1, Math.min(C.booking.maxGuests, v));
    save('guests', state.guests);
    var label = state.guests === 1 ? t('booking.guest') : t('booking.guestsWord');
    $('#guestValue').innerHTML = state.guests + ' <small style="font-size:12px;color:var(--ink-soft)">' + esc(label) + '</small>';
  }

  async function submitBooking(e) {
    e.preventDefault();
    var name = $('#bkName').value.trim(), phone = $('#bkPhone').value.trim();
    var date = $('#bkDate').value, time = $('#bkTime').value;
    if (!name) return markInvalid('#bkName');
    if (!phone) return markInvalid('#bkPhone');
    if (!date) return markInvalid('#bkDate');
    if (!time) return markInvalid('#bkTime');

    var areaLabel = t('booking.' + (state.area === 'any' ? 'any' : state.area));
    var payload = {
      code: 'BK-' + orderCode().slice(3), name: name, phone: phone,
      email: $('#bkEmail').value.trim(), date: date, time: time,
      guests: state.guests, area: state.area, areaLabel: areaLabel,
      occasion: $('#bkOccasion').value.trim(), notes: $('#bkNotes').value.trim(),
      lang: I.getLang()
    };

    var btn = $('#bookingForm').querySelector('button[type=submit]');
    btn.disabled = true; btn.innerHTML = t('checkout.submitting');

    var stored = false;
    if (state.api) {
      try { var res = await apiPost('/api/bookings', payload); if (res && (res.ok || res.code)) stored = true; if (res && res.code) payload.code = res.code; }
      catch (err) { console.warn('API booking failed, falling back to WhatsApp', err); }
    }
    if (!stored) {
      var local = load('bookings', []); local.unshift(Object.assign({ createdAt: new Date().toISOString(), status: 'new', channel: 'local' }, payload));
      save('bookings', local.slice(0, 60));
    }

    var msg = whatsappText(payload, 'booking');
    var url = waLink(msg);
    if (!stored) window.open(url, '_blank', 'noopener');

    $('#bookingFormWrap').hidden = true;
    var host = $('#bookingSuccess');
    host.hidden = false;
    host.innerHTML =
      '<div class="success-panel">' +
        '<div class="tick"><svg width="34" height="34"><use href="#i-check"/></svg></div>' +
        '<h3>' + esc(t('booking.success')) + '</h3>' +
        '<div class="code-box">' + esc(payload.code) + '</div>' +
        '<p>' + t('booking.successBody', {
          name: esc(name), code: payload.code, guests: payload.guests + ' ' + (payload.guests === 1 ? esc(t('booking.guest')) : esc(t('booking.guestsWord'))),
          date: '<b>' + esc(date) + '</b>', time: '<b>' + esc(time) + '</b>'
        }) + '</p>' +
        '<div style="text-align:left;background:var(--paper);border:1px solid var(--line);border-radius:var(--r-md);padding:12px 14px;margin-bottom:14px;font-size:13.6px">' +
          '<div>👤 <b>' + esc(name) + '</b> · 📞 ' + esc(phone) + '</div>' +
          '<div>📅 ' + esc(date) + ' · 🕒 ' + esc(time) + ' · 👥 ' + payload.guests + '</div>' +
          '<div>💺 ' + esc(areaLabel) + (payload.occasion ? ' · 🎉 ' + esc(payload.occasion) : '') + '</div>' +
        '</div>' +
        '<div class="success-actions">' +
          '<a class="btn btn-primary btn-lg" href="' + url + '" target="_blank" rel="noopener"><svg width="18" height="18"><use href="#i-whatsapp"/></svg> ' + esc(t('common.confirmWhatsapp')) + '</a>' +
          '<button class="btn btn-ghost btn-lg" id="bkAgain">' + esc(t('booking.new')) + '</button>' +
        '</div>' +
      '</div>';
    $('#bkAgain').onclick = function () {
      host.hidden = true; host.innerHTML = '';
      $('#bookingFormWrap').hidden = false;
      $('#bookingForm').reset(); btn.disabled = false;
      btn.innerHTML = '<svg width="19" height="19"><use href="#i-check"/></svg> ' + t('booking.submit');
      initBooking();
    };
    toast(t('booking.success'), 'ok');
  }

  /* ============================================================= GALLERY */
  function renderGallery() {
    var host = $('#galleryGrid');
    var picks = ['assets/img/hero-ella.jpg|🌄|' + t('brand.tagline') + '|green']
      .concat(signatureItems().slice(0, 6).map(function (i) { return i.img + '|' + i.emoji + '|' + L(i.n) + '|' + tintOf(i.cat); }));
    host.innerHTML = picks.map(function (p, idx) {
      var parts = p.split('|');
      var tint = parts[3] || (idx % 2 ? 'blue' : 'green');
      return '<figure class="g-item" style="margin:0">' +
        '<div class="fallback t-' + tint + '" aria-hidden="true"><span>' + parts[1] + '</span></div>' +
        '<img src="' + parts[0] + '" alt="' + esc(parts[2]) + '" loading="lazy" decoding="async" onerror="this.remove()">' +
        '<figcaption class="cap">' + esc(parts[2]) + '</figcaption></figure>';
    }).join('');
  }

  /* ================================================================ API */
  async function detectApi() {
    try {
      var ctrl = new AbortController();
      var to = setTimeout(function () { ctrl.abort(); }, 2500);
      var r = await fetch('api/health', { signal: ctrl.signal, headers: { Accept: 'application/json' } });
      clearTimeout(to);
      if (r.ok) {
        var j = await r.json();
        state.api = true;
        if (j && j.overrides) state.overrides = j.overrides;
      }
    } catch (e) { state.api = false; }
  }

  /* ============================================================ EVENTS */
  function bindEvents() {
    /* global click delegation: add / qty / cart */
    document.addEventListener('click', function (e) {
      var addBtn = e.target.closest('[data-add]');
      if (addBtn) {
        e.preventDefault();
        var item = ITEM_BY_ID[addBtn.dataset.add];
        var hasOpts = (item.options && item.options.length) || (item.addons && item.addons.length);
        if (hasOpts) openItemModal(item.id);
        else addItemToCart(item, null, [], 1);
        return;
      }
      var inc = e.target.closest('[data-inc]');
      if (inc) { var it1 = ITEM_BY_ID[inc.dataset.inc]; var q1 = cartQty(it1.id); setQtyByItem(it1.id, q1 + 1); return; }
      var dec = e.target.closest('[data-dec]');
      if (dec) { var it2 = ITEM_BY_ID[dec.dataset.dec]; var q2 = cartQty(it2.id); setQtyByItem(it2.id, q2 - 1); return; }

      var incL = e.target.closest('[data-inc-line]');
      if (incL) { var l1 = findLine(incL.dataset.incLine); if (l1) setQty(l1.key, l1.qty + 1); return; }
      var decL = e.target.closest('[data-dec-line]');
      if (decL) { var l2 = findLine(decL.dataset.decLine); if (l2) setQty(l2.key, l2.qty - 1); return; }
      var del = e.target.closest('[data-del]');
      if (del) { var l3 = findLine(del.dataset.del); if (l3) { setQty(l3.key, 0); toast(t('toast.removed', { name: L(ITEM_BY_ID[l3.id].n) })); } return; }
    });

    function findLine(key) { return state.cart.filter(function (l) { return l.key === key; })[0]; }
    function setQtyByItem(id, qty) {
      // adjust the first matching line(s) of that item
      var lines = state.cart.filter(function (l) { return l.id === id; });
      if (!lines.length) return;
      var total = lines.reduce(function (s, l) { return s + l.qty; }, 0);
      var diff = qty - total;
      if (diff > 0) lines[0].qty += diff;
      else {
        var rem = -diff;
        for (var i = lines.length - 1; i >= 0 && rem > 0; i--) {
          var take = Math.min(lines[i].qty, rem);
          lines[i].qty -= take; rem -= take;
        }
        state.cart = state.cart.filter(function (l) { return l.qty > 0; });
      }
      save('cart', state.cart); renderCart(); renderMenu();
    }

    /* cart drawer */
    var openCart = function () { renderCart(); $('#cartDrawer').classList.add('show'); $('#overlay').classList.add('show'); document.body.classList.add('no-scroll'); };
    $('#cartBtn').onclick = openCart;
    $('#mbCart').onclick = openCart;
    $('#openCartTop').onclick = openCart;
    $('#cartClose').onclick = closeModals;
    $('#overlay').onclick = closeModals;
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModals(); });

    /* search */
    var search = $('#menuSearch');
    var deb;
    search.addEventListener('input', function () {
      clearTimeout(deb);
      $('#searchClear').classList.toggle('show', !!search.value);
      deb = setTimeout(function () { state.q = search.value; renderMenu(); }, 140);
    });
    $('#searchClear').onclick = function () { search.value = ''; state.q = ''; $('#searchClear').classList.remove('show'); renderMenu(); search.focus(); };

    $('#menuSort').addEventListener('change', function (e) { state.sort = e.target.value; renderMenu(); });

    /* language */
    $('#langBtn').onclick = function (e) {
      e.stopPropagation();
      var open = $('#langMenu').classList.toggle('open');
      $('#langBtn').setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    document.addEventListener('click', function (e) { if (!e.target.closest('.lang-switch')) closeLangMenu(); });

    /* burger */
    $('#burgerBtn').onclick = function () {
      var open = $('#navLinks').classList.toggle('open');
      $('#burgerBtn').setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    $$('#navLinks a').forEach(function (a) { a.onclick = function () { $('#navLinks').classList.remove('open'); }; });

    /* header shadow + scroll spy */
    var header = $('#siteHeader');
    var sections = ['signature', 'menu', 'booking', 'gallery', 'about', 'contact'];
    var spy = function () {
      header.classList.toggle('scrolled', window.scrollY > 8);
      var pos = window.scrollY + 140;
      var active = null;
      sections.forEach(function (id) {
        var el = document.getElementById(id);
        if (el && el.offsetTop <= pos) active = id;
      });
      $$('#navLinks a').forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + active); });
    };
    window.addEventListener('scroll', spy, { passive: true });
    window.addEventListener('resize', function () { layoutCarousel(); spy(); });
    spy();

    /* reveal on scroll */
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
      }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
      $$('.reveal').forEach(function (el) { io.observe(el); });
    } else $$('.reveal').forEach(function (el) { el.classList.add('in'); });

    /* keep status fresh */
    setInterval(renderStatus, 60000);
    window.addEventListener('offline', function () { toast(t('toast.offline'), 'err'); });
  }

  /* ============================================================== BOOT */
  function boot() {
    I.init();
    state.lang = I.getLang();
    state.cart = load('cart', []);
    if (!Array.isArray(state.cart)) state.cart = [];

    $('#year').textContent = new Date().getFullYear();
    $('#statDishes').textContent = M.items.length + '+';

    applyTranslations();
    renderCatChips();
    renderFilters();
    renderCarousel();
    renderMenu();
    renderCart();
    renderGallery();
    initBooking();
    bindEvents();

    detectApi().then(function () {
      if (state.overrides && Object.keys(state.overrides).length) renderMenu();
    });

    /* service worker (offline shell) */
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').catch(function () {});
      });
    }
  }

  /* small public hook — handy for debugging, tests and future extensions */
  window.UC_APP = {
    state: state, renderMenu: renderMenu, renderCart: renderCart, renderCarousel: renderCarousel,
    applyOverrides: function (ov) { state.overrides = ov || {}; renderMenu(); },
    openItemModal: openItemModal, openCart: function () { renderCart(); $('#cartDrawer').classList.add('show'); },
    price: price, isAvailable: isAvailable, totals: totals, toast: toast, cafeNow: cafeNow, openState: openState
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
