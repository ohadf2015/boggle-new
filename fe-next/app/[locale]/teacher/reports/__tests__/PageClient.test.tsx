import { vi, type Mock, } from 'vitest';
/**
 * Teacher Reports PageClient Tests
 *
 * Tests for the reports page that shows class and student progress.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReportsPageClient from '../PageClient';

// Mock the report components
// The page now mounts the shared education header — a compact bar with a way
// back, which these screens used to lack entirely. It pulls MusicContext in,
// which this suite has no provider for and no interest in.
vi.mock('@/components/education/EducationHeader', () => ({
  EducationHeader: () => <div data-testid="education-header" />,
}));
vi.mock('@/components/teacher/reports/StudentProgressReport', () => ({
  StudentProgressReport: ({ studentId, classroomId }: { studentId: string; classroomId: string }) => (
    <div data-testid="student-progress-report" data-student-id={studentId} data-classroom-id={classroomId}>
      Student Progress Report Mock
    </div>
  ),
}));

vi.mock('@/components/teacher/reports/ClassProgressReport', () => ({
  ClassProgressReport: ({ classroomId, onStudentClick }: { classroomId: string; onStudentClick?: (id: string) => void }) => (
    <div data-testid="class-progress-report" data-classroom-id={classroomId}>
      Class Progress Report Mock
      <button onClick={() => onStudentClick?.('student-123')}>Click Student</button>
    </div>
  ),
}));

vi.mock('@/components/teacher/digest/ProgressDigestDashboard', () => ({
  ProgressDigestDashboard: ({ classroomId }: { classroomId: string }) => (
    <div data-testid="progress-digest-dashboard" data-classroom-id={classroomId}>
      Progress Digest Mock
    </div>
  ),
}));

// The free arc surfaces mount on every class/student view; their own suites
// cover their behavior.
vi.mock('@/components/teacher/reports/ClassArcPanel', () => ({
  ClassArcPanel: ({ classroomId }: { classroomId: string }) => (
    <div data-testid="class-arc-panel" data-classroom-id={classroomId} />
  ),
}));

vi.mock('@/components/teacher/reports/StudentArcView', () => ({
  StudentArcView: ({ studentId }: { studentId: string }) => (
    <div data-testid="student-arc-view" data-student-id={studentId} />
  ),
}));

vi.mock('@/components/teacher/reports/AssignmentProgressReport', () => ({
  AssignmentProgressReport: ({ classroomId }: { classroomId: string }) => (
    <div data-testid="assignment-progress-report" data-classroom-id={classroomId}>
      Assignment Progress Mock
    </div>
  ),
}));

vi.mock('@/components/teacher/reports/ClassroomRosterProgress', () => ({
  ClassroomRosterProgress: ({ classroomId }: { classroomId: string }) => (
    <div data-testid="classroom-roster-progress">{classroomId}</div>
  ),
}));
vi.mock('@/components/teacher/reports/ClassAssignmentGrid', () => ({
  ClassAssignmentGrid: ({ classroomId }: { classroomId: string }) => (
    <div data-testid="class-assignment-grid" data-classroom-id={classroomId} />
  ),
}));

vi.mock('@/components/teacher/reports/AssignmentCompletionReport', () => ({
  AssignmentCompletionReport: ({ classroomId }: { classroomId: string }) => (
    <div data-testid="assignment-completion-report" data-classroom-id={classroomId} />
  ),
}));

// Mock useLanguage
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'teacher.reports.title': 'Progress Reports',
        'teacher.reports.classReport': 'Class Report',
        'teacher.reports.studentReport': 'Student Report',
        'teacher.reports.backToClass': 'Back to Class Report',
        'teacher.reports.selectClassroom': 'Select a Classroom',
      };
      return translations[key] || key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock useAuth
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'teacher@example.com' },
    isAuthenticated: true,
    loading: false,
  }),
}));

// Mock useClassrooms hook
const mockClassrooms = [
  { id: 'classroom-1', name: 'English 101', created_at: '2024-01-01' },
  { id: 'classroom-2', name: 'English 102', created_at: '2024-01-02' },
];

vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({
    classrooms: mockClassrooms,
    isLoading: false,
    error: null,
  }),
}));

// Mock useSearchParams
const mockSearchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => '/en/teacher/reports',
}));

vi.mock('@/lib/education/useTeacherAccess', () => ({
  useTeacherAccess: () => ({ hasAccess: true, status: 'approved', latestRequest: null, isLoading: false }),
}));

const getRecentClassroomGames = vi.fn().mockResolvedValue({ data: [], error: null });
vi.mock('@/lib/supabase/analyticsLastGame', () => ({
  getRecentClassroomGames: (...a: unknown[]) => getRecentClassroomGames(...a),
}));

const getClassroomStudents = vi.fn().mockResolvedValue({ data: [], error: null });
vi.mock('@/lib/supabase/education/classrooms', () => ({
  getClassroomStudents: (...a: unknown[]) => getClassroomStudents(...a),
}));

const proState: { hasPro: boolean; loading: boolean; accessTrialExpires: string | null; [k: string]: unknown } = {
  hasPro: true, loading: false, accessTrialExpires: null, source: 'polar', periodEnd: null, grant: null, grantExpired: false, refresh: async () => {},
};
const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => proState,
}));

const trackEduReportsViewed = vi.fn();
vi.mock('@/lib/education/telemetry', () => ({
  trackEduReportsViewed: (...args: unknown[]) => trackEduReportsViewed(...args),
}));

describe('ReportsPageClient', () => {
  describe('A teacher with one class', () => {
    const all = [...mockClassrooms];
    beforeEach(() => mockClassrooms.splice(1));
    afterEach(() => mockClassrooms.splice(0, mockClassrooms.length, ...all));

    it('Given one class, Then the report opens on it instead of asking to pick', () => {
      render(<ReportsPageClient />);
      expect(screen.queryByText('Select a Classroom')).not.toBeInTheDocument();
      expect(screen.getByTestId('class-progress-report')).toHaveAttribute('data-classroom-id', 'classroom-1');
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete('studentId');
    mockSearchParams.delete('classroomId');
  });

  describe('Classroom Selection', () => {
    it('displays classroom selection when no classroom is selected', () => {
      render(<ReportsPageClient />);

      expect(screen.getByText('Progress Reports')).toBeInTheDocument();
      expect(screen.getByText('Select a Classroom')).toBeInTheDocument();
    });

    it('displays list of available classrooms', () => {
      render(<ReportsPageClient />);

      expect(screen.getByText('English 101')).toBeInTheDocument();
      expect(screen.getByText('English 102')).toBeInTheDocument();
    });
  });

  describe('Class Report View', () => {
    beforeEach(() => {
      mockSearchParams.set('classroomId', 'classroom-1');
    });

    it('displays class report when classroom is selected', () => {
      render(<ReportsPageClient />);

      expect(screen.getByTestId('class-progress-report')).toBeInTheDocument();
      expect(screen.getByTestId('class-progress-report')).toHaveAttribute(
        'data-classroom-id',
        'classroom-1'
      );
    });

    it('switches to student view when student is clicked', async () => {
      const user = userEvent.setup();

      render(<ReportsPageClient />);

      const clickStudentButton = screen.getByRole('button', { name: /click student/i });
      await user.click(clickStudentButton);

      await waitFor(() => {
        expect(screen.getByTestId('student-progress-report')).toBeInTheDocument();
      });
    });
  });

  describe('Student Report View', () => {
    beforeEach(() => {
      mockSearchParams.set('classroomId', 'classroom-1');
      mockSearchParams.set('studentId', 'student-123');
    });

    it('displays student report when student is selected', () => {
      render(<ReportsPageClient />);

      expect(screen.getByTestId('student-progress-report')).toBeInTheDocument();
      expect(screen.getByTestId('student-progress-report')).toHaveAttribute(
        'data-student-id',
        'student-123'
      );
    });

    it('displays back button to return to class view', () => {
      render(<ReportsPageClient />);

      expect(screen.getByRole('button', { name: /back to class report/i })).toBeInTheDocument();
    });

    it('returns to class view when back button is clicked', async () => {
      const user = userEvent.setup();

      render(<ReportsPageClient />);

      const backButton = screen.getByRole('button', { name: /back to class report/i });
      await user.click(backButton);

      await waitFor(() => {
        expect(screen.getByTestId('class-progress-report')).toBeInTheDocument();
      });
    });
  });

  describe('Pro gating', () => {
    afterEach(() => {
      proState.hasPro = true;
      proState.loading = false;
      proState.accessTrialExpires = null;
    });

    const REPORT_SURFACES = [
      'class-progress-report', 'student-progress-report', 'progress-digest-dashboard', 'assignment-progress-report',
      'assignment-completion-report', 'class-assignment-grid', 'classroom-roster-progress', 'class-arc-panel', 'student-arc-view',
    ];
    const expectNoReportData = () => {
      for (const id of REPORT_SURFACES) expect(screen.queryByTestId(id)).not.toBeInTheDocument();
      expect(screen.queryByText('English 101')).not.toBeInTheDocument();
      expect(getClassroomStudents).not.toHaveBeenCalled();
      expect(getRecentClassroomGames).not.toHaveBeenCalled();
    };

    it.each([
      ['the picker', ''],
      ['a class deep link', 'classroomId=classroom-1'],
      ['a student deep link', 'classroomId=classroom-1&studentId=student-123'],
    ])('shows a never-trial free teacher the Pro lock on %s, with no student results', (_label, query) => {
      proState.hasPro = false;
      for (const [k, v] of new URLSearchParams(query)) mockSearchParams.set(k, v);
      render(<ReportsPageClient />);

      expect(screen.getByRole('heading', { level: 1, name: 'Progress Reports' })).toBeInTheDocument();
      expect(screen.getByTestId('pro-gate-preview')).toBeInTheDocument();
      expect(screen.getByTestId('pro-gate-pill')).toBeInTheDocument();
      expect(screen.getByTestId('pro-gate-upgrade-reports')).toHaveTextContent('teacher.proGate.reports.cta');
      expectNoReportData();
    });

    it('locks the page again once the access trial has expired, keeping nothing on screen', () => {
      proState.hasPro = false;
      proState.accessTrialExpires = inDays(-1);
      mockSearchParams.set('classroomId', 'classroom-1');
      render(<ReportsPageClient />);

      expect(screen.getByTestId('pro-gate-upgrade-reports')).toBeInTheDocument();
      expectNoReportData();
    });

    it('shows neither reports nor the lock while the entitlement resolves', () => {
      proState.loading = true;
      mockSearchParams.set('classroomId', 'classroom-1');
      const { container } = render(<ReportsPageClient />);

      expect(screen.getByTestId('education-shell-scroll')).toBeInTheDocument();
      expect(container).not.toBeEmptyDOMElement();
      expect(screen.getByTestId('reports-checking')).toHaveAttribute('aria-busy', 'true');
      expect(screen.queryByTestId('pro-gate-preview')).not.toBeInTheDocument();
      expectNoReportData();
    });

    it('gives a teacher on a live access trial the full reports with one Pro strip', () => {
      proState.hasPro = false;
      proState.accessTrialExpires = inDays(9);
      mockSearchParams.set('classroomId', 'classroom-1');
      render(<ReportsPageClient />);

      expect(screen.getAllByTestId('pro-trial-preview')).toHaveLength(1);
      expect(screen.getByTestId('class-progress-report')).toBeInTheDocument();
      expect(screen.getByTestId('classroom-roster-progress')).toBeInTheDocument();
      expect(screen.queryByTestId('pro-gate-preview')).not.toBeInTheDocument();
    });

    it('gives a paying teacher every report and no lock or strip', () => {
      mockSearchParams.set('classroomId', 'classroom-1');
      render(<ReportsPageClient />);

      expect(screen.getByTestId('class-progress-report')).toBeInTheDocument();
      expect(screen.getByTestId('progress-digest-dashboard')).toBeInTheDocument();
      expect(getRecentClassroomGames).toHaveBeenCalledWith('classroom-1', expect.any(Number), expect.anything());
      expect(screen.queryByTestId('pro-gate-preview')).not.toBeInTheDocument();
      expect(screen.queryByTestId('pro-trial-preview')).not.toBeInTheDocument();
    });

    it('renders reports for a Pro teacher', () => {
      render(<ReportsPageClient />);

      expect(screen.getByText('Progress Reports')).toBeInTheDocument();
      expect(screen.getByText('English 101')).toBeInTheDocument();
      expect(screen.queryByTestId('pro-gate-preview')).not.toBeInTheDocument();
    });
  });

  describe('Telemetry', () => {
    it('fires edu_reports_viewed once for a Pro teacher landing on the list', () => {
      render(<ReportsPageClient />);
      expect(trackEduReportsViewed).toHaveBeenCalledTimes(1);
      expect(trackEduReportsViewed).toHaveBeenCalledWith({});
    });

    it('includes classroom scope when the URL already selects a class', () => {
      mockSearchParams.set('classroomId', 'classroom-1');
      render(<ReportsPageClient />);
      expect(trackEduReportsViewed).toHaveBeenCalledWith({
        classroomId: 'classroom-1',
      });
    });

    it('does not fire when the Pro gate blocks the page', () => {
      proState.hasPro = false;
      render(<ReportsPageClient />);
      expect(trackEduReportsViewed).not.toHaveBeenCalled();
      proState.hasPro = true;
    });
  });

  describe('Accessibility', () => {
    it('has accessible page heading', () => {
      render(<ReportsPageClient />);

      expect(
        screen.getByRole('heading', { name: /progress reports/i })
      ).toBeInTheDocument();
    });

    it('classroom buttons are accessible', () => {
      render(<ReportsPageClient />);

      const classroomButtons = screen.getAllByRole('button');
      expect(classroomButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Browser history', () => {
    it('follows the URL when the teacher presses browser Back', () => {
      // GIVEN the student view opened from a URL
      mockSearchParams.set('classroomId', 'classroom-1');
      mockSearchParams.set('studentId', 'student-123');
      const { rerender } = render(<ReportsPageClient />);
      expect(screen.getByTestId('student-progress-report')).toBeInTheDocument();

      // WHEN Back drops studentId from the URL
      mockSearchParams.delete('studentId');
      rerender(<ReportsPageClient />);

      // THEN the class view shows — local state must not pin the old view
      expect(screen.getByTestId('class-progress-report')).toBeInTheDocument();
    });
  });
});
