/* Umbrella Cafe — offline shell service worker */
var CACHE = 'umbrella-cafe-v1';
var SHELL = [
  './',
  './index.html',
  './admin.html',
  './manifest.json',
  './assets/css/styles.css',
  './assets/css/admin.css',
  './assets/js/config.js',
  './assets/js/i18n.js',
  './assets/js/menu-data.js',
  './assets/js/app.js',
  './assets/js/admin.js',
  './assets/img/logo.svg',
  './assets/img/logo-512.png',
  './assets/img/hero-ella.jpg'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL).catch(function () {}); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.indexOf('/api/') === 0) return;   // never cache API traffic

  // HTML: network first, fall back to cache (keeps menu updates instant)
  if (req.mode === 'navigate' || /\.html?$/.test(url.pathname)) {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy).catch(function () {}); });
        return res;
      }).catch(function () { return caches.match(req).then(function (m) { return m || caches.match('./index.html'); }); })
    );
    return;
  }

  // assets & images: stale-while-revalidate
  e.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy).catch(function () {}); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || network;
    })
  );
});
