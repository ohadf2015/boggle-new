import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const proState = {
  hasPro: false,
  loading: false,
};

const studentsState: { data: unknown[]; error: { message: string } | null } = {
  data: [],
  error: null,
};

const practiceState: { data: unknown[]; error: { message: string } | null } = {
  data: [],
  error: null,
};

const assignmentsState: { data: unknown[]; error: { message: string } | null } = {
  data: [],
  error: null,
};

/** assignmentId → student_lesson_progress rows returned by getAssignmentCompletions. */
let completionBatches: Record<string, unknown[]> = {};

// Stable t: a fresh identity per render would retrigger useReportData's effect
// on every render and spin forever, so the dictionary lives at module scope.
const translations: Record<string, string> = {
  'teacher.reports.rosterProgress.title': 'Roster progress',
  'teacher.reports.rosterProgress.columns.student': 'Student',
  'teacher.reports.rosterProgress.columns.completion': 'Assignments',
  'teacher.reports.rosterProgress.columns.averageScore': 'Avg score',
  'teacher.reports.rosterProgress.columns.lastActive': 'Last active',
  'teacher.reports.rosterProgress.columns.joinStatus': 'Join status',
  'teacher.reports.rosterProgress.status.signed_in': 'Signed in',
  'teacher.reports.rosterProgress.status.guest': 'Guest',
  'teacher.reports.rosterProgress.status.joined_idle': 'Joined, not practiced',
  'teacher.reports.rosterProgress.completion': '{{completed}}/{{total}}',
  'teacher.reports.rosterProgress.averageScore': '{{score}}%',
  'teacher.reports.rosterProgress.averageScoreEmpty': '—',
  'teacher.reports.rosterProgress.upgrade': 'Teacher Pro {{price}} — more per-student detail',
  'teacher.reports.rosterProgress.never': 'Never',
  'teacher.reports.rosterProgress.parentShare.title': 'Share with parents',
  'teacher.reports.rosterProgress.parentShare.generated': 'Progress as of {{date}}',
  'teacher.reports.rosterProgress.parentShare.print': 'Print parent summary',
  'teacher.reports.rosterProgress.parentShare.copy': 'Copy parent summary',
  'teacher.reports.rosterProgress.parentShare.copied': 'Copied',
  'teacher.reports.rosterProgress.parentShare.upgrade': 'Print a parent summary with Teacher Pro {{price}}',
  'teacher.reports.rosterProgress.parentShare.footer': 'LexiClash classroom progress.',
  'teacher.reports.title': 'Reports',
  'teacher.reports.assignmentProgress.untitled': 'Untitled lesson',
  'teacher.reports.assignmentProgress.anonymousStudent': 'Student {{id}}',
  'teacher.reports.loading': 'Loading report…',
  'teacher.reports.error': 'Couldn’t load the report',
  'teacher.reports.retry': 'Retry',
  'education.analytics.today': 'Today',
  'education.analytics.yesterday': 'Yesterday',
  'education.analytics.daysAgo': '{{count}}d ago',
};

const t = (key: string, params?: Record<string, string | number>) => {
  let value = translations[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(`{{${k}}}`, String(v));
    }
  }
  return value;
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
  useLanguage: () => ({ t, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/lib/supabase/education/classrooms', () => ({
  getClassroomStudents: vi.fn(() => Promise.resolve(studentsState)),
}));

vi.mock('@/lib/supabase/analytics', () => ({
  getStudentsProgressSummary: vi.fn(() => Promise.resolve(practiceState)),
}));

vi.mock('@/lib/supabase/education/assignments', () => ({
  getClassroomAssignments: vi.fn(() => Promise.resolve(assignmentsState)),
  getAssignmentCompletions: vi.fn((assignmentId: string) =>
    Promise.resolve({ data: completionBatches[assignmentId] ?? [], error: null }),
  ),
}));

vi.mock('@/lib/education/telemetry', () => ({
  trackTeacherRosterProgressUpgradeClicked: vi.fn(),
  trackTeacherRosterParentSharePrinted: vi.fn(),
}));

