// Milk Dairy Notebook — Service Worker
// Bump CACHE_VERSION on every deploy that changes index.html / icons /
// manifest, otherwise users keep getting the old cached version forever.
const CACHE_VERSION = 'v2';
const CACHE_NAME = 'mdn-cache-' + CACHE_VERSION;

// Everything needed to open and run the app with zero network.
// Add any other local files you reference (extra icons, fonts, etc).
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => console.warn('[SW] precache failed:', url, err))
        )
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Page navigations: ALWAYS try the network first so users get today's
  // update immediately. Only fall back to the cached app shell when
  // there's no network (offline support). Whatever comes back from the
  // network is also stored, so offline mode stays fresh too.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        if (res && res.status === 200) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', resClone));
        }
        return res;
      }).catch(() => caches.match('./index.html').then((cached) => cached || caches.match('./')))
    );
    return;
  }

  // Everything else (manifest, icons, the pdf-lib script): cache-first,
  // fall back to network, and store whatever the network returns for
  // next time.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && (res.status === 200 || res.type === 'opaque')) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
