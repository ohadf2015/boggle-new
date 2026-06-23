/**
 * Serves the Service Worker with the correct MIME type and headers.
 *
 * In Next.js standalone output, files in `public/` are NOT automatically served
 * — the standalone server only serves /_next/* and the Node process itself.
 * Requests to /sw.js therefore fall through to the router. This route handler is
 * the SINGLE source of /sw.js (there is intentionally no `public/sw.js`, which
 * would also be a hard "conflicting public file and page file" error → 500).
 *
 * The actual SW script lives in `lib/sw/swSource.ts` so the precache route list
 * can be injected from the canonical offline allowlist (no drift) and unit-
 * tested. We serve it with:
 *   Content-Type: application/javascript
 *   Service-Worker-Allowed: /   (grants full-path scope)
 *   Cache-Control: must-revalidate (browser picks up new SW versions)
 */
import { SW_SOURCE } from '@/lib/sw/swSource';

// Monetag's ownership-verification service worker. Monetag's "Upload file"
// verification fetches /sw.js and checks it matches this exact content (zone
// 11192958). But /sw.js is ALSO the app's real PWA service worker — we cannot
// replace it, or we'd install Monetag's push/ad SW for every visitor AND inside
// the native Capacitor app webview (where AdMob serves → behavioral-policy
// violation). So we serve this Monetag content to the VERIFIER REQUEST ONLY (see
// isMonetagVerifier) and the real SW to everyone else. The verifier just reads
// the bytes; it never installs them as a SW.
const MONETAG_VERIFICATION_SW = `self.options = {
    "domain": "3nbf4.com",
    "zoneId": 11192958
}
self.lary = ""
importScripts('https://3nbf4.com/act/files/service-worker.min.js?r=sw')
`;

/**
 * A GENUINE service-worker registration (`navigator.serviceWorker.register`)
 * always sends `Sec-Fetch-Dest: serviceworker` — real browsers and the native
 * Capacitor webview included. Monetag's verifier is a plain server-side GET: no
 * Sec-Fetch headers and no cookie. We require BOTH signals absent before serving
 * the Monetag bytes, so a real SW install can never receive them.
 */
function isMonetagVerifier(request: Request): boolean {
  const h = request.headers;
  const isServiceWorkerFetch = h.get('sec-fetch-dest') === 'serviceworker';
  const hasCookie = !!h.get('cookie');
  return !isServiceWorkerFetch && !hasCookie;
}

export const dynamic = 'force-dynamic';

export function GET(request: Request): Response {
  if (isMonetagVerifier(request)) {
    return new Response(MONETAG_VERIFICATION_SW, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-store',
        'CDN-Cache-Control': 'no-store',
      },
    });
  }

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
