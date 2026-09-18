/**
 * Determine the "section home" for a given pathname.
 *
 * Used by error boundaries and navigation fallbacks to pick a sensible
 * destination when a user can't stay on the current page:
 * - Education users (teacher/student/join/classroom routes) → /{locale}/education
 * - Everyone else → /{locale} (main app root)
 *
 * This centralizes the definition so all four error boundaries + parentRoute
 * overrides stay in sync (class 3 pitfall: asymmetric navigation paths).
 */

import { locales as LOCALES } from '@/lib/i18n';

export interface SectionHomeParams {
  /** The pathname to analyze, e.g. '/en/teacher/classroom/abc' */
  pathname: string;
  /** Optional explicit locale to override what's detected from pathname */
  locale?: string;
}

/**
 * Routes (top-level under locale) that belong to the education section.
 * These are the routes whose parents should navigate to /education, not /.
 */
const EDUCATION_ROUTES = new Set(['/teacher', '/student', '/join', '/classroom']);

/**
 * Extract locale from pathname, e.g. '/en/teacher' → 'en', '/foo/bar' → undefined
 */
function detectLocale(pathname: string): string | undefined {
  if (!pathname) return undefined;
  // Strip query parameters and hash before parsing
  const pathOnly = pathname.split('?')[0].split('#')[0];
  const segs = pathOnly.split('/').filter(Boolean);
  if (segs.length > 0 && LOCALES.includes(segs[0])) {
    return segs[0];
  }
  return undefined;
}

/**
 * Determine if a pathname is part of an education flow.
 *
 * A pathname is in education if it has a recognized locale AND its first
 * segment after the locale is in EDUCATION_ROUTES, e.g.:
 * - /en/teacher → true
 * - /en/teacher/classroom/abc → true
 * - /en/student/achievements → true
 * - /en/multiplayer?classroom=true → false (context is in query, not route)
 * - /teacher → false (no locale prefix)
 * - /xy/teacher → false (unrecognized locale, can't reliably determine intent)
 * - /multiplayer → false (not an education route)
 *
 * We require a recognized locale to avoid ambiguity: without it, we can't
 * reliably determine if /teacher is meant to be an education route.
 */
export function isEducationPath(pathname: string): boolean {
  if (!pathname) return false;
  // Strip query parameters and hash before parsing
  const pathOnly = pathname.split('?')[0].split('#')[0];
  const segs = pathOnly.split('/').filter(Boolean);

  // Education routes MUST have a recognized locale + education route segment
  if (segs.length < 2) return false;
  const locale = segs[0];
  if (!LOCALES.includes(locale)) return false;
  const topLevelSegment = segs[1];
  return topLevelSegment ? EDUCATION_ROUTES.has(`/${topLevelSegment}`) : false;
}

/**
 * Return the "section home" for a given pathname.
 *
 * @param params - pathname and optional explicit locale
 * @returns /{locale}/education for edu routes, /{locale} otherwise; defaults to /en if locale is ambiguous
 */
export function sectionHome({ pathname, locale: explicitLocale }: SectionHomeParams): string {
  const locale = explicitLocale || detectLocale(pathname) || 'en';
  const inEducation = isEducationPath(pathname);
  return inEducation ? `/${locale}/education` : `/${locale}`;
}

export default sectionHome;
