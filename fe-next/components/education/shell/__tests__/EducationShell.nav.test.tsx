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

  it('gives a student screen its own tab set', () => {
    pathname.current = '/en/student/achievements';
    const { getByTestId } = render(<EducationShell>body</EducationShell>);
    expect(getByTestId('education-tab-achievements').getAttribute('aria-current')).toBe('page');
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
    // Whatever nav this path resolves to, chromeFree=false must not suppress it.
    expect(queryByTestId('education-tabbar') ?? queryByTestId('education-sidebar')).not.toBeNull();
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
