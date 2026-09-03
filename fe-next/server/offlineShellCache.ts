import type { Request, Response } from 'express';
import { locales } from '@/i18n/config';
import { offlineCapableRoutes } from '@/lib/offline/offlineCapableModes';

/**
 * Cold-start offline fix (device-verified 2026-09-03):
 *
 * The native app loads from the remote URL, and the Android WebView does NOT
 * serve cold-start navigations from service-worker cache — a fresh offline
 * launch fails straight into Capacitor's `errorPath` before the SW can answer.
 * The one store the WebView DOES consult on a cold offline launch is its
 * plain HTTP cache — but Next's dynamic pages respond with
 * `private, no-cache, no-store, max-age=0, must-revalidate`, which forbids
 * storing the document at all.
 *
 * For the offline-shell routes (the same set the SW precaches — home shells
 * plus every offline-capable mode) we rewrite Cache-Control to a short
 * max-age plus a long stale-while-revalidate window, so:
 *  - online: shell is served from cache for 5 min, then revalidated;
 *  - offline cold start: WebView serves the cached shell from disk cache
 *    (MainActivity sets LOAD_CACHE_ELSE_NETWORK), React boots, and
 *    NetworkStatusHandler's offline launcher takes over.
 *
 * Safety invariants:
 *  - `private` only — shared/CDN caches must never store these responses;
 *    per-user browser cache only.
 *  - Document navigations only. RSC fetches and Next router prefetches use
 *    the same URLs with `RSC` / `next-router-prefetch` headers — serving
 *    stale HTML there would hand the client router a stale payload, so the
 *    rewrite never applies to them.
 *  - Anything outside the shell set is untouched (APIs keep no-store).
 */

export const OFFLINE_SHELL_CACHE_CONTROL =
  'private, max-age=300, stale-while-revalidate=86400';

const EXTRA_SHELL_SEGMENTS = ['connections/pyramid'] as const;

const SHELL_PATHS: ReadonlySet<string> = new Set([
  '/',
  ...locales.map((l) => `/${l}`),
  ...offlineCapableRoutes().map((route) => route.split(/[?#]/)[0] ?? ''),
  ...locales.flatMap((l) => EXTRA_SHELL_SEGMENTS.map((seg) => `/${l}/${seg}`)),
]);

export function isOfflineShellPath(pathname: string): boolean {
  return SHELL_PATHS.has(pathname);
}

/** True for real page loads; RSC/prefetch fetches must never get stale bytes. */
export function isDocumentNavigation(req: Request): boolean {
  return !req.headers['rsc'] && !req.headers['next-router-prefetch'];
}

/**
 * Wrap the response's header writers so any Cache-Control Next sets for an
 * offline-shell document navigation is replaced with the cacheable value.
 * Non-shell routes and RSC/prefetch requests pass through untouched.
 */
export function applyOfflineShellCacheHeader(
  req: Request,
  res: Response,
  pathname: string,
): void {
  if (!isOfflineShellPath(pathname) || !isDocumentNavigation(req)) return;

  const originalSetHeader = res.setHeader.bind(res);
  res.setHeader = ((name: string, value: unknown): Response => {
    if (name.toLowerCase() === 'cache-control') {
      return originalSetHeader('Cache-Control', OFFLINE_SHELL_CACHE_CONTROL) as Response;
    }
    return originalSetHeader(name, value as string | number | readonly string[]) as Response;
  }) as Response['setHeader'];

  const originalWriteHead = res.writeHead.bind(res);
  res.writeHead = ((...args: unknown[]): Response => {
    const maybeHeaders = args[1];
    if (maybeHeaders && typeof maybeHeaders === 'object' && !Array.isArray(maybeHeaders)) {
      const headers: Record<string, unknown> = {
        ...(maybeHeaders as Record<string, unknown>),
      };
      const ccKey = Object.keys(headers).find((k) => k.toLowerCase() === 'cache-control');
      if (ccKey) {
        delete headers[ccKey];
        headers['Cache-Control'] = OFFLINE_SHELL_CACHE_CONTROL;
        args[1] = headers;
      }
    }
    return originalWriteHead(...(args as Parameters<Response['writeHead']>)) as Response;
  }) as Response['writeHead'];
}
