export const PATHNAME_HEADER = 'x-lc-pathname';

const LANDING_RE = /^\/(?:en|he|sv|ja|es|ru)?$/;

/**
 * Locale-root paths (`/`, `/en`, `/he/`) are the PSI landing surface.
 * Nested routes keep the full beforeInteractive catalogue.
 */
export function isLandingPath(pathname: string): boolean {
  if (!pathname) return false;
  const p = pathname.replace(/\/+$/, '') || '/';
  if (p === '/') return true;
  return LANDING_RE.test(p);
}
