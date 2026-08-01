import { getPyramidsForLocale } from './pyramid/puzzles';

/**
 * The flagship connections destination for a locale. Pyramid mode takes
 * priority over the regular level chain (owner call, 2026-08-01) — locales
 * with a pyramid pool route their primary CTAs there; the rest fall back to
 * regular play.
 */
export function connectionsPrimaryPath(locale: string): string {
  return getPyramidsForLocale(locale).length > 0
    ? `/${locale}/connections/pyramid`
    : `/${locale}/connections/play`;
}
