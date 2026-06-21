const CACHE_NAME = 'dairy-notebook-v1';

// Edited to use explicit repository paths for GitHub Pages
const SHELL_ASSETS = [
  '/Dairy/',
  '/Dairy/index.html',
  '/Dairy/manifest.json',
  '/Dairy/icon-192.png',
  '/Dairy/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  // Forces the waiting service worker to become the active service worker
  self.skipWaiting(); 
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  // Ensures the service worker takes control of the page immediately
  self.clients.claim(); 
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests and valid HTTP/HTTPS protocols (ignores Chrome extensions, etc.)
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Stale-while-revalidate: Fetch new data in the background to keep the cache fresh
      const networkFetch = fetch(event.request)
        .then((networkResponse) => {
          // Ensure we only cache valid, successful, and local-origin responses
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => {
          // If the network fails (offline), return the cached version
          return cachedResponse; 
        });

      // Return the cached response immediately if it exists, otherwise wait for the network fetch
      return cachedResponse || networkFetch;
    })
  );
});
