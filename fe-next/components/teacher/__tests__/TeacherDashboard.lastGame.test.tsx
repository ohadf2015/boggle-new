import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user1' }, profile: { user_role: 'teacher', is_admin: false }, loading: false }) }));
vi.mock('@/hooks/useRecentGameSettings', () => ({ useRecentGameSettings: () => ({ getMostRecent: vi.fn(), hasRecentConfig: false }) }));
vi.mock('@/hooks/useClassroom', () => ({ useClassrooms: () => ({ classrooms: [{ id: 'c1', name: 'Class 1' }], loading: false }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/en/teacher', useSearchParams: () => new URLSearchParams() }));
vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => <div /> }));
vi.mock('@/components/education/TeacherOnboarding', () => ({ TeacherOnboarding: () => null }));
vi.mock('@/components/education/TeacherWelcomeBanner', () => ({ TeacherWelcomeBanner: () => null }));
vi.mock('@/components/teacher/ClassroomManager', () => ({ default: () => <div /> }));
vi.mock('@/components/teacher/LessonBuilder', () => ({ default: () => <div /> }));
vi.mock('@/components/teacher/QuickStartButton', () => ({ default: () => <div /> }));
vi.mock('@/components/teacher/dashboard', () => ({ DuelMonitoringPanel: () => <div /> }));
vi.mock('@/components/teacher/assignments', () => ({ AssignmentTrackingPanel: () => <div />, AssignmentCreator: () => <div /> }));
vi.mock('@/components/teacher/analytics/AnalyticsDashboard', () => ({ AnalyticsDashboard: () => <div data-testid="analytics" /> }));
vi.mock('@/components/teacher/StudentsPresentStrip', () => ({ default: () => <div /> }));
vi.mock('@/components/teacher/curriculum/CurriculumWordListBrowser', () => ({ CurriculumWordListBrowser: () => <div /> }));
vi.mock('@/components/teacher/TeacherPlanBadge', () => ({ TeacherPlanBadge: () => null }));
vi.mock('@/components/teacher/ProWelcomeCelebration', () => ({ ProWelcomeCelebration: () => null }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro: false, loading: false, grant: null }) }));
vi.mock('@/components/teacher/analytics/LastGameInsights', () => ({
  LastGameInsights: ({ classroomId }: { classroomId: string }) => <div data-testid="last-game-insights">{classroomId}</div>,
}));

import TeacherDashboard from '../TeacherDashboard';

/**
 * The last class game's recap is FREE and sits above the Pro-gated analytics on
 * the Review tab: a free teacher still gets "which words did we miss" for the
 * game they just ran; Pro is the trend view across games and students.
 */
describe('<TeacherDashboard> Review tab — last game insights', () => {
  it('mounts the last-game card for the selected classroom, outside the Pro gate', () => {
    render(<TeacherDashboard />);
    fireEvent.click(screen.getByRole('tab', { name: 'teacher.dashboard.tab.review' }));
    expect(screen.getByTestId('last-game-insights')).toHaveTextContent('c1');
    // Free teacher: analytics is replaced by the ProGate upsell, the recap is not.
    expect(screen.queryByTestId('analytics')).not.toBeInTheDocument();
  });
});
