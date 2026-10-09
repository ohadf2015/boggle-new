/**
 * Reports PageClient — the arc wiring decision (evidence pack §8.2):
 * the per-student arc and the class arc panel render for a FREE teacher,
 * while the deep printable reports stay behind ProGate.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

let search = '';
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
    classrooms: [{ id: 'c1', name: 'Band 2', member_count: 2, language: 'en' }],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro: false, loading: false }) }));
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
  ProGate: () => <div data-testid="pro-gate" />,
}));
vi.mock('@/components/teacher/TeacherPlanBadge', () => ({ TeacherPlanBadge: () => <div /> }));
vi.mock('@/components/teacher/reports/StudentProgressReport', () => ({
  StudentProgressReport: () => <div data-testid="student-progress-report" />,
}));
vi.mock('@/components/teacher/reports/ClassProgressReport', () => ({
  ClassProgressReport: () => <div data-testid="class-progress-report" />,
}));
vi.mock('@/components/teacher/reports/ClassArcPanel', () => ({
  ClassArcPanel: ({ onStudentClick }: { onStudentClick: (id: string, name?: string) => void }) => (
    <div data-testid="class-arc-panel">
      <button type="button" onClick={() => onStudentClick('s1', 'Sam')}>pick</button>
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
vi.mock('@/components/teacher/reports/ClassAssignmentGrid', () => ({
  ClassAssignmentGrid: () => <div data-testid="class-assignment-grid" />,
}));
vi.mock('@/components/teacher/reports/AssignmentCompletionReport', () => ({
  AssignmentCompletionReport: () => <div data-testid="assignment-completion-report" />,
}));
vi.mock('@/components/teacher/reports/GoogleClassroomGradePassback', () => ({
  GoogleClassroomGradePassback: () => <div />,
}));
vi.mock('@/components/teacher/reports/ExportAllClassesButton', () => ({
  ExportAllClassesButton: () => <div />,
}));
vi.mock('@/components/teacher/digest/ProgressDigestDashboard', () => ({
  ProgressDigestDashboard: () => <div />,
}));
vi.mock('@/components/teacher/hq/tvScale', () => ({ TEACHER_TV_SCALE: '' }));

import TeacherReportsPage from '../PageClient';

describe('<TeacherReportsPage> arc gating', () => {
  beforeEach(() => {
    search = '';
  });

  it('shows the class arc panel to a free teacher on the class view', () => {
    search = 'classroomId=c1';
    render(<TeacherReportsPage />);
    expect(screen.getByTestId('class-arc-panel')).toBeInTheDocument();
    expect(screen.getByTestId('pro-gate')).toBeInTheDocument();
    expect(screen.queryByTestId('class-progress-report')).not.toBeInTheDocument();
  });

  it('shows the student arc to a free teacher while the deep report stays gated', () => {
    search = 'classroomId=c1&studentId=s1';
    render(<TeacherReportsPage />);
    expect(screen.getByTestId('student-arc-view')).toBeInTheDocument();
    expect(screen.getByTestId('pro-gate')).toBeInTheDocument();
    expect(screen.queryByTestId('student-progress-report')).not.toBeInTheDocument();
  });

  it('hands the clicked student name through to the arc header', async () => {
    search = 'classroomId=c1';
    const { findByTestId, findAllByText } = render(<TeacherReportsPage />);
    const panel = await findByTestId('class-arc-panel');
    panel.querySelector('button')!.click();
    expect((await findByTestId('student-arc-view')).textContent).toBe('Sam');
  });

  it('resolves the student name from the roster on a deep link', async () => {
    getClassroomStudents.mockResolvedValue({
      data: [{ student_id: 's1', profiles: { display_name: 'Noa', username: 'Player_x' } }],
      error: null,
    });
    search = 'classroomId=c1&studentId=s1';
    const { findByTestId } = render(<TeacherReportsPage />);
    await waitFor(() => expect(getClassroomStudents).toHaveBeenCalledWith('c1'));
    expect((await findByTestId('student-arc-view')).textContent).toBe('Noa');
  });
});
