/* ==========================================================================
   Umbrella Cafe — admin web panel smoke test (jsdom)
   Boots admin.html against a fake API, then again in LOCAL fallback mode.
   Run: npm test
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

let failures = 0;
const ok = (label, cond, extra = '') => {
  if (cond) console.log('  ✔ ' + label);
  else { failures++; console.log('  ✘ ' + label + (extra ? ' → ' + extra : '')); }
};
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------- fake panel API server */
function fakeApi(state) {
  const calls = state.calls;
  return async function fakeFetch(url, opts = {}) {
    const u = String(url);
    const method = (opts.method || 'GET').toUpperCase();
    const body = opts.body ? JSON.parse(opts.body) : {};
    calls.push(method + ' ' + u);
    const json = (obj, status = 200) => ({
      ok: status < 400, status,
      json: async () => obj,
      headers: new Map(),
      clone() { return this; }
    });

    if (u.endsWith('api/health')) {
      return json({ ok: true, acceptOrders: true, acceptBookings: true, serviceCharge: 0.1, prepMinutes: 25, deliveryFee: 0, overrides: state.overrides });
    }
    if (u.endsWith('api/admin/login')) {
      return body.pin === '2024' ? json({ ok: true, token: 'fake.token', expiresIn: 43200 })
        : json({ ok: false, error: 'wrong_pin' }, 401);
    }
    if (u.includes('api/admin/summary')) {
      const today = new Date().toISOString().slice(0, 10);
      return json({
        ok: true,
        orders: { total: state.orders.length, today: 2, new: state.orders.filter(o => o.status === 'new').length, preparing: 1, ready: 0, done: 0, cancelled: 0 },
        revenue: { today: 8460, total: 12690 },
        bookings: { total: state.bookings.length, new: 1, today: 1, guestsToday: 4 },
        last7: Array.from({ length: 7 }, (_, i) => ({ date: new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10), count: i % 3, revenue: (i % 3) * 2500 })),
        topItems: [{ name: 'Umbrella Ultimate Legend (Special Kottu)', qty: 9 }, { name: 'Ella Rock Chicken Roti', qty: 6 }],
        upcoming: state.bookings.slice(0, 5),
        settings: { prepMinutes: 25, deliveryFee: 0, acceptOrders: true, acceptBookings: true, serviceCharge: 0.1 }
      });
    }
    if (u.includes('api/admin/orders') && method === 'GET') return json({ ok: true, count: state.orders.length, items: state.orders });
    if (u.includes('api/admin/bookings') && method === 'GET') return json({ ok: true, count: state.bookings.length, items: state.bookings });
    if (u.match(/api\/admin\/orders\/.+/) && method === 'PATCH') {
      const id = decodeURIComponent(u.split('/').pop().split('?')[0]);
      const rec = state.orders.find(o => o.id === id || o.code === id);
      if (rec) { rec.status = body.status; rec.note = body.note; }
      return json({ ok: true, item: rec });
    }
    if (u.match(/api\/admin\/bookings\/.+/) && method === 'PATCH') {
      const id = decodeURIComponent(u.split('/').pop().split('?')[0]);
      const rec = state.bookings.find(b => b.id === id || b.code === id);
      if (rec) rec.status = body.status;
      return json({ ok: true, item: rec });
    }
    if (u.includes('api/admin/overrides')) {
      if (method === 'GET') return json({ ok: true, overrides: state.overrides });
      state.overrides = body.overrides || {};
      return json({ ok: true, overrides: state.overrides });
    }
    if (u.includes('api/admin/settings')) {
      Object.assign(state.settings, body);
      return json({ ok: true, settings: state.settings, newToken: body.pin ? 'new.token' : null });
    }
    return json({ ok: false, error: 'not_found' }, 404);
  };
}

