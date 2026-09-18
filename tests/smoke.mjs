/* ==========================================================================
   Umbrella Cafe — front-end smoke test (jsdom)
   Verifies the site boots without errors, renders the full menu in all four
   languages, and that cart maths (10 % service charge) and forms behave.

   Run:  npm install --save-dev jsdom && npm test
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

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => errors.push('jsdomError: ' + e.message));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: undefined,
  url: 'http://localhost:8080/index.html',
  pretendToBeVisual: true,
  virtualConsole: vc
});
const { window } = dom;
const { document } = window;

/* ---- browser APIs jsdom lacks ---- */
window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
window.IntersectionObserver = class { constructor() {} observe() {} unobserve() {} disconnect() {} };
window.Element.prototype.animate = function () { return { finished: Promise.resolve() }; };
window.scrollTo = () => {};
window.fetch = async () => { throw new Error('offline'); };   // forces WhatsApp/local fallback path
window.HTMLMediaElement.prototype.play = () => Promise.resolve();

/* ---- load the app scripts in order ---- */
for (const f of ['assets/js/config.js', 'assets/js/i18n.js', 'assets/js/menu-data.js', 'assets/js/app.js']) {
  const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
  window.eval(code);
}

const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

await tick(120);

const I = window.UC_I18N, M = window.UC_MENU, C = window.UC_CONFIG;

console.log('\n☔ Umbrella Cafe — smoke test\n');

/* ------------------------------------------------------------------ boot */
console.log('Boot');
ok('no runtime errors on boot', errors.length === 0, errors.join(' | '));
ok('menu data loaded (' + M.items.length + ' items, ' + M.categories.length + ' categories)', M.items.length === 70 && M.categories.length === 17);
ok('dish cards rendered', document.querySelectorAll('.dish-card').length > 40, 'found ' + document.querySelectorAll('.dish-card').length);
ok('category chips rendered', document.querySelectorAll('#catChips .chip').length === M.categories.length + 1);
ok('filter chips rendered', document.querySelectorAll('#filterChips .chip').length === 7);
ok('signature carousel cards', document.querySelectorAll('.sig-card').length === 8, 'found ' + document.querySelectorAll('.sig-card').length);
ok('gallery rendered', document.querySelectorAll('.g-item').length >= 6);
ok('opening hours lists filled', document.querySelectorAll('#hoursList .hours-row').length === 7 && document.querySelectorAll('#footerHours li').length === 7);
ok('open/closed status shown', /Open|Closed/.test(document.querySelector('#openStatusText').textContent));
ok('real phone number present', document.body.innerHTML.includes('+94 71 205 4801'));
ok('instagram link', !!document.querySelector('a[href*="instagram.com/cafe_umbrella_"]'));
ok('facebook link', !!document.querySelector('a[href*="facebook.com/profile.php?id=61573828236464"]'));
ok('google maps link', !!document.querySelector('a[href*="share.google"]'));
ok('map embed uses real coordinates', (document.querySelector('.map-frame iframe') || {}).src?.includes('6.872309'));
ok('booking date defaults to today (cafe tz)', /^\d{4}-\d{2}-\d{2}$/.test(document.querySelector('#bkDate').value));

/* -------------------------------------------------------------- languages */
console.log('\nLanguages');
const dishCount = () => document.querySelectorAll('.dish-card').length;
for (const lang of ['fr', 'ru', 'de', 'en']) {
  window.eval(`UC_I18N.setLang('${lang}')`);
  await tick(40);
  const sample = document.querySelector('.dish-name')?.textContent || '';
  const navMenu = document.querySelector('.nav-links a')?.textContent || '';
  ok(lang.toUpperCase() + ' UI translated ("' + navMenu + '")', navMenu.length > 1);
  ok(lang.toUpperCase() + ' menu still renders (' + dishCount() + ' cards)', dishCount() > 40);
  if (lang === 'fr') ok('French dish names', /Jardin Vert|Riz|Poulet|Kottu/i.test(sample), sample);
  if (lang === 'ru') ok('Cyrillic dish names', /[А-Яа-яЁё]/.test(document.body.textContent), sample);
  if (lang === 'de') ok('German dish names', /[ÄÖÜäöüß]|Roti|Kottu/.test(sample + document.body.textContent));
  ok(lang.toUpperCase() + ' no errors', errors.length === 0, errors.slice(-1).join(''));
}
ok('language persisted', window.localStorage.getItem('uc_lang') === 'en');

