/**
 * The tab set behind the education nav shell, derived from the path alone.
 *
 * Deliberately a pure module with no React and no context: `EducationShell`
 * resolves the nav itself from `usePathname()` instead of taking a `nav` prop.
 * Nine screens mount the shell and one of them, `student/profile/PageClient`,
 * is pinned at its 570-line ceiling — a prop every page had to pass would cost
 * that file a line it does not have, and would let a new screen forget to.
 *
 * Only the two CRUD areas get tabs. A projector or in-game surface stays
 * chrome-free on purpose: `/education/classroom-game` and `/multiplayer` are in
 * front of a class, and `/student/join` is the one screen where the student has
 * exactly one job. Those return `null` here, which is the same answer
 * `isQuietChromeSurface` gives the install prompts — but it is NOT the same
 * list, so the two are kept apart: `/teacher` is quiet-chrome (no install
 * pills) AND navigable (tabs).
 *
 * Tab budget is 4, not the 5 the brief allows. `/teacher` has no classroom
 * index route — classes live on the dashboard — and a tab that duplicates the
 * hub it sits next to is a choice the teacher should not have to make.
 */

export type EducationNavKind = 'teacher' | 'student';

export interface EducationNavItem {
  /** Stable id: test ids, active comparison, React keys. */
  key: string;
  /** Path tail under the area root; '' is the area root itself. */
  segment: string;
  /** Locale-prefixed href, filled in by `resolveEducationNav`. */
  href: string;
  /** Translation key — resolved by the caller, which owns `t`. */
  labelKey: string;
  /** lucide icon name, resolved in `EducationNav` so this module stays pure. */
  icon: 'play' | 'book' | 'chart' | 'user' | 'trophy' | 'dumbbell';
}

type NavTemplate = Omit<EducationNavItem, 'href'>;

const TEACHER_TABS: readonly NavTemplate[] = [
  { key: 'play', segment: '', labelKey: 'teacher.nav.play', icon: 'play' },
  { key: 'lessons', segment: 'curriculum', labelKey: 'teacher.nav.lessons', icon: 'book' },
  { key: 'reports', segment: 'reports', labelKey: 'teacher.nav.reports', icon: 'chart' },
  { key: 'me', segment: 'profile', labelKey: 'teacher.nav.me', icon: 'user' },
];

const STUDENT_TABS: readonly NavTemplate[] = [
  { key: 'play', segment: '', labelKey: 'teacher.nav.studentPlay', icon: 'play' },
  { key: 'practice', segment: 'lessons', labelKey: 'teacher.nav.studentPractice', icon: 'dumbbell' },
  {
    key: 'achievements',
    segment: 'achievements',
    labelKey: 'teacher.nav.studentAchievements',
    icon: 'trophy',
  },
  { key: 'me', segment: 'profile', labelKey: 'teacher.nav.me', icon: 'user' },
];

export const EDUCATION_NAV_ITEMS: Record<EducationNavKind, readonly NavTemplate[]> = {
  teacher: TEACHER_TABS,
  student: STUDENT_TABS,
};

/** Areas that mount the shell but must show no chrome at all. */
const CHROME_FREE: readonly (readonly string[])[] = [
  ['student', 'join'],
  ['education'],
  ['multiplayer'],
];

export interface ResolvedEducationNav {
  kind: EducationNavKind;
  locale: string;
  items: EducationNavItem[];
  /** `null` on a detail screen that owns no tab — the row still renders. */
  activeKey: string | null;
}

/**
 * A locale prefix is optional and never validated against a list: adding a
 * seventh language must not silently drop the tab bar for that language.
 */
function splitLocale(segments: string[]): { locale: string; tail: string[] } {
  const AREAS = new Set(['teacher', 'student']);
  if (segments.length > 0 && !AREAS.has(segments[0])) {
    return { locale: segments[0], tail: segments.slice(1) };
  }
  return { locale: 'en', tail: segments };
}

export function resolveEducationNav(
  pathname: string | null | undefined,
): ResolvedEducationNav | null {
  if (!pathname) return null;
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const { locale, tail } = splitLocale(segments);

  const isChromeFree = CHROME_FREE.some((route) =>
    route.every((segment, i) => tail[i] === segment),
  );
  if (isChromeFree) return null;

  const area = tail[0];
  if (area !== 'teacher' && area !== 'student') return null;

  const templates = EDUCATION_NAV_ITEMS[area];
  const items = templates.map((tpl) => ({
    ...tpl,
    href: `/${locale}/${area}${tpl.segment ? `/${tpl.segment}` : ''}`,
  }));

  // Longest match wins, so `/student/lessons/42` lands on Practice rather than
  // on Play (whose segment is '' and therefore a prefix of everything).
  const rest = tail.slice(1);
  const activeKey =
    rest.length === 0
      ? 'play'
      : (templates.find((tpl) => tpl.segment !== '' && tpl.segment === rest[0])?.key ?? null);

  return { kind: area, locale, items, activeKey };
}

export default resolveEducationNav;
