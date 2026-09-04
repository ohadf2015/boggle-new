import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user1' }, profile: { user_role: 'teacher', is_admin: false }, loading: false }),
}));
vi.mock('@/hooks/useRecentGameSettings', () => ({ useRecentGameSettings: () => ({ getMostRecent: vi.fn(), hasRecentConfig: false }) }));
vi.mock('@/hooks/useClassroom', () => ({ useClassrooms: () => ({ classrooms: [{ id: 'c1', name: 'Class 1' }], loading: false }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/en/teacher' }));
vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => <div /> }));
vi.mock('@/components/education/TeacherOnboarding', () => ({ TeacherOnboarding: () => null }));
vi.mock('@/components/education/TeacherWelcomeBanner', () => ({ TeacherWelcomeBanner: () => null }));
vi.mock('@/components/teacher/ClassroomManager', () => ({ default: () => <div /> }));
vi.mock('@/components/teacher/LessonBuilder', () => ({ default: () => <div /> }));
vi.mock('@/components/teacher/QuickStartButton', () => ({ default: () => <div /> }));
vi.mock('@/components/teacher/dashboard', () => ({ DuelMonitoringPanel: () => <div /> }));
vi.mock('@/components/teacher/assignments', () => ({ AssignmentTrackingPanel: () => <div />, AssignmentCreator: () => <div /> }));
vi.mock('@/components/teacher/analytics/AnalyticsDashboard', () => ({ AnalyticsDashboard: () => <div /> }));
vi.mock('@/components/teacher/StudentsPresentStrip', () => ({ default: () => <div /> }));
vi.mock('@/components/teacher/curriculum/CurriculumWordListBrowser', () => ({ CurriculumWordListBrowser: () => <div /> }));
vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));

let proState: Record<string, unknown>;
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => proState }));

vi.mock('@/components/teacher/analytics/LastGameInsights', () => ({ LastGameInsights: () => <div data-testid="last-game-insights" /> }));
import TeacherDashboard from '../TeacherDashboard';

const grant = { id: 'g1', expires_at: '2027-09-05T12:00:00Z', days: 365, note: 'Sorry about Thursday.', welcomed: false };

/**
 * The dashboard is where a gifted teacher finds out the gift took: a PRO chip in
 * the header and, the first time only, the celebration.
 */
describe('<TeacherDashboard> Pro state', () => {
  const originalFetch = global.fetch;
  beforeEach(() => { global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as unknown as typeof fetch; });
  afterEach(() => { global.fetch = originalFetch; });

  it('shows the PRO chip and the one-time celebration for a freshly gifted teacher', () => {
    proState = { hasPro: true, loading: false, source: 'admin_grant', periodEnd: grant.expires_at, grant, grantExpired: false, refresh: vi.fn() };
    render(<TeacherDashboard />);
    expect(screen.getByTestId('teacher-plan-badge')).toHaveAttribute('data-plan', 'pro');
    expect(screen.getByRole('dialog', { name: 'teacher.proWelcome.title' })).toBeInTheDocument();
  });

  it('shows the PRO chip but no celebration once it has been seen', () => {
    proState = { hasPro: true, loading: false, source: 'admin_grant', periodEnd: grant.expires_at, grant: { ...grant, welcomed: true }, grantExpired: false, refresh: vi.fn() };
    render(<TeacherDashboard />);
    expect(screen.getByTestId('teacher-plan-badge')).toHaveAttribute('data-plan', 'pro');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the Free chip for a free teacher and no celebration', () => {
    proState = { hasPro: false, loading: false, source: 'polar', periodEnd: null, grant: null, grantExpired: false, refresh: vi.fn() };
    render(<TeacherDashboard />);
    expect(screen.getByTestId('teacher-plan-badge')).toHaveAttribute('data-plan', 'free');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
