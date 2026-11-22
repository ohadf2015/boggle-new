import { vi, type Mock, afterEach, beforeEach } from 'vitest';
/**
 * Teacher Reports PageClient Tests
 *
 * Pro gating and telemetry of the reports page.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReportsPageClient from '../PageClient';

// Mock the report components
// The page now mounts the shared education header — a compact bar with a way
// back, which these screens used to lack entirely. It pulls MusicContext in,
// which this suite has no provider for and no interest in.
vi.mock('@/components/teacher/analytics/overview/ClassOverview', () => ({
  ClassOverview: ({ classroomName, onOpenChange }: { classroomName: string; onOpenChange?: (id: string | null) => void }) => (
    <button type="button" data-testid="class-overview" data-class={classroomName} onClick={() => onOpenChange?.('student-9')} />
  ),
}));

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
      <button onClick={() => onStudentClick?.('33333333-3333-4333-8333-333333333333')}>Click Student</button>
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
  { id: '11111111-1111-4111-8111-111111111111', name: 'English 101', created_at: '2024-01-01' },
  { id: '22222222-2222-4222-8222-222222222222', name: 'English 102', created_at: '2024-01-02' },
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

vi.mock('../OwnClassProPreview', () => ({
  OwnClassProPreview: ({ classroomId }: { classroomId: string }) => <section data-testid={`own-preview-${classroomId}`} />,
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
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete('studentId');
    mockSearchParams.delete('classroomId');
  });

  describe('Pro gating', () => {
    afterEach(() => {
      proState.hasPro = true;
      proState.loading = false;
      proState.accessTrialExpires = null;
      Object.assign(proState, { known: undefined, trialUsed: undefined, status: undefined });
    });

    const REPORT_SURFACES = [
      'class-progress-report', 'student-progress-report', 'progress-digest-dashboard', 'assignment-progress-report',
      'assignment-completion-report', 'class-assignment-grid', 'classroom-roster-progress', 'class-arc-panel', 'student-arc-view',
    ];
    const expectNoReportData = () => {
      for (const id of REPORT_SURFACES) expect(screen.queryByTestId(id)).not.toBeInTheDocument();
      expect(screen.queryAllByText('English 101').every((n) => n.closest('[data-testid=reports-free-insights],[data-testid=reports-free-class]'))).toBe(true);
      expect(getRecentClassroomGames).not.toHaveBeenCalled();
    };

    it.each([
      ['the picker', ''],
      ['a class deep link', 'classroomId=11111111-1111-4111-8111-111111111111'],
      ['a student deep link', 'classroomId=11111111-1111-4111-8111-111111111111&studentId=33333333-3333-4333-8333-333333333333'],
    ])('shows a never-trial free teacher the Pro lock on %s, with no student results', (_label, query) => {
      proState.hasPro = false;
      for (const [k, v] of new URLSearchParams(query)) mockSearchParams.set(k, v);
      render(<ReportsPageClient />);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(query ? 'English 101' : 'Progress Reports');
      expect(screen.getByTestId('pro-gate-preview')).toBeInTheDocument();
      expect(screen.getByTestId('pro-gate-pill')).toBeInTheDocument();
      expect(screen.getByTestId('pro-gate-upgrade-reports')).toHaveTextContent('teacher.proGate.reports.cta');
      expectNoReportData();
    });

    it('shows a free teacher this week for their oldest class first, names the classes free does not cover, and puts the Pro lock after', () => {
      proState.hasPro = false;
      freeWeek.mounted = [];
      render(<ReportsPageClient />);
      const insights = screen.getByTestId('reports-free-insights');
      expect(within(insights).getByText('English 101')).toBeInTheDocument();
      expect(within(insights).getByTestId('free-week-11111111-1111-4111-8111-111111111111')).toBeInTheDocument();
      expect(freeWeek.mounted.every((p) => p.classroomId === '11111111-1111-4111-8111-111111111111' && p.proLine === false)).toBe(true);
      const others = screen.getByTestId('reports-free-other-classes');
      expect(others).toHaveTextContent('teacher.reports.freeOtherClasses');
      expect(others).toHaveTextContent('English 102');
      expect(insights.compareDocumentPosition(screen.getByTestId('pro-gate-lock')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(screen.queryByTestId('reports-free-summary')).toBeNull();
    });

    describe('a free teacher on one class', () => {
      afterEach(() => {
        for (const c of mockClassrooms) delete (c as { member_count?: number }).member_count;
      });

      it('Given a class link, Then that class\'s own week leads, its own roster preview follows, and the Pro lock comes last', () => {
        proState.hasPro = false;
        freeWeek.mounted = [];
        mockSearchParams.set('classroomId', '22222222-2222-4222-8222-222222222222');
        render(<ReportsPageClient />);
        const view = screen.getByTestId('reports-free-class');
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('English 102');
        const week = within(view).getByTestId('free-week-22222222-2222-4222-8222-222222222222');
        const own = within(view).getByTestId('own-preview-22222222-2222-4222-8222-222222222222');
        expect(freeWeek.mounted.every((p) => p.classroomId === '22222222-2222-4222-8222-222222222222' && p.proLine !== false)).toBe(true);
        expect(week.compareDocumentPosition(own) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(own.compareDocumentPosition(screen.getByTestId('pro-gate-lock')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(screen.queryByTestId('reports-free-insights')).toBeNull();
        expect(screen.getAllByTestId('pro-gate-upgrade-reports')).toHaveLength(1);
      });

      it('Given ?classroomId=null, Then the free class list shows instead', () => {
        proState.hasPro = false;
        mockSearchParams.set('classroomId', 'null');
        render(<ReportsPageClient />);
        expect(screen.queryByTestId('reports-free-class')).toBeNull();
        expect(screen.getByTestId('reports-free-insights')).toBeInTheDocument();
        expect(getClassroomStudents).not.toHaveBeenCalledWith('null');
      });

      it('Given the class list and a class with students, Then the own-class preview stands in for the sample', () => {
        proState.hasPro = false;
        (mockClassrooms[0] as { member_count?: number }).member_count = 0;
        (mockClassrooms[1] as { member_count?: number }).member_count = 4;
        render(<ReportsPageClient />);
        const own = screen.getByTestId('own-preview-22222222-2222-4222-8222-222222222222');
        expect(own.compareDocumentPosition(screen.getByTestId('pro-gate-lock')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      });

      it('Given the class list and the oldest class has students, Then the preview is that class', () => {
        proState.hasPro = false;
        (mockClassrooms[0] as { member_count?: number }).member_count = 3;
        (mockClassrooms[1] as { member_count?: number }).member_count = 4;
        render(<ReportsPageClient />);
        expect(screen.getByTestId('own-preview-11111111-1111-4111-8111-111111111111')).toBeInTheDocument();
        expect(screen.queryByTestId('own-preview-22222222-2222-4222-8222-222222222222')).toBeNull();
      });

      it('Given a quiet week beside the own roster, Then the shell hides the empty card\'s sample so only the teacher\'s own class shows', () => {
        proState.hasPro = false;
        render(<ReportsPageClient />);
        const frame = screen.getByTestId('pro-gate-lock').parentElement!;
        expect(frame.className).toContain('[&:has([data-testid=own-class-pro-preview])_[data-testid=free-week-sample]]:hidden');
      });

      it('Given no class has students, Then there is no roster preview', () => {
        proState.hasPro = false;
        render(<ReportsPageClient />);
        expect(screen.queryByTestId(/^own-preview-/)).toBeNull();
      });
    });

    it('shows a Pro teacher no free insight', () => {
      proState.hasPro = true;
      render(<ReportsPageClient />);
      expect(screen.queryByTestId('reports-free-insights')).toBeNull();
    });

    it('offers a never-trialed free teacher the Polar trial as the lock\'s one action', () => {
      Object.assign(proState, { hasPro: false, known: true, status: 'active', trialUsed: false });
      render(<ReportsPageClient />);

      expect(screen.getByTestId('pro-gate-upgrade-reports')).toHaveTextContent('eduPlans.reports.startTrialCta');
      const lockCard = screen.getByTestId('pro-gate-lock');
      expect(within(lockCard).getAllByRole('button')).toHaveLength(1);
      expectNoReportData();
    });

    it('sends a free teacher whose Polar trial is used up to the paid unlock', () => {
      Object.assign(proState, { hasPro: false, known: true, status: 'canceled', trialUsed: true });
      render(<ReportsPageClient />);

      expect(screen.getByTestId('pro-gate-upgrade-reports')).toHaveTextContent('teacher.proGate.reports.cta');
    });

    it('locks the page again once the access trial has expired, keeping nothing on screen', () => {
      proState.hasPro = false;
      proState.accessTrialExpires = inDays(-1);
      mockSearchParams.set('classroomId', '11111111-1111-4111-8111-111111111111');
      render(<ReportsPageClient />);

      expect(screen.getByTestId('pro-gate-upgrade-reports')).toBeInTheDocument();
      expectNoReportData();
    });

    it('shows neither reports nor the lock while the entitlement resolves', () => {
      proState.loading = true;
      mockSearchParams.set('classroomId', '11111111-1111-4111-8111-111111111111');
      const { container } = render(<ReportsPageClient />);

      expect(screen.getByTestId('education-shell-scroll')).toBeInTheDocument();
      expect(container).not.toBeEmptyDOMElement();
      expect(screen.getByTestId('reports-checking')).toHaveAttribute('aria-busy', 'true');
      expect(screen.queryByTestId('pro-gate-preview')).not.toBeInTheDocument();
      expectNoReportData();
    });

    it('gives a teacher on a live access trial the full reports with one Pro strip', async () => {
      proState.hasPro = false;
      proState.accessTrialExpires = inDays(9);
      mockSearchParams.set('classroomId', '11111111-1111-4111-8111-111111111111');
      render(<ReportsPageClient />);

      expect(screen.getAllByTestId('pro-trial-preview')).toHaveLength(1);
      expect(screen.queryByTestId('teacher-plan-badge')).not.toBeInTheDocument();
      expect(screen.getByTestId('classroom-roster-progress')).toBeInTheDocument();
      await openSection('more');
      expect(screen.getByTestId('class-progress-report')).toBeInTheDocument();
      expect(screen.queryByTestId('pro-gate-preview')).not.toBeInTheDocument();
    });

    it('on a phone, orders the trial strip after the report so the reteach action is the first tap', () => {
      proState.hasPro = false;
      proState.accessTrialExpires = inDays(9);
      render(<ReportsPageClient />);

      const strip = screen.getByTestId('pro-trial-preview');
      const frame = strip.parentElement!;
      expect(frame.className).toMatch(/max-sm:flex-col/);
      expect(frame.className).toContain('max-sm:[&>[data-testid=pro-trial-preview]]:order-last');
      expect(strip.nextElementSibling).toContainElement(screen.getByTestId('reports-value-line'));
      expect(strip.nextElementSibling!.className).toMatch(/\bw-full\b/);
    });

    it('gives a paying teacher every report and no lock or strip', async () => {
      mockSearchParams.set('classroomId', '11111111-1111-4111-8111-111111111111');
      render(<ReportsPageClient />);

      expect(screen.queryByTestId('teacher-plan-badge')).toBeNull();
      await openSection('more');
      expect(screen.getByTestId('class-progress-report')).toBeInTheDocument();
      expect(screen.getByTestId('progress-digest-dashboard')).toBeInTheDocument();
      await openSection('games');
      expect(getRecentClassroomGames).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111', expect.any(Number), expect.anything());
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
      mockSearchParams.set('classroomId', '11111111-1111-4111-8111-111111111111');
      render(<ReportsPageClient />);
      expect(trackEduReportsViewed).toHaveBeenCalledWith({
        classroomId: '11111111-1111-4111-8111-111111111111',
      });
    });

    it('does not fire when the Pro gate blocks the page', () => {
      proState.hasPro = false;
      render(<ReportsPageClient />);
      expect(trackEduReportsViewed).not.toHaveBeenCalled();
      proState.hasPro = true;
    });
  });

});
