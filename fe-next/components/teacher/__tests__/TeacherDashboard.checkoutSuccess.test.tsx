import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user1' }, profile: { user_role: 'teacher', is_admin: false }, loading: false }),
}));
vi.mock('@/hooks/useRecentGameSettings', () => ({ useRecentGameSettings: () => ({ getMostRecent: vi.fn(), hasRecentConfig: false }) }));
vi.mock('@/hooks/useClassroom', () => ({ useClassrooms: () => ({ classrooms: [{ id: 'c1', name: 'Class 1' }], loading: false }) }));
let search = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/en/teacher',
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => <div /> }));
vi.mock('@/components/education/TeacherOnboarding', () => ({ TeacherOnboarding: () => null }));
// The welcome dialog waits for the first-run walkthrough to be out of the way
// (both are fixed overlays, z-[90] under z-[100]). This teacher has seen it.
vi.mock('@/hooks/useOnboardingState', () => ({
  useTeacherOnboardingState: () => ({ isCompleted: true, isSkipped: false, shouldShowOnboarding: false }),
}));
vi.mock('@/components/education/TeacherWelcomeBanner', () => ({ TeacherWelcomeBanner: () => null }));
vi.mock('@/components/teacher/ClassroomManager', () => ({ default: () => <div /> }));
vi.mock('@/components/teacher/LessonBuilder', () => ({ default: () => <div /> }));
vi.mock('@/components/teacher/assignments', () => ({ AssignmentTrackingPanel: () => <div />, AssignmentCreator: () => <div /> }));
vi.mock('@/components/teacher/analytics/AnalyticsDashboard', () => ({ AnalyticsDashboard: () => <div /> }));
vi.mock('@/components/teacher/StudentsPresentStrip', () => ({ default: () => <div /> }));
vi.mock('@/components/teacher/curriculum/CurriculumWordListBrowser', () => ({ CurriculumWordListBrowser: () => <div /> }));
vi.mock('@/components/teacher/analytics/LastGameInsights', () => ({ LastGameInsights: () => <div /> }));
vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));

let proState: Record<string, unknown>;
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => proState }));

// The PLAY NOW panel has its own suite (dashboard/__tests__/PlayNowLauncher);
// here it is only the thing that must sit above everything else.
vi.mock('@/components/teacher/dashboard/PlayNowLauncher', () => ({
  PlayNowLauncher: () => <div data-testid="play-now-launcher" />,
}));


import TeacherDashboard from '../TeacherDashboard';

const PAID = { hasPro: true, loading: false, source: 'polar', periodEnd: '2026-10-09T00:00:00Z', grant: null, grantExpired: false };
const FREE = { hasPro: false, loading: false, source: 'polar', periodEnd: null, grant: null, grantExpired: false };

/**
 * Coming back from Polar checkout is the one moment a paying teacher needs to
 * be TOLD the payment took. The webhook that flips the `subscriptions` row can
 * land seconds after the redirect, so the dashboard keeps re-reading the
 * entitlement for a while instead of showing "Upgrade to Pro" to someone who
 * just paid.
 */
describe('<TeacherDashboard> after Polar checkout', () => {
  const originalFetch = global.fetch;
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as unknown as typeof fetch;
    search = 'checkout=success';
  });
  afterEach(() => { global.fetch = originalFetch; vi.useRealTimers(); });

  it('celebrates once the paid entitlement is visible', () => {
    proState = { ...PAID, refresh: vi.fn() };
    render(<TeacherDashboard />);
    expect(screen.getByTestId('teacher-plan-badge')).toHaveAttribute('data-plan', 'pro');
    expect(screen.getByRole('dialog', { name: 'teacher.proWelcome.title' })).toBeInTheDocument();
    expect(screen.getByText('teacher.proWelcome.paidBody')).toBeInTheDocument();
  });

  it('keeps re-reading the entitlement while the webhook has not landed yet', () => {
    vi.useFakeTimers();
    const refresh = vi.fn().mockResolvedValue(undefined);
    proState = { ...FREE, refresh };
    render(<TeacherDashboard />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(2_500); });
    expect(refresh).toHaveBeenCalled();
  });

  it('does not celebrate a paid teacher who simply opened the dashboard', () => {
    search = '';
    proState = { ...PAID, refresh: vi.fn() };
    render(<TeacherDashboard />);
    expect(screen.getByTestId('teacher-plan-badge')).toHaveAttribute('data-plan', 'pro');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
