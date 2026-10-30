import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnalyticsPageClient } from '../PageClient';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeClassroomProgress } from '@/hooks/useRealtimeClassroomProgress';
import { useRouter } from 'next/navigation';

vi.mock('@/components/education/EducationHeader', () => ({
  EducationHeader: () => <div data-testid="education-header" />,
}));
vi.mock('@/contexts/AuthContext');
vi.mock('@/hooks/useRealtimeClassroomProgress');
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: () => '/en/teacher/classroom/test/analytics',
}));
vi.mock('@/lib/education/useTeacherAccess', () => ({
  useTeacherAccess: () => ({ hasAccess: true, status: 'approved', latestRequest: null, isLoading: false }),
}));

const teacherPro = { hasPro: true, loading: false };
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => teacherPro }));

vi.mock('@/components/teacher/assignments', () => ({ AssignmentTrackingPanel: () => null }));

type DashProps = {
  onViewStudents?: (f: 'struggling') => void;
  onCreateReviewLesson?: (w: string[]) => void;
};
const dash: { props: DashProps } = { props: {} };
vi.mock('@/components/teacher/analytics/AnalyticsDashboard', () => ({
  AnalyticsDashboard: (props: DashProps) => {
    dash.props = props;
    return <div data-testid="analytics-dashboard" />;
  },
}));
vi.mock('@/components/teacher/analytics/StudentProgressTable', () => ({
  StudentProgressTable: ({ onStudentClick }: { onStudentClick?: (id: string) => void }) => (
    <button type="button" data-testid="student-progress-table" onClick={() => onStudentClick?.('s1')}>row</button>
  ),
}));
vi.mock('@/components/teacher/analytics/LessonEffectivenessChart', () => ({
  __esModule: true,
  default: () => <div data-testid="lesson-effectiveness-chart" />,
}));
vi.mock('@/components/teacher/analytics/VocabularyHeatmap', () => ({ VocabularyHeatmap: () => null }));
vi.mock('@/components/teacher/analytics/LiveActivityIndicator', () => ({ LiveActivityIndicator: () => null }));
vi.mock('@/components/teacher/reports/WordMasteryReport', () => ({
  WordMasteryReport: ({ classroomId, classroomName }: { classroomId: string; classroomName: string }) => (
    <section data-testid="word-mastery-report">mastery {classroomId} {classroomName}</section>
  ),
}));
vi.mock('@/lib/supabase/education/classrooms', () => ({
  getClassroom: vi.fn(async () => ({ data: { id: 'classroom-1', name: 'Room 4' }, error: null })),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

const push = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  teacherPro.hasPro = true;
  teacherPro.loading = false;
  (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({ push });
  (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: { id: 't1' }, loading: false });
  (useRealtimeClassroomProgress as ReturnType<typeof vi.fn>).mockReturnValue({
    isConnected: true,
    activeStudentsCount: 0,
    lastUpdate: null,
    connectionStatus: 'connected',
    recentActivity: [],
  });
});

describe('analytics page: summary first, every control does something', () => {
  it('titles the page with the class name and says it is the class report', async () => {
    render(<AnalyticsPageClient classroomId="classroom-1" locale="en" />);
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Room 4'));
    expect(screen.getByText('teacher.classroom.cardClassReport')).toBeInTheDocument();
  });

  it('shows no "live" box while no student is playing', () => {
    render(<AnalyticsPageClient classroomId="classroom-1" locale="en" />);
    expect(screen.queryByTestId('analytics-live')).toBeNull();
  });

  it('shows the live box once students are playing', () => {
    (useRealtimeClassroomProgress as ReturnType<typeof vi.fn>).mockReturnValue({
      isConnected: true,
      activeStudentsCount: 2,
      lastUpdate: null,
      connectionStatus: 'connected',
      recentActivity: [],
    });
    render(<AnalyticsPageClient classroomId="classroom-1" locale="en" />);
    expect(screen.getByTestId('analytics-live')).toBeInTheDocument();
  });

  it('leads with the per-word mastery report, then a cards-only dashboard', async () => {
    render(<AnalyticsPageClient classroomId="classroom-1" locale="en" />);

    const mastery = screen.getByTestId('word-mastery-report');
    const dashboard = screen.getByTestId('analytics-dashboard');
    expect(mastery).toHaveTextContent('classroom-1');
    // The practice rounds are named after the class, so the report needs the real name.
    await waitFor(() => expect(mastery).toHaveTextContent('Room 4'));
    expect(mastery.compareDocumentPosition(dashboard) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps the mastery report behind the same single Pro gate for free teachers', () => {
    teacherPro.hasPro = false;
    render(<AnalyticsPageClient classroomId="classroom-1" locale="en" />);

    expect(screen.queryByTestId('word-mastery-report')).not.toBeInTheDocument();
    expect(screen.getAllByText('teacher.proGate.analytics.title')).toHaveLength(1);
  });

  it('shows a busy placeholder while the Pro check resolves, so a slow load never reads as an empty page', () => {
    teacherPro.loading = true;
    render(<AnalyticsPageClient classroomId="classroom-1" locale="en" />);

    expect(screen.getByTestId('analytics-pro-pending')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByTestId('word-mastery-report')).not.toBeInTheDocument();
    expect(screen.queryByText('teacher.proGate.analytics.title')).not.toBeInTheDocument();
  });

  it('View Students brings the students tab back from any other tab', async () => {
    const user = userEvent.setup();
    render(<AnalyticsPageClient classroomId="classroom-1" locale="en" />);

    await user.click(screen.getByText('education.analytics.viewLessons'));
    await waitFor(() => expect(screen.queryByTestId('student-progress-table')).not.toBeInTheDocument());

    act(() => dash.props.onViewStudents?.('struggling'));
    expect(await screen.findByTestId('student-progress-table')).toBeInTheDocument();
  });

  it('opens a student’s own report inside education when a row is tapped', async () => {
    const user = userEvent.setup();
    render(<AnalyticsPageClient classroomId="classroom-1" locale="en" />);

    await user.click(screen.getByTestId('student-progress-table'));
    expect(push).toHaveBeenCalledWith('/en/teacher/reports?classroomId=classroom-1&studentId=s1');
  });

  it('Create review lesson jumps to the mastery report, where the missed-words practice lives', () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    render(<AnalyticsPageClient classroomId="classroom-1" locale="en" />);

    act(() => dash.props.onCreateReviewLesson?.(['river']));
    expect(scroll).toHaveBeenCalled();
    expect(scroll.mock.contexts[0]).toBe(screen.getByTestId('word-mastery-report').parentElement);
  });
});
