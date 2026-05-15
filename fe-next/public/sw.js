// LexiClash Service Worker
// Strategy: cache-first for static assets, network-first for pages/API
//
// Bump CACHE_NAME on every deploy that changes caching behavior, precache
// list, or static asset URLs. The `activate` handler below deletes any
// cache whose name !== CACHE_NAME, so bumping the version reliably evicts
// stale assets for returning users. Format: lexiclash-v{MAJOR}-{YYYYMMDD}.
const CACHE_NAME = 'lexiclash-v4-20260515';

// Cacheable: status 200 only, basic/default response type, GET requests.
// Rejects 206 (Range), 0 (opaque), redirects, and CORS-restricted responses
// that throw on Cache.put().
function isCacheable(response) {
  return (
    response &&
    response.status === 200 &&
    (response.type === 'basic' || response.type === 'default' || response.type === 'cors')
  );
}

// Wrap cache.put to swallow expected errors (Range, opaque, quota exceeded).
// SW has no Sentry SDK — forward unexpected failures to clients via postMessage
// so the page-side Sentry init can capture them.
function safeCachePut(cache, request, response) {
  return cache.put(request, response).catch((err) => {
    const msg = err && err.message ? err.message : String(err);
    // Known noise: partial responses, opaque, quota — swallow.
    if (
      msg.includes('Partial response') ||
      msg.includes('status code 206') ||
      msg.includes('convert value to') ||
      msg.includes('QuotaExceeded')
    ) {
      return;
    }
    self.clients.matchAll().then((clients) => {
      clients.forEach((c) => c.postMessage({ type: 'sw:cache-error', message: msg, url: request.url }));
    });
  });
}

// Static assets to precache on install
const PRECACHE_ASSETS = [
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
];

// Patterns that should NEVER be cached (always network)
const NETWORK_ONLY_PATTERNS = [
  /\/api\//,
  /\/socket\.io/,
  /supabase/,
  /sentry/,
  /_next\/webpack-hmr/,
];

// Patterns for cache-first strategy (immutable static assets)
const CACHE_FIRST_PATTERNS = [
  /\/_next\/static\//,
  /\/fonts\//,
  /\/images\//,
  /\/sounds\//,
  /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf|mp3|ogg|wav)$/,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  // Activate immediately without waiting for existing clients to close
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Take control of all open clients immediately
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Network-only: API, WebSocket, Sentry, HMR
  if (NETWORK_ONLY_PATTERNS.some((p) => p.test(url.pathname + url.search))) {
    return;
  }

  // Cache-first: static assets (immutable, hashed filenames)
  if (CACHE_FIRST_PATTERNS.some((p) => p.test(url.pathname))) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (isCacheable(response)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => safeCachePut(cache, request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-first: HTML pages (game state must be fresh)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (isCacheable(response)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => safeCachePut(cache, request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || Response.error()))
    );
    return;
  }

  // Stale-while-revalidate: everything else (_next/data, JS chunks)
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (isCacheable(response)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => safeCachePut(cache, request, clone));
          }
          return response;
        })
        .catch(() => cached || Response.error());
      return cached || fetchPromise;
    })
  );
});
