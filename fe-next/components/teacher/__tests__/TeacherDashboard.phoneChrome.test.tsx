import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const classroomsMock = { value: [{ id: 'c1', name: 'Class 1', join_code: 'ABCDEF', member_count: 3 }] };
const media = { wide: false };

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, profile: { user_role: 'teacher', is_admin: false }, loading: false }),
}));
vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({
    classrooms: classroomsMock.value,
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    createClassroom: vi.fn(),
  }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/en/teacher',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/components/education/EducationHeader', () => ({
  EducationHeader: () => <div data-testid="education-header" />,
}));
vi.mock('@/components/education/TeacherOnboarding', () => ({
  TeacherOnboarding: () => <div data-testid="teacher-onboarding" />,
}));
vi.mock('@/components/teacher/ClassroomManager', () => ({ default: () => <div data-testid="classroom-manager" /> }));
vi.mock('@/components/teacher/LessonBuilder', () => ({ default: () => <div data-testid="lesson-builder" /> }));
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
vi.mock('@/components/teacher/ProWelcomeCelebration', () => ({ ProWelcomeCelebration: () => null }));
vi.mock('@/components/teacher/StudentsPresentStrip', () => ({ default: () => <div data-testid="students-present" /> }));
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => ({ grant: null, loading: false, hasPro: false, source: null, periodEnd: null, refresh: vi.fn(), grantExpired: false }),
}));
vi.mock('@/components/teacher/dashboard/PlayNowLauncher', () => ({
  PlayNowLauncher: () => <div data-testid="play-now-launcher" />,
}));

vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => media.wide }));
vi.mock('@/components/teacher/hq/useFirstAssignmentCta', () => ({
  useFirstAssignmentCta: () => ({ assignmentCount: 0, hasActiveRoom: false }),
}));
vi.mock('@/components/teacher/hq/GetStudentsInCard', () => ({
  GetStudentsInCard: ({ rosterAction }: { rosterAction?: React.ReactNode }) => (
    <div data-testid="get-students-in">{rosterAction}</div>
  ),
}));

import TeacherDashboard from '../TeacherDashboard';

describe('Teacher HQ — chrome above the two steps on a phone', () => {
  it('Given one class, Then its name is a quiet label on phones (no filled pill competing with step 1), and keeps its truncation', () => {
    media.wide = false;
    render(<TeacherDashboard />);
    const chip = screen.getByTestId('hq-class-chip');
    expect(chip.className).toMatch(/(^|\s)max-sm:bg-transparent(\s|$)/);
    expect(chip.className).toMatch(/(^|\s)max-sm:shadow-none(\s|$)/);
    expect(chip.querySelector('[dir="auto"]')?.className).toMatch(/(^|\s)truncate(\s|$)/);
  });
});