async function bootAdmin({ online }) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('jsdomError: ' + e.message));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

  const html = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost:8080/admin.html', pretendToBeVisual: true, virtualConsole: vc });
  const { window } = dom;
  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.scrollTo = () => {};
  window.print = () => {};
  window.confirm = () => true;
  window.open = () => null;
  window.URL.createObjectURL = () => 'blob:fake';
  window.URL.revokeObjectURL = () => {};
  window.Blob = window.Blob || class {};

  const state = {
    calls: [], overrides: {}, settings: { prepMinutes: 25, deliveryFee: 0, serviceCharge: 0.1, acceptOrders: true, acceptBookings: true },
    orders: [
      { id: 'o1', code: 'UC-DEMO1', status: 'new', type: 'dineIn', table: '5', name: 'Anna Schmidt', phone: '+4915112345678', lang: 'de',
        createdAt: new Date(Date.now() - 6 * 60000).toISOString(), subtotal: 3500, service: 350, total: 3850,
        lines: [{ id: 'kottu-special', name: 'Umbrella Ultimate Legend (Special Kottu)', nameLocal: 'Umbrella Ultimate Legend', qty: 1, unit: 1900, lineTotal: 1900, extra: '' },
                { id: 'lassi-mango', name: 'Mango Lassie', nameLocal: 'Mango-Lassi', qty: 2, unit: 800, lineTotal: 1600, extra: '' }],
        notes: 'not too spicy' },
      { id: 'o2', code: 'UC-DEMO2', status: 'preparing', type: 'delivery', address: 'Hotel View Point, Ella', name: 'Pierre Martin', phone: '+33612345678', lang: 'fr',
        createdAt: new Date(Date.now() - 48 * 60000).toISOString(), subtotal: 4200, service: 420, total: 4620,
        lines: [{ id: 'main-pepper-chicken', name: "Ella Valley Pepper Chicken & Mash", nameLocal: 'Poulet au poivre', qty: 2, unit: 1950, lineTotal: 3900, extra: '' },
                { id: 'juice-lime', name: 'Lime Fresh Juice', nameLocal: 'Jus de citron vert', qty: 1, unit: 300, lineTotal: 300, extra: '' }] }
    ],
    bookings: [
      { id: 'b1', code: 'BK-DEMO1', status: 'new', name: 'Ivan Petrov', phone: '+79001234567', date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), time: '19:30',
        guests: 4, area: 'outdoor', areaLabel: 'Terrace', occasion: 'Birthday', createdAt: new Date().toISOString(), lang: 'ru' }
    ]
  };

  window.fetch = online ? fakeApi(state) : (async () => { throw new Error('network offline'); });

  for (const f of ['assets/js/config.js', 'assets/js/i18n.js', 'assets/js/menu-data.js', 'assets/js/admin.js']) {
    window.eval(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  }
  await tick(150);
  return { window, document: window.document, state, errors };
}

/* ===================================================================== API mode */
console.log('\n☔ Umbrella Cafe — admin panel smoke test\n');
console.log('Panel (server API mode)');
let A = await bootAdmin({ online: true });
let { window: w, document: d, state } = A;

ok('no runtime errors', A.errors.length === 0, A.errors.join(' | '));
ok('PIN gate shown first', !d.querySelector('#gate').hidden && d.querySelector('#shell').hidden);

/* wrong PIN */
d.querySelector('#pinInput').value = '0000';
d.querySelector('#gateForm').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
await tick(120);
ok('wrong PIN rejected with message', /wrong pin/i.test(d.querySelector('#gateError').textContent), d.querySelector('#gateError').textContent);
ok('still locked', d.querySelector('#shell').hidden);

/* right PIN */
d.querySelector('#pinInput').value = '2024';
d.querySelector('#gateForm').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
await tick(400);
ok('correct PIN unlocks the panel', !d.querySelector('#shell').hidden && d.querySelector('#gate').hidden);
ok('API reported online', /online/i.test(d.querySelector('#apiPill').textContent), d.querySelector('#apiPill').textContent);
ok('local-mode banner hidden', d.querySelector('#modeBanner').hidden);

/* dashboard */
ok('dashboard stat cards', d.querySelectorAll('#statCards .stat-card').length === 4);
ok('revenue card formatted', /Rs\.\s?8,460/.test(d.querySelector('#statCards').textContent.replace(/\u00a0/g, ' ')), d.querySelector('#statCards').textContent.replace(/\s+/g, ' ').slice(0, 120));
ok('7-day chart bars', d.querySelectorAll('#chart .bar').length === 7);
ok('top sellers listed', d.querySelectorAll('#topList .top-row').length === 2);
ok('newest orders on dashboard', d.querySelectorAll('#dashOrders .row-item').length === 2);
ok('upcoming bookings on dashboard', d.querySelectorAll('#dashBookings .row-item').length === 1);
ok('badge shows new orders', d.querySelector('#badgeOrders').textContent === '1' && !d.querySelector('#badgeOrders').hidden);
ok('Ella clock pill running', /Ella \d{2}:\d{2}/.test(d.querySelector('#clockPill').textContent), d.querySelector('#clockPill').textContent);