/* ------------------------------------------------------------------ cart */
console.log('\nCart & ordering maths');
window.eval(`UC_I18N.setLang('en')`);
await tick(20);
const addBtn = document.querySelector('[data-add="kottu-special"]');
ok('signature kottu has an add button', !!addBtn);
addBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await tick(30);
const cart = JSON.parse(window.localStorage.getItem('uc_cart') || '[]');
ok('item added to cart', cart.length === 1 && cart[0].id === 'kottu-special', JSON.stringify(cart));
ok('unit price = 1900', cart[0]?.unit === 1900);
ok('cart badge shows 1', document.querySelector('#cartCount').textContent === '1');

// add a second dish + a sized/option dish via the modal path
window.eval(`document.querySelector('[data-add="tea-black"]').click()`);
await tick(30);
ok('option modal opened for tea (small/big pot)', !document.querySelector('#optionModal').innerHTML.includes('undefined') && document.querySelectorAll('#optionModal .option-row').length === 2);
const bigPot = document.querySelectorAll('#optionModal .option-row')[1];
bigPot?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await tick(20);
document.querySelector('#mQtyPlus')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await tick(20);
ok('modal total reflects big pot ×2 (Rs. 1,200)', document.querySelector('#mTotal').textContent.replace(/\s/g, '').includes('1,200'), document.querySelector('#mTotal')?.textContent);
document.querySelector('#mAdd')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await tick(30);
const cart2 = JSON.parse(window.localStorage.getItem('uc_cart') || '[]');
ok('tea (big pot ×2) in cart', cart2.length === 2 && cart2[1].unit === 600 && cart2[1].qty === 2, JSON.stringify(cart2));

// totals: 1900 + 1200 = 3100 subtotal, +10% service = 3410
window.eval(`document.querySelector('#cartBtn').click()`);
await tick(40);
const foot = document.querySelector('#cartFoot').textContent.replace(/\s+/g, ' ');
ok('subtotal Rs. 3,100', foot.includes('3,100'), foot);
ok('service charge Rs. 310', foot.includes('310'), foot);
ok('total Rs. 3,410', foot.includes('3,410'), foot);
ok('service charge is 10%', Math.abs(C.serviceCharge - 0.1) < 1e-9);

/* checkout flow (offline → local storage + WhatsApp) */
window.eval(`document.querySelector('#goCheckout').click()`);
await tick(50);
ok('checkout modal opened', document.querySelectorAll('#checkoutModal .seg button').length === 3);
document.querySelector('#coSubmit')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await tick(40);
ok('empty name blocks submit', !document.querySelector('#checkoutModal').textContent.includes('Order received'));
const setVal = (sel, v) => { const el = document.querySelector(sel); el.value = v; el.dispatchEvent(new window.Event('input', { bubbles: true })); };
setVal('#coName', 'Test Guest'); setVal('#coPhone', '+94770000000');
window.eval(`window.open = () => null`);
document.querySelector('#coSubmit')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await tick(200);
const co = document.querySelector('#checkoutModal').textContent;
ok('order confirmation shown', /Order received/i.test(co), co.slice(0, 120));
ok('order code displayed', /UC-[A-Z0-9]{5}/.test(co));
const localOrders = JSON.parse(window.localStorage.getItem('uc_orders') || '[]');
ok('order stored locally (offline fallback)', localOrders.length === 1 && localOrders[0].total === 3410, JSON.stringify(localOrders).slice(0, 160));
ok('basket cleared right after ordering', JSON.parse(window.localStorage.getItem('uc_cart') || '[]').length === 0);
ok('basket badge reset to 0', document.querySelector('#cartCount').hidden === true);

