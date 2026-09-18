/* ==========================================================================
   Umbrella Cafe — demo data seeder
   Fills data/orders.json & data/bookings.json with realistic sample records so
   the web panel can be demonstrated (dashboard, 7-day chart, top sellers).

   Run:  npm run seed            (add --fresh to replace existing data)
   Clear: rm data/orders.json data/bookings.json
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.UC_DATA_DIR ? path.resolve(process.env.UC_DATA_DIR) : path.join(path.resolve(__dirname, '..'), 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const fresh = process.argv.includes('--fresh');

const NAMES = [
  ['Anna Schmidt', '+4915112345678', 'de'], ['Pierre Martin', '+33612345678', 'fr'],
  ['Ivan Petrov', '+79001234567', 'ru'], ['Emma Jones', '+447700900123', 'en'],
  ['Nimal Silva', '+94771112222', 'en'], ['Sofia Rossi', '+393331234567', 'en'],
  ['Lukas Weber', '+491701234567', 'de'], ['Camille Bernard', '+33677889900', 'fr'],
  ['Olga Ivanova', '+79161234567', 'ru'], ['Tom Baker', '+61412345678', 'en'],
  ['Maya Fernando', '+94712345678', 'en'], ['Jonas Müller', '+491519876543', 'de']
];

const DISHES = [
  ['kottu-special', 'Umbrella Ultimate Legend (Special Kottu)', 1900],
  ['kottu-chicken-egg', 'The Ella Express (Chicken Egg Kottu)', 1600],
  ['kottu-veg', 'Misty Mountain Veggie (Veg Kottu)', 1200],
  ['roti-chicken', 'Ella Rock Chicken Roti (Chicken Mushroom)', 1200],
  ['roti-ravana', "Ravana's Cheesy Treat (Cheese Sausage)", 1300],
  ['roti-green', 'Ella Green Garden (Veg Roti)', 900],
  ['main-rice-curry', 'Sri Lankan Vegetable Rice & Curry', 1350],
  ['main-pepper-chicken', "Ella Valley Pepper Chicken & Mash (Chef's Special)", 1950],
  ['main-egg-fried-rice', 'Egg Fried Rice (Chicken Deviled)', 1800],
  ['chopsey-chicken', 'Chicken Chop Suey', 1600],
  ['om-umbrella-special', 'Umbrella Special Omelette', 1100],
  ['pancake-umbrella-choc-coco', 'Umbrella Special: Chocolate & Coconut Pancake', 1050],
  ['juice-mango', 'Mango Fresh Juice', 800],
  ['lassi-mango', 'Mango Lassie', 950],
  ['shake-chocolate', 'Chocolate Milkshake', 950],
  ['tea-black', 'Sri Lankan Black Tea', 500],
  ['iced-coffee', 'Ice Coffee (milk & black coffee)', 850],
  ['drink-ginger-beer', 'Ginger Beer', 350]
];

const TYPES = ['dineIn', 'takeaway', 'delivery'];
const STATUS_BY_AGE = (ageDays, i) => {
  if (ageDays >= 1) return i % 7 === 0 ? 'cancelled' : 'done';
  return ['new', 'accepted', 'preparing', 'ready', 'done'][i % 5];
};
const HOTELS = ['Hotel View Point, Ella', 'Ella Edge Guest House', 'Mountain Retreat Bungalow', 'Nine Arch Homestay', 'Ella Heritage Villa'];
const OCCASIONS = ['Birthday', 'Anniversary', 'Honeymoon', '', '', 'Family dinner', ''];

const code = (p) => {
  const s = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 5; i++) out += s[crypto.randomInt(s.length)];
  return p + '-' + out;
};
const pick = (arr) => arr[crypto.randomInt(arr.length)];
const SERVICE = 0.10;

function makeOrder(daysAgo, hourOffset, i) {
  const [name, phone, lang] = pick(NAMES);
  const created = new Date(Date.now() - daysAgo * 86400000 + hourOffset * 3600000);
  const nLines = 1 + crypto.randomInt(3);
  const chosen = [];
  while (chosen.length < nLines) {
    const d = pick(DISHES);
    if (!chosen.some((c) => c[0] === d[0])) chosen.push(d);
  }
  const lines = chosen.map(([id, nm, unit]) => {
    const qty = 1 + crypto.randomInt(2);
    return { id, name: nm, nameLocal: nm, option: null, extra: '', addons: [], qty, unit, lineTotal: qty * unit };
  });
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const service = Math.round(subtotal * SERVICE);
  const type = pick(TYPES);
  return {
    id: crypto.randomUUID(), code: code('UC'), createdAt: created.toISOString(),
    status: STATUS_BY_AGE(daysAgo, i), channel: 'web',
    name, phone, email: '', type,
    table: type === 'dineIn' ? String(1 + crypto.randomInt(9)) : '',
    address: type === 'delivery' ? pick(HOTELS) : '',
    when: '', notes: pick(['', '', 'Less spicy please', 'No onions', 'Extra chilli paste on the side', 'Vegetarian, no fish']),
    lang, subtotal, service, total: subtotal + service, lines
  };
}

function makeBooking(daysFromNow, i) {
  const [name, phone, lang] = pick(NAMES);
  const date = new Date(Date.now() + daysFromNow * 86400000).toISOString().slice(0, 10);
  const hour = 8 + crypto.randomInt(11);
  const time = String(hour).padStart(2, '0') + ':' + (crypto.randomInt(2) ? '00' : '30');
  const area = pick(['indoor', 'outdoor', 'any']);
  return {
    id: crypto.randomUUID(), code: code('BK'), createdAt: new Date(Date.now() - crypto.randomInt(72) * 3600000).toISOString(),
    status: daysFromNow <= 0 ? pick(['confirmed', 'seated', 'done']) : (i % 3 === 0 ? 'new' : 'confirmed'),
    channel: 'web', name, phone, email: '', date, time,
    guests: 1 + crypto.randomInt(6), area,
    areaLabel: area === 'indoor' ? 'Indoor' : area === 'outdoor' ? 'Outdoor terrace' : 'No preference',
    occasion: pick(OCCASIONS), notes: pick(['', '', 'Window table if possible', 'High chair needed', 'Birthday cake from outside']),
    lang
  };
}

const orders = [];
for (let d = 6; d >= 0; d--) {
  const perDay = d === 0 ? 4 : 2 + crypto.randomInt(3);
  for (let k = 0; k < perDay; k++) orders.push(makeOrder(d, -(1 + k * 2), orders.length));
}
orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

const bookings = [];
for (let d = -1; d <= 6; d++) bookings.push(makeBooking(d, bookings.length));
for (let d = 0; d <= 4; d++) bookings.push(makeBooking(d, bookings.length + 1));
bookings.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

function write(name, data, keep) {
  const file = path.join(DATA_DIR, name);
  let merged = data;
  if (!fresh && fs.existsSync(file)) {
    try {
      const existing = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Array.isArray(existing) && existing.length) merged = keep === 'orders' ? data.concat(existing) : existing.concat(data);
    } catch { /* ignore */ }
  }
  fs.writeFileSync(file, JSON.stringify(merged, null, 2));
  return merged.length;
}

const no = write('orders.json', orders, 'orders');
const nb = write('bookings.json', bookings, 'bookings');

const revenue = orders.reduce((s, o) => s + o.total, 0);
console.log('');
console.log('  ☔  Umbrella Cafe — demo data seeded');
console.log('  -------------------------------------');
console.log(`  Orders   ${no} records  (${orders.length} new, Rs. ${revenue.toLocaleString('en-US')} revenue)`);
console.log(`  Bookings ${nb} records`);
console.log(`  Files    ${DATA_DIR}/orders.json, ${DATA_DIR}/bookings.json`);
console.log('  Open the panel: http://localhost:8080/admin.html  (PIN 2024)');
console.log('');