/* orders view */
d.querySelector('[data-view="orders"]').click();
await tick(80);
ok('orders view visible', !d.querySelector('#view-orders').hidden && d.querySelector('#view-dashboard').hidden);
ok('status tabs rendered', d.querySelectorAll('#orderTabs .tab').length === 7);
ok('order rows rendered', d.querySelectorAll('#orderList .row-item').length === 2);
ok('new order highlighted', !!d.querySelector('#orderList .row-item.fresh'));
ok('order lines hidden until expanded', d.querySelector('#orderList .row-body').hidden);
d.querySelector('#orderList [data-toggle]').click();
await tick(30);
ok('expand shows ordered items + totals', !d.querySelector('#orderList .row-body').hidden && /3,850/.test(d.querySelector('#orderList .row-body').textContent.replace(/\u00a0/g, ' ')));
ok('whatsapp + call buttons per order', !!d.querySelector('#orderList a[href^="https://wa.me/"]') && !!d.querySelector('#orderList a[href^="tel:"]'));

/* status advance */
d.querySelector('#orderList [data-status="accepted"]').click();
await tick(250);
ok('PATCH sent to API', state.calls.some(c => c.startsWith('PATCH api/admin/orders/o1')), state.calls.filter(c => c.startsWith('PATCH')).join(','));
ok('status updated in UI', state.orders[0].status === 'accepted');

/* filters + search */
d.querySelector('#orderTabs [data-filter="preparing"]').click();
await tick(60);
ok('status filter works', d.querySelectorAll('#orderList .row-item').length === 1);
d.querySelector('#orderTabs [data-filter="all"]').click();
await tick(40);
const sEl = d.querySelector('#orderSearch');
sEl.value = 'pierre'; sEl.dispatchEvent(new w.Event('input', { bubbles: true }));
await tick(60);
ok('search filters orders', d.querySelectorAll('#orderList .row-item').length === 1 && /Pierre/.test(d.querySelector('#orderList').textContent));
sEl.value = ''; sEl.dispatchEvent(new w.Event('input', { bubbles: true }));
await tick(60);

/* bookings view */
d.querySelector('[data-view="bookings"]').click();
await tick(80);
ok('booking rows rendered', d.querySelectorAll('#bookingList .row-item').length === 1);
ok('booking shows date/time/guests', /19:30/.test(d.querySelector('#bookingList').textContent) && /4 guests/.test(d.querySelector('#bookingList').textContent));
d.querySelector('#bookingList [data-status="confirmed"]').click();
await tick(250);
ok('booking status confirmed via API', state.bookings[0].status === 'confirmed');

/* menu editor */
d.querySelector('[data-view="menu"]').click();
await tick(120);
ok('all 70 dishes listed for editing', d.querySelectorAll('#menuEditor .me-row').length === 70, 'got ' + d.querySelectorAll('#menuEditor .me-row').length);
ok('category headers rendered', d.querySelectorAll('#menuEditor .me-cat').length === 17);
const priceInput = d.querySelector('[data-price="kottu-special"]');
priceInput.value = '2050'; priceInput.dispatchEvent(new w.Event('input', { bubbles: true }));
await tick(40);
ok('price edit marks the row changed', priceInput.closest('.me-row').classList.contains('changed'));
d.querySelector('[data-avail="soup-pumpkin"]').click();
await tick(40);
ok('sold-out toggle flips', d.querySelector('[data-avail="soup-pumpkin"]').classList.contains('off') && d.querySelector('[data-avail="soup-pumpkin"]').closest('.me-row').classList.contains('off'));
d.querySelector('#saveOverrides').click();
await tick(250);
ok('overrides saved through the API', state.calls.some(c => c.startsWith('PUT api/admin/overrides')));
ok('server received new price', state.overrides['kottu-special'] && state.overrides['kottu-special'].price === 2050, JSON.stringify(state.overrides));
ok('server received sold-out flag', state.overrides['soup-pumpkin'] && state.overrides['soup-pumpkin'].available === false);
const ms = d.querySelector('#menuSearchAdmin');
ms.value = 'pancake'; ms.dispatchEvent(new w.Event('input', { bubbles: true }));
await tick(60);
ok('menu search narrows the editor', d.querySelectorAll('#menuEditor .me-row').length > 0 && d.querySelectorAll('#menuEditor .me-row').length < 12, 'got ' + d.querySelectorAll('#menuEditor .me-row').length);

