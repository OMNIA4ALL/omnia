const CACHE_NAME = 'omnia-v2-cache-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './css/style.css',
  './js/api.js',
  './js/storage.js',
  './js/navigation.js',
  './js/dashboard.js',
  './js/tools.js',
  './js/earth.js',
  './js/universe.js',
  './js/simulation-lab.js',
  './js/learn.js',
  './js/file-lab.js',
  './js/code-playground.js',
  './js/world-intelligence.js',
  './js/workspace.js',
  './js/network.js',
  './js/device.js',
  './js/studio.js',
  './js/focus.js',
  './js/privacy.js',
  './js/assistant.js',
  './js/app.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Network first for external API requests, cache first for static assets
  if (e.request.url.includes('api.open-meteo.com') || e.request.url.includes('earthquake.usgs.gov') || e.request.url.includes('frankfurter.dev')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then((res) => {
        return res || fetch(e.request).catch(() => caches.match('./offline.html'));
      })
    );
  }
});
