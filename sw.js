// Service Worker for Dr. Savianu Medical Website
// Cache version bumped to v146: added gestoreturni/gestoreturni.html and gestoreturni/app.js
const CACHE_NAME = 'savianu-v147';
const urlsToCache = [
  '/',
  '/index.html',
  '/privacy.html',
  '/styles.css',
  '/app.js',
  '/config.js',
  '/logo.png',
  '/bluelogo.png',
  '/bronzelogo.png',
  '/cert-malattia.html',
  '/rsa.html',
  '/faq.html',
  '/esenzioni.html',
  '/impegnative.html',
  '/offline.html',
  '/calcolatore-ferie.html',
  '/calcolatoreferiegemini.html',
  '/ferie.html',
  '/installazione.html',
  '/xsegretarie.html',
  '/gestoreturni/gestoreturni.html',
  '/gestoreturni/app.js'
];

// Helper: Check if request is same-origin
function isSameOrigin(requestUrl) {
  const url = new URL(requestUrl);
  return url.origin === self.location.origin;
}

// Helper: NetworkFirst strategy (try network first, fallback to cache)
function networkFirst(request) {
  return fetch(request)
    .then(response => {
      // Cache only successful responses (status 200-299)
      if (response && response.status >= 200 && response.status < 300) {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, responseClone);
        });
      }
      return response;
    })
    .catch(() => {
      return caches.match(request) || caches.match('/offline.html');
    });
}

// Helper: CacheFirst strategy (try cache first, fallback to network)
function cacheFirst(request) {
  return caches.match(request)
    .then(response => {
      if (response) {
        return response;
      }
      return fetch(request)
        .then(response => {
          // Cache only successful responses
          if (response && response.status >= 200 && response.status < 300) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
    })
    .catch(() => caches.match('/offline.html'));
}

// Message handler — page sends SKIP_WAITING to activate update toast-triggered SW
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Install event — do NOT skipWaiting here; let the update toast control activation
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - Strategic routing based on request type
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Only cache same-origin requests
  if (!isSameOrigin(event.request.url)) return;

  // Detect request type
  const isNavigation = event.request.mode === 'navigate';
  const isStaticAsset = ['style', 'script', 'image', 'font'].includes(event.request.destination);

  // Route to appropriate strategy
  event.respondWith(
    isNavigation || !isStaticAsset
      ? networkFirst(event.request)
      : cacheFirst(event.request)
  );
});