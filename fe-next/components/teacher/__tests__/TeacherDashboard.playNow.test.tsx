/**
 * Teacher home → live game in ONE tap.
 *
 * The dashboard's job is now a single question — "which words?" — with a
 * default already chosen. Everything the old screen led with (a generic Quick
 * Start, a Repeat-last twin, a lesson BUILDER) either folds into the PLAY NOW
 * panel or drops below it. Two competing green buttons is not one dominant
 * action.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const push = vi.fn();

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, profile: { user_role: 'teacher' }, loading: false }),
}));
vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({ classrooms: [{ id: 'c1', name: 'Class 1' }], isLoading: false, error: null, refresh: vi.fn() }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/en/teacher',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => <div /> }));
vi.mock('@/components/education/TeacherOnboarding', () => ({ TeacherOnboarding: () => <div /> }));
vi.mock('@/components/teacher/ClassroomManager', () => ({ default: () => <div data-testid="classroom-manager" /> }));
vi.mock('@/components/teacher/LessonBuilder', () => ({ default: () => <div data-testid="lesson-builder" /> }));
vi.mock('@/components/teacher/assignments', () => ({
  AssignmentTrackingPanel: () => <div />, AssignmentCreator: () => <div />,
}));
vi.mock('@/components/teacher/analytics/AnalyticsDashboard', () => ({ AnalyticsDashboard: () => <div /> }));
vi.mock('@/components/teacher/analytics/LastGameInsights', () => ({ LastGameInsights: () => <div /> }));
vi.mock('@/components/teacher/ProGate', () => ({ ProGate: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/teacher/TeacherPlanBadge', () => ({ TeacherPlanBadge: () => <div /> }));
vi.mock('@/components/teacher/ProWelcomeCelebration', () => ({ ProWelcomeCelebration: () => null }));
vi.mock('@/components/teacher/StudentsPresentStrip', () => ({ default: () => <div /> }));
vi.mock('@/components/teacher/PlayTabFirstRunCard', () => ({ default: () => <div data-testid="first-run-card" /> }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ grant: null, loading: false, hasPro: false }) }));
vi.mock('@/hooks/useVocabularyLesson', () => ({
  useLessons: () => ({
    lessons: [{ id: 'l1', name: 'Unit 5', language: 'en', words: [{ word: 'a', definition: 'b' }] }],
    isLoading: false,
    error: null,
  }),
}));
vi.mock('@/hooks/useRecentGameSettings', () => ({
  useRecentGameSettings: () => ({
    recentConfigs: [], hasRecentConfig: true, saveConfig: vi.fn(), getMostRecent: () => null,
  }),
}));

import TeacherDashboard from '../TeacherDashboard';
import { readQuickLaunchIntent } from '../dashboard/quickLaunchIntent';

describe('<TeacherDashboard> — play now in one tap', () => {
  beforeEach(() => {
    push.mockClear();
    sessionStorage.clear();
  });

  it('leads with the PLAY NOW panel, above everything else on the page', () => {
    const { container } = render(<TeacherDashboard />);
    const launcher = screen.getByTestId('play-now-launcher');
    const builder = screen.getByTestId('lesson-builder');
    expect(launcher).toBeInTheDocument();
    expect(
      launcher.compareDocumentPosition(builder) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(container.querySelector('[data-testid="play-now-launcher"]')).toBeTruthy();
  });

  it('one tap writes the intent and heads for the express lobby', () => {
    render(<TeacherDashboard />);
    fireEvent.click(screen.getByTestId('play-now-go'));

    expect(readQuickLaunchIntent()).toMatchObject({ source: 'lesson', lessonId: 'l1' });
    expect(push).toHaveBeenCalledWith('/en/education/classroom-game?flow=quickLaunch');
  });

  it('drops the rival CTAs the panel replaced', () => {
    render(<TeacherDashboard />);
    expect(screen.queryByText('teacher.dashboard.quickStart')).not.toBeInTheDocument();
    expect(screen.queryByText('teacher.dashboard.repeatLastGame')).not.toBeInTheDocument();
  });

  it('keeps recent games and reports one tap away, outside the panel', () => {
    render(<TeacherDashboard />);
    const shortcuts = screen.getByTestId('teacher-shortcuts');
    expect(shortcuts.contains(screen.getByTestId('play-now-launcher'))).toBe(false);
    expect(screen.getByTestId('shortcut-reports')).toHaveAttribute('href', '/en/teacher/reports');
  });

  it('opens the last-game panel in one tap without it ever being in the way', () => {
    render(<TeacherDashboard />);
    const tools = screen.getByTestId('teacher-tools');
    expect(tools).not.toHaveAttribute('open');

    fireEvent.click(screen.getByTestId('shortcut-last-game'));

    expect(screen.getByTestId('teacher-tools')).toHaveAttribute('open');
  });

  it('still refuses a tab bar', () => {
    render(<TeacherDashboard />);
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });
});
