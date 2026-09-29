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
import { multiplayerExitDestination } from '@/lib/multiplayer/exitDestination';

export interface SectionHomeParams {
  /** The pathname to analyze, e.g. '/en/teacher/classroom/abc' */
  pathname: string;
  /** Optional explicit locale to override what's detected from pathname */
  locale?: string;
  /**
   * Optional query string (e.g. `window.location.search`) carrying context the
   * pathname alone can't capture — namely a classroom multiplayer room
   * (`?classroom=true&host=true`). Callers that only pass `pathname` keep the
   * old behaviour: a `?classroom=true` embedded IN `pathname` is still ignored,
   * exactly like every other query string this function strips.
   */
  search?: string;
}

/**
 * Top-level segments (under the locale) that belong to the education section.
 * Prefix-based, not a per-page allowlist: `/education` alone has ~20 SEO
 * landing pages, and a literal list of them rotted before — any new landing
 * silently bounced its errors to the consumer homepage. Every page under
 * /education (landing included) resolves to the education home.
 *
 * Exported so the registry test pins the exact contents: adding a consumer
 * route whose name collides (e.g. a consumer "join") must fail loudly.
 */
export const EDUCATION_TOP_LEVEL_SEGMENTS: ReadonlySet<string> = new Set(['teacher', 'student', 'join', 'classroom', 'education']);

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
 * Determine if a pathname is part of the education section.
 *
 * A pathname is in education if it has a recognized locale AND its first
 * segment after the locale is one of EDUCATION_TOP_LEVEL_SEGMENTS, e.g.:
 * - /en/teacher → true
 * - /en/teacher/classroom/abc → true
 * - /en/student/achievements → true
 * - /en/education → true
 * - /en/education/for-schools → true (SEO landing; still education)
 * - /en/education/classroom-game → true
 * - /en/multiplayer?classroom=true → false (context is in query, not route;
 *   see `sectionHome`'s `search` param for that case)
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
  if (!topLevelSegment) return false;
  return EDUCATION_TOP_LEVEL_SEGMENTS.has(topLevelSegment);
}

/**
 * True when `pathOnly` is `/{locale}/multiplayer` and `search` marks it a
 * classroom room (`?classroom=true`). Kept separate from `isEducationPath`
 * because it needs the query string, which that function never receives.
 */
function isMultiplayerClassroomPath(pathOnly: string, search: string): boolean {
  const segs = pathOnly.split('/').filter(Boolean);
  if (segs.length < 2) return false;
  if (!LOCALES.includes(segs[0])) return false;
  if (segs[1] !== 'multiplayer') return false;
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return params.get('classroom') === 'true';
}

/**
 * Return the "section home" for a given pathname.
 *
 * @param params - pathname, optional explicit locale, optional search string
 * @returns /{locale}/education for edu routes, /{locale} otherwise; defaults to /en if locale is ambiguous
 */
export function sectionHome({ pathname, locale: explicitLocale, search }: SectionHomeParams): string {
  const locale = explicitLocale || detectLocale(pathname) || 'en';
  const pathOnly = (pathname || '').split('?')[0].split('#')[0];

  if (search && isMultiplayerClassroomPath(pathOnly, search)) {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    const isHost = params.get('host') === 'true';
    // Reuse the canonical classroom-exit decision (host → teacher hub, student
    // → student hub) instead of re-deriving it — a second copy is exactly how
    // these two decisions drifted apart before (class 3 pitfall).
    const destination = multiplayerExitDestination({ isClassroomMode: true, isHost, locale });
    if (destination) return destination;
  }

  const inEducation = isEducationPath(pathname);
  if (!inEducation) return `/${locale}`;
  // The bare landing IS the education fallback target — an error boundary
  // there must not loop the user back onto the page that errored.
  const segs = pathOnly.split('/').filter(Boolean);
  if (segs.length === 2 && segs[1] === 'education') return `/${locale}`;
  return `/${locale}/education`;
}

export default sectionHome;
