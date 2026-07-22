/**
 * Single source of truth for the service-worker script.
 *
 * Why this exists: `output: 'standalone'` does not serve `public/`, so the SW
 * cannot live at `public/sw.js` (it 404s in prod, and having both a public file
 * and the `/sw.js` route is a hard Next.js conflict → `/sw.js` 500). Instead
 * `app/sw.js/route.ts` serves THIS string. Keeping the script here (not inlined
 * in the route) lets us inject the offline-capable route list from the
 * canonical allowlist so the precache set can never drift, and lets a unit test
 * assert the emitted script parses as valid JS.
 *
 * The script is emitted as a template literal — regex backslashes are doubled
 * (`\\/` → `\/`). `swSource.test.ts` parses the output with `new Function` to
 * catch any escaping slip.
 */
import { offlineCapableRoutes } from '@/lib/offline/offlineCapableModes';
import { locales } from '@/i18n/config';

/**
 * Cache name. The `v{MAJOR}` prefix is bumped manually on a behavior/precache
 * change; the suffix is a per-build stamp derived from NEXT_PUBLIC_BUILD_TIME
 * (baked at build in next.config.mjs) so the name AUTO-BUMPS on every deploy.
 *
 * Why this matters: the SW `activate` handler deletes every cache whose key
 * isn't the current name, and `install` calls skipWaiting + `activate` calls
 * clients.claim. A *static* name meant the served `/sw.js` was byte-identical
 * across deploys → the browser never saw a new SW → install/activate never
 * re-ran → returning PWA / native-WebView users kept the previous build's
 * precached shells indefinitely. A build-stamped name changes the bytes every
 * deploy, so the new SW installs, claims clients, and purges the stale caches.
 *
 * Format: lexiclash-v{MAJOR}-{YYYYMMDDHHMMSS}. Dev/test (env unset) fall back to
 * a fixed 8-digit date so the value is deterministic.
 */
const BUILD_STAMP =
  (process.env.NEXT_PUBLIC_BUILD_TIME || '').replace(/\D/g, '').slice(0, 14) || '20260605';
export const SW_CACHE_NAME = `lexiclash-v7-${BUILD_STAMP}`;

/**
 * Route shells to precache so a cold (offline) launch has a cached document to
 * serve: every offline-capable mode route + each locale home (the locale home
 * is the navigation-fallback target when the uncacheable `/`→`/{locale}`
 * redirect can't be served offline).
 */
// Locale homes first: the navigation-fallback loop serves the first cached
// entry, and landing a cold offline launch on the home (with its offline
// launcher) is friendlier than dropping mid-mode.
const OFFLINE_SHELL_ROUTES: string[] = [
  ...locales.map((l) => `/${l}`),
  ...offlineCapableRoutes(),
];

export const SW_SOURCE = `// LexiClash Service Worker — generated from lib/sw/swSource.ts (do not edit served copy)
// Strategy: cache-first for static assets, network-first for pages (with an
// offline navigation fallback), stale-while-revalidate for everything else.
const CACHE_NAME = '${SW_CACHE_NAME}';
const OFFLINE_SHELL_ROUTES = ${JSON.stringify(OFFLINE_SHELL_ROUTES)};

function isCacheable(response) {
  return (
    response &&
    response.status === 200 &&
    (response.type === 'basic' || response.type === 'default' || response.type === 'cors')
  );
}

async function safeCachePut(cache, request, response) {
  try {
    return await cache.put(request, response);
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    // These are known, non-actionable cache failures — swallow them silently.
    if (
      msg.includes('Partial response') ||
      msg.includes('status code 206') ||
      msg.includes('convert value to') ||
      msg.includes('QuotaExceeded') ||
      msg.includes('Unexpected internal error')
    ) {
      return;
    }
    self.clients.matchAll().then((clients) => {
      clients.forEach((c) => c.postMessage({ type: 'sw:cache-error', message: msg, url: request.url }));
    });
  }
}

const PRECACHE_ASSETS = ['/favicon.ico', '/icon-192.png', '/icon-512.png'];

const NETWORK_ONLY_PATTERNS = [
  /\\/api\\//,
  /\\/socket\\.io/,
  /supabase/,
  /sentry/,
  /_next\\/webpack-hmr/,
];

// The word dictionary is an /api/ path, but it must be available offline so
// Blast/Daily word validation works with no network. Route it offline-first
// (stale-while-revalidate) — checked BEFORE NETWORK_ONLY_PATTERNS. This kills
// both the cold-start dict failure and the 24h IndexedDB-TTL re-fetch failure
// (the hook's re-fetch now succeeds from cache offline). Cached on first fetch,
// active-locale only (do not precache — Hebrew is ~5MB).
const DICT_SWR_PATTERN = /\\/api\\/dictionary-words/;

const CACHE_FIRST_PATTERNS = [
  /\\/_next\\/static\\//,
  /\\/fonts\\//,
  /\\/images\\//,
  /\\/sounds\\//,
  /\\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf|mp3|ogg|wav)$/,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Critical static assets — install fails if these can't be cached.
      await cache.addAll(PRECACHE_ASSETS);
      // Offline-capable shells — best-effort, per-route so one failed/redirected
      // fetch can't abort install (cache.addAll is all-or-nothing).
      await Promise.all(
        OFFLINE_SHELL_ROUTES.map((route) =>
          fetch(route, { credentials: 'same-origin' })
            .then((res) => (isCacheable(res) ? safeCachePut(cache, route, res.clone()) : undefined))
            .catch(() => undefined)
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// On a failed page navigation, fall back to a cached shell so a cold offline
// launch (entry is '/' → uncacheable redirect) can still boot. Prefer a shell
// whose locale matches the requested path, else any cached shell.
async function navigationFallback(request) {
  const exact = await caches.match(request);
  if (exact) return exact;
  const cache = await caches.open(CACHE_NAME);
  const path = new URL(request.url).pathname;
  const localeMatch = path.match(/^\\/([a-z]{2})(?:\\/|$)/);
  const locale = localeMatch ? localeMatch[1] : null;
  if (locale) {
    const home = await cache.match('/' + locale);
    if (home) return home;
  }
  for (const route of OFFLINE_SHELL_ROUTES) {
    const hit = await cache.match(route);
    if (hit) return hit;
  }
  return Response.error();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;
  if (request.method !== 'GET') return;

  // Dictionary: offline-first (cache, revalidate in background). Must precede
  // the NETWORK_ONLY check (which would otherwise claim this /api/ path).
  if (DICT_SWR_PATTERN.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(request).then((cached) => {
          const network = fetch(request)
            .then((response) => {
              if (isCacheable(response)) {
                safeCachePut(cache, request, response.clone());
              }
              return response;
            })
            .catch(() => cached || Response.error());
          return cached || network;
        })
      )
    );
    return;
  }

  if (NETWORK_ONLY_PATTERNS.some((p) => p.test(url.pathname + url.search))) {
    return;
  }

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

  const isNavigation =
    request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (isCacheable(response)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => safeCachePut(cache, request, clone));
          }
          return response;
        })
        .catch(() => navigationFallback(request))
    );
    return;
  }

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
`;