import { getClassroomStudents } from '@/lib/supabase/education/classrooms';
import { getStudentsProgressSummary } from '@/lib/supabase/analytics';
import { getClassroomAssignments, getAssignmentCompletions } from '@/lib/supabase/education/assignments';
import { trackTeacherRosterProgressUpgradeClicked, trackTeacherRosterParentSharePrinted } from '@/lib/education/telemetry';
import { ClassroomRosterProgress } from '../ClassroomRosterProgress';

const todayIso = () => new Date().toISOString().split('T')[0];
const yesterdayIso = () => new Date(Date.now() - 86400000).toISOString().split('T')[0];

const rosterStudent = (id: string, profile: { display_name?: string; username?: string } | null, joinedAt: string) => ({
  id: `m-${id}`,
  student_id: id,
  classroom_id: 'c1',
  joined_at: joinedAt,
  level: 'core',
  profiles: profile,
});

describe('ClassroomRosterProgress', () => {
  beforeEach(() => {
    proState.hasPro = false;
    proState.loading = false;
    studentsState.data = [];
    studentsState.error = null;
    practiceState.data = [];
    practiceState.error = null;
    assignmentsState.data = [];
    assignmentsState.error = null;
    completionBatches = {};
    vi.clearAllMocks();
  });

  it('renders one row per student, sorted joined_idle → guest → signed_in', async () => {
    studentsState.data = [
      rosterStudent('sA', { display_name: 'Priya', username: 'Player_570b3674' }, '2026-10-01T09:00:00.000Z'),
      rosterStudent('sB', { display_name: null, username: 'Player_570b3674' }, '2026-10-02T09:00:00.000Z'),
      rosterStudent('sC', { display_name: null, username: 'Player_11111111' }, '2026-10-03T09:00:00.000Z'),
    ];
    practiceState.data = [
      { studentId: 'sA', lastPracticeDate: todayIso() },
      { studentId: 'sB', lastPracticeDate: yesterdayIso() },
    ];
    assignmentsState.data = [
      { id: 'a1', title: 'Nouns', due_date: null },
      { id: 'a2', title: 'Verbs', due_date: null },
    ];
    completionBatches = {
      a1: [
        { student_id: 'sA', words_attempted: [{ correct: true }], completed_at: todayIso() },
        { student_id: 'sB', words_attempted: [{ correct: true }], completed_at: todayIso() },
      ],
      a2: [{ student_id: 'sA', words_attempted: [{ correct: true }], completed_at: todayIso() }],
    };

    render(<ClassroomRosterProgress classroomId="c1" />);

    const section = await screen.findByTestId('classroom-roster-progress');
    expect(section).toHaveTextContent('Roster progress');

    const rows = screen.getAllByTestId('classroom-roster-row');
    expect(rows.map((r) => r.getAttribute('data-status'))).toEqual([
      'joined_idle',
      'guest',
      'signed_in',
    ]);
    // joined_idle (sC) leads with 0/2; guest (sB) is 1/2; signed_in (sA) is 2/2.
    expect(rows[0]).toHaveTextContent('0/2');
    expect(rows[1]).toHaveTextContent('1/2');
    expect(rows[2]).toHaveTextContent('2/2');
    // sC has no usable profile name, so the anonymous fallback carries it.
    expect(rows[0]).toHaveTextContent('Student sC');
    expect(rows[2]).toHaveTextContent('Priya');
  });

  it('shows completion, last-active and join-status per row', async () => {
    studentsState.data = [
      rosterStudent('sA', { display_name: 'Priya' }, '2026-10-01T09:00:00.000Z'),
      rosterStudent('sB', { display_name: null, username: 'Player_22222222' }, '2026-10-02T09:00:00.000Z'),
      rosterStudent('sC', { display_name: null, username: 'Player_11111111' }, yesterdayIso()),
      rosterStudent('sX', { display_name: null, username: 'Player_33333333' }, null),
    ];
    practiceState.data = [
      { studentId: 'sA', lastPracticeDate: todayIso() },
      { studentId: 'sB', lastPracticeDate: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0] },
    ];
    assignmentsState.data = [{ id: 'a1', title: 'Nouns', due_date: null }];
    completionBatches = {
      a1: [{ student_id: 'sA', words_attempted: [{ correct: true }], completed_at: todayIso() }],
    };

    render(<ClassroomRosterProgress classroomId="c1" />);

    const rows = await screen.findAllByTestId('classroom-roster-row');
    expect(rows).toHaveLength(4);

    // joined_idle leads; "last active" falls back to the join date.
    const idle = rows[0];
    expect(idle).toHaveAttribute('data-status', 'joined_idle');
    expect(idle).toHaveTextContent('0/1');
    expect(idle).toHaveTextContent('Yesterday');
    expect(idle).toHaveTextContent('Joined, not practiced');

    // guest group next, stale first; sX has no dates at all and sinks + shows "Never".
    const guest = rows[1];
    expect(guest).toHaveAttribute('data-status', 'guest');
    expect(guest).toHaveTextContent('0/1');
    expect(guest).toHaveTextContent('5d ago');
    expect(guest).toHaveTextContent('Guest');

    const dateless = rows[2];
    expect(dateless).toHaveAttribute('data-status', 'guest');
    expect(dateless).toHaveTextContent('Never');

    // signed_in last, practiced today.
    const signedIn = rows[3];
    expect(signedIn).toHaveAttribute('data-status', 'signed_in');
    expect(signedIn).toHaveTextContent('1/1');
    expect(signedIn).toHaveTextContent('Today');
    expect(signedIn).toHaveTextContent('Signed in');
    expect(signedIn).toHaveTextContent('Priya');
  });

  it('renders nothing when the roster is empty', async () => {
    studentsState.data = [];
    render(<ClassroomRosterProgress classroomId="c1" />);
    await waitFor(() => {
      expect(screen.queryByTestId('classroom-roster-progress')).toBeNull();
      expect(screen.queryByText('Loading report…')).toBeNull();
    });
    expect(getStudentsProgressSummary).toHaveBeenCalledWith('c1');
    expect(getClassroomAssignments).toHaveBeenCalledWith('c1');
  });

  it('lands on the error state with retry when a loader fails', async () => {
    studentsState.error = { message: 'boom' };
    render(<ClassroomRosterProgress classroomId="c1" />);
    expect(await screen.findByText('Couldn’t load the report')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
    expect(screen.queryByTestId('classroom-roster-progress')).toBeNull();
  });

  it('shows one upgrade link to /en/teacher/upgrade for a free teacher and tracks the click', async () => {
    studentsState.data = [
      rosterStudent('sA', { display_name: 'Priya' }, '2026-10-01T09:00:00.000Z'),
    ];
    practiceState.data = [{ studentId: 'sA', lastPracticeDate: todayIso() }];

    render(<ClassroomRosterProgress classroomId="c1" />);

    const link = await screen.findByTestId('classroom-roster-upgrade');
    expect(link).toHaveAttribute('href', '/en/teacher/upgrade');
    expect(link).toHaveTextContent('Teacher Pro $9');

    await userEvent.click(link);
    expect(trackTeacherRosterProgressUpgradeClicked).toHaveBeenCalledWith({ classroomId: 'c1' });
  });

  it('hides the upgrade link for Pro teachers and while entitlement loads', async () => {
    studentsState.data = [
      rosterStudent('sA', { display_name: 'Priya' }, '2026-10-01T09:00:00.000Z'),
    ];
    practiceState.data = [{ studentId: 'sA', lastPracticeDate: todayIso() }];

    proState.hasPro = true;
    const { unmount } = render(<ClassroomRosterProgress classroomId="c1" />);
    await screen.findByTestId('classroom-roster-progress');
    expect(screen.queryByTestId('classroom-roster-upgrade')).toBeNull();
    unmount();

    proState.hasPro = false;
    proState.loading = true;
    render(<ClassroomRosterProgress classroomId="c1" />);
    await screen.findByTestId('classroom-roster-progress');
    expect(screen.queryByTestId('classroom-roster-upgrade')).toBeNull();
  });

  it('loads the roster through the existing education helpers', async () => {
    studentsState.data = [
      rosterStudent('sA', { display_name: 'Priya' }, '2026-10-01T09:00:00.000Z'),
    ];
    practiceState.data = [{ studentId: 'sA', lastPracticeDate: todayIso() }];

    render(<ClassroomRosterProgress classroomId="c1" />);

    await screen.findByTestId('classroom-roster-progress');
    expect(getClassroomStudents).toHaveBeenCalledWith('c1');
    expect(getStudentsProgressSummary).toHaveBeenCalledWith('c1');
    expect(getClassroomAssignments).toHaveBeenCalledWith('c1');
    expect(getAssignmentCompletions).not.toHaveBeenCalled(); // no assignments in this class
  });

  it('shows average score on each row (percent or em dash)', async () => {
    studentsState.data = [
      rosterStudent('sA', { display_name: 'Priya' }, '2026-10-01T09:00:00.000Z'),
      rosterStudent('sC', { display_name: null, username: 'Player_11111111' }, '2026-10-03T09:00:00.000Z'),
    ];
    practiceState.data = [{ studentId: 'sA', lastPracticeDate: todayIso() }];
    assignmentsState.data = [{ id: 'a1', title: 'Nouns', due_date: null }];
    completionBatches = {
      a1: [{ student_id: 'sA', words_attempted: [{ correct: true }], completed_at: todayIso() }],
    };

    render(<ClassroomRosterProgress classroomId="c1" classroomName="Year 5" />);

    const rows = await screen.findAllByTestId('classroom-roster-row');
    const idle = rows.find((r) => r.getAttribute('data-status') === 'joined_idle');
    const signed = rows.find((r) => r.getAttribute('data-status') === 'signed_in');
    expect(idle).toHaveTextContent('—');
    expect(signed).toHaveTextContent('100%');
    expect(screen.getByTestId('classroom-roster-parent-print')).toHaveTextContent('Share with parents');
    expect(screen.getByTestId('classroom-roster-parent-print')).not.toHaveTextContent('Joined, not practiced');
  });

  it('offers a parent-share upgrade CTA to free teachers', async () => {
    studentsState.data = [
      rosterStudent('sA', { display_name: 'Priya' }, '2026-10-01T09:00:00.000Z'),
    ];
    practiceState.data = [{ studentId: 'sA', lastPracticeDate: todayIso() }];

    render(<ClassroomRosterProgress classroomId="c1" />);

    const link = await screen.findByTestId('classroom-roster-parent-share-upgrade');
    expect(link).toHaveAttribute('href', '/en/teacher/upgrade');
    expect(link).toHaveTextContent('Teacher Pro $9');
    expect(screen.queryByTestId('classroom-roster-parent-share')).toBeNull();
  });

  it('prints the parent summary for a Pro teacher and tracks it', async () => {
    studentsState.data = [
      rosterStudent('sA', { display_name: 'Priya' }, '2026-10-01T09:00:00.000Z'),
    ];
    practiceState.data = [{ studentId: 'sA', lastPracticeDate: todayIso() }];
    proState.hasPro = true;
    const print = vi.fn();
    window.print = print;

    render(<ClassroomRosterProgress classroomId="c1" classroomName="Year 5" />);

    await screen.findByTestId('classroom-roster-parent-share');
    expect(screen.queryByTestId('classroom-roster-parent-share-upgrade')).toBeNull();
    expect(screen.queryByTestId('classroom-roster-upgrade')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Print parent summary' }));
    expect(print).toHaveBeenCalledTimes(1);
    expect(trackTeacherRosterParentSharePrinted).toHaveBeenCalledWith({ classroomId: 'c1' });
  });

  it('Given a roster, Then each row starts with the shared avatar for that student', async () => {
    studentsState.data = [
      rosterStudent('sA', { display_name: 'Priya', username: 'p' }, '2026-10-01T09:00:00.000Z'),
      rosterStudent('sB', { display_name: 'Omar', username: 'o' }, '2026-10-02T09:00:00.000Z'),
    ];
    render(<ClassroomRosterProgress classroomId="c1" />);
    const rows = await screen.findAllByTestId('classroom-roster-row');
    for (const row of rows) {
      const avatar = within(row).getByTestId('avatar-lite');
      expect(['sA', 'sB']).toContain(avatar.getAttribute('data-user-id'));
    }
    expect(rows).toHaveLength(2);
  });
});
