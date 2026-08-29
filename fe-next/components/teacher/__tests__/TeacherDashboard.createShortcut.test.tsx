/**
 * TeacherDashboard — always-visible Create classroom shortcut in the header.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TeacherDashboard from '@/components/teacher/TeacherDashboard';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/en/teacher',
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user1' },
    profile: { user_role: 'teacher', is_admin: false },
    isAuthenticated: true,
    loading: false,
  }),
}));

vi.mock('@/hooks/useRecentGameSettings', () => ({
  useRecentGameSettings: () => ({
    getMostRecent: vi.fn(),
    hasRecentConfig: false,
  }),
}));

vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({
    classrooms: [],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

vi.mock('@/components/education/EducationHeader', () => ({
  EducationHeader: () => <div data-testid="education-header" />,
}));

vi.mock('@/components/education/TeacherOnboarding', () => ({
  TeacherOnboarding: () => <div data-testid="teacher-onboarding" />,
}));

vi.mock('@/components/education/TeacherWelcomeBanner', () => ({
  TeacherWelcomeBanner: () => <div data-testid="teacher-welcome-banner" />,
}));

vi.mock('@/components/teacher/ClassroomManager', () => ({
  default: () => <div data-testid="classroom-manager" />,
}));

vi.mock('@/components/teacher/LessonBuilder', () => ({
  default: () => <div data-testid="lesson-builder" />,
}));

vi.mock('@/components/teacher/QuickStartButton', () => ({
  default: () => <div data-testid="quick-start-button" />,
}));

vi.mock('@/components/teacher/PlayTabFirstRunCard', () => ({
  default: ({ onCreateClassroom }: { onCreateClassroom: () => void }) => (
    <button onClick={onCreateClassroom} data-testid="play-tab-create-button">
      go-to-prepare
    </button>
  ),
}));

vi.mock('@/components/teacher/StudentsPresentStrip', () => ({
  default: () => <div>StudentsPresentStrip</div>,
}));

vi.mock('@/components/teacher/dashboard', () => ({
  DuelMonitoringPanel: () => <div data-testid="duel-monitoring-panel" />,
}));

vi.mock('@/components/teacher/assignments', () => ({
  AssignmentTrackingPanel: () => <div data-testid="assignment-tracking-panel" />,
  AssignmentCreator: () => <div data-testid="assignment-creator" />,
}));

vi.mock('@/components/teacher/analytics/AnalyticsDashboard', () => ({
  AnalyticsDashboard: () => <div data-testid="analytics-dashboard" />,
}));

vi.mock('@/components/teacher/curriculum/CurriculumWordListBrowser', () => ({
  CurriculumWordListBrowser: () => <div>CurriculumWordListBrowser</div>,
}));

describe('TeacherDashboard create-classroom header shortcut', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shouldShowCreateClassroomShortcutInHeaderOnPlayTab', () => {
    // GIVEN / WHEN
    render(<TeacherDashboard />);

    // THEN — always visible, even with zero classrooms on the play tab
    const shortcut = screen.getByTestId('create-classroom-shortcut');
    expect(shortcut).toBeInTheDocument();
    expect(shortcut).toHaveTextContent('teacher.classroom.create');
  });

  it('shouldOpenPrepareTabWhenHeaderShortcutClicked', () => {
    // GIVEN
    render(<TeacherDashboard />);
    expect(screen.queryByTestId('classroom-manager')).not.toBeInTheDocument();

    // WHEN
    fireEvent.click(screen.getByTestId('create-classroom-shortcut'));

    // THEN
    expect(screen.getByTestId('classroom-manager')).toBeInTheDocument();
  });
});
