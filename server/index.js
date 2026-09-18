/* ==========================================================================
   UMBRELLA CAFE — ELLA · web panel server (zero dependencies, Node >= 18)

   • Serves the website (static files)
   • Stores online ORDERS and TABLE BOOKINGS in ./data/*.json
   • Powers the admin web panel (admin.html) with PIN auth
   • Lets the cafe change prices / mark dishes sold out (menu overrides)

   Run:  npm start            → http://0.0.0.0:8080
   Env:  PORT, HOST, UC_ADMIN_PIN
   ========================================================================== */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = process.env.UC_DATA_DIR ? path.resolve(process.env.UC_DATA_DIR) : path.join(ROOT, 'data');
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';
const VERSION = '1.0.0';

fs.mkdirSync(DATA_DIR, { recursive: true });

/* ------------------------------------------------------------ tiny store */
const FILES = {
  orders: path.join(DATA_DIR, 'orders.json'),
  bookings: path.join(DATA_DIR, 'bookings.json'),
  settings: path.join(DATA_DIR, 'settings.json')
};

function read(key, fallback) {
  try {
    const raw = fs.readFileSync(FILES[key], 'utf8');
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch { return fallback; }
}
function write(key, value) {
  const file = FILES[key];
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, file);
}

const DEFAULT_SETTINGS = {
  pin: process.env.UC_ADMIN_PIN || '2024',
  secret: crypto.randomBytes(24).toString('hex'),
  prepMinutes: 25,
  deliveryFee: 0,
  acceptOrders: true,
  acceptBookings: true,
  serviceCharge: 0.10,
  overrides: {}          // { "item-id": { price: 1500, available: false } }
};

function settings() {
  const s = read('settings', null);
  if (!s) { write('settings', DEFAULT_SETTINGS); return { ...DEFAULT_SETTINGS }; }
  return { ...DEFAULT_SETTINGS, ...s, overrides: s.overrides || {} };
}
function saveSettings(patch) {
  const next = { ...settings(), ...patch };
  if (process.env.UC_ADMIN_PIN) next.pin = process.env.UC_ADMIN_PIN;   // env always wins
  write('settings', next);
  return next;
}

/* ---------------------------------------------------------------- helpers */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.map': 'application/json'
};

function code(prefix = 'UC') {
  const s = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 5; i++) out += s[crypto.randomInt(s.length)];
  return prefix + '-' + out;
}
const nowISO = () => new Date().toISOString();

function sendJSON(res, status, obj, extraHeaders = {}) {
  const body = Buffer.from(JSON.stringify(obj));
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    ...extraHeaders
  });
  res.end(body);
}

function readBody(req, limit = 256 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('payload too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new Error('invalid JSON')); }
    });
    req.on('error', reject);
  });
}

/* ------------------------------------------------------------ auth (PIN) */
function makeToken(pin) {
  const s = settings();
  const exp = Date.now() + 12 * 3600 * 1000;
  const payload = `${exp}`;
  const mac = crypto.createHmac('sha256', s.secret + '|' + s.pin).update(payload + '|' + pin).digest('hex');
  return `${exp}.${mac}`;
}
function checkToken(token) {
  if (!token) return false;
  const s = settings();
  const [exp, mac] = String(token).split('.');
  if (!exp || !mac) return false;
  if (Number(exp) < Date.now()) return false;
  const expect = crypto.createHmac('sha256', s.secret + '|' + s.pin).update(exp + '|' + s.pin).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(mac, 'hex'), Buffer.from(expect, 'hex')); }
  catch { return false; }
}
function tokenFrom(req) {
  const h = req.headers['authorization'] || '';
  if (h.startsWith('Bearer ')) return h.slice(7).trim();
  return (req.headers['x-admin-token'] || '').trim();
}

