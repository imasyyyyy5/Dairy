const CACHE_NAME = 'dairy-notebook-v2';
const SHELL_ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first: always try to get the freshest copy when online (so a new
// deploy shows up immediately), and only fall back to the cached copy when
// offline. This avoids ever serving a stale index.html after an update —
// the old cache-first strategy could keep showing an outdated cached page
// even after a fix was deployed.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
self.addEventListener('fetch', (event) => {
  // Check if this is the incoming shared file
  if (event.request.method === 'POST' && event.request.url.includes('/import-shared-file')) {
    event.respondWith((async () => {
      try {
        // Extract the file from the incoming POST request
        const formData = await event.request.formData();
        const file = formData.get('backup_file');
        
        if (file) {
          // Store the file temporarily in the Cache API
          const cache = await caches.open('dairy-shared-file-cache');
          await cache.put('/temp-shared-backup.pdf', new Response(file));
        }
        
        // Redirect the user to the main app with a special URL parameter
        return Response.redirect('/?shared_import=pending', 303);
      } catch (error) {
        console.error("Error receiving shared file:", error);
        return Response.redirect('/?shared_import=error', 303);
      }
    })());
  }
});

