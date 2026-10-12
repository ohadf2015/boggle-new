import { describe, it, expect } from 'vitest';
import {
  buildClassroomRosterProgress,
  countRosterAssignmentProgress,
  resolveJoinFunnelStatus,
  hasRealProfileName,
  type RosterStudentInput,
} from '../classroomRosterProgress';
import type { AssignmentProgressRow } from '../assignmentProgressReport';

const student = (overrides: Partial<RosterStudentInput> = {}): RosterStudentInput => ({
  studentId: 's1',
  name: 'Sam',
  joinedAt: '2026-10-01T09:00:00.000Z',
  displayName: null,
  username: null,
  ...overrides,
});

describe('hasRealProfileName', () => {
  it('accepts a real display_name even when username is the DB placeholder', () => {
    expect(
      hasRealProfileName({ displayName: 'Victoria Delong', username: 'Player_570b3674' }),
    ).toBe(true);
  });

  it('accepts a real username when display_name is missing', () => {
    expect(hasRealProfileName({ displayName: null, username: 'sam_w' })).toBe(true);
  });

  it('rejects the Player_xxxxxxxx DB placeholder in any case', () => {
    expect(hasRealProfileName({ displayName: null, username: 'Player_570b3674' })).toBe(false);
    expect(hasRealProfileName({ displayName: 'player_9abcdef0', username: null })).toBe(false);
  });

  it('requires exactly 8 hex chars — Player_123 is a chosen handle, not the default', () => {
    expect(hasRealProfileName({ displayName: null, username: 'Player_123' })).toBe(true);
  });

  it('rejects missing and blank profiles', () => {
    expect(hasRealProfileName({ displayName: null, username: null })).toBe(false);
    expect(hasRealProfileName({ displayName: '   ', username: '' })).toBe(false);
  });
});

describe('resolveJoinFunnelStatus', () => {
  it('signed_in wins on a real profile name even without practice', () => {
    expect(
      resolveJoinFunnelStatus(
        student({ displayName: 'Priya' }),
        null,
      ),
    ).toBe('signed_in');
  });

  it('guest when guest-like and practiced', () => {
    expect(
      resolveJoinFunnelStatus(
        student({ username: 'Player_570b3674' }),
        '2026-10-10T09:00:00.000Z',
      ),
    ).toBe('guest');
  });

  it('joined_idle when guest-like, on the roster, and never practiced', () => {
    expect(
      resolveJoinFunnelStatus(
        student({ username: 'Player_570b3674' }),
        null,
      ),
    ).toBe('joined_idle');
  });

  it('falls back to guest for a guest-like row with neither join nor practice data', () => {
    expect(resolveJoinFunnelStatus(student({ joinedAt: null }), null)).toBe('guest');
  });
});

describe('buildClassroomRosterProgress', () => {
  it('returns an empty list for an empty roster', () => {
    expect(buildClassroomRosterProgress({ students: [] })).toEqual([]);
  });

  it('defaults missing counts and practice to 0/0 and lastActiveAt = joinedAt', () => {
    const rows = buildClassroomRosterProgress({
      students: [student({ username: 'Player_570b3674' })],
    });
    expect(rows).toEqual([
      {
        studentId: 's1',
        name: 'Sam',
        completedAssignments: 0,
        totalAssignments: 0,
        lastActiveAt: '2026-10-01T09:00:00.000Z',
        joinFunnelStatus: 'joined_idle',
      },
    ]);
  });

  it('uses lastPracticeDate over joinedAt for lastActiveAt', () => {
    const rows = buildClassroomRosterProgress({
      students: [student({ displayName: 'Priya' })],
      lastPractice: [{ studentId: 's1', lastPracticeDate: '2026-10-11T09:00:00.000Z' }],
    });
    expect(rows[0].lastActiveAt).toBe('2026-10-11T09:00:00.000Z');
    expect(rows[0].joinFunnelStatus).toBe('signed_in');
  });

  it('maps per-student assignment counts through', () => {
    const rows = buildClassroomRosterProgress({
      students: [student({ displayName: 'Priya' })],
      assignmentCounts: [{ studentId: 's1', assignmentCount: 4, completedCount: 2 }],
    });
    expect(rows[0]).toMatchObject({ completedAssignments: 2, totalAssignments: 4 });
  });

  it('sorts joined_idle first, then guest, then signed_in; stale first within a group', () => {
    const rows = buildClassroomRosterProgress({
      students: [
        student({ studentId: 'signed-recent', name: 'Signed Recent', displayName: 'A', joinedAt: '2026-10-11T09:00:00.000Z' }),
        student({ studentId: 'idle-stale', name: 'Idle Stale', username: 'Player_11111111', joinedAt: '2026-09-01T09:00:00.000Z' }),
        student({ studentId: 'signed-stale', name: 'Signed Stale', displayName: 'B', joinedAt: '2026-09-15T09:00:00.000Z' }),
        student({ studentId: 'guest-stale', name: 'Guest Stale', username: 'Player_22222222', joinedAt: '2026-10-05T09:00:00.000Z' }),
        student({ studentId: 'idle-recent', name: 'Idle Recent', username: 'Player_33333333', joinedAt: '2026-10-10T09:00:00.000Z' }),
        student({ studentId: 'guest-recent', name: 'Guest Recent', username: 'Player_44444444', joinedAt: '2026-10-12T09:00:00.000Z' }),
      ],
      lastPractice: [
        { studentId: 'guest-stale', lastPracticeDate: '2026-10-06T09:00:00.000Z' },
        { studentId: 'signed-stale', lastPracticeDate: '2026-09-16T09:00:00.000Z' },
        { studentId: 'guest-recent', lastPracticeDate: '2026-10-12T09:00:00.000Z' },
        { studentId: 'signed-recent', lastPracticeDate: '2026-10-11T09:00:00.000Z' },
      ],
    });
    expect(rows.map((r) => r.studentId)).toEqual([
      'idle-stale',
      'idle-recent',
      'guest-stale',
      'guest-recent',
      'signed-stale',
      'signed-recent',
    ]);
  });

  it('sinks rows with no lastActiveAt to the bottom of their group', () => {
    const rows = buildClassroomRosterProgress({
      students: [
        student({ studentId: 'no-dates', name: 'No Dates', joinedAt: null }),
        student({ studentId: 'with-join', name: 'With Join', username: 'Player_55555555', joinedAt: '2026-10-02T09:00:00.000Z' }),
      ],
    });
    expect(rows.map((r) => r.studentId)).toEqual(['with-join', 'no-dates']);
  });
});

describe('countRosterAssignmentProgress', () => {
  const row = (studentId: string, status: AssignmentProgressRow['status']): AssignmentProgressRow => ({
    studentId,
    studentName: studentId,
    assignmentId: `a-${studentId}-${status}`,
    assignmentTitle: 'A',
    status,
    score: null,
    accuracy: null,
    completedAt: null,
  });

  it('counts total and completed per student across all assignments', () => {
    const counts = countRosterAssignmentProgress([
      row('s1', 'completed'),
      row('s1', 'missing'),
      row('s1', 'overdue'),
      row('s2', 'completed'),
    ]);
    expect(counts).toEqual([
      { studentId: 's1', assignmentCount: 3, completedCount: 1 },
      { studentId: 's2', assignmentCount: 1, completedCount: 1 },
    ]);
  });

  it('omits students with no progress rows (they render as 0/0 via the model default)', () => {
    expect(countRosterAssignmentProgress([])).toEqual([]);
  });
});
