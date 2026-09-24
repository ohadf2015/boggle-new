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
import { render, screen, fireEvent } from '@testing-library/react';

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

/**
 * Teacher HQ: the banner lives behind the small "Go Pro" dock chip and mounts
 * only once that chip is opened (the Pro cards record `iap_viewed` on mount, so
 * a closed sheet must not mount them). Open it the way a teacher would.
 */
const openProChip = () =>
  fireEvent.click(
    screen.getByTestId('teacher-dashboard-banner').querySelector('summary') as HTMLElement,
  );

const order = (a: Element, b: Element) =>
  a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;

describe('<TeacherDashboard> — the banner slot', () => {
  it('renders a passed banner inside the ONE scrolling region', () => {
    render(<TeacherDashboard banner={<div data-testid="a-banner">trial ends soon</div>} />);
    openProChip();
    const region = screen.getByTestId('education-shell-scroll');
    expect(region.contains(screen.getByTestId('a-banner'))).toBe(true);
  });

  it('puts it BELOW the hero, never stacked above it', () => {
    render(<TeacherDashboard banner={<div data-testid="a-banner">trial ends soon</div>} />);
    openProChip();
    expect(order(screen.getByTestId('play-now-launcher'), screen.getByTestId('a-banner'))).toBe(-1);
  });

  it('does not mount the banner (and its impression) until the chip is opened', () => {
    render(<TeacherDashboard banner={<div data-testid="a-banner">trial ends soon</div>} />);
    expect(screen.queryByTestId('a-banner')).toBeNull();
    openProChip();
    expect(screen.getByTestId('a-banner')).toBeInTheDocument();
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
