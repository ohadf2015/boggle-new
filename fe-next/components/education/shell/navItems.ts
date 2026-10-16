/**
 * The tab set behind the education nav shell, derived from the path alone —
 * pure, so `EducationShell` resolves it from `usePathname()` with no prop for a
 * page to forget. Projector, in-game and join surfaces return `null`.
 * Teacher: Home · Classes · Library · Reports; Pro and Profile sit outside the
 * row (sidebar bottom / avatar menu).
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
  icon: 'home' | 'play' | 'book' | 'library' | 'chart' | 'user' | 'trophy' | 'dumbbell' | 'users';
}

type NavTemplate = Omit<EducationNavItem, 'href'>;

const TEACHER_TABS: readonly NavTemplate[] = [
  { key: 'home', segment: '', labelKey: 'eduShell.nav.home', icon: 'home' },
  { key: 'classes', segment: 'classroom', labelKey: 'teacher.nav.classes', icon: 'users' },
  { key: 'library', segment: 'curriculum', labelKey: 'eduShell.nav.library', icon: 'library' },
  { key: 'reports', segment: 'reports', labelKey: 'teacher.nav.reports', icon: 'chart' },
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
  ['education', 'live'],
  ['multiplayer'],
];

export interface ResolvedEducationNav {
  kind: EducationNavKind;
  locale: string;
  items: EducationNavItem[];
  /** `null` on a detail screen that owns no tab — the row still renders. */
  activeKey: string | null;
  /** Teacher only: the gold Pro destination and the avatar menu's Profile. */
  proHref?: string;
  profileHref?: string;
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

  // The root tab ('' segment) is a prefix of everything, so it only wins on the root itself.
  const rest = tail.slice(1);
  const activeKey =
    rest.length === 0
      ? templates[0].key
      : (templates.find((tpl) => tpl.segment !== '' && tpl.segment === rest[0])?.key ?? null);

  if (area === 'teacher') {
    return {
      kind: area,
      locale,
      items,
      activeKey,
      proHref: `/${locale}/teacher/upgrade`,
      profileHref: `/${locale}/teacher/profile`,
    };
  }
  return { kind: area, locale, items, activeKey };
}

export default resolveEducationNav;
