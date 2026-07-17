// Milk Dairy Notebook — Service Worker
// Bump CACHE_VERSION on every deploy that changes app.html / index.html /
// icons / manifest, otherwise users keep getting the old cached version
// forever.
const CACHE_VERSION = 'v4';
const CACHE_NAME = 'mdn-cache-' + CACHE_VERSION;

// Everything needed to open and run the app with zero network.
// app.html is the real app (start_url in manifest.json) — it must be
// precached. index.html (the promo/landing page) is precached too so it
// also works offline, but it is NOT the app shell.
const PRECACHE_URLS = [
  './app.html',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'
];

async function handleShareTarget(event) {
  try {
    const formData = await event.request.formData();
    const file = formData.get('backup_file');
    if (file) {
      const cache = await caches.open(SHARE_CACHE_NAME);
      await cache.put('shared-file', new Response(file, {
        headers: { 'Content-Type': file.type || 'application/pdf' }
      }));
    }
  } catch (err) {
    console.warn('[SW] share target handling failed:', err);
  }
  return Response.redirect('./index.html?shared=1', 303);
}

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

// Name of the cache used to hand off an incoming shared file from this
// fetch handler to the page (there's no server here, so this cache is the
// only way to move the Blob from the share-sheet POST to index.html).
const SHARE_CACHE_NAME = 'mdn-shared-incoming';

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Web Share Target hand-off: the OS share sheet POSTs the file here
  // (manifest.json's share_target.action). There's no real server behind
  // this static app, so the service worker itself has to catch the POST,
  // stash the file, and redirect into the app.
  if (req.method === 'POST') {
    const url = new URL(req.url);
    if (url.pathname.endsWith('/import-shared-file')) {
      event.respondWith(handleShareTarget(event));
      return;
    }
  }

  if (req.method !== 'GET') return;

  // Page navigations: ALWAYS try the network first so users get today's
  // update immediately. Only fall back to the cached copy when there's no
  // network (offline support). Cache/match by the ACTUAL url being
  // navigated to (app.html vs index.html) — not a hardcoded page — so the
  // two pages never overwrite each other's cached copy. If a page has never
  // been cached (e.g. first-ever offline launch), fall back to app.html
  // since that's the real app and the more useful thing to show.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        if (res && res.status === 200) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return res;
      }).catch(() => caches.match(req).then((cached) => cached || caches.match('./app.html')))
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
