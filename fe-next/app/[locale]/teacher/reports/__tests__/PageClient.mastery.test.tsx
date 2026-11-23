import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';

let search = '';
vi.mock('@/components/teacher/analytics/overview/ClassOverview', () => ({
  ClassOverview: ({ classroomName, onOpenChange }: { classroomName: string; onOpenChange?: (id: string | null) => void }) => (
    <button type="button" data-testid="class-overview" data-class={classroomName} onClick={() => onOpenChange?.('student-9')} />
  ),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/en/teacher/reports',
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({
    classrooms: [{ id: '11111111-1111-4111-8111-111111111111', name: 'Band 2', member_count: 2, language: 'en' }],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro: true, loading: false }) }));
vi.mock('@/lib/education/telemetry', () => ({ trackEduReportsViewed: vi.fn() }));
const getClassroomStudents = vi.fn().mockResolvedValue({ data: [], error: null });
vi.mock('@/lib/supabase/education/classrooms', () => ({
  getClassroomStudents: (...a: unknown[]) => getClassroomStudents(...a),
}));
vi.mock('@/lib/displayName', () => ({
  resolveDisplayName: (c: (string | null | undefined)[], fb: string) => c.find(Boolean) ?? fb,
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  m: { div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div> },
  useReducedMotion: () => true,
}));

vi.mock('@/components/education/shell/EducationShell', () => ({
  EducationShell: ({ children, header }: { children: React.ReactNode; header: React.ReactNode }) => (
    <div data-testid="shell">{header}{children}</div>
  ),
}));
vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => <div /> }));
vi.mock('@/components/education/TeacherGate', () => ({
  TeacherGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/teacher/ProGate', () => ({
  ProGate: ({ children }: { children: React.ReactNode }) => <div data-testid="pro-gate">{children}</div>,
}));
vi.mock('@/components/teacher/reports/StudentProgressReport', () => ({
  StudentProgressReport: () => <div data-testid="student-progress-report" />,
}));
vi.mock('@/components/teacher/reports/ClassProgressReport', () => ({
  ClassProgressReport: () => <div data-testid="class-progress-report" />,
}));
vi.mock('@/components/teacher/reports/ClassArcPanel', () => ({
  ClassArcPanel: ({ onStudentClick }: { onStudentClick: (id: string, name?: string) => void }) => (
    <div data-testid="class-arc-panel">
      <button type="button" onClick={() => onStudentClick('33333333-3333-4333-8333-333333333333', 'Sam')}>pick</button>
    </div>
  ),
}));
vi.mock('@/components/teacher/reports/StudentArcView', () => ({
  StudentArcView: ({ studentName }: { studentName?: string }) => (
    <div data-testid="student-arc-view">{studentName ?? 'no-name'}</div>
  ),
}));
vi.mock('@/components/teacher/reports/AssignmentProgressReport', () => ({
  AssignmentProgressReport: () => <div data-testid="assignment-report" />,
}));
vi.mock('@/components/teacher/reports/ClassroomRosterProgress', () => ({
  ClassroomRosterProgress: ({ classroomId }: { classroomId: string }) => (
    <div data-testid="classroom-roster-progress">{classroomId}</div>
  ),
}));
vi.mock('@/components/teacher/reports/ClassAssignmentGrid', () => ({
  ClassAssignmentGrid: () => <div data-testid="class-assignment-grid" />,
}));
vi.mock('@/components/teacher/reports/AssignmentCompletionReport', () => ({
  AssignmentCompletionReport: () => <div data-testid="assignment-completion-report" />,
}));
vi.mock('@/components/teacher/reports/GoogleClassroomGradePassback', () => ({
  GoogleClassroomGradePassback: () => <div />,
}));
vi.mock('@/components/teacher/pro/ParentReportPack', () => ({
  ParentReportPack: () => <div data-testid="parent-report-pack" />,
}));
vi.mock('@/components/teacher/reports/StudentParentPreview', () => ({
  StudentParentPreview: () => <div data-testid="student-parent-preview" />,
}));
vi.mock('@/components/teacher/reports/ExportAllClassesButton', () => ({
  ExportAllClassesButton: () => <div />,
}));
vi.mock('@/components/teacher/digest/ProgressDigestDashboard', () => ({
  ProgressDigestDashboard: () => <div data-testid="progress-digest-dashboard" />,
}));
vi.mock('@/components/teacher/hq/tvScale', () => ({ TEACHER_TV_SCALE: '' }));

vi.mock('@/components/teacher/reports/WordMasteryReport', () => ({
  WordMasteryReport: ({ classroomId }: { classroomId: string }) => <div data-testid="word-mastery-report">{classroomId}</div>,
}));

