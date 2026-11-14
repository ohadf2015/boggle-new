/**
 * The shell decides for itself whether a screen is navigable.
 *
 * `usePathname()` is read inside the shell rather than handed down as a prop,
 * for two reasons that are easy to lose: nine screens mount this shell and a
 * prop is nine chances to forget one, and `student/profile/PageClient.tsx` sits
 * at exactly its 570-line ceiling, so it has no line to spend on passing it.
 *
 * The nav must not become a second scroller. The shell's whole contract is
 * "the page never scrolls and exactly one inner region does" — a sidebar tall
 * enough to scroll, or a tab bar that is `position: fixed` over the content,
 * both break it (the fixed one invisibly: `scrollHeight` stays equal to the
 * viewport while the last row of content sits under the bar).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { EducationShell } from '../EducationShell';

const pathname = vi.hoisted(() => ({ current: '/' }));

vi.mock('next/navigation', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  usePathname: () => pathname.current,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', isRTL: false }),
}));

vi.mock('../TeacherAccountMenu', () => ({
  TeacherAccountMenu: ({ variant }: { variant?: string }) => <button data-testid={`account-${variant ?? 'row'}`} />,
}));

afterEach(() => {
  cleanup();
  document.body.className = '';
  pathname.current = '/';
});

describe('EducationShell — nav shell', () => {
  it('gives a teacher screen both bottom tabs and a desktop sidebar', () => {
    pathname.current = '/en/teacher';
    const { getByTestId } = render(<EducationShell>body</EducationShell>);
    expect(getByTestId('education-tabbar')).toBeTruthy();
    expect(getByTestId('education-sidebar')).toBeTruthy();
  });

  it('gives a teacher screen its own top bar with the avatar menu, and drops any page header', () => {
    pathname.current = '/en/teacher/reports';
    const { getByTestId, queryByTestId } = render(
      <EducationShell header={<div data-testid="page-header" />}>body</EducationShell>,
    );
    expect(getByTestId('teacher-topbar').className).toContain('lg:hidden');
    expect(getByTestId('account-icon')).toBeTruthy();
    expect(getByTestId('education-sidebar').contains(getByTestId('account-row'))).toBe(true);
    expect(queryByTestId('page-header')).toBeNull();
  });

  it('puts a student screen in the academy world: map backdrop and map dock, no sidebar or tab bar', () => {
    pathname.current = '/en/student/lessons/abc';
    const { getByTestId, queryByTestId } = render(<EducationShell>body</EducationShell>);
    expect(getByTestId('academy-backdrop').getAttribute('data-art')).toBe('map');
    expect(getByTestId('academy-dock-lessons')).toBeTruthy();
    expect(getByTestId('academy-dock-me')).toBeTruthy();
    expect(queryByTestId('education-sidebar')).toBeNull();
    expect(queryByTestId('education-tabbar')).toBeNull();
  });

  it('titles a student screen on an academy plaque with a way back to the map, in place of the page header', () => {
    pathname.current = '/en/student/lessons/abc';
    const { getByTestId, queryByTestId } = render(
      <EducationShell title="Space words" header={<div data-testid="page-header" />}>body</EducationShell>,
    );
    expect(queryByTestId('page-header')).toBeNull();
    expect(getByTestId('academy-plaque').textContent).toContain('Space words');
    expect(getByTestId('academy-page-back').getAttribute('href')).toBe('/en/student');
  });

  it('falls back to the active tab name when a student screen passes no title', () => {
    pathname.current = '/en/student/profile';
    const { getByTestId } = render(<EducationShell>body</EducationShell>);
    expect(getByTestId('academy-plaque').textContent).toContain('teacher.nav.me');
  });

  it('on a short landscape window, moves the student dock up beside the plaque as icons so the page keeps its height', () => {
    pathname.current = '/en/student/lessons/abc';
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes('orientation: landscape') && query.includes('max-height'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    try {
      const { getByTestId, getAllByTestId } = render(<EducationShell title="Space words">body</EducationShell>);
      expect(getAllByTestId('academy-dock-lessons')).toHaveLength(1);
      expect(getByTestId('student-academy-top').contains(getByTestId('academy-dock-lessons'))).toBe(true);
    } finally {
      window.matchMedia = original;
    }
  });

  it('keeps an active student drill clean: no world, no dock, no plaque', () => {
    pathname.current = '/en/student/lessons/abc';
    const { queryByTestId } = render(<EducationShell chromeFree>body</EducationShell>);
    expect(queryByTestId('academy-backdrop')).toBeNull();
    expect(queryByTestId('academy-dock-lessons')).toBeNull();
    expect(queryByTestId('academy-plaque')).toBeNull();
  });

  it('leaves a projector / in-game surface chrome-free', () => {
    pathname.current = '/en/education/classroom-game';
    const { queryByTestId } = render(<EducationShell>body</EducationShell>);
    expect(queryByTestId('education-tabbar')).toBeNull();
    expect(queryByTestId('education-sidebar')).toBeNull();
  });

  it('drops the nav on ANY path when chromeFree is set (active drill)', () => {
    // A drill on a measured-square board sizes to the leftover area — the tab
    // bar mounted during the round is grid area thrown away (2026-09-12 grid
    // pass). chromeFree skips nav resolution even where a nav would resolve.
    pathname.current = '/en/student/lessons/lesson-1';
    const { queryByTestId } = render(<EducationShell chromeFree>body</EducationShell>);
    expect(queryByTestId('education-tabbar')).toBeNull();
    expect(queryByTestId('education-sidebar')).toBeNull();
  });

  it('keeps the nav without chromeFree on the same drill path (picker needs a way home)', () => {
    pathname.current = '/en/student/lessons/lesson-1';
    const { queryByTestId } = render(<EducationShell>body</EducationShell>);
    expect(queryByTestId('academy-dock-lessons')).not.toBeNull();
    expect(queryByTestId('academy-page-back')).not.toBeNull();
  });

  it('lays the tab bar out in the column, so the scroll region gets shorter', () => {
    pathname.current = '/en/teacher';
    const { getByTestId } = render(<EducationShell>body</EducationShell>);
    const root = getByTestId('education-shell');
    const bar = getByTestId('education-tabbar');
    // A direct flex child of the shell root — not an overlay floating above it.
    expect(bar.parentElement).toBe(root);
    expect(bar.className).not.toMatch(/\b(fixed|absolute)\b/);
  });

  it('keeps the scroll region the only scroller, beside the sidebar', () => {
    pathname.current = '/en/teacher';
    const { getByTestId } = render(<EducationShell>body</EducationShell>);
    const region = getByTestId('education-shell-scroll');
    const side = getByTestId('education-sidebar');
    expect(region.className).toContain('min-h-0');
    expect(region.className).toContain('overflow-y-auto');
    expect(side.className).toContain('overflow-hidden');
    // Sidebar and content column share one row, which itself cannot scroll.
    const row = getByTestId('education-shell-body');
    expect(row.className).toContain('min-h-0');
    expect(row.className).not.toMatch(/overflow-y-auto/);
    expect(side.parentElement).toBe(row);
  });

  it('still renders bare, with no nav, when the path is not an education area', () => {
    pathname.current = '/en/blog';
    const { queryByTestId, getByTestId } = render(<EducationShell>body</EducationShell>);
    expect(queryByTestId('education-tabbar')).toBeNull();
    expect(getByTestId('education-shell-scroll').textContent).toBe('body');
  });
});

describe('EducationShell with a passed nav (a teacher screen under /education)', () => {
  it('Given the Start a game launcher path, Then the passed teacher nav shows the top bar and sidebar, and tabs={false} drops the phone tab bar', async () => {
    const { teacherEducationNav } = await import('../navItems');
    pathname.current = '/en/education/classroom-game';
    const { getByTestId, queryByTestId } = render(
      <EducationShell nav={teacherEducationNav('en')} tabs={false}>
        <p>lobby</p>
      </EducationShell>,
    );
    expect(getByTestId('teacher-topbar')).toBeInTheDocument();
    expect(getByTestId('education-sidebar')).toBeInTheDocument();
    expect(queryByTestId('education-tabbar')).toBeNull();
    expect(queryByTestId('education-shell-header')).toBeNull();
  });

  it('Given the same path with no nav passed, Then it stays chrome-free', () => {
    pathname.current = '/en/education/classroom-game';
    const { queryByTestId } = render(
      <EducationShell>
        <p>lobby</p>
      </EducationShell>,
    );
    expect(queryByTestId('teacher-topbar')).toBeNull();
    expect(queryByTestId('education-sidebar')).toBeNull();
  });

  it('gives the launcher the teacher tabs with none active', async () => {
    const { teacherEducationNav } = await import('../navItems');
    const nav = teacherEducationNav('he');
    expect(nav.kind).toBe('teacher');
    expect(nav.activeKey).toBeNull();
    expect(nav.items.map((i) => i.href)).toEqual(['/he/teacher', '/he/teacher/classroom', '/he/teacher/curriculum', '/he/teacher/reports']);
  });
});
