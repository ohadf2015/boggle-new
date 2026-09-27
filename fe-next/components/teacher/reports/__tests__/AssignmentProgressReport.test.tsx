import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const proState = {
  hasPro: true,
  loading: false,
};

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => proState,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const translations: Record<string, string> = {
        'teacher.reports.assignmentProgress.title': 'Assignment progress',
        'teacher.reports.assignmentProgress.empty': 'No assignments in this classroom yet',
        'teacher.reports.assignmentProgress.statusCompleted': 'Completed',
        'teacher.reports.assignmentProgress.statusMissing': 'Missing',
        'teacher.reports.assignmentProgress.exportCsv': 'Export CSV',
        'teacher.reports.assignmentProgress.exportCsvPro': 'Export CSV with Teacher Pro {{price}}',
        'teacher.reports.assignmentProgress.fileName': '{{name}} – assignment progress',
        'teacher.reports.columns.student': 'Student',
        'teacher.reports.columns.assignment': 'Assignment',
        'teacher.reports.columns.status': 'Status',
        'teacher.reports.columns.score': 'Score',
        'teacher.reports.columns.accuracy': 'Accuracy',
        'teacher.reports.columns.completedAt': 'Completed at',
      };
      let value = translations[key] || key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          value = value.replace(`{{${k}}}`, String(v));
        }
      }
      return value;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('@/lib/supabase/education/assignments', () => ({
  getClassroomAssignments: vi.fn(),
  getAssignmentCompletions: vi.fn(),
}));

vi.mock('@/lib/supabase/education/classrooms', () => ({
  getClassroomStudents: vi.fn(),
}));

vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: vi.fn(),
}));

vi.mock('../ReportChrome', () => ({
  ReportSkeleton: () => <div>loading</div>,
  ReportError: () => <div>error</div>,
  ReportEmpty: () => <div>empty</div>,
  SectionTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  useReportData: () => ({
    data: {
      rows: [
        {
          studentId: 's1',
          studentName: 'Ada',
          assignmentId: 'a1',
          assignmentTitle: 'Week 1 nouns',
          status: 'completed',
          score: 12,
          accuracy: 80,
          completedAt: '2026-09-01T00:00:00.000Z',
        },
        {
          studentId: 's2',
          studentName: 'Ben',
          assignmentId: 'a1',
          assignmentTitle: 'Week 1 nouns',
          status: 'missing',
          score: null,
          accuracy: null,
          completedAt: null,
        },
      ],
    },
    loading: false,
    failed: false,
    retry: () => {},
  }),
}));

vi.mock('@/lib/education/assignmentProgressReport', async () => {
  const actual = await vi.importActual<typeof import('@/lib/education/assignmentProgressReport')>(
    '@/lib/education/assignmentProgressReport',
  );
  return { ...actual, downloadCsvFile: vi.fn() };
});

import { AssignmentProgressReport } from '../AssignmentProgressReport';
import { downloadCsvFile } from '@/lib/education/assignmentProgressReport';

describe('AssignmentProgressReport', () => {
  beforeEach(() => {
    (downloadCsvFile as unknown as { mockClear: () => void }).mockClear();
    proState.hasPro = true;
    proState.loading = false;
  });

  it('shows completed and missing assignment results on screen', () => {
    render(<AssignmentProgressReport classroomId="c1" classroomName="English 101" />);
    expect(screen.getByTestId('assignment-progress-report')).toBeInTheDocument();
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('Ben')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Missing')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('lets a Pro teacher export CSV', async () => {
    render(<AssignmentProgressReport classroomId="c1" classroomName="English 101" />);
    await userEvent.click(screen.getByTestId('assignment-progress-csv-export'));
    expect(downloadCsvFile).toHaveBeenCalledTimes(1);
    const [fileName, csv] = (downloadCsvFile as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
    expect(fileName).toContain('English 101');
    expect(String(csv)).toContain('Ada');
    expect(String(csv)).toContain('Completed');
    expect(String(csv)).toContain('Missing');
  });

  it('sends a free teacher to the existing upgrade route instead of downloading', () => {
    proState.hasPro = false;
    render(<AssignmentProgressReport classroomId="c1" classroomName="English 101" />);
    const cta = screen.getByTestId('assignment-progress-csv-upgrade');
    expect(cta).toHaveAttribute('href', '/en/teacher/upgrade');
    expect(screen.queryByTestId('assignment-progress-csv-export')).not.toBeInTheDocument();
    expect(downloadCsvFile).not.toHaveBeenCalled();
  });
});
