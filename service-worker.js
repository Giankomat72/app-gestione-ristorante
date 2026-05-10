// ============================================================
// service-worker.js - PWA Service Worker
// GestioneRistorante v1.0
// ============================================================

const CACHE_NAME = 'gestione-ristorante-v1';
const ASSETS_TO_CACHE = [
  '/app-gestione-ristorante/',
  '/app-gestione-ristorante/index.html',
  '/app-gestione-ristorante/manifest.json',
  '/app-gestione-ristorante/css/style.css',
  '/app-gestione-ristorante/js/app.js',
  '/app-gestione-ristorante/js/api.js',
  '/app-gestione-ristorante/js/turni.js',
  '/app-gestione-ristorante/js/bacheca.js',
  '/app-gestione-ristorante/js/ordini.js',
  '/app-gestione-ristorante/js/attivita.js'
];

// INSTALL: mette in cache tutti gli asset
self.addEventListener('install', function(event) {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// ACTIVATE: pulisce cache vecchie
self.addEventListener('activate', function(event) {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then(function(keyList) {
      return Promise.all(keyList.map(function(key) {
        if (key !== CACHE_NAME) {
          console.log('[SW] Removing old cache:', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

// FETCH: strategia Network First con fallback cache
self.addEventListener('fetch', function(event) {
  // Ignora richieste non-GET
  if (event.request.method !== 'GET') return;

  // Per le API di Google Sheets: sempre network, no cache
  if (event.request.url.includes('script.google.com') ||
      event.request.url.includes('googleapis.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Per tutto il resto: Network First
  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // Salva una copia nella cache
        if (response.status === 200) {
          var responseClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(function() {
        // Se network fallisce, usa la cache
        return caches.match(event.request).then(function(response) {
          if (response) return response;
          // Fallback finale: index.html
          return caches.match('/app-gestione-ristorante/index.html');
        });
      })
  );
});
