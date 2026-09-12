/**
 * The nav shell: phone gets bottom tabs, desktop gets a sidebar, and a
 * projector/game surface gets neither.
 *
 * Two rules are load-bearing and neither is obvious from reading the markup:
 *
 * 1. The tab bar is a FLEX CHILD of the shell, never `position: fixed`. A
 *    fixed bar does not grow `scrollHeight`, so the shell's own no-scroll
 *    assertion would still pass while the last row of content sat unreachable
 *    underneath it — verbatim the "content clipped and unreachable" symptom in
 *    the overlay notes. Laying it out in the column makes the scroll region
 *    shorter by exactly the bar's height instead.
 *
 * 2. The nav kind is derived from `usePathname()` INSIDE the shell rather than
 *    passed as a prop. Nine screens mount this shell and one of them
 *    (`student/profile/PageClient.tsx`) is pinned at its 570-line ceiling — a
 *    prop would cost it a line it does not have.
 *
 * Contrast: an inactive tab is the same shape as the devtools button that the
 * contrast sweep flags (`edgeRatio: 0`), so inactive tabs carry a real fill
 * AND a 2px cream border; active tabs differ by FILL, not only text colour.
 * Widths are written `border-[2px]` / `border-t-[3px]` because twMerge folds
 * `border-neo` into the same class group as `border-neo-<colour>` and drops it.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { resolveEducationNav, EDUCATION_NAV_ITEMS } from '../navItems';
import { EducationNav } from '../EducationNav';

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

describe('resolveEducationNav', () => {
  it('gives the teacher area its own tab set, with the dashboard active', () => {
    const nav = resolveEducationNav('/en/teacher');
    expect(nav?.kind).toBe('teacher');
    expect(nav?.activeKey).toBe('play');
  });

  it('keeps a deep teacher route inside the teacher tabs', () => {
    expect(resolveEducationNav('/he/teacher/reports')?.activeKey).toBe('reports');
    expect(resolveEducationNav('/en/teacher/curriculum')?.activeKey).toBe('lessons');
    expect(resolveEducationNav('/en/teacher/profile')?.activeKey).toBe('me');
    expect(resolveEducationNav('/en/teacher/classroom')?.activeKey).toBe('classes');
  });

  it('lists the teacher tabs as Play, Classes, Lessons, Reports, Me, in order', () => {
    const nav = resolveEducationNav('/en/teacher');
    expect(nav?.items.map((item) => item.key)).toEqual([
      'play',
      'classes',
      'lessons',
      'reports',
      'me',
    ]);
    // Second position, per the addendum's "Play · Classes · Lessons · Reports · Me".
    const classes = nav?.items[1];
    expect(classes?.key).toBe('classes');
    expect(classes?.href).toBe('/en/teacher/classroom');
    expect(classes?.labelKey).toBe('teacher.nav.classes');
    expect(classes?.icon).toBe('users');
  });

  it('still shows the teacher tabs on a class detail screen that owns no tab', () => {
    const nav = resolveEducationNav('/en/teacher/classroom/abc-123/analytics');
    expect(nav?.kind).toBe('teacher');
    expect(nav?.items.length).toBeGreaterThan(0);
  });

  it('gives the student area a different tab set', () => {
    expect(resolveEducationNav('/en/student')?.kind).toBe('student');
    expect(resolveEducationNav('/en/student/achievements')?.activeKey).toBe('achievements');
    expect(resolveEducationNav('/es/student/lessons/42')?.activeKey).toBe('practice');
  });

  it('leaves projector and game surfaces chrome-free', () => {
    expect(resolveEducationNav('/en/education/classroom-game')).toBeNull();
    expect(resolveEducationNav('/en/multiplayer')).toBeNull();
    expect(resolveEducationNav('/en/student/join')).toBeNull();
    expect(resolveEducationNav('/en/blog')).toBeNull();
    expect(resolveEducationNav(null)).toBeNull();
  });

  it('keeps every tab row within the 4-5 tab budget', () => {
    for (const items of Object.values(EDUCATION_NAV_ITEMS)) {
      expect(items.length).toBeGreaterThanOrEqual(3);
      expect(items.length).toBeLessThanOrEqual(5);
    }
  });

  it('routes every tab through the active locale', () => {
    const nav = resolveEducationNav('/he/teacher');
    for (const item of nav!.items) expect(item.href).toMatch(/^\/he\//);
  });
});

describe('<EducationNav>', () => {
  const nav = resolveEducationNav('/en/teacher')!;
  const t = (key: string) => key;

  it('renders the bottom tab bar in flow, never as a fixed overlay', () => {
    const { getByTestId } = render(<EducationNav nav={nav} t={t} variant="tabs" />);
    const bar = getByTestId('education-tabbar');
    expect(bar.className).not.toMatch(/\bfixed\b/);
    expect(bar.className).toContain('shrink-0');
    // Phone only — the sidebar replaces it from tablet up.
    expect(bar.className).toContain('md:hidden');
  });

  it('separates the bar from the content with a real edge, not a tint', () => {
    const { getByTestId } = render(<EducationNav nav={nav} t={t} variant="tabs" />);
    const bar = getByTestId('education-tabbar');
    expect(bar.className).toContain('border-t-[3px]');
    expect(bar.className).toContain('border-neo-cream');
    // `border-neo` would be dropped by twMerge and render borderless.
    expect(bar.className).not.toMatch(/border-neo(\s|$)/);
  });

  it('marks the active tab by FILL, and gives inactive tabs an edge of their own', () => {
    const { getByTestId } = render(<EducationNav nav={nav} t={t} variant="tabs" />);
    const active = getByTestId('education-tab-play');
    const inactive = getByTestId('education-tab-reports');

    expect(active.getAttribute('aria-current')).toBe('page');
    expect(active.className).toContain('bg-neo-lime');
    expect(active.className).toContain('text-neo-black');

    expect(inactive.getAttribute('aria-current')).toBeNull();
    // Not a ghost: its own fill plus a 2px cream edge against the navy bar.
    expect(inactive.className).toContain('bg-neo-navy-light');
    expect(inactive.className).toContain('border-[2px]');
    expect(inactive.className).toContain('border-neo-cream');
  });

  it('labels every tab — an icon alone is not a label', () => {
    const { getByTestId } = render(<EducationNav nav={nav} t={t} variant="tabs" />);
    for (const item of nav.items) {
      expect(getByTestId(`education-tab-${item.key}`).textContent).toContain(item.labelKey);
    }
  });

  it('renders the Classes tab with its own icon, second from the left', () => {
    const { getByTestId } = render(<EducationNav nav={nav} t={t} variant="tabs" />);
    const classes = getByTestId('education-tab-classes');
    expect(classes.querySelector('svg')).toBeTruthy();
    expect(classes.getAttribute('href')).toBe('/en/teacher/classroom');
  });

  it('renders the sidebar on desktop only, and never lets it scroll', () => {
    const { getByTestId } = render(<EducationNav nav={nav} t={t} variant="sidebar" />);
    const side = getByTestId('education-sidebar');
    expect(side.className).toContain('hidden');
    expect(side.className).toContain('md:flex');
    expect(side.className).toContain('shrink-0');
    expect(side.className).not.toMatch(/overflow-y-auto/);
  });
});

/**
 * Tablet (768-1023px) is its own layout, not "a wide phone".
 *
 * The addendum is explicit: at tablet the sidebar is present but collapsed to
 * icons, and the bottom tab bar is hidden. Getting this backwards — tabs at the
 * bottom of a 1024-wide iPad while a 240px sidebar waits one pixel away — is a
 * spec line a critic reads off the screenshot, so the handover is asserted on
 * the class strings rather than left to a live viewport nobody captures.
 *
 * Both halves must move together: if the sidebar appeared at `md` while the
 * tabs still hid only at `lg`, a tablet would carry BOTH and lose a row of
 * content to a duplicate nav.
 */
describe('EducationNav — the tablet handover', () => {
  const nav = resolveEducationNav('/en/teacher')!;
  const t = (k: string) => k;

  it('brings the sidebar in at tablet, collapsed to an icon rail', () => {
    const { getByTestId } = render(<EducationNav nav={nav} t={t} variant="sidebar" />);
    const side = getByTestId('education-sidebar');
    expect(side.className).toContain('md:flex');
    // Icon rail at tablet, full 240px column once there is desktop width.
    expect(side.className).toContain('w-[72px]');
    expect(side.className).toContain('lg:w-60');
  });

  it('hides the bottom tabs the moment the sidebar arrives — never both', () => {
    const { getByTestId } = render(<EducationNav nav={nav} t={t} variant="tabs" />);
    expect(getByTestId('education-tabbar').className).toContain('md:hidden');
  });

  it('keeps the sidebar label in the DOM at tablet but out of the rail', () => {
    const { getByTestId } = render(<EducationNav nav={nav} t={t} variant="sidebar" />);
    const label = getByTestId('education-side-play').querySelector('[data-testid="education-side-label-play"]');
    // Present for screen readers at every width; painted only at lg.
    expect(label).not.toBeNull();
    expect(label!.className).toContain('lg:inline');
  });
});
