import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const proState = {
  hasPro: false,
  loading: false,
};

const reportState: {
  data: { rows: Array<{ assignmentId: string; title: string; submitted: number; roster: number }> } | null;
  loading: boolean;
  failed: boolean;
} = {
  data: { rows: [{ assignmentId: 'a1', title: 'Nouns', submitted: 0, roster: 5 }] },
  loading: false,
  failed: false,
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
        'teacher.reports.assignmentCompletion.title': 'Assignment completion',
        'teacher.reports.assignmentCompletion.submitted': '{{submitted}} / {{roster}} submitted',
        'teacher.reports.assignmentCompletion.upgrade': 'Teacher Pro {{price}}',
        'teacher.reports.assignmentProgress.untitled': 'Untitled lesson',
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
}));

vi.mock('@/lib/education/telemetry', () => ({
  trackTeacherAssignmentReportViewed: vi.fn(),
  trackTeacherAssignmentReportUpgradeClicked: vi.fn(),
}));

vi.mock('../ReportChrome', () => ({
  ReportSkeleton: () => <div>loading</div>,
  ReportError: () => <div>error</div>,
  useReportData: () => ({
    data: reportState.data,
    loading: reportState.loading,
    failed: reportState.failed,
    retry: () => {},
  }),
}));

import {
  trackTeacherAssignmentReportUpgradeClicked,
  trackTeacherAssignmentReportViewed,
} from '@/lib/education/telemetry';
import { AssignmentCompletionReport } from '../AssignmentCompletionReport';

describe('AssignmentCompletionReport', () => {
  beforeEach(() => {
    proState.hasPro = false;
    reportState.loading = false;
    reportState.failed = false;
    reportState.data = { rows: [{ assignmentId: 'a1', title: 'Nouns', submitted: 0, roster: 5 }] };
    (trackTeacherAssignmentReportViewed as ReturnType<typeof vi.fn>).mockClear();
    (trackTeacherAssignmentReportUpgradeClicked as ReturnType<typeof vi.fn>).mockClear();
  });

  it('shows 0 submitted as a valid row', () => {
    render(<AssignmentCompletionReport classroomId="c1" />);
    const row = screen.getByTestId('assignment-completion-row');
    expect(row).toHaveAttribute('data-submitted', '0');
    expect(row).toHaveAttribute('data-roster', '5');
    expect(row).toHaveTextContent('0 / 5 submitted');
  });

  it('shows a partial classroom', () => {
    reportState.data = { rows: [{ assignmentId: 'a1', title: 'Nouns', submitted: 2, roster: 5 }] };
    render(<AssignmentCompletionReport classroomId="c1" />);
    const row = screen.getByTestId('assignment-completion-row');
    expect(row).toHaveAttribute('data-submitted', '2');
    expect(row).toHaveAttribute('data-roster', '5');
    expect(row).toHaveTextContent('2 / 5 submitted');
  });

  it('shows an all-submitted classroom', () => {
    reportState.data = { rows: [{ assignmentId: 'a1', title: 'Nouns', submitted: 5, roster: 5 }] };
    render(<AssignmentCompletionReport classroomId="c1" />);
    const row = screen.getByTestId('assignment-completion-row');
    expect(row).toHaveAttribute('data-submitted', '5');
    expect(row).toHaveAttribute('data-roster', '5');
    expect(row).toHaveTextContent('5 / 5 submitted');
  });

  it('does not render when the classroom has no assignments', () => {
    reportState.data = { rows: [] };
    render(<AssignmentCompletionReport classroomId="c1" />);
    expect(screen.queryByTestId('assignment-completion-report')).not.toBeInTheDocument();
    expect(trackTeacherAssignmentReportViewed).not.toHaveBeenCalled();
  });

  it('fires viewed telemetry and one Polar upgrade link for free teachers', async () => {
    render(<AssignmentCompletionReport classroomId="c1" />);
    const upgrade = screen.getByTestId('assignment-completion-upgrade');
    expect(upgrade).toHaveAttribute('href', '/en/teacher/upgrade');
    expect(trackTeacherAssignmentReportViewed).toHaveBeenCalledWith({
      classroomId: 'c1',
      assignmentCount: 1,
      hasPro: false,
    });
    await userEvent.click(upgrade);
    expect(trackTeacherAssignmentReportUpgradeClicked).toHaveBeenCalledWith({ classroomId: 'c1' });
  });

  it('hides the upgrade link for Teacher Pro', () => {
    proState.hasPro = true;
    render(<AssignmentCompletionReport classroomId="c1" />);
    expect(screen.getByTestId('assignment-completion-report')).toBeInTheDocument();
    expect(screen.queryByTestId('assignment-completion-upgrade')).not.toBeInTheDocument();
  });
});
