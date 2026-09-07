/**
 * The hub is ONE screen: the teacher's lessons, and a way to make another.
 *
 * Baseline measured live at 1440x900: landing showed a Pro banner, a plan badge,
 * a three-tab bar, a students-present strip, a generic START GAME, a Duel
 * Activity panel and a tip card — and not one lesson. The lessons the teacher
 * came for were a tab away, so hosting a specific list cost Prepare → the card's
 * Start Game → Create Room.
 *
 * Contract now: lessons are on the landing screen, every other surface is folded
 * into a single closed disclosure, and nothing is behind a tab.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user1' },
    profile: { user_role: 'teacher', is_admin: false },
    loading: false,
  }),
}));

vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({
    classrooms: [{ id: 'c1', name: 'Class 1' }],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/en/teacher',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/education/EducationHeader', () => ({
  EducationHeader: () => <div>EducationHeader</div>,
}));
vi.mock('@/components/education/TeacherOnboarding', () => ({
  TeacherOnboarding: () => <div>TeacherOnboarding</div>,
}));
vi.mock('@/components/teacher/ClassroomManager', () => ({
  default: () => <div data-testid="classroom-manager" />,
}));
vi.mock('@/components/teacher/LessonBuilder', () => ({
  default: () => <div data-testid="lesson-builder" />,
}));
vi.mock('@/components/teacher/assignments', () => ({
  AssignmentTrackingPanel: () => <div data-testid="assignment-panel" />,
  AssignmentCreator: () => <div data-testid="assignment-creator" />,
}));
vi.mock('@/components/teacher/analytics/AnalyticsDashboard', () => ({
  AnalyticsDashboard: () => <div data-testid="analytics-dashboard" />,
}));
vi.mock('@/components/teacher/analytics/LastGameInsights', () => ({
  LastGameInsights: () => <div data-testid="last-game-insights" />,
}));
vi.mock('@/components/teacher/ProGate', () => ({
  ProGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/teacher/TeacherPlanBadge', () => ({
  TeacherPlanBadge: () => <div data-testid="plan-badge" />,
}));
vi.mock('@/components/teacher/ProWelcomeCelebration', () => ({
  ProWelcomeCelebration: () => null,
}));
vi.mock('@/components/teacher/StudentsPresentStrip', () => ({
  default: () => <div data-testid="students-present" />,
}));
vi.mock('@/components/teacher/PlayTabFirstRunCard', () => ({
  default: () => <div data-testid="first-run-card" />,
}));
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => ({ grant: null, loading: false, hasPro: false }),
}));

import TeacherDashboard from '../TeacherDashboard';

describe('<TeacherDashboard> — one screen', () => {
  it('puts the lessons on the landing screen', () => {
    render(<TeacherDashboard />);
    expect(screen.getByTestId('lesson-builder')).toBeInTheDocument();
  });

  it('has no tab bar', () => {
    render(<TeacherDashboard />);
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('folds every other surface into a single disclosure, closed by default', () => {
    render(<TeacherDashboard />);
    const tools = screen.getByTestId('teacher-tools');
    expect(tools.tagName).toBe('DETAILS');
    expect(tools).not.toHaveAttribute('open');
    // The secondary surfaces live inside it, not on the landing screen.
    expect(tools.contains(screen.getByTestId('classroom-manager'))).toBe(true);
    expect(tools.contains(screen.getByTestId('assignment-panel'))).toBe(true);
    expect(tools.contains(screen.getByTestId('last-game-insights'))).toBe(true);
    expect(tools.contains(screen.getByTestId('lesson-builder'))).toBe(false);
  });

  it('drops the surfaces that pushed the lessons off the screen', () => {
    render(<TeacherDashboard />);
    expect(screen.queryByText('teacher.dashboard.quickTip')).not.toBeInTheDocument();
    expect(screen.queryByText('teacher.dashboard.duelActivity')).not.toBeInTheDocument();
    expect(screen.queryByText('teacher.curriculum.title')).not.toBeInTheDocument();
  });

  it('asks for the classroom once, not once per section', () => {
    render(<TeacherDashboard />);
    expect(
      screen.queryAllByText('teacher.dashboard.selectClassroom:')
    ).toHaveLength(0);
  });
});