/* ------------------------------------------------------- naive rate limit */
const hits = new Map();
function rateLimit(req, key = 'api', max = 60, windowMs = 60_000) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'local').toString().split(',')[0].trim();
  const id = key + ':' + ip;
  const now = Date.now();
  const entry = hits.get(id) || { count: 0, start: now };
  if (now - entry.start > windowMs) { entry.count = 0; entry.start = now; }
  entry.count++;
  hits.set(id, entry);
  if (hits.size > 4000) for (const [k, v] of hits) if (now - v.start > windowMs) hits.delete(k);
  return entry.count <= max;
}

/* ------------------------------------------------------------- validation */
const str = (v, max = 400) => String(v == null ? '' : v).slice(0, max).trim();
const num = (v, dflt = 0) => {
  if (v === null || v === undefined || v === '') return dflt;
  const n = Number(v);
  return Number.isFinite(n) ? n : dflt;
};

function validateOrder(b) {
  const name = str(b.name, 80), phone = str(b.phone, 40);
  const lines = Array.isArray(b.lines) ? b.lines.slice(0, 120).map((l) => ({
    id: str(l.id, 60), name: str(l.name, 120), nameLocal: str(l.nameLocal, 120),
    option: str(l.option, 40) || null, extra: str(l.extra, 200),
    addons: Array.isArray(l.addons) ? l.addons.map((a) => str(a, 40)).slice(0, 8) : [],
    qty: Math.max(1, Math.min(99, Math.round(num(l.qty, 1)))),
    unit: Math.max(0, num(l.unit)), lineTotal: Math.max(0, num(l.lineTotal))
  })) : [];
  const errors = [];
  if (!name) errors.push('name');
  if (!phone) errors.push('phone');
  if (!lines.length) errors.push('items');
  return { errors, value: {
    name, phone, email: str(b.email, 120),
    type: ['dineIn', 'takeaway', 'delivery'].includes(b.type) ? b.type : 'takeaway',
    table: str(b.table, 12), address: str(b.address, 200), when: str(b.when, 12),
    notes: str(b.notes, 500), lang: str(b.lang, 4) || 'en',
    subtotal: Math.max(0, num(b.subtotal)), service: Math.max(0, num(b.service)), total: Math.max(0, num(b.total)),
    lines
  } };
}

function validateBooking(b) {
  const name = str(b.name, 80), phone = str(b.phone, 40), date = str(b.date, 10), time = str(b.time, 5);
  const errors = [];
  if (!name) errors.push('name');
  if (!phone) errors.push('phone');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.push('date');
  if (!/^\d{2}:\d{2}$/.test(time)) errors.push('time');
  return { errors, value: {
    name, phone, email: str(b.email, 120), date, time,
    guests: Math.max(1, Math.min(40, Math.round(num(b.guests, 2)))),
    area: ['indoor', 'outdoor', 'any'].includes(b.area) ? b.area : 'any',
    areaLabel: str(b.areaLabel, 60), occasion: str(b.occasion, 120),
    notes: str(b.notes, 500), lang: str(b.lang, 4) || 'en'
  } };
}

/* ------------------------------------------------------------------- CSV */
function toCSV(rows, cols) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [cols.map((c) => esc(c.label)).join(',')].concat(
    rows.map((r) => cols.map((c) => esc(typeof c.get === 'function' ? c.get(r) : r[c.key])).join(','))
  ).join('\n');
}

