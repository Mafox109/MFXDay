/* eslint-disable no-restricted-globals */

const SHELL_CACHE = 'mfxday-shell-v1';
const RUNTIME_CACHE = 'mfxday-runtime-v1';

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/icons/icon-72.svg',
  '/icons/icon-96.svg',
  '/icons/icon-128.svg',
  '/icons/icon-144.svg',
  '/icons/icon-192.svg',
  '/icons/icon-256.svg',
  '/icons/icon-384.svg',
  '/icons/icon-512.svg',
];

self.addEventListener('install', (event) => {
  // Pré-cache do "app shell" (controlamos atualização via SKIP_WAITING).
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).catch(() => {
      // Se algum asset falhar no addAll, ainda tentamos ativar.
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => {
          if (k !== SHELL_CACHE && k !== RUNTIME_CACHE) return caches.delete(k);
          return Promise.resolve(false);
        })
      );
      // Após ativar, assume controle de páginas existentes.
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    // Atualização controlada: só chamamos skipWaiting via UI.
    self.skipWaiting();
  }
});

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Fallback: prefere servir o app shell (SPA) e usa offline.html apenas como último recurso.
    const cachedIndex = await caches.match('/index.html');
    if (cachedIndex) return cachedIndex;
    const cachedOffline = await caches.match('/offline.html');
    return cachedOffline || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached || fetchPromise;
}

async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cachedOffline = await caches.match('/offline.html');
    return cachedOffline || Response.error();
  }
}

function isSameOrigin(url) {
  try {
    return url.origin === self.location.origin;
  } catch {
    return true;
  }
}

function isNavigationRequest(request) {
  if (request.mode === 'navigate') return true;
  const accept = request.headers.get('accept') || '';
  return accept.includes('text/html');
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!isSameOrigin(url)) return;

  // Navegação SPA: fallback offline garantido.
  if (isNavigationRequest(request)) {
    event.respondWith(networkFirst(request));
    return;
  }

  const pathname = url.pathname;
  const isIcon = pathname.startsWith('/icons/');
  const isAsset =
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/icons/') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.woff2') ||
    pathname.endsWith('.woff');

  if (isAsset || isIcon) {
    // Stale While Revalidate: melhora sensação de velocidade.
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Outros GET: Cache First.
  event.respondWith(cacheFirst(request));
});

