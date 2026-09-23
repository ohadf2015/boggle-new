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
 * Routes (top-level under locale) that belong to the education section.
 * These are the routes whose parents should navigate to /education, not /.
 */
const EDUCATION_ROUTES = new Set(['/teacher', '/student', '/join', '/classroom']);

/**
 * `/education/*` sub-routes that are functional flows (gameplay, class tools,
 * grade passback, Google Classroom add-on, etc.) rather than SEO/marketing
 * landing pages. `/education` itself and pages like
 * `/education/esl-word-games` are marketing content — bouncing an error there
 * to the main app home is fine. These are not: a teacher or student mid-flow
 * here who hits a chunk error or a stale deep link must stay inside education,
 * not land on the consumer homepage (the 31% education→home-within-60s bug).
 */
const EDUCATION_SUBROUTES = new Set([
  'classroom-game',
  'duels',
  'access',
  'miss-gap-assignment',
  'miss-gap-grade-passback',
  'miss-gap-practice',
  'miss-gap-whatsapp',
  'unplugged-grade-passback',
  'unplugged-reteach',
  'classic-unplugged',
  'team-tiles-unplugged',
  'classroom-addon',
  'class-gap',
  'chatgpt-reteach',
]);

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
 * segment after the locale is in EDUCATION_ROUTES, or is `education` followed
 * by a known functional sub-route (EDUCATION_SUBROUTES), e.g.:
 * - /en/teacher → true
 * - /en/teacher/classroom/abc → true
 * - /en/student/achievements → true
 * - /en/education/classroom-game → true (functional flow, not marketing)
 * - /en/education/duels/abc123 → true
 * - /en/education → false (the marketing landing page itself)
 * - /en/education/esl-word-games → false (SEO landing page)
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
  if (EDUCATION_ROUTES.has(`/${topLevelSegment}`)) return true;
  if (topLevelSegment === 'education') {
    const subSegment = segs[2];
    return !!subSegment && EDUCATION_SUBROUTES.has(subSegment);
  }
  return false;
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
  return inEducation ? `/${locale}/education` : `/${locale}`;
}

export default sectionHome;