vi.mock('@/components/teacher/analytics/VocabularyHeatmap', () => ({
  VocabularyHeatmap: ({ classroomId }: { classroomId: string }) => <div data-testid="vocabulary-heatmap">{classroomId}</div>,
}));
vi.mock('next/dynamic', () => ({
  default: () => ({ classroomId }: { classroomId: string }) => <div data-testid="lesson-effectiveness">{classroomId}</div>,
}));
const live = vi.hoisted(() => ({ connectionStatus: 'connected', activeStudentsCount: 0, isConnected: true }));
vi.mock('@/hooks/useRealtimeClassroomProgress', () => ({
  useRealtimeClassroomProgress: () => ({ ...live, lastUpdate: null, recentActivity: [] }),
}));
vi.mock('@/components/teacher/analytics/LiveActivityIndicator', () => ({
  LiveActivityIndicator: ({ activeStudentsCount }: { activeStudentsCount: number }) => <div data-testid="live-indicator">{activeStudentsCount}</div>,
}));

import userEvent from '@testing-library/user-event';
import TeacherReportsPage from '../PageClient';

describe('<TeacherReportsPage> class view — summary first, detail on demand', () => {
  beforeEach(() => {
    search = 'classroomId=11111111-1111-4111-8111-111111111111';
  });

  it('names the class once, as the page heading', () => {
    render(<TeacherReportsPage />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Band 2');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  const openTab = async (id: string) => {
    await userEvent.click(screen.getByRole('tab', { name: `teacher.reports.tabs.${id}` }));
  };

  it('opens on the roster, with the other sections one tab away and not mounted', () => {
    render(<TeacherReportsPage />);
    const tabs = screen.getAllByRole('tab').map((tab) => tab.textContent);
    expect(tabs).toEqual(['students', 'games', 'words', 'homework', 'more'].map((id) => `teacher.reports.tabs.${id}`));
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('teacher.reports.tabs.students');
    expect(screen.getByTestId('classroom-roster-progress')).toBeInTheDocument();
    expect(screen.queryByTestId('word-mastery-report')).toBeNull();
    expect(screen.queryByTestId('class-arc-panel')).toBeNull();
  });

  it('shows the word mastery report with the vocabulary heatmap under it on the words tab', async () => {
    render(<TeacherReportsPage />);
    await openTab('words');
    const mastery = await screen.findByTestId('word-mastery-report');
    expect(mastery).toHaveTextContent('11111111-1111-4111-8111-111111111111');
    const heatmap = screen.getByTestId('vocabulary-heatmap');
    expect(mastery.compareDocumentPosition(heatmap) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('Given an old ?section=pulse link, Then the words tab opens', () => {
    search = 'classroomId=11111111-1111-4111-8111-111111111111&section=pulse';
    render(<TeacherReportsPage />);
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('teacher.reports.tabs.words');
  });

  it('keeps lesson effectiveness folded on the more tab and mounts it only when opened', async () => {
    render(<TeacherReportsPage />);
    await openTab('more');
    const lessons = screen.getByTestId('lessons-disclosure') as HTMLDetailsElement;
    expect(within(lessons).getByTestId('pro-powered-chip')).toBeInTheDocument();
    expect(screen.queryByTestId('lesson-effectiveness')).toBeNull();
    act(() => {
      lessons.open = true;
      lessons.dispatchEvent(new Event('toggle'));
    });
    expect(screen.getByTestId('lesson-effectiveness')).toHaveTextContent('11111111-1111-4111-8111-111111111111');
  });

  it('shows who is playing right now only while students are live', () => {
    live.activeStudentsCount = 0;
    const { unmount } = render(<TeacherReportsPage />);
    expect(screen.queryByTestId('live-indicator')).toBeNull();
    unmount();
    live.activeStudentsCount = 3;
    render(<TeacherReportsPage />);
    expect(screen.getByTestId('live-indicator')).toHaveTextContent('3');
    live.activeStudentsCount = 0;
  });

  it('has no link to a second class report page', () => {
    render(<TeacherReportsPage />);
    expect(screen.queryByTestId('reports-class-report-link')).toBeNull();
    expect(document.querySelector('a[href*="/analytics"]')).toBeNull();
  });

  it('shows the class assignment grid open on the homework tab, with the per-assignment reports folded under it', async () => {
    render(<TeacherReportsPage />);
    await openTab('homework');
    expect((await screen.findByTestId('class-assignment-grid')).closest('details')).toBeNull();
    const folded = screen.getByTestId('assignment-report').closest('details');
    expect(folded).not.toBeNull();
    expect(folded).not.toHaveAttribute('open');
  });

  it('gates the whole page once, and keeps arc, digest, parent reports and the printable report folded on the more tab', async () => {
    render(<TeacherReportsPage />);
    expect(screen.getAllByTestId('pro-gate')).toHaveLength(1);
    await openTab('more');
    for (const id of ['class-arc-panel', 'progress-digest-dashboard', 'class-progress-report']) {
      const d = (await screen.findByTestId(id)).closest('details');
      expect(d).not.toBeNull();
      expect(d).not.toHaveAttribute('open');
    }
    const parents = screen.getByTestId('parent-reports-disclosure') as HTMLDetailsElement;
    expect(screen.queryByTestId('parent-report-pack')).not.toBeInTheDocument();
    act(() => {
      parents.open = true;
      parents.dispatchEvent(new Event('toggle'));
    });
    expect(screen.getByTestId('parent-report-pack')).toBeInTheDocument();
  });
});
