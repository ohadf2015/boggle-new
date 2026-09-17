import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user1' }, profile: { user_role: 'teacher', is_admin: false }, loading: false }),
}));
vi.mock('@/hooks/useRecentGameSettings', () => ({ useRecentGameSettings: () => ({ getMostRecent: vi.fn(), hasRecentConfig: false }) }));
let classroomState: Record<string, unknown>;
vi.mock('@/hooks/useClassroom', () => ({ useClassrooms: () => classroomState }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/en/teacher', useSearchParams: () => new URLSearchParams() }));
vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => <div /> }));
vi.mock('@/components/education/TeacherOnboarding', () => ({ TeacherOnboarding: () => null }));
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
vi.mock('@/components/teacher/dashboard/PlayNowLauncher', () => ({ PlayNowLauncher: () => <div /> }));
vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));

let proState: Record<string, unknown>;
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => proState }));

// The gate's own impression logic has its own suite; here only the prop matters.
vi.mock('../ProGate', () => ({
  ProGate: ({ active }: { active?: boolean }) => <div data-testid="pro-gate" data-active={String(active)} />,
}));

const viewed = vi.fn();
const toolsOpened = vi.fn();
vi.mock('@/lib/education/telemetry', async (orig) => ({
  ...(await orig<typeof import('@/lib/education/telemetry')>()),
  trackEduTeacherDashboardViewed: (...a: unknown[]) => viewed(...a),
  trackEduTeacherToolsOpened: (...a: unknown[]) => toolsOpened(...a),
}));

import TeacherDashboard from '../TeacherDashboard';

const freePro = { hasPro: false, loading: false, source: null, periodEnd: null, grant: null, grantExpired: false, refresh: vi.fn() };
const twoClasses = [
  { id: 'c1', name: 'A', member_count: 3 },
  { id: 'c2', name: 'B', member_count: 4 },
];

function openTools() {
  const drawer = screen.getByTestId('teacher-tools') as HTMLDetailsElement;
  act(() => {
    drawer.open = true;
    fireEvent(drawer, new Event('toggle'));
  });
}

describe('<TeacherDashboard> telemetry', () => {
  const originalFetch = global.fetch;
  beforeEach(() => {
    viewed.mockClear();
    toolsOpened.mockClear();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as unknown as typeof fetch;
  });
  afterEach(() => { global.fetch = originalFetch; });

  it('Given classrooms and Pro resolved, When the dashboard mounts, Then one view event carries the teacher snapshot', () => {
    classroomState = { classrooms: twoClasses, isLoading: false, error: null, refresh: vi.fn() };
    proState = freePro;
    const { rerender } = render(<TeacherDashboard />);
    rerender(<TeacherDashboard />);
    expect(viewed).toHaveBeenCalledTimes(1);
    expect(viewed).toHaveBeenCalledWith({ classroomCount: 2, studentCount: 7, hasPro: false });
  });

  it('Given classrooms still loading, When the dashboard mounts, Then no view event fires with a false zero', () => {
    classroomState = { classrooms: [], isLoading: true, error: null, refresh: vi.fn() };
    proState = freePro;
    render(<TeacherDashboard />);
    expect(viewed).not.toHaveBeenCalled();
  });

  it('Given the Tools drawer closed, When the teacher opens it, Then tools_opened fires and the paywall becomes active', () => {
    classroomState = { classrooms: twoClasses, isLoading: false, error: null, refresh: vi.fn() };
    proState = freePro;
    render(<TeacherDashboard />);
    expect(screen.getByTestId('pro-gate')).toHaveAttribute('data-active', 'false');

    openTools();

    expect(toolsOpened).toHaveBeenCalledWith({ classroomCount: 2, studentCount: 7, hasPro: false });
    expect(screen.getByTestId('pro-gate')).toHaveAttribute('data-active', 'true');
  });
});