/* --------------------------------------------------------------- booking */
console.log('\nBooking');
window.eval(`document.querySelector('#succClose').click()`);
await tick(30);
window.eval(`document.querySelector('#guestPlus').click(); document.querySelector('#guestPlus').click()`);
await tick(20);
ok('guest stepper works', document.querySelector('#guestValue').textContent.trim().startsWith('4'));
document.querySelectorAll('#bkArea button')[2]?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
setVal('#bkName', 'Marie Dupont'); setVal('#bkPhone', '+33612345678');
setVal('#bkDate', '2026-10-02'); setVal('#bkTime', '19:00');
setVal('#bkOccasion', 'Anniversaire');
window.eval(`document.querySelector('#bookingForm').dispatchEvent(new Event('submit', {bubbles:true, cancelable:true}))`);
await tick(250);
const bs = document.querySelector('#bookingSuccess').textContent;
ok('booking confirmed', /Table booked/i.test(bs), bs.slice(0, 120));
ok('booking reference shown', /BK-[A-Z0-9]{5}/.test(bs));
ok('booking stored locally', (JSON.parse(window.localStorage.getItem('uc_bookings') || '[]')).length === 1);
ok('booking kept guest count & terrace', bs.includes('4') && /terrace/i.test(bs));

/* ---------------------------------------------------------------- filters */
console.log('\nMenu search & filters');
window.eval(`document.querySelector('#bkAgain').click()`);
await tick(20);
const search = document.querySelector('#menuSearch');
search.value = 'kottu'; search.dispatchEvent(new window.Event('input', { bubbles: true }));
await tick(320);
ok('search "kottu" → 4 kottu dishes', document.querySelectorAll('.dish-card').length === 4, 'got ' + document.querySelectorAll('.dish-card').length);
search.value = 'zzzz'; search.dispatchEvent(new window.Event('input', { bubbles: true }));
await tick(320);
ok('no-results state shown', !!document.querySelector('.no-results'));
document.querySelector('#resetFilters')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await tick(120);
ok('reset filters restores menu', document.querySelectorAll('.dish-card').length > 40);
window.eval(`document.querySelectorAll('#filterChips .chip')[0].click()`);   // vegetarian
await tick(50);
const vegCount = document.querySelectorAll('.dish-card').length;
ok('vegetarian filter narrows results (' + vegCount + ')', vegCount > 25 && vegCount < 60);
window.eval(`document.querySelectorAll('#filterChips .chip')[0].click()`);
await tick(30);
window.eval(`document.querySelectorAll('#filterChips .chip')[1].click()`);   // vegan
await tick(50);
const veganCount = document.querySelectorAll('.dish-card').length;
ok('vegan filter narrows further (' + veganCount + ')', veganCount > 8 && veganCount < vegCount);
window.eval(`document.querySelectorAll('#filterChips .chip')[1].click()`);
await tick(30);
window.eval(`document.querySelectorAll('#catChips .chip')[2].click()`);      // kottu category
await tick(40);
ok('category chip filters to kottu (4)', document.querySelectorAll('.dish-card').length === 4);
window.eval(`document.querySelectorAll('#catChips .chip')[0].click()`);
await tick(30);

/* -------------------------------------------------------------- sold out */
console.log('\nMenu overrides from the web panel (sold-out / price change)');
const before = document.querySelectorAll('.dish-card').length;
window.eval(`UC_APP.applyOverrides({ 'soup-pumpkin': { available: false }, 'kottu-special': { price: 2100 } })`);
await tick(50);
window.eval(`document.querySelectorAll('#catChips .chip')[0].click()`);
await tick(40);
ok('sold-out dish removed from the public menu', document.querySelectorAll('.dish-card').length === before - 1,
  'before ' + before + ' after ' + document.querySelectorAll('.dish-card').length);
const kottuCard = Array.from(document.querySelectorAll('.dish-card')).find(c => c.dataset.id === 'kottu-special');
ok('panel price override shown to customers (Rs. 2,100)', /2,100/.test(kottuCard?.textContent || ''), kottuCard?.textContent.replace(/\s+/g,' ').slice(0,90));
window.eval(`UC_APP.applyOverrides({})`);
await tick(40);
ok('clearing overrides restores the menu', document.querySelectorAll('.dish-card').length === before);

console.log('\n' + (failures === 0 ? '✅ ALL CHECKS PASSED' : '❌ ' + failures + ' CHECK(S) FAILED'));
if (errors.length) console.log('Console errors:\n - ' + errors.join('\n - '));
process.exit(failures === 0 && errors.length === 0 ? 0 : 1);
