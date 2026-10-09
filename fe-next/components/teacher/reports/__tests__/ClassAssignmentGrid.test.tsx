import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const NOW = Date.parse('2026-10-07T12:00:00.000Z');

const { trackProgressReportViewed, trackWeeklySummaryCopied, proState, writeText } = vi.hoisted(() => ({
  trackProgressReportViewed: vi.fn(),
  trackWeeklySummaryCopied: vi.fn(),
  proState: { hasPro: false, loading: false },
  writeText: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => proState,
}));

vi.mock('@/lib/education/telemetry', () => ({
  trackProgressReportViewed: (...args: unknown[]) => trackProgressReportViewed(...args),
  trackWeeklySummaryCopied: (...args: unknown[]) => trackWeeklySummaryCopied(...args),
}));

const { stableT } = vi.hoisted(() => {
  const translations: Record<string, string> = {
    'teacher.reports.classGrid.title': 'Class progress',
    'teacher.reports.classGrid.empty': 'No students or assignments in this class yet',
    'teacher.reports.classGrid.statusCompleted': 'Completed',
    'teacher.reports.classGrid.statusMissing': 'Missing',
    'teacher.reports.classGrid.copySummary': 'Copy weekly summary',
    'teacher.reports.classGrid.copied': 'Copied',
    'teacher.reports.classGrid.copyFailed': 'Could not copy',
    'teacher.reports.classGrid.proNudge': 'Pro: scheduled weekly email reports',
    'teacher.reports.classGrid.summaryDue': 'Assignments due',
    'teacher.reports.classGrid.summaryCompleted': 'Completed',
    'teacher.reports.classGrid.summaryTopWords': 'Top words',
    'teacher.reports.classGrid.summaryAttention': 'Needs attention',
    'teacher.reports.classGrid.summaryNone': 'none',
    'teacher.reports.classGrid.summaryMissing': '{{name}} ({{count}} missing)',
    'teacher.reports.assignmentProgress.untitled': 'Untitled',
    'teacher.reports.assignmentProgress.anonymousStudent': 'Student {{id}}',
    'teacher.reports.columns.student': 'Student',
  };
  function stableT(key: string, params?: Record<string, string | number>) {
    let value = translations[key] || key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(`{{${k}}}`, String(v));
      }
    }
    return value;
  }
  return { stableT };
});

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: stableT,
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('@/lib/supabase/education/classrooms', () => ({
  getClassroomStudents: vi.fn(async () => ({
    data: [
      { student_id: 's1', profiles: { display_name: 'Ada', username: null } },
      { student_id: 's2', profiles: { display_name: 'Ben', username: null } },
    ],
    error: null,
  })),
}));

vi.mock('@/lib/supabase/education/assignments', () => ({
  getClassroomAssignments: vi.fn(async () => ({
    data: [
      { id: 'a1', title: 'Week 1 nouns', due_date: '2026-10-06', vocabulary_lessons: null },
      { id: 'a2', title: 'Old verbs', due_date: '2026-09-01', vocabulary_lessons: null },
    ],
    error: null,
  })),
  getAssignmentCompletions: vi.fn(async (assignmentId: string) => {
    if (assignmentId !== 'a1') return { data: [], error: null };
    return {
      data: [
        {
          id: 'row1',
          student_id: 's1',
          assignment_id: 'a1',
          words_attempted: {
            cat: { attempts: 3, correct: 2 },
            abandon: { attempts: 1, correct: 1 },
          },
          words_mastered: ['cat'],
          completed_at: '2026-10-06T00:00:00.000Z',
        },
      ],
      error: null,
    };
  }),
}));

import { ClassAssignmentGrid } from '../ClassAssignmentGrid';

describe('ClassAssignmentGrid', () => {
  beforeEach(() => {
    trackProgressReportViewed.mockClear();
    trackWeeklySummaryCopied.mockClear();
    writeText.mockReset().mockResolvedValue(undefined);
    proState.hasPro = false;
    proState.loading = false;
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders a students × assignments grid with status, best word and score', async () => {
    render(<ClassAssignmentGrid classroomId="c1" classroomName="English 101" />);

    expect(await screen.findByRole('columnheader', { name: 'Week 1 nouns' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Old verbs' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Ada' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Ben' })).toBeInTheDocument();

    const cells = screen.getAllByTestId('class-progress-cell');
    const adaThisWeek = cells.find(
      (cell) => cell.getAttribute('data-student') === 's1' && cell.getAttribute('data-assignment') === 'a1',
    );
    const benThisWeek = cells.find(
      (cell) => cell.getAttribute('data-student') === 's2' && cell.getAttribute('data-assignment') === 'a1',
    );
    expect(adaThisWeek).toHaveAttribute('data-status', 'completed');
    expect(adaThisWeek).toHaveTextContent('Completed');
    expect(adaThisWeek).toHaveTextContent('abandon');
    expect(adaThisWeek).toHaveTextContent('75');
    expect(benThisWeek).toHaveAttribute('data-status', 'missing');
    expect(benThisWeek).toHaveTextContent('Missing');
    expect(benThisWeek).toHaveTextContent('—');
    expect(benThisWeek).not.toHaveTextContent('abandon');
  });

  it('fires progress_report_viewed with the class id once the grid is on screen', async () => {
    render(<ClassAssignmentGrid classroomId="c1" classroomName="English 101" />);
    await screen.findByTestId('weekly-summary');
    await waitFor(() => expect(trackProgressReportViewed).toHaveBeenCalledWith('c1'));
    expect(trackWeeklySummaryCopied).not.toHaveBeenCalled();
  });

  it('copies a weekly summary and fires weekly_summary_copied with the class id', async () => {
    render(<ClassAssignmentGrid classroomId="c1" classroomName="English 101" />);
    const summary = await screen.findByTestId('weekly-summary');
    expect(summary.textContent).toBe(
      [
        'English 101',
        'Assignments due: 1 · Completed: 0',
        'Top words: abandon',
        'Needs attention: Ben (1 missing)',
      ].join('\n'),
    );
    expect(summary.textContent).not.toContain('Old verbs');

    await userEvent.click(screen.getByTestId('weekly-summary-copy'));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(summary.textContent));
    expect(trackWeeklySummaryCopied).toHaveBeenCalledWith('c1');
    expect(screen.getByTestId('weekly-summary-copy')).toHaveTextContent('Copied');
  });

  it('does not fire weekly_summary_copied when the clipboard rejects', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    render(<ClassAssignmentGrid classroomId="c1" classroomName="English 101" />);
    await screen.findByTestId('weekly-summary');
    await userEvent.click(screen.getByTestId('weekly-summary-copy'));
    expect(await screen.findByText('Could not copy')).toBeInTheDocument();
    expect(trackWeeklySummaryCopied).not.toHaveBeenCalled();
  });

  it('links a free teacher to the existing upgrade page and hides the nudge for Pro', async () => {
    const { rerender } = render(<ClassAssignmentGrid classroomId="c1" classroomName="English 101" />);
    const nudge = await screen.findByTestId('class-grid-pro-nudge');
    expect(nudge).toHaveAttribute('href', '/en/teacher/upgrade');
    expect(nudge).toHaveTextContent('Pro: scheduled weekly email reports');

    proState.hasPro = true;
    rerender(<ClassAssignmentGrid classroomId="c1" classroomName="English 101" />);
    expect(screen.queryByTestId('class-grid-pro-nudge')).not.toBeInTheDocument();
  });
});
