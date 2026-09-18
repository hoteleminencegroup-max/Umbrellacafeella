# ☔ Umbrella Cafe — Ella · Roti & Kottu Hub

A complete, mobile-first **restaurant website + web panel** for **Umbrella Cafe**, Passara Road (3rd Mile Post), Ella 90090, Sri Lanka.

* **3D menu panel** at the very top of the page — tilt-on-hover dish cards, a rotating 3D signature carousel, coin-style price badges
* **Online ordering** (dine-in / takeaway / delivery) with a live basket and the cafe's 10 % service charge
* **Table booking** with date, time, guest stepper and seating choice
* **Admin web panel** — orders board, booking diary, menu price & sold-out control, settings, CSV export
* **4 languages** — English · Français · Русский · Deutsch (full menu + UI translation)
* **Zero dependencies** — no framework, no build step. Plain HTML/CSS/JS + a small Node server

---

## ☔ Real business details used

| | |
|---|---|
| **Name** | Umbrella Cafe — *The Umbrella Ella · Roti & Kottu Hub* |
| **Address** | Passara Road, 3rd Mile Post, Ella 90090, Uva Province, Sri Lanka |
| **Coordinates** | 6.872309, 81.05567 |
| **Phone** | +94 71 205 4801 (main) · +94 76 022 9717 (alt) |
| **WhatsApp** | +94 71 205 4801 (`wa.me/94712054801`) — the only notification channel |
| **Instagram** | [@cafe_umbrella_](https://www.instagram.com/cafe_umbrella_) |
| **Facebook** | [profile.php?id=61573828236464](https://www.facebook.com/profile.php?id=61573828236464) |
| **Google Maps** | [share.google/cYiIixkUGF5D3pMt7](https://share.google/cYiIixkUGF5D3pMt7) |
| **Tripadvisor** | [Umbrella Cafe, Ella](https://www.tripadvisor.com/Restaurant_Review-g616035-d21064844-Reviews-Umbrella_Cafe-Ella_Uva_Province.html) · 4.8 ★ (19 reviews) |
| **Hours** | Mon–Fri & Sun 09:00–21:00 · Sat 09:00–18:00 (Asia/Colombo) |
| **Menu** | 70 dishes across 17 categories, Rs. 250 – Rs. 1,950 |
| **Service charge** | 10 % added to the total bill |

All of it is editable in one place: **`assets/js/config.js`**.

---

## ▶ Quick start

```bash
npm start          # → http://localhost:8080
```

| URL | What |
|---|---|
| `/` | Customer website (menu at the top, ordering, booking) |
| `/admin.html` | Web panel — **PIN `2024`** |
| `/api/health` | API status + live menu overrides |

```bash
npm run seed       # fill the panel with realistic demo orders & bookings (--fresh to replace)
npm test           # front-end + admin smoke tests (needs: npm i -D jsdom)
```

Environment variables: `PORT` (default 8080), `HOST` (default 0.0.0.0), `UC_ADMIN_PIN` (overrides the stored PIN and locks it), `UC_DATA_DIR` (where JSON data lives).

---

## 🧾 The web panel (`/admin.html`)

PIN-protected, auto-refreshes every 25 s, keyboard shortcuts `1–5` to jump between views and `R` to refresh.

| View | What you can do |
|---|---|
| **Dashboard** | Orders today, revenue today/total, new orders in the queue, bookings & guests today · 7-day orders/revenue chart · top sellers · newest orders · upcoming bookings |
| **Orders** | Filter by status (new → accepted → preparing → ready → done, or cancelled) · search by code/name/phone/table/dish · expand to see every line, notes, subtotal, 10 % service and total · one-tap status advance · call / WhatsApp the customer · delete · CSV export |
| **Bookings** | Filter by status (new → confirmed → seated → done / cancelled) · sort by date or newest · guest count, seating, occasion, notes · call / WhatsApp · delete · CSV export |
| **Menu & Prices** | All 70 dishes: override a price or flip a dish to **sold out** — the public menu updates instantly. Search + category filter + "only changed". Reset all. |
| **Settings** | Prep time, delivery fee, service-charge %, pause online orders, pause bookings, change the panel PIN, export orders/bookings CSV or raw JSON |

**Two operating modes**

* **Server mode** (default, `npm start`) — orders and bookings from every visitor are stored in `data/*.json` and appear in the panel for everyone. Totals are recalculated **server-side** (client prices are never trusted).
* **Local mode** — if the site is hosted without the Node server (GitHub Pages, Netlify, any static host), the panel still unlocks and reads the orders placed in that browser, and every order/booking is delivered to the cafe as a **WhatsApp message** to +94 71 205 4801. A banner in the panel explains which mode is active.

---

## 🛒 Ordering & 📅 booking flow

1. Guest taps a dish → card with options (small/big pot, pancake topping) or add-ons (chicken curry, baby jackfruit curry) opens a chooser with quantity and live price.
2. Basket drawer shows lines, subtotal, **service charge 10 %**, total.
3. Checkout: dine-in (table no.) / takeaway / delivery (address), preferred time, name, phone/WhatsApp, kitchen notes. **No e-mail is used** — notifications go to the web panel and to WhatsApp.
4. On submit the order is **saved to the panel API** *and* a pre-filled **WhatsApp message** opens to the cafe with the full order, totals and order code (e.g. `UC-K7M2Q`).
5. Bookings work the same way and produce a reference like `BK-4RT8N`.

Validation: name + phone are required (address too, for delivery); bookings need a valid date and time. Customer details are remembered for next time. Orders survive a page reload (basket is persisted in `localStorage`).

---

## 🌐 Languages

`assets/js/i18n.js` holds **166 UI strings × 4 languages**; every dish name, description and category is translated in `assets/js/menu-data.js`.

* Language picker in the header + footer, remembered in `localStorage`, auto-detected from the browser on first visit.
* Numbers and prices are formatted per locale (`Rs. 1 900` in Russian, `Rs. 1.900` in German…).
* WhatsApp messages are sent to the kitchen in **English** (with the customer's language noted) so the staff always read the same dish names.
* Adding a 5th language = add one block to `I18N` and a 5th value to each `n(en, fr, ru, de, …)` call.

---

## 🍽️ Editing the menu

`assets/js/menu-data.js` — one object per dish:

```js
{ id: 'kottu-special', cat: 'kottu', price: 1900,
  img: 'kottu-special.png', emoji: '💥',
  tags: ['chicken', 'chef'], popular: true, signature: true,
  n: n('Umbrella Ultimate Legend (Special Kottu)', 'Légende Ultime…', 'Амбрелла…', 'Umbrella Ultimate Legend…'),
  d: n('Carrot, leeks, cabbage, beans, chicken, egg, mushrooms, sausage', …) }
```

| Field | Meaning |
|---|---|
| `cat` | category id (see `categories` at the top) |
| `price` | base price in LKR |
| `options` | mutually exclusive sizes/toppings, each with its own price |
| `addons` | optional extras (`+ Rs. 550`) |
| `tags` | `veg` `vegan` `chicken` `prawns` `cheese` `chef` — power the filter chips |
| `popular` / `signature` | boosts sorting and puts the dish in the 3D carousel |
| `img` / `emoji` | photo filename in `assets/img/dishes/`, emoji used by the placeholder tile |

Prices and availability can also be changed **without touching code** from the panel's *Menu & Prices* view (stored in `data/settings.json` as `overrides`).

---

## 🎨 Design

* **Palette** — green `#12805c` / deep green `#0a4d38` · blue `#0f6fb3` / deep blue `#0a3f66` · yellow `#ffc21f` · white `#ffffff` (the umbrella colours).
* **3D look** — `perspective` + `rotateX/rotateY` tilt on dish cards following the cursor, layered depth shadows, a 3D coverflow carousel for the signature dishes, embossed price "coins", glossy media overlays.
* **Mobile** — sticky bottom action bar (Menu · Order · Book · Call), hamburger nav, 2-column card grid, horizontally scrolling chips, safe-area insets; single column under 380 px.
* **Accessibility** — skip link, ARIA roles/labels, focus rings, `prefers-reduced-motion` support, keyboard-operable carousel and panel.
* **Extras** — PWA manifest + offline service worker, `Restaurant` JSON-LD schema (address, geo, hours, ratings, menu), Open Graph tags, print stylesheet (prints the menu cleanly).

---

## 🖼️ Images

AI-generated 3D food renders live in `assets/img/` and `assets/img/dishes/` as optimised JPGs (`bash tools/optimize-images.sh` converts & compresses anything you drop in). The logo is available as both a crisp SVG (`assets/img/logo.svg`) and a PNG badge (`assets/img/logo.png`).

While a dish photo is missing, the card shows a **themed placeholder tile** (category-tinted green/blue/yellow gradient + the dish emoji), so the site never looks broken. To use your own photos, drop files into `assets/img/dishes/` using these names:

```
roti-veg · roti-cheese · roti-mushroom · roti-hawaiian · roti-chicken
kottu-veg · kottu-chicken · kottu-special
rice-curry · coconut-roti · veg-fried-rice · fried-rice · pepper-chicken
chopsey · soup · starters · omelette · boiled
pancakes · choc-pancake · sweet-corner · icecream
juice · lassi · milkshake · tea · coffee · iced · softdrinks      (.jpg, 900×900)
```

29 photos cover all 70 dishes: similar items share one shot (every soup uses `soup.jpg`, every juice `juice.jpg`, …) while the dish's own emoji badge keeps the cards distinct. Swap any of them for a real photo of your plate and it appears instantly.

---

## 🚀 Deploying

**With the panel (recommended)** — any Node host (VPS, Railway, Render, Fly.io, a VPS with `pm2`):

```bash
git clone <repo> && cd Umbrellacafeella
UC_ADMIN_PIN=your-secret-pin PORT=8080 npm start
```

Put it behind nginx/Caddy with HTTPS; `data/` is the only state and can be backed up or volume-mounted.

**Static only** — GitHub Pages / Netlify / Vercel / Cloudflare Pages: upload everything except `server/` and `data/`. Orders and bookings then travel by WhatsApp, and `/admin.html` runs in local mode.

---

## 📁 Project structure

```
index.html              customer website (menu first, ordering, booking, gallery, contact)
admin.html              web panel (PIN gate → dashboard/orders/bookings/menu/settings)
manifest.json  sw.js    PWA manifest + offline service worker
assets/
  css/styles.css        site theme, 3D cards, responsive layout
  css/admin.css         panel theme
  js/config.js          ☔ real business profile — edit phone, hours, socials, service charge
  js/i18n.js            166 UI strings × EN/FR/RU/DE + language engine + money formatting
  js/menu-data.js       70 dishes × 17 categories, fully translated
  js/app.js             menu rendering, 3D carousel, basket, checkout, booking
  js/admin.js           panel logic (API mode + local fallback)
  img/logo.svg|png      umbrella logo (theme colours)
  img/hero-ella.png     Ella hill-country hero
  img/dishes/*.png      3D dish renders
server/index.js         zero-dependency Node server: static + REST API + PIN auth + CSV
server/seed.js          demo data generator
tests/smoke.mjs         site smoke test (jsdom): boot, 4 languages, basket maths, filters
tests/admin.mjs         panel smoke test (jsdom): API mode + local mode
data/*.json             orders, bookings, settings (git-ignored)
```

### API

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | – | status + service charge + menu overrides |
| POST | `/api/orders` | – | create an order (totals recalculated server-side) |
| POST | `/api/bookings` | – | create a table booking |
| POST | `/api/admin/login` | PIN | returns a 12 h bearer token |
| GET | `/api/admin/summary` | ✔ | dashboard KPIs, 7-day chart, top sellers, upcoming bookings |
| GET/PATCH/DELETE | `/api/admin/orders[/:id]` | ✔ | list / change status & note / delete |
| GET/PATCH/DELETE | `/api/admin/bookings[/:id]` | ✔ | list / change status & note / delete |
| GET/PUT | `/api/admin/overrides` | ✔ | read/write menu price & sold-out overrides |
| GET/PUT | `/api/admin/settings` | ✔ | prep time, delivery fee, service %, pause orders/bookings, PIN |
| GET | `/api/admin/export?type=orders\|bookings` | ✔ | CSV download |

Rate limiting, payload size limits, path-traversal guards, `no-store` API caching and gzip are built in. The PIN is never returned by the API; tokens are HMAC-signed and expire.

---

## ✅ Tests

```bash
npm install --save-dev jsdom
npm test
```

* `tests/smoke.mjs` — boots the site, asserts a clean console, 70 dish cards, 17 category chips, the 3D carousel, real contact data & map coordinates, all four languages re-rendering, basket maths (`1900 + 2×600 = 3100 → +10 % → 3410`), option/add-on pricing, checkout validation, order storage, the full booking flow, search/filters, and panel overrides (sold-out + price change).
* `tests/admin.mjs` — PIN gate (wrong/right), dashboard KPIs & chart, order/booking status transitions through the API, filters & search, the 70-row menu editor, overrides & settings persistence, PIN change rules, lock, and the offline **local mode** fallback.

---

*Made with ❤ in the hills of Ella — Good Food, Cold Beer & Mountain Vibes.*
