/**
 * Serves the Service Worker with the correct MIME type and headers.
 *
 * In Next.js standalone output (used on Vercel), files in `public/` are NOT
 * automatically served — the standalone server only serves /_next/* and the
 * Node process itself. Requests to /sw.js therefore fall through to the Next.js
 * router and return an HTML 404 page, which makes the browser reject the SW
 * registration ("MIME type is not a JavaScript MIME type").
 *
 * This route handler inlines the SW source and serves it with:
 *   Content-Type: application/javascript
 *   Service-Worker-Allowed: /   (grants full-path scope)
 *   Cache-Control: no-cache     (browser must revalidate on each page load)
 */

// Inline the SW source so it survives the standalone bundle copy step.
// Keep this in sync with public/sw.js.
const SW_SOURCE = `// LexiClash Service Worker
// Strategy: cache-first for static assets, network-first for pages/API
const CACHE_NAME = 'lexiclash-v1';

// Static assets to precache on install
const PRECACHE_ASSETS = [
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
];

// Patterns that should NEVER be cached (always network)
const NETWORK_ONLY_PATTERNS = [
  /\\/api\\//,
  /\\/socket\\.io/,
  /supabase/,
  /sentry/,
  /_next\\/webpack-hmr/,
];

// Patterns for cache-first strategy (immutable static assets)
const CACHE_FIRST_PATTERNS = [
  /\\/_next\\/static\\//,
  /\\/fonts\\//,
  /\\/images\\//,
  /\\/sounds\\//,
  /\\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf|mp3|ogg|wav)$/,
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
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
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
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Stale-while-revalidate: everything else (_next/data, JS chunks)
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
`;

export const dynamic = 'force-static';

export function GET(): Response {
  return new Response(SW_SOURCE, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      // Allow the SW to control the entire origin scope
      'Service-Worker-Allowed': '/',
      // Must revalidate on every navigation so updated SW versions are picked up
      'Cache-Control': 'public, max-age=0, must-revalidate',
      // Prevent CDN edge caches from serving stale SW bytes
      'CDN-Cache-Control': 'no-store',
    },
  });
}
