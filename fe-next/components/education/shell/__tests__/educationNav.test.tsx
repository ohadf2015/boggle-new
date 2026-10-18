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
import { waitFor, render, cleanup } from '@testing-library/react';
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
    expect(nav?.activeKey).toBe('home');
  });

  it('keeps a deep teacher route inside the teacher tabs', () => {
    expect(resolveEducationNav('/he/teacher/reports')?.activeKey).toBe('reports');
    expect(resolveEducationNav('/en/teacher/curriculum')?.activeKey).toBe('library');
    // Profile lives in the avatar menu, so no tab claims it.
    expect(resolveEducationNav('/en/teacher/profile')?.activeKey).toBeNull();
    expect(resolveEducationNav('/en/teacher/classroom')?.activeKey).toBe('classes');
  });

  it('lists the teacher tabs as Home, Classes, Library, Reports, in order', () => {
    const nav = resolveEducationNav('/en/teacher');
    expect(nav?.items.map((item) => item.key)).toEqual(['home', 'classes', 'library', 'reports']);
    expect(nav?.items[0].href).toBe('/en/teacher');
    expect(nav?.items[2].href).toBe('/en/teacher/curriculum');
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

  it('gives the teacher nav Pro and Profile links outside the tab row', () => {
    const nav = resolveEducationNav('/he/teacher/reports');
    expect(nav?.proHref).toBe('/he/teacher/upgrade');
    expect(nav?.profileHref).toBe('/he/teacher/profile');
    expect(nav?.items.some((item) => item.key === 'pro' || item.key === 'me')).toBe(false);
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
    // Phone/tablet only — the sidebar replaces it from lg (1024) up.
    expect(bar.className).toContain('lg:hidden');
  });

  it('separates the bar from the content with a real edge, not a tint', () => {
    const { getByTestId } = render(<EducationNav nav={nav} t={t} variant="tabs" />);
    const bar = getByTestId('education-tabbar');
    expect(bar.className).toContain('border-t-[3px]');
    expect(bar.className).toContain('border-neo-cream');
    // `border-neo` would be dropped by twMerge and render borderless.
    expect(bar.className).not.toMatch(/border-neo(\s|$)/);
  });

  it('marks the active tab with one lime pill behind its icon, never a solid lime slab', () => {
    const { getByTestId } = render(<EducationNav nav={nav} t={t} variant="tabs" />);
    const active = getByTestId('education-tab-home');
    const inactive = getByTestId('education-tab-reports');

    expect(active.getAttribute('aria-current')).toBe('page');
    expect(active.className).toContain('text-neo-lime');
    // GO LIVE owns the one solid lime slab on the deck.
    expect(active.className).not.toMatch(/(^|\s)bg-neo-lime(\s|$)/);

    const pill = getByTestId('education-tab-indicator');
    expect(pill.className).toContain('border-neo-lime');
    expect(pill.className).not.toMatch(/(^|\s)bg-neo-lime(\s|$)/);

    expect(inactive.getAttribute('aria-current')).toBeNull();
    // One dock, not four boxed buttons.
    expect(inactive.className).not.toMatch(/border-\[2px\]/);
    expect(inactive.className).not.toContain('bg-neo-navy-light');
  });

  it('slides the pill to the active tab with a short transform-only transition', async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    const { getByTestId } = render(<EducationNav nav={resolveEducationNav('/en/teacher/curriculum')!} t={t} variant="tabs" />);
    const track = getByTestId('education-tab-indicator-track');
    await waitFor(() => expect(track.style.getPropertyValue('--tab-i')).toBe('2'));
    expect(track.style.getPropertyValue('--tab-n')).toBe('4');
    expect(track.className).toMatch(/transition-\[translate\]/);
    expect(track.className).toMatch(/duration-200/);
    expect(track.className).toContain('motion-reduce:transition-none');
    expect(track.className).toMatch(/rtl:/);
  });

  it('hides the pill on a teacher screen that owns no tab', () => {
    const { queryByTestId } = render(<EducationNav nav={resolveEducationNav('/en/teacher/profile')!} t={t} variant="tabs" />);
    expect(queryByTestId('education-tab-indicator-track')).toBeNull();
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
    expect(side.className).toContain('lg:flex');
    expect(side.className).toContain('shrink-0');
    expect(side.className).not.toMatch(/overflow-y-auto/);
  });
});

/**
 * Handover at `lg` (1024): product guidance — drawer/tabs below 1024, no
 * permanent sidebar (even a 72px rail) eating tablet width. Both halves must
 * move together so a tablet never carries BOTH navs.
 */
