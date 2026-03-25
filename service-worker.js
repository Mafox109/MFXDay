/* eslint-disable no-restricted-globals */

// Versão do cache: ao fazer deploy, você deve manter este valor constante
// ou incrementá-lo para forçar atualização completa.
const CACHE_VERSION = 'mfxday-static-v1';
const CACHE_NAME = CACHE_VERSION;

const ESSENTIAL = [
  './index.html',
  './styles.css',
  './main.js',
  './manifest.json',
  './offline.html',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

function toAbsolute(urlOrDot) {
  return new URL(urlOrDot, self.location).href;
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Fallback offline:
    // - se for navegação HTML, devolve offline.html
    // - caso contrário, tenta devolver qualquer HTML cacheado
    const accept = request.headers.get('accept') || '';
    if (accept.includes('text/html')) {
      return (await cache.match(toAbsolute('./offline.html'))) || Response.error();
    }
    return Response.error();
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const urls = ESSENTIAL.map(toAbsolute);
      // cache.addAll falha se qualquer recurso não existir.
      try {
        await cache.addAll(urls);
      } catch {
        // Tentativa resiliente: adiciona um por vez.
        for (const u of urls) {
          try {
            const res = await fetch(u);
            if (res && res.ok) await cache.put(u, res.clone());
          } catch {
            // ignora item faltante
          }
        }
      }
      self.skipWaiting(); // para ser mais responsivo em redes instáveis
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) return caches.delete(k);
          return Promise.resolve(false);
        })
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  // Para navegação (SPA ou URLs diretas), garante fallback offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await cacheFirst(request);
        } catch {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match(toAbsolute('./offline.html'))) || Response.error();
        }
      })()
    );
    return;
  }

  event.respondWith(cacheFirst(request));
});

