import { vi, type Mock, afterEach, beforeEach } from 'vitest';
/**
 * Teacher Reports PageClient Tests
 *
 * Tests for the reports page that shows class and student progress.
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
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
const freeWeek = vi.hoisted(() => ({ mounted: [] as { classroomId: string; proLine?: boolean }[] }));
vi.mock('@/components/teacher/analytics/free/FreeWeekInsight', () => ({
  FreeWeekInsight: (props: { classroomId: string; proLine?: boolean }) => {
    freeWeek.mounted.push(props);
    return <section data-testid={`free-week-${props.classroomId}`} />;
  },
}));

vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => proState,
}));

const weekStats: { summary: Record<string, unknown> | null; status: string } = {
  summary: { gamesPlayed: 3, gamesLast30d: 7, totalStudents: 24, activeClasses: 2, lastPlayedAt: {} },
  status: 'ready',
};
vi.mock('@/hooks/useTeacherWeekStats', () => ({
  useTeacherWeekStats: () => ({ ...weekStats, insights: [] }),
}));

const trackEduReportsViewed = vi.fn();
vi.mock('@/lib/education/telemetry', () => ({
  trackEduReportsViewed: (...args: unknown[]) => trackEduReportsViewed(...args),
}));

const openSection = async (id: string) => {
  await userEvent.setup().click(screen.getByRole('tab', { name: `teacher.reports.tabs.${id}` }));
};

describe('ReportsPageClient', () => {
  describe('A teacher with one class', () => {
    const all = [...mockClassrooms];
    beforeEach(() => mockClassrooms.splice(1));
    afterEach(() => mockClassrooms.splice(0, mockClassrooms.length, ...all));

    it('Given one class, Then the report opens on it instead of asking to pick', async () => {
      render(<ReportsPageClient />);
      expect(screen.queryByText('Select a Classroom')).not.toBeInTheDocument();
      expect(screen.getByTestId('classroom-roster-progress')).toHaveTextContent('classroom-1');
      await openSection('more');
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

    it('puts Homework results one tap from the top of the class results', async () => {
      render(<ReportsPageClient />);
      await userEvent.setup().click(screen.getByTestId('reports-homework-shortcut'));
      expect(screen.getByRole('tab', { name: 'teacher.reports.tabs.homework' })).toHaveAttribute('data-state', 'active');
    });

    it('opens straight on homework from a ?section=homework link', () => {
      mockSearchParams.set('section', 'homework');
      render(<ReportsPageClient />);
      expect(screen.getByRole('tab', { name: 'teacher.reports.tabs.homework' })).toHaveAttribute('data-state', 'active');
      mockSearchParams.delete('section');
    });

    it('displays class report when classroom is selected', async () => {
      render(<ReportsPageClient />);
      await openSection('more');

      expect(screen.getByTestId('class-progress-report')).toBeInTheDocument();
      expect(screen.getByTestId('class-progress-report')).toHaveAttribute(
        'data-classroom-id',
        'classroom-1'
      );
    });

    it('switches to student view when student is clicked', async () => {
      const user = userEvent.setup();

      render(<ReportsPageClient />);
      await openSection('more');

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
        expect(screen.getByTestId('classroom-roster-progress')).toBeInTheDocument();
      });
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

  describe('Plain-words value and the empty class', () => {
    const saved = { ...proState };
    beforeEach(() => Object.assign(proState, { hasPro: true, loading: false, accessTrialExpires: null }));
    afterEach(() => {
      Object.assign(proState, saved);
      delete (mockClassrooms[0] as { member_count?: number }).member_count;
    });

    it('Given the class list, Then one line says what a report is for, in plain words', () => {
      render(<ReportsPageClient />);
      expect(screen.getByTestId('reports-value-line')).toHaveTextContent('teacher.reports.valueLine');
    });

    it('Given a class nobody has played in yet, Then an empty state says why and offers one action: start a game for that class', () => {
      (mockClassrooms[0] as { member_count?: number }).member_count = 0;
      mockSearchParams.set('classroomId', 'classroom-1');
      render(<ReportsPageClient />);
      const empty = screen.getByTestId('reports-class-empty');
      expect(empty).toHaveTextContent('teacher.reports.emptyClass.title');
      const links = within(empty).getAllByRole('link');
      expect(links).toHaveLength(1);
      expect(links[0]).toHaveAttribute('href', '/en/education/classroom-game?classroomId=classroom-1');
      expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    });

    it('Given a class with students, Then the report tabs show and no empty state', () => {
      (mockClassrooms[0] as { member_count?: number }).member_count = 12;
      mockSearchParams.set('classroomId', 'classroom-1');
      render(<ReportsPageClient />);
      expect(screen.queryByTestId('reports-class-empty')).not.toBeInTheDocument();
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('Given a free teacher at the lock, Then the page says the missed words stay free on every game\'s results', () => {
      Object.assign(proState, { hasPro: false, known: true, status: 'canceled', trialUsed: true });
      render(<ReportsPageClient />);
      expect(screen.getByTestId('reports-locked-value')).toHaveTextContent('teacher.reports.lockedValue');
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
      expect(screen.getByTestId('classroom-roster-progress')).toBeInTheDocument();
    });
  });
});
