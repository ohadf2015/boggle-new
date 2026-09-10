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

vi.mock('@/hooks/useRecentGameSettings', () => ({
  useRecentGameSettings: () => ({
    getMostRecent: vi.fn(),
    hasRecentConfig: false,
  }),
}));

vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({
    classrooms: [{ id: 'c1', name: 'Class 1' }],
    loading: false,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => '/en/teacher',
  // TeacherDashboard reads `?tab=` / `?reviewWords=` on first render.
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/education/EducationHeader', () => ({
  EducationHeader: () => <div>EducationHeader</div>,
}));

vi.mock('@/components/education/TeacherOnboarding', () => ({
  TeacherOnboarding: () => <div>TeacherOnboarding</div>,
}));

vi.mock('@/components/education/TeacherWelcomeBanner', () => ({
  TeacherWelcomeBanner: ({ hasAccess }: { hasAccess: boolean }) => (
    hasAccess ? <div>education.teacher.welcome_banner_title</div> : null
  ),
}));

vi.mock('@/components/teacher/ClassroomManager', () => ({
  default: () => <div>ClassroomManager</div>,
}));

vi.mock('@/components/teacher/LessonBuilder', () => ({
  default: () => <div>LessonBuilder</div>,
}));

vi.mock('@/components/teacher/assignments', () => ({
  AssignmentTrackingPanel: () => <div>AssignmentTrackingPanel</div>,
  AssignmentCreator: () => <div>AssignmentCreator</div>,
}));

vi.mock('@/components/teacher/analytics/AnalyticsDashboard', () => ({
  AnalyticsDashboard: () => <div>AnalyticsDashboard</div>,
}));

vi.mock('@/components/teacher/analytics/LastGameInsights', () => ({ LastGameInsights: () => <div data-testid="last-game-insights" /> }));
import TeacherDashboard from '../TeacherDashboard';

// The PLAY NOW panel has its own suite (dashboard/__tests__/PlayNowLauncher);
// here it is only the thing that must sit above everything else.
vi.mock('@/components/teacher/dashboard/PlayNowLauncher', () => ({
  PlayNowLauncher: () => <div data-testid="play-now-launcher" />,
}));


describe('<TeacherDashboard>', () => {
  it('renders teacher dashboard with greeting', () => {
    render(<TeacherDashboard />);
    expect(screen.getByText('teacher.dashboard.title')).toBeInTheDocument();
  });

  // The welcome banner left the dashboard with the rest of the landing-screen
  // furniture — it still greets a newly-approved teacher on /education, which is
  // where they land straight after approval.
  it('does not repeat the welcome banner on the dashboard', () => {
    render(<TeacherDashboard />);
    expect(screen.queryByText('education.teacher.welcome_banner_title')).not.toBeInTheDocument();
  });
});
