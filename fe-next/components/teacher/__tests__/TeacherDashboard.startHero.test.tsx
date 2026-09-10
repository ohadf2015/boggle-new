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
vi.mock('@/hooks/useRecentGameSettings', () => ({
  useRecentGameSettings: () => ({ getMostRecent: () => null, hasRecentConfig: false }),
}));

import TeacherDashboard from '../TeacherDashboard';

describe('<TeacherDashboard> — START GAME hero', () => {
  it('puts a primary Start Game CTA on the landing screen even with no last-game config', () => {
    render(<TeacherDashboard />);
    const hero = screen.getByTestId('start-game-hero');
    expect(hero).toBeInTheDocument();
    expect(hero.closest('[data-testid="teacher-tools"]')).toBeNull();
  });
});
