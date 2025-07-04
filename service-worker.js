const STATIC_CACHE_NAME = 'static-cache-v1';
const RUNTIME_CACHE_NAME = 'runtime-cache';
const MAX_RUNTIME_ITEMS = 50;

const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/manifest.json',
  '/service-worker.js',
  '/videos.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Instalando: cache estático dos arquivos essenciais
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

// Ativando: removendo caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== STATIC_CACHE_NAME && key !== RUNTIME_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Função para limitar o tamanho do cache dinâmico
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    limitCacheSize(cacheName, maxItems);
  }
}

// Estratégia mista: Cache First para arquivos estáticos, Network First para outros (ex: vídeos)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  if (FILES_TO_CACHE.includes(new URL(event.request.url).pathname)) {
    // Cache First para arquivos estáticos
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        return cachedResponse || fetch(event.request);
      })
    );
  } else {
    // Network First para outros (dinâmicos)
    event.respondWith(
      fetch(event.request).then(response => {
        return caches.open(RUNTIME_CACHE_NAME).then(cache => {
          cache.put(event.request, response.clone());
          limitCacheSize(RUNTIME_CACHE_NAME, MAX_RUNTIME_ITEMS);
          return response;
        });
      }).catch(() => caches.match(event.request))
    );
  }
});

// Para atualizar imediatamente após instrução
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
