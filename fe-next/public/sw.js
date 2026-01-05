/**
 * LexiClash Service Worker
 *
 * Provides:
 * - Offline caching of static assets (app shell)
 * - Cache-first strategy for fonts and images
 * - Network-first strategy for API calls
 * - Offline fallback page
 */

const CACHE_VERSION = 'lexiclash-v4'; // v4: Remove fake offline page, let browser handle errors
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

// Static assets to cache on install (app shell)
// NOTE: Do NOT cache '/' as it's a redirect route, not actual content
const STATIC_ASSETS = [
  '/manifest.json',
  '/favicon.svg',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/og-image-en.jpg',
  '/og-image-he.jpg',
];

// Cache limits
const MAX_DYNAMIC_CACHE_SIZE = 50;

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      // Cache what we can, don't fail if some assets are missing
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[SW] Failed to cache: ${url}`, err);
          })
        )
      );
    })
  );
  // Take control immediately
  self.skipWaiting();
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key.startsWith('lexiclash-') && key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          })
      );
    })
  );
  // Take control of all pages
  self.clients.claim();
});

/**
 * Helper: Limit cache size
 */
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    // Delete oldest entries
    const deleteCount = keys.length - maxItems;
    for (let i = 0; i < deleteCount; i++) {
      await cache.delete(keys[i]);
    }
  }
}

/**
 * Helper: Cache-first strategy (for static assets)
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
      limitCacheSize(DYNAMIC_CACHE, MAX_DYNAMIC_CACHE_SIZE);
    }
    return response;
  } catch {
    // For static assets, just let the browser handle the network error
    // Don't return undefined or a fallback that might not exist
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

/**
 * Helper: Network-first strategy (for API and pages)
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    // Cache successful responses (but not redirects or errors)
    if (response.ok && response.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Network failed - try cache
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    // For navigation requests, let the browser handle the error naturally
    // This allows proper error pages and avoids showing misleading "offline" messages
    // when the issue is actually a server error or deployment issue
    if (request.mode === 'navigate') {
      // Re-throw to let browser show its native error page
      // This is better UX than a fake "offline" page when the server is down
      throw error;
    }
    return new Response('Network error', { status: 503, statusText: 'Service Unavailable' });
  }
}

/**
 * Fetch event - route requests to appropriate strategy
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip WebSocket and socket.io
  if (url.pathname.includes('socket.io') || url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }

  // Skip auth-related routes - these should NEVER be cached or intercepted
  // to prevent authentication flow issues
  if (url.pathname.includes('/auth/')) {
    return;
  }

  // Skip external API calls
  if (url.origin !== location.origin) {
    // Exception: Google Fonts - cache these
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
      event.respondWith(cacheFirst(request));
    }
    return;
  }

  // API routes - network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Next.js chunks - network first (these change on each deployment)
  // CRITICAL: Do NOT cache-first these, as chunk hashes change between deployments
  if (url.pathname.startsWith('/_next/static/chunks/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets - cache first (but NOT chunks)
  if (
    url.pathname.match(/\.(woff2?|ttf|otf|png|jpg|jpeg|svg|ico|webp)$/) ||
    STATIC_ASSETS.includes(url.pathname)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // CSS and other Next.js static files - network first for freshness
  if (url.pathname.match(/\.(js|css)$/) || url.pathname.startsWith('/_next/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // HTML pages - network first
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Default - network first
  event.respondWith(networkFirst(request));
});

/**
 * Background sync for offline actions (if supported)
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-game-data') {
    console.log('[SW] Background sync triggered');
    // Future: sync offline game data
  }
});

/**
 * Push notification support (if implemented later)
 */
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'LexiClash', {
        body: data.body || 'New game notification',
        icon: '/icon-192.png',
        badge: '/icon-96.png',
        data: data.url,
      })
    );
  }
});

/**
 * Handle notification click
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.notification.data) {
    event.waitUntil(clients.openWindow(event.notification.data));
  }
});
