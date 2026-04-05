// Agro Pro — Service Worker
const CACHE_NAME = 'agropro-v2';
const CACHE_URLS = [
  './agropro-3-1.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './splash-640x1136.png',
  './splash-750x1334.png',
  './splash-1125x2436.png',
  './splash-828x1792.png',
  './splash-1242x2688.png',
  './splash-1170x2532.png',
  './splash-1284x2778.png',
  './splash-1179x2556.png',
  './splash-1290x2796.png',
  './splash-1536x2048.png',
  './splash-1668x2388.png',
  './splash-2048x2732.png'
];

// Instalação — pré-cacheia os arquivos essenciais
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // Tenta cachear tudo; falhas em splash individuais não travam o install
      return Promise.allSettled(
        CACHE_URLS.map(function(url) {
          return cache.add(url).catch(function() {});
        })
      );
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Ativação — limpa caches antigos
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch — cache-first para assets locais, network-first para API Supabase
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // Supabase e APIs externas: sempre rede, sem cache
  if (url.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request).catch(function() {
        return new Response(JSON.stringify({ error: 'offline' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Fontes Google: network-first com fallback cache
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    event.respondWith(
      fetch(event.request).then(function(response) {
        var toCache = response.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, toCache); });
        return response;
      }).catch(function() {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Assets locais: cache-first
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;
      return fetch(event.request).then(function(response) {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        var toCache = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, toCache);
        });
        return response;
      }).catch(function() {
        return caches.match('./agropro-3-1.html');
      });
    })
  );
});
