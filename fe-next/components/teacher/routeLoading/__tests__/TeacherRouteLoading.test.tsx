import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const pathname = vi.hoisted(() => ({ current: '/en/teacher' }));
const lang = vi.hoisted(() => ({ current: 'en' }));

vi.mock('next/navigation', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  usePathname: () => pathname.current,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: lang.current, isRTL: lang.current === 'he' }),
}));
vi.mock('@/components/education/shell/TeacherAccountMenu', () => ({ TeacherAccountMenu: () => null }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => <div data-testid="page-loader" /> }));

import { TeacherRouteLoading } from '../TeacherRouteLoading';

afterEach(() => {
  cleanup();
  pathname.current = '/en/teacher';
  lang.current = 'en';
});

describe('TeacherRouteLoading', () => {
  it.each([
    ['/en/teacher', 'home-skeleton'],
    ['/en/teacher/classroom', 'classes-skeleton'],
    ['/en/teacher/curriculum', 'library-skeleton'],
    ['/en/teacher/reports', 'reports-skeleton'],
  ])('keeps the sidebar and shows the matching skeleton for %s', (path, testId) => {
    // Given a teacher tab being navigated to
    pathname.current = path;
    // When its route fallback renders
    render(<TeacherRouteLoading />);
    // Then the chrome stays and the skeleton is the one for that page, never the full-page mascot
    expect(screen.getByTestId('education-sidebar')).toBeTruthy();
    expect(screen.getByTestId(testId)).toBeTruthy();
    expect(screen.queryByTestId('page-loader')).toBeNull();
  });

  it('keeps the chrome with a generic skeleton on a teacher detail screen', () => {
    pathname.current = '/en/teacher/classroom/abc';
    render(<TeacherRouteLoading />);
    expect(screen.getByTestId('education-sidebar')).toBeTruthy();
    expect(screen.getByTestId('teacher-generic-skeleton')).toBeTruthy();
  });

  it('mirrors the Hebrew layout direction of the page it stands in for', () => {
    pathname.current = '/he/teacher';
    lang.current = 'he';
    render(<TeacherRouteLoading />);
    expect(screen.getByTestId('education-shell').className).toContain('rtl');
  });

  it('falls back to the plain loader outside the teacher nav areas', () => {
    pathname.current = '/en/teacher/join-sheet';
    render(<TeacherRouteLoading />);
    expect(screen.getByTestId('page-loader')).toBeTruthy();
  });
});
