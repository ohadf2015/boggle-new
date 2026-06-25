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

export const dynamic = 'force-dynamic';

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
