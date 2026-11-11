// Service Worker PWA — CanchaApp ADI Venecia
// Blindado bajo OWASP Top 10:2025 (A02/A03/A04):
// - Solo intercepta peticiones GET del mismo origen (Same-Origin).
// - Excluye rutas administrativas (/admin/*) y endpoints API (/api/*) del caché compartido.

const CACHE_NAME = 'cancha-venecia-pwa-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/reservar/',
  '/mi-reserva/',
  '/confirmacion/',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  let reqUrl;
  try {
    reqUrl = new URL(event.request.url);
  } catch {
    return;
  }

  // OWASP A03/A04: No cachear orígenes externos, endpoints API ni vistas administrativas sensibles
  if (
    reqUrl.origin !== self.location.origin ||
    reqUrl.pathname.startsWith('/api/') ||
    reqUrl.pathname.startsWith('/admin/')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match('/index.html'))
      )
  );
});