/* settings */
d.querySelector('[data-view="settings"]').click();
await tick(100);
ok('cafe profile shows real details', /Passara Road/.test(d.querySelector('#profileBox').textContent) && /\+94 71 205 4801/.test(d.querySelector('#profileBox').textContent));
ok('social links in panel', d.querySelectorAll('#profileBox a').length >= 4);
d.querySelector('#setPrep').value = '35';
d.querySelector('#swOrders').click();     // pause online orders
d.querySelector('#saveSettings').click();
await tick(250);
ok('settings saved through the API', state.calls.some(c => c.startsWith('PUT api/admin/settings')) && state.settings.prepMinutes === 35, JSON.stringify(state.settings));
ok('accept-orders toggle persisted', state.settings.acceptOrders === false);
d.querySelector('#newPin').value = '9876'; d.querySelector('#newPin2').value = '1234';
d.querySelector('#savePin').click();
await tick(120);
ok('mismatched PIN blocked', state.settings.pin === undefined || state.settings.pin !== '9876');
d.querySelector('#newPin2').value = '9876';
d.querySelector('#savePin').click();
await tick(200);
ok('matching PIN accepted', state.settings.pin === '9876');

/* lock */
d.querySelector('#btnLogout').click();
await tick(60);
ok('lock button returns to the PIN gate', !d.querySelector('#gate').hidden && d.querySelector('#shell').hidden);

/* ============================================================== LOCAL mode */
console.log('\nPanel (local fallback mode — static hosting, no server)');
let B = await bootAdmin({ online: false });
let w2 = B.window, d2 = B.document;
ok('no runtime errors offline', B.errors.length === 0, B.errors.join(' | '));
ok('gate shown offline too', !d2.querySelector('#gate').hidden);

// seed browser-local data (as if a customer ordered on this device)
w2.localStorage.setItem('uc_orders', JSON.stringify([{ id: 'l1', code: 'UC-LOCAL', status: 'new', type: 'takeaway', name: 'Nimal Silva', phone: '+94771112222', lang: 'en', createdAt: new Date().toISOString(), subtotal: 1900, service: 190, total: 2090, lines: [{ id: 'kottu-special', name: 'Special Kottu', nameLocal: 'Special Kottu', qty: 1, unit: 1900, lineTotal: 1900, extra: '' }] }]));
w2.localStorage.setItem('uc_bookings', JSON.stringify([{ id: 'l2', code: 'BK-LOCAL', status: 'new', name: 'Emma Jones', phone: '+447700900123', date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), time: '18:00', guests: 2, area: 'indoor', areaLabel: 'Indoor', createdAt: new Date().toISOString() }]));

d2.querySelector('#pinInput').value = '2024';
d2.querySelector('#gateForm').dispatchEvent(new w2.Event('submit', { bubbles: true, cancelable: true }));
await tick(400);
ok('offline login works with the default PIN', !d2.querySelector('#shell').hidden);
ok('local mode flagged in the topbar', /local mode/i.test(d2.querySelector('#apiPill').textContent), d2.querySelector('#apiPill').textContent);
ok('local mode banner explains it', !d2.querySelector('#modeBanner').hidden && /Local demo mode/i.test(d2.querySelector('#modeBanner').textContent));
ok('locally stored order is listed', d2.querySelectorAll('#dashOrders .row-item').length === 1 && /UC-LOCAL/.test(d2.querySelector('#dashOrders').textContent));
ok('locally stored booking is listed', /BK-LOCAL/.test(d2.querySelector('#dashBookings').textContent));

d2.querySelector('[data-view="orders"]').click();
await tick(80);
d2.querySelector('#orderList [data-status="accepted"]').click();
await tick(150);
const stored = JSON.parse(w2.localStorage.getItem('uc_orders'));
ok('offline status change persists to browser storage', stored[0].status === 'accepted', JSON.stringify(stored[0].status));

d2.querySelector('[data-view="menu"]').click();
await tick(120);
d2.querySelector('[data-avail="juice-mango"]').click();
d2.querySelector('#saveOverrides').click();
await tick(150);
ok('offline override saved to browser storage', JSON.parse(w2.localStorage.getItem('uc_overrides') || '{}')['juice-mango']?.available === false,
  w2.localStorage.getItem('uc_overrides'));

console.log('\n' + (failures === 0 ? '✅ ADMIN PANEL CHECKS PASSED' : '❌ ' + failures + ' CHECK(S) FAILED'));
process.exit(failures === 0 ? 0 : 1);
