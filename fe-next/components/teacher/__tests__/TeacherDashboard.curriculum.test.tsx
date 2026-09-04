/**
 * TeacherDashboard — curriculum word lists reachable from the prepare tab.
 *
 * `curriculum_word_lists` holds 138 active curated lists spanning grade_1…grade_12, and
 * `CurriculumWordListBrowser` is a complete browser for them — but its only mount was
 * /teacher/curriculum, a route with zero in-app links (sitemap and an e2e spec were the
 * sole references). Grade bands are the one concrete, repeated thing teachers named on the
 * access-request form ("2nd to 6th graders", "9th and 10th graders", "כיתה ה"), so the
 * content existed and was simply unreachable.
 *
 * Play-tab zero/loading/error states are covered by TeacherDashboard.firstRun.test.tsx.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

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

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/en/teacher',
}));

vi.mock('@/components/education/EducationHeader', () => ({
  EducationHeader: () => <div>EducationHeader</div>,
}));

vi.mock('@/components/education/TeacherOnboarding', () => ({
  TeacherOnboarding: () => <div>TeacherOnboarding</div>,
}));

vi.mock('@/components/education/TeacherWelcomeBanner', () => ({
  TeacherWelcomeBanner: () => <div>TeacherWelcomeBanner</div>,
}));

vi.mock('@/components/teacher/ClassroomManager', () => ({
  default: () => <div>ClassroomManager</div>,
}));

vi.mock('@/components/teacher/LessonBuilder', () => ({
  default: () => <div>LessonBuilder</div>,
}));

vi.mock('@/components/teacher/QuickStartButton', () => ({
  default: () => <div>QuickStartButton</div>,
}));

vi.mock('@/components/teacher/PlayTabFirstRunCard', () => ({
  default: ({ onCreateClassroom }: { onCreateClassroom: () => void }) => (
    <button onClick={onCreateClassroom}>go-to-prepare</button>
  ),
}));

vi.mock('@/components/teacher/StudentsPresentStrip', () => ({
  default: () => <div>StudentsPresentStrip</div>,
}));

vi.mock('@/components/teacher/dashboard', () => ({
  DuelMonitoringPanel: () => <div>DuelMonitoringPanel</div>,
}));

vi.mock('@/components/teacher/assignments', () => ({
  AssignmentTrackingPanel: () => <div>AssignmentTrackingPanel</div>,
  AssignmentCreator: () => <div>AssignmentCreator</div>,
}));

vi.mock('@/components/teacher/analytics/AnalyticsDashboard', () => ({
  AnalyticsDashboard: () => <div>AnalyticsDashboard</div>,
}));

vi.mock('@/components/teacher/curriculum/CurriculumWordListBrowser', () => ({
  CurriculumWordListBrowser: () => <div>CurriculumWordListBrowser</div>,
}));

vi.mock('@/components/teacher/analytics/LastGameInsights', () => ({ LastGameInsights: () => <div data-testid="last-game-insights" /> }));
import TeacherDashboard from '../TeacherDashboard';

describe('<TeacherDashboard> curriculum word lists', () => {
  it('surfaces the curriculum browser on the prepare tab', () => {
    render(<TeacherDashboard />);

    // Navigate the way a teacher actually does — the Prepare tab in the tab bar.
    // This used to go through PlayTabFirstRunCard's `onCreateClassroom`, which switched tabs as a
    // side effect. That prop is gone by design: the first-run card now creates the classroom
    // inline and shows the join code without leaving the Play tab, so there is no longer a
    // "create sends you to Prepare" hop to ride. The assertion below is unchanged — the curriculum
    // browser must live on Prepare and nowhere else.
    fireEvent.click(screen.getByText('teacher.dashboard.tab.prepare'));

    expect(screen.getByText('CurriculumWordListBrowser')).toBeInTheDocument();
  });

  it('does not surface it on the landing tab, which is for running games', () => {
    render(<TeacherDashboard />);

    expect(screen.queryByText('CurriculumWordListBrowser')).toBeNull();
  });
});
