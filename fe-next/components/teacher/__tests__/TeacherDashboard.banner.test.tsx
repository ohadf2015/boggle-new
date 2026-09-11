/**
 * The trial/Pro banner belongs INSIDE the shell, and BELOW the one button.
 *
 * `app/[locale]/teacher/PageClient.tsx` rendered it as a sibling of the
 * dashboard: `<>{banner}<TeacherDashboard /></>`. The dashboard's root is
 * `h-dvh`, so a banner beside it makes the page taller than the viewport and
 * the document scrolls again — the one thing this whole piece exists to stop —
 * and it does it only for the teachers who see a banner, which is why it
 * survives a casual check.
 *
 * It is also a stacked prompt above the primary action, which the decision-
 * fatigue rule forbids outright ("no stacked banners, tips or prompts above the
 * primary action; one status row at most"). So it goes inside the scrolling
 * region, after PLAY NOW: still seen, never in the way.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, profile: { user_role: 'teacher', is_admin: false }, loading: false }),
}));
vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({
    classrooms: [{ id: 'c1', name: 'Class 1' }],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    createClassroom: vi.fn(),
  }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/en/teacher',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/components/education/EducationHeader', () => ({
  EducationHeader: () => <div data-testid="education-header" />,
}));
vi.mock('@/components/education/TeacherOnboarding', () => ({
  TeacherOnboarding: () => <div data-testid="teacher-onboarding" />,
}));
vi.mock('@/components/teacher/ClassroomManager', () => ({ default: () => <div /> }));
vi.mock('@/components/teacher/LessonBuilder', () => ({ default: () => <div /> }));
vi.mock('@/components/teacher/assignments', () => ({
  AssignmentTrackingPanel: () => <div />,
  AssignmentCreator: () => <div />,
}));
vi.mock('@/components/teacher/analytics/AnalyticsDashboard', () => ({ AnalyticsDashboard: () => <div /> }));
vi.mock('@/components/teacher/analytics/LastGameInsights', () => ({ LastGameInsights: () => <div /> }));
vi.mock('@/components/teacher/ProGate', () => ({
  ProGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/teacher/ProWelcomeCelebration', () => ({ ProWelcomeCelebration: () => null }));
vi.mock('@/components/teacher/StudentsPresentStrip', () => ({ default: () => <div /> }));
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => ({ grant: null, loading: false, hasPro: false, source: null, periodEnd: null, refresh: vi.fn(), grantExpired: false }),
}));
vi.mock('@/components/teacher/dashboard/PlayNowLauncher', () => ({
  PlayNowLauncher: () => <div data-testid="play-now-launcher" />,
}));

import TeacherDashboard from '../TeacherDashboard';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const order = (a: Element, b: Element) =>
  a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;

describe('<TeacherDashboard> — the banner slot', () => {
  it('renders a passed banner inside the ONE scrolling region', () => {
    render(<TeacherDashboard banner={<div data-testid="a-banner">trial ends soon</div>} />);
    const region = screen.getByTestId('education-shell-scroll');
    expect(region.contains(screen.getByTestId('a-banner'))).toBe(true);
  });

  it('puts it BELOW the hero, never stacked above it', () => {
    render(<TeacherDashboard banner={<div data-testid="a-banner">trial ends soon</div>} />);
    expect(order(screen.getByTestId('play-now-launcher'), screen.getByTestId('a-banner'))).toBe(-1);
  });

  it('renders nothing extra when there is no banner', () => {
    render(<TeacherDashboard />);
    expect(screen.queryByTestId('teacher-dashboard-banner')).toBeNull();
  });

  it('the route client hands the banner to the dashboard instead of stacking it', () => {
    // A sibling of an `h-dvh` root makes the page taller than the viewport.
    const src = readFileSync(
      path.join(__dirname, '..', '..', '..', 'app', '[locale]', 'teacher', 'PageClient.tsx'),
      'utf8',
    );
    expect(src).toMatch(/<TeacherDashboard\s+banner=/);
    expect(src, 'no banner may render as a sibling of <TeacherDashboard />').not.toMatch(
      /<TeacherProAskBanner \/>\s*\n\s*<TeacherDashboard \/>/,
    );
  });
});