describe('EducationNav — the lg handover', () => {
  const nav = resolveEducationNav('/en/teacher')!;
  const t = (k: string) => k;

  it('brings the labeled sidebar in only at desktop (≥1024)', () => {
    const { getByTestId } = render(<EducationNav nav={nav} t={t} variant="sidebar" />);
    const side = getByTestId('education-sidebar');
    expect(side.className).toContain('lg:flex');
    expect(side.className).toContain('w-60');
    expect(side.className).not.toMatch(/w-\[72px\]/);
  });

  it('hides the bottom tabs the moment the sidebar arrives — never both', () => {
    const { getByTestId } = render(<EducationNav nav={nav} t={t} variant="tabs" />);
    expect(getByTestId('education-tabbar').className).toContain('lg:hidden');
  });

  it('marks the active sidebar item with the same tinted lime as the dock, never a solid lime slab', () => {
    const { getByTestId } = render(<EducationNav nav={nav} t={t} variant="sidebar" />);
    const active = getByTestId('education-side-home');
    expect(active.getAttribute('aria-current')).toBe('page');
    expect(active.className).toContain('border-neo-lime');
    expect(active.className).toContain('text-neo-lime');
    expect(active.className).not.toMatch(/(^|\s)bg-neo-lime(\s|$)/);
  });

  it('keeps every sidebar label painted (no tablet icon-rail hide)', () => {
    const { getByTestId } = render(<EducationNav nav={nav} t={t} variant="sidebar" />);
    const label = getByTestId('education-side-home').querySelector('[data-testid="education-side-label-home"]');
    expect(label).not.toBeNull();
    expect(label!.className).toContain('truncate');
    expect(label!.className).not.toMatch(/hidden/);
  });
});

describe('EducationNav — teacher sidebar extras', () => {
  const t = (k: string) => k;

  it('pins a gold Pro link to the bottom of the teacher sidebar', () => {
    const nav = resolveEducationNav('/en/teacher/classroom')!;
    const { getByTestId } = render(<EducationNav nav={nav} t={t} variant="sidebar" />);
    const pro = getByTestId('education-side-pro');
    expect(pro.getAttribute('href')).toBe('/en/teacher/upgrade');
    expect(pro.className).toContain('text-neo-yellow');
    expect(pro.textContent).toContain('eduShell.nav.pro');
  });

  it('says Free plan with an Upgrade pill while the teacher is on the free plan', () => {
    const nav = resolveEducationNav('/en/teacher/classroom')!;
    const { getByTestId } = render(<EducationNav nav={nav} t={t} variant="sidebar" plan="free" />);
    const pro = getByTestId('education-side-pro');
    expect(pro.textContent).toContain('teacher.plan.free');
    expect(getByTestId('education-side-pro-pill').textContent).toBe('teacher.plan.upgrade');
  });

  it('shows a lime check, not an ask, once the teacher is on Pro', () => {
    const nav = resolveEducationNav('/en/teacher/classroom')!;
    const { getByTestId, queryByText } = render(<EducationNav nav={nav} t={t} variant="sidebar" plan="pro" />);
    expect(getByTestId('education-side-pro').textContent).toContain('eduShell.nav.pro');
    expect(getByTestId('education-side-pro-pill').getAttribute('aria-label')).toBe('teacher.plan.pro');
    expect(queryByText('teacher.plan.upgrade')).toBeNull();
  });

  it('labels a Polar trial in the pill', () => {
    const nav = resolveEducationNav('/en/teacher/classroom')!;
    const { getByTestId } = render(<EducationNav nav={nav} t={t} variant="sidebar" plan="trial" />);
    expect(getByTestId('education-side-pro-pill').textContent).toBe('teacher.plan.trialActive');
  });

  it('never shows the Pro link to students', () => {
    const nav = resolveEducationNav('/en/student')!;
    const { queryByTestId } = render(<EducationNav nav={nav} t={t} variant="sidebar" />);
    expect(queryByTestId('education-side-pro')).toBeNull();
  });

  it('renders the brand and account slots inside the sidebar', () => {
    const nav = resolveEducationNav('/en/teacher')!;
    const { getByTestId } = render(
      <EducationNav nav={nav} t={t} variant="sidebar" brand={<span data-testid="b" />} account={<span data-testid="acct" />} />,
    );
    const side = getByTestId('education-sidebar');
    expect(side.contains(getByTestId('b'))).toBe(true);
    expect(side.contains(getByTestId('acct'))).toBe(true);
  });

  it('keeps the phone tab bar to the four destinations (Pro lives in the avatar menu)', () => {
    const nav = resolveEducationNav('/en/teacher')!;
    const { getByTestId, queryByTestId } = render(<EducationNav nav={nav} t={t} variant="tabs" />);
    expect(getByTestId('education-tabbar').querySelectorAll('a')).toHaveLength(4);
    expect(queryByTestId('education-side-pro')).toBeNull();
  });
});
