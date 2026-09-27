import React from 'react';
import { render, screen } from '@testing-library/react';

/**
 * Regression coverage for the always-empty score/accuracy column.
 *
 * Unlike AssignmentProgressReport.test.tsx, this file does NOT mock
 * `../ReportChrome` — `useReportData` runs for real, so the component's own
 * `load()` callback executes and actually maps a raw `student_lesson_progress`
 * row into a report row. The fixture below is shaped like the REAL table
 * (see fe-next/supabase/migrations/056_teacher_vocabulary_builder.sql +
 * 062_education_xp_tracking.sql): no `score`/`accuracy` columns exist, only
 * `words_attempted` (jsonb) and `completed_at`. The old code read
 * `c.score`/`c.accuracy` off this row, which are always `undefined` on the
 * real table, so the column was always blank.
 */

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => ({ hasPro: true, loading: false }),
}));

// `t` MUST be a stable function reference across renders: the component's
// `load` is a `useCallback` that depends on `t`, and `useReportData` (the
// REAL implementation here, unlike AssignmentProgressReport.test.tsx which
// mocks it away) re-runs its data-fetch effect whenever `load`'s identity
// changes. A `t` recreated inside `useLanguage()` on every call gives `load`
// a new identity every render -> infinite effect loop -> OOM crash.
const { stableT } = vi.hoisted(() => {
  const translations: Record<string, string> = {
    'teacher.reports.assignmentProgress.title': 'Assignment progress',
    'teacher.reports.assignmentProgress.empty': 'No assignments in this classroom yet',
    'teacher.reports.assignmentProgress.statusCompleted': 'Completed',
    'teacher.reports.assignmentProgress.statusMissing': 'Missing',
    'teacher.reports.assignmentProgress.exportCsv': 'Export CSV',
    'teacher.reports.assignmentProgress.exportCsvPro': 'Export CSV with Teacher Pro {{price}}',
    'teacher.reports.assignmentProgress.fileName': '{{name}} – assignment progress',
    'teacher.reports.assignmentProgress.untitled': 'Untitled',
    'teacher.reports.assignmentProgress.anonymousStudent': 'Student {{id}}',
    'teacher.reports.columns.student': 'Student',
    'teacher.reports.columns.assignment': 'Assignment',
    'teacher.reports.columns.status': 'Status',
    'teacher.reports.columns.score': 'Score',
    'teacher.reports.columns.accuracy': 'Accuracy',
    'teacher.reports.columns.completedAt': 'Completed at',
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

vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: vi.fn(),
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
    data: [{ id: 'a1', title: 'Week 1 nouns', vocabulary_lessons: null }],
    error: null,
  })),
  // Real shape of a `student_lesson_progress` row (056 + 062 migrations):
  // id, student_id, lesson_id, assignment_id, words_attempted (jsonb),
  // words_mastered (text[]), started_at, completed_at, total_xp,
  // current_level, current_streak, longest_streak, last_practice_date,
  // total_practice_sessions. There is no `score` or `accuracy` column.
  getAssignmentCompletions: vi.fn(async () => ({
    data: [
      {
        id: 'row1',
        student_id: 's1',
        lesson_id: 'l1',
        assignment_id: 'a1',
        words_attempted: {
          cat: { attempts: 3, correct: 2, lastAttemptAt: '2026-09-01T00:00:00.000Z' },
          dog: { attempts: 1, correct: 1, lastAttemptAt: '2026-09-01T00:00:00.000Z' },
        },
        words_mastered: ['dog'],
        started_at: '2026-08-31T00:00:00.000Z',
        completed_at: '2026-09-01T00:00:00.000Z',
        total_xp: 40,
        current_level: 2,
        current_streak: 1,
        longest_streak: 3,
        last_practice_date: '2026-09-01',
        total_practice_sessions: 5,
        profiles: { display_name: 'Ada', avatar_emoji: null },
      },
    ],
    error: null,
  })),
}));

import { AssignmentProgressReport } from '../AssignmentProgressReport';

describe('AssignmentProgressReport reading the real student_lesson_progress columns', () => {
  it('derives a score/accuracy percentage from words_attempted instead of showing a blank column forever', async () => {
    render(<AssignmentProgressReport classroomId="c1" classroomName="English 101" />);

    // 2 correct + 1 correct = 3 correct out of 3 + 1 = 4 attempts => 75%.
    expect(await screen.findByText('75')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('shows an em-dash, never 0, for a student with no completion at all', async () => {
    render(<AssignmentProgressReport classroomId="c1" classroomName="English 101" />);

    await screen.findByText('Ben');
    const benRow = screen.getByText('Ben').closest('tr');
    expect(benRow).not.toBeNull();
    expect(benRow!.textContent).toContain('—');
    expect(benRow!.textContent).not.toMatch(/[^0-9]0(%|\s|$)/);
  });
});
