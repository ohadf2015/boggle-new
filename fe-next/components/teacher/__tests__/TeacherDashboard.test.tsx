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

vi.mock('@/components/teacher/QuickStartButton', () => ({
  default: () => <div>QuickStartButton</div>,
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

vi.mock('@/components/teacher/analytics/LastGameInsights', () => ({ LastGameInsights: () => <div data-testid="last-game-insights" /> }));
import TeacherDashboard from '../TeacherDashboard';

describe('<TeacherDashboard>', () => {
  it('renders teacher dashboard with greeting', () => {
    render(<TeacherDashboard />);
    expect(screen.getByText('teacher.dashboard.title')).toBeInTheDocument();
  });

  it('renders TeacherWelcomeBanner when teacher has access', () => {
    render(<TeacherDashboard />);
    // The banner component is mocked and should render when hasAccess is true
    expect(screen.getByText('education.teacher.welcome_banner_title')).toBeInTheDocument();
  });
});
