import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

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
  ProGate: ({ active }: { active?: boolean }) => <div data-testid="pro-gate" data-active={String(active)} />,
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
vi.mock('@/components/teacher/reports/GoogleClassroomGradePassback', () => ({
  GoogleClassroomGradePassback: () => <div />,
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

import TeacherReportsPage from '../PageClient';

describe('<TeacherReportsPage> class view — summary first, detail on demand', () => {
  beforeEach(() => {
    search = 'classroomId=c1';
  });

  it('names the class once, as the page heading', () => {
    render(<TeacherReportsPage />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Band 2');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('leads with the word mastery report, above the arc', () => {
    render(<TeacherReportsPage />);
    const mastery = screen.getByTestId('word-mastery-report');
    const arc = screen.getByTestId('class-arc-panel');
    expect(mastery).toHaveTextContent('c1');
    expect(mastery.compareDocumentPosition(arc) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('folds the printable report into a closed disclosure and tells ProGate it is not on screen', () => {
    render(<TeacherReportsPage />);
    const gate = screen.getByTestId('pro-gate');
    const details = gate.closest('details');
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute('open');
    expect(gate).toHaveAttribute('data-active', 'false');
  });

  it('keeps the summary short: assignments, arc and digest fold into closed disclosures between the mastery report and the full report', () => {
    render(<TeacherReportsPage />);
    const mastery = screen.getByTestId('word-mastery-report');
    const full = screen.getByTestId('full-report-disclosure');
    for (const id of ['assignment-report', 'class-arc-panel', 'progress-digest-dashboard']) {
      const d = screen.getByTestId(id).closest('details');
      expect(d).not.toBeNull();
      expect(d).not.toHaveAttribute('open');
      expect(d).not.toBe(full);
      expect(mastery.compareDocumentPosition(d!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(d!.compareDocumentPosition(full) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    for (const key of ['assignmentsTitle', 'arcTitle', 'digestTitle']) {
      expect(screen.getByText(`eduPro.reports.${key}`)).toBeInTheDocument();
    }
  });
});