/* ============================================================ API ROUTES */
async function handleApi(req, res, url) {
  const route = url.pathname.replace(/^\/+|\/+$/g, '');
  const parts = route.split('/');      // ['api','orders'] …
  const method = req.method.toUpperCase();

  if (method === 'OPTIONS') return sendJSON(res, 204, {});

  /* --- public --- */
  if (parts[1] === 'health' && method === 'GET') {
    const s = settings();
    return sendJSON(res, 200, {
      ok: true, name: 'Umbrella Cafe Ella', version: VERSION, time: nowISO(),
      acceptOrders: s.acceptOrders, acceptBookings: s.acceptBookings,
      serviceCharge: s.serviceCharge, prepMinutes: s.prepMinutes, deliveryFee: s.deliveryFee,
      overrides: s.overrides
    });
  }

  if (parts[1] === 'orders' && parts.length === 2 && method === 'POST') {
    if (!rateLimit(req, 'orders', 25)) return sendJSON(res, 429, { ok: false, error: 'too_many_requests' });
    const s = settings();
    if (!s.acceptOrders) return sendJSON(res, 403, { ok: false, error: 'orders_closed' });
    let body; try { body = await readBody(req); } catch (e) { return sendJSON(res, 400, { ok: false, error: e.message }); }
    const { errors, value } = validateOrder(body);
    if (errors.length) return sendJSON(res, 422, { ok: false, error: 'invalid', fields: errors });

    // server-side recalculation: never trust client totals
    const subtotal = value.lines.reduce((sum, l) => sum + l.qty * l.unit, 0);
    const service = Math.round(subtotal * num(s.serviceCharge, 0.1));
    const record = {
      id: crypto.randomUUID(),
      code: str(body.code, 12) || code('UC'),
      createdAt: nowISO(), status: 'new', channel: 'web',
      ...value,
      subtotal: subtotal || value.subtotal,
      service: service || value.service,
      total: (subtotal || value.subtotal) + (service || value.service)
    };
    const orders = read('orders', []);
    orders.unshift(record);
    write('orders', orders.slice(0, 3000));
    console.log(`[order] ${record.code} · ${record.name} · ${record.type} · Rs.${record.total}`);
    return sendJSON(res, 201, { ok: true, id: record.id, code: record.code, status: record.status, total: record.total });
  }

  if (parts[1] === 'bookings' && parts.length === 2 && method === 'POST') {
    if (!rateLimit(req, 'bookings', 25)) return sendJSON(res, 429, { ok: false, error: 'too_many_requests' });
    const s = settings();
    if (!s.acceptBookings) return sendJSON(res, 403, { ok: false, error: 'bookings_closed' });
    let body; try { body = await readBody(req); } catch (e) { return sendJSON(res, 400, { ok: false, error: e.message }); }
    const { errors, value } = validateBooking(body);
    if (errors.length) return sendJSON(res, 422, { ok: false, error: 'invalid', fields: errors });

    const record = {
      id: crypto.randomUUID(),
      code: str(body.code, 12) || code('BK'),
      createdAt: nowISO(), status: 'new', channel: 'web', ...value
    };
    const bookings = read('bookings', []);
    bookings.unshift(record);
    write('bookings', bookings.slice(0, 3000));
    console.log(`[booking] ${record.code} · ${record.name} · ${record.date} ${record.time} · ${record.guests}p`);
    return sendJSON(res, 201, { ok: true, id: record.id, code: record.code, status: record.status });
  }

  /* --- admin --- */
  if (parts[1] === 'admin') {
    if (parts[2] === 'login' && method === 'POST') {
      if (!rateLimit(req, 'login', 12, 5 * 60_000)) return sendJSON(res, 429, { ok: false, error: 'too_many_attempts' });
      let body; try { body = await readBody(req); } catch { return sendJSON(res, 400, { ok: false, error: 'invalid JSON' }); }
      const pin = str(body.pin, 12);
      const s = settings();
      const ok = pin.length > 0 && crypto.timingSafeEqual(
        Buffer.from(crypto.createHash('sha256').update(pin).digest('hex')),
        Buffer.from(crypto.createHash('sha256').update(String(s.pin)).digest('hex'))
      );
      if (!ok) return sendJSON(res, 401, { ok: false, error: 'wrong_pin' });
      return sendJSON(res, 200, { ok: true, token: makeToken(s.pin), expiresIn: 12 * 3600 });
    }

    if (!checkToken(tokenFrom(req))) return sendJSON(res, 401, { ok: false, error: 'unauthorized' });
    if (!rateLimit(req, 'admin', 300)) return sendJSON(res, 429, { ok: false, error: 'too_many_requests' });

    const orders = read('orders', []);
    const bookings = read('bookings', []);
    const s = settings();

    if (parts[2] === 'summary' && method === 'GET') {
      const today = nowISO().slice(0, 10);
      const todays = orders.filter((o) => (o.createdAt || '').slice(0, 10) === today);
      const upcoming = bookings
        .filter((b) => b.date >= today && b.status !== 'cancelled')
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
        .slice(0, 12);
      const byStatus = {};
      orders.forEach((o) => { byStatus[o.status] = (byStatus[o.status] || 0) + 1; });
      const top = {};
      orders.forEach((o) => (o.lines || []).forEach((l) => { top[l.name] = (top[l.name] || 0) + l.qty; }));
      const topItems = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, qty]) => ({ name, qty }));
      const last7 = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        const dayOrders = orders.filter((o) => (o.createdAt || '').slice(0, 10) === d);
        last7.push({ date: d, count: dayOrders.length, revenue: dayOrders.reduce((sum, o) => sum + num(o.total), 0) });
      }
      return sendJSON(res, 200, {
        ok: true,
        orders: { total: orders.length, today: todays.length, new: byStatus.new || 0, preparing: byStatus.preparing || 0, ready: byStatus.ready || 0, done: byStatus.done || 0, cancelled: byStatus.cancelled || 0 },
        revenue: { today: todays.reduce((sum, o) => sum + num(o.total), 0), total: orders.reduce((sum, o) => sum + num(o.total), 0) },
        bookings: { total: bookings.length, new: bookings.filter((b) => b.status === 'new').length, today: bookings.filter((b) => b.date === today).length, guestsToday: bookings.filter((b) => b.date === today).reduce((sum, b) => sum + num(b.guests), 0) },
        last7, topItems, upcoming,
        settings: { prepMinutes: s.prepMinutes, deliveryFee: s.deliveryFee, acceptOrders: s.acceptOrders, acceptBookings: s.acceptBookings, serviceCharge: s.serviceCharge }
      });
    }

    if (parts[2] === 'orders' && method === 'GET') {
      const status = url.searchParams.get('status') || 'all';
      const q = (url.searchParams.get('q') || '').toLowerCase();
      const limit = Math.min(400, num(url.searchParams.get('limit'), 200));
      let list = orders;
      if (status !== 'all') list = list.filter((o) => o.status === status);
      if (q) list = list.filter((o) => [o.code, o.name, o.phone, o.table, o.address, o.notes].join(' ').toLowerCase().includes(q));
      return sendJSON(res, 200, { ok: true, count: list.length, items: list.slice(0, limit) });
    }

    if (parts[2] === 'orders' && parts[3] && (method === 'PATCH' || method === 'PUT')) {
      const id = parts[3];
      let body; try { body = await readBody(req); } catch { return sendJSON(res, 400, { ok: false, error: 'invalid JSON' }); }
      const list = read('orders', []);
      const rec = list.find((o) => o.id === id || o.code === id);
      if (!rec) return sendJSON(res, 404, { ok: false, error: 'not_found' });
      const allowed = ['new', 'accepted', 'preparing', 'ready', 'done', 'cancelled'];
      if (body.status && allowed.includes(body.status)) rec.status = body.status;
      if (body.note !== undefined) rec.note = str(body.note, 300);
      rec.updatedAt = nowISO();
      write('orders', list);
      return sendJSON(res, 200, { ok: true, item: rec });
    }

    if (parts[2] === 'orders' && parts[3] && method === 'DELETE') {
      const id = parts[3];
      const list = read('orders', []).filter((o) => o.id !== id && o.code !== id);
      write('orders', list);
      return sendJSON(res, 200, { ok: true, deleted: id });
    }

    if (parts[2] === 'bookings' && method === 'GET') {
      const status = url.searchParams.get('status') || 'all';
      let list = bookings;
      if (status !== 'all') list = list.filter((b) => b.status === status);
      return sendJSON(res, 200, { ok: true, count: list.length, items: list.slice(0, 400) });
    }

    if (parts[2] === 'bookings' && parts[3] && (method === 'PATCH' || method === 'PUT')) {
      const id = parts[3];
      let body; try { body = await readBody(req); } catch { return sendJSON(res, 400, { ok: false, error: 'invalid JSON' }); }
      const list = read('bookings', []);
      const rec = list.find((b) => b.id === id || b.code === id);
      if (!rec) return sendJSON(res, 404, { ok: false, error: 'not_found' });
      const allowed = ['new', 'confirmed', 'seated', 'done', 'cancelled'];
      if (body.status && allowed.includes(body.status)) rec.status = body.status;
      if (body.note !== undefined) rec.note = str(body.note, 300);
      rec.updatedAt = nowISO();
      write('bookings', list);
      return sendJSON(res, 200, { ok: true, item: rec });
    }

    if (parts[2] === 'bookings' && parts[3] && method === 'DELETE') {
      const id = parts[3];
      write('bookings', read('bookings', []).filter((b) => b.id !== id && b.code !== id));
      return sendJSON(res, 200, { ok: true, deleted: id });
    }

    if (parts[2] === 'overrides') {
      if (method === 'GET') return sendJSON(res, 200, { ok: true, overrides: s.overrides });
      if (method === 'PUT' || method === 'POST') {
        let body; try { body = await readBody(req); } catch { return sendJSON(res, 400, { ok: false, error: 'invalid JSON' }); }
        const clean = {};
        Object.entries(body.overrides || body || {}).forEach(([id, v]) => {
          if (typeof id !== 'string' || !id) return;
          const entry = {};
          if (v && typeof v.price === 'number' && v.price >= 0) entry.price = Math.round(v.price);
          if (v && typeof v.available === 'boolean') entry.available = v.available;
          if (Object.keys(entry).length) clean[id.slice(0, 60)] = entry;
        });
        saveSettings({ overrides: clean });
        return sendJSON(res, 200, { ok: true, overrides: clean });
      }
    }

    if (parts[2] === 'settings') {
      if (method === 'GET') return sendJSON(res, 200, { ok: true, settings: { ...s, pin: '****', secret: undefined } });
      if (method === 'PUT' || method === 'POST') {
        let body; try { body = await readBody(req); } catch { return sendJSON(res, 400, { ok: false, error: 'invalid JSON' }); }
        const patch = {};
        if (body.prepMinutes !== undefined) patch.prepMinutes = Math.max(1, Math.min(240, Math.round(num(body.prepMinutes, 25))));
        if (body.deliveryFee !== undefined) patch.deliveryFee = Math.max(0, num(body.deliveryFee, 0));
        if (body.serviceCharge !== undefined) patch.serviceCharge = Math.max(0, Math.min(0.5, num(body.serviceCharge, 0.1)));
        if (typeof body.acceptOrders === 'boolean') patch.acceptOrders = body.acceptOrders;
        if (typeof body.acceptBookings === 'boolean') patch.acceptBookings = body.acceptBookings;
        if (body.pin !== undefined) {
          const pin = str(body.pin, 12);
          if (pin.length < 4) return sendJSON(res, 422, { ok: false, error: 'pin_too_short' });
          if (process.env.UC_ADMIN_PIN) return sendJSON(res, 403, { ok: false, error: 'pin_locked_by_env' });
          patch.pin = pin;
        }
        const next = saveSettings(patch);
        return sendJSON(res, 200, { ok: true, settings: { ...next, pin: '****', secret: undefined }, newToken: patch.pin ? makeToken(patch.pin) : null });
      }
    }

    if (parts[2] === 'export' && method === 'GET') {
      const type = url.searchParams.get('type') === 'bookings' ? 'bookings' : 'orders';
      let csv;
      if (type === 'orders') {
        csv = toCSV(orders, [
          { label: 'code', key: 'code' }, { label: 'created', key: 'createdAt' }, { label: 'status', key: 'status' },
          { label: 'type', key: 'type' }, { label: 'name', key: 'name' }, { label: 'phone', key: 'phone' },
          { label: 'table', key: 'table' }, { label: 'address', key: 'address' }, { label: 'when', key: 'when' },
          { label: 'items', get: (o) => (o.lines || []).map((l) => `${l.qty}x ${l.name}${l.extra ? ' (' + l.extra + ')' : ''}`).join(' | ') },
          { label: 'subtotal', key: 'subtotal' }, { label: 'service', key: 'service' }, { label: 'total', key: 'total' },
          { label: 'notes', key: 'notes' }, { label: 'lang', key: 'lang' }
        ]);
      } else {
        csv = toCSV(bookings, [
          { label: 'code', key: 'code' }, { label: 'created', key: 'createdAt' }, { label: 'status', key: 'status' },
          { label: 'date', key: 'date' }, { label: 'time', key: 'time' }, { label: 'guests', key: 'guests' },
          { label: 'name', key: 'name' }, { label: 'phone', key: 'phone' }, { label: 'email', key: 'email' },
          { label: 'seating', key: 'areaLabel' }, { label: 'occasion', key: 'occasion' }, { label: 'notes', key: 'notes' }
        ]);
      }
      const buf = Buffer.from('\ufeff' + csv, 'utf8');
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="umbrella-cafe-${type}-${nowISO().slice(0, 10)}.csv"`,
        'Content-Length': buf.length, 'Access-Control-Allow-Origin': '*'
      });
      return res.end(buf);
    }
  }

  return sendJSON(res, 404, { ok: false, error: 'not_found', path: url.pathname });
}

/* ========================================================= STATIC FILES */
function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
  if (rel === '/data' || rel.startsWith('/data/') || rel.startsWith('/.git')) { res.writeHead(404); return res.end('Not found'); }

  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      // single-page fallback for unknown paths (but never for /api)
      const fallback = path.join(ROOT, 'index.html');
      if (fs.existsSync(fallback)) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(fs.readFileSync(fallback));
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found');
    }
    const ext = path.extname(file).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const isAsset = /\.(png|jpg|jpeg|webp|gif|svg|ico|woff2|css|js)$/i.test(ext);
    const headers = {
      'Content-Type': type,
      'Cache-Control': ext === '.html' ? 'no-cache' : (isAsset ? 'public, max-age=86400' : 'public, max-age=3600'),
      'X-Content-Type-Options': 'nosniff'
    };
    const accept = String(req.headers['accept-encoding'] || '');
    const compressible = /text|javascript|json|svg|css/.test(type) && st.size > 1024;

    fs.readFile(file, (e2, data) => {
      if (e2) { res.writeHead(500); return res.end('Server error'); }
      if (compressible && accept.includes('gzip')) {
        const gz = zlib.gzipSync(data);
        headers['Content-Encoding'] = 'gzip';
        headers['Content-Length'] = gz.length;
        headers['Vary'] = 'Accept-Encoding';
        res.writeHead(200, headers);
        return res.end(req.method === 'HEAD' ? undefined : gz);
      }
      headers['Content-Length'] = data.length;
      res.writeHead(200, headers);
      res.end(req.method === 'HEAD' ? undefined : data);
    });
  });
}

/* ============================================================== SERVER */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res, url);
    res.writeHead(405, { Allow: 'GET,HEAD' }); res.end('Method not allowed');
  } catch (err) {
    console.error('[error]', err);
    if (!res.headersSent) sendJSON(res, 500, { ok: false, error: 'server_error' });
    else res.end();
  }
});

server.listen(PORT, HOST, () => {
  const s = settings();
  console.log('');
  console.log('  ☔  UMBRELLA CAFE — ELLA · web panel server v' + VERSION);
  console.log('  --------------------------------------------------');
  console.log(`  Site      http://localhost:${PORT}/`);
  console.log(`  Web panel http://localhost:${PORT}/admin.html   (PIN ${process.env.UC_ADMIN_PIN ? 'from env' : s.pin})`);
  console.log(`  API       http://localhost:${PORT}/api/health`);
  console.log(`  Data dir  ${DATA_DIR}`);
  console.log(`  Listening ${HOST}:${PORT}`);
  console.log('');
});

process.on('SIGTERM', () => { console.log('shutting down'); server.close(() => process.exit(0)); });
process.on('SIGINT', () => { console.log('shutting down'); server.close(() => process.exit(0)); });
