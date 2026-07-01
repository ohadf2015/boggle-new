/**
 * parentRoute — compute the URL-hierarchy parent ("back one level") of a
 * resolved pathname, locale-aware.
 *
 * Why this exists: `router.back()` pops the BROWSER history stack, which is not
 * the same as the route hierarchy. On a deep-link or refresh it over-shoots to
 * home, skipping intermediate levels. This computes the deterministic parent so
 * back navigation always goes exactly one level up.
 *
 * Rules:
 *  - The first segment, if a known locale, is preserved.
 *  - A top-level section under a locale (`/en/daily`) → localized home (`/en`).
 *  - Otherwise drop the last segment (`/en/daily/archive` → `/en/daily`).
 *  - PARENT_OVERRIDES handle routes whose URL parent has no page of its own.
 */

// Single source of truth for locales — importing avoids the drift that left
// 'ru' out here while other copies had it (Russian back nav dropped the prefix).
import { locales as LOCALES } from '@/lib/i18n';

/** Routes (locale-stripped) whose URL-drop-one parent has no page → explicit parent. */
const PARENT_OVERRIDES: { test: RegExp; parent: string }[] = [
  // /party/<gameId>/host and /play have no /party/<gameId> page.
  { test: /^\/party\/[^/]+\/(host|play)$/, parent: '/party' },
];

export function parentRoute(pathname: string): string {
  if (!pathname) return '/';

  const clean = pathname.replace(/\/+$/, '') || '/';
  const segs = clean.split('/').filter(Boolean); // ['en','daily','archive']

  const hasLocale = segs.length > 0 && LOCALES.includes(segs[0]);
  const locale = hasLocale ? segs[0] : '';
  const home = locale ? `/${locale}` : '/';
  const rest = hasLocale ? segs.slice(1) : segs;

  if (rest.length === 0) return home; // already at home

  const stripped = '/' + rest.join('/');
  for (const o of PARENT_OVERRIDES) {
    if (o.test.test(stripped)) return locale ? `/${locale}${o.parent}` : o.parent;
  }

  if (rest.length === 1) return home; // top-level section → home

  const parentRest = rest.slice(0, -1);
  return (locale ? `/${locale}` : '') + '/' + parentRest.join('/');
}

export default parentRoute;
