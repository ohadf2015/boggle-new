import { describe, it, expect } from 'vitest';
import {
  assignmentDueState,
  pickTeacherAssignmentReminders,
  reminderSendRows,
  reportsUrl,
  DUE_SOON_WINDOW_MS,
  OVERDUE_MAX_AGE_MS,
} from '../assignmentDueReminders';

const NOW = Date.parse('2026-10-11T12:00:00.000Z');

const assignment = {
  id: 'a1',
  classroomId: 'c1',
  classroomName: 'Year 7',
  teacherId: 't1',
  lessonId: 'l1',
  title: 'Week 3 nouns',
  dueDate: new Date(NOW + 6 * 60 * 60 * 1000).toISOString(),
};

const roster = [
  { classroomId: 'c1', studentId: 's1' },
  { classroomId: 'c1', studentId: 's2' },
];

describe('assignmentDueState', () => {
  it('returns none without a due date', () => {
    expect(assignmentDueState(null, NOW)).toBe('none');
    expect(assignmentDueState('not-a-date', NOW)).toBe('none');
  });

  it('returns due_soon inside the 24h window and overdue after', () => {
    expect(assignmentDueState(new Date(NOW + DUE_SOON_WINDOW_MS).toISOString(), NOW)).toBe('due_soon');
    expect(assignmentDueState(new Date(NOW + DUE_SOON_WINDOW_MS + 1).toISOString(), NOW)).toBe('none');
    expect(assignmentDueState(new Date(NOW - 1).toISOString(), NOW)).toBe('overdue');
  });
});

describe('pickTeacherAssignmentReminders', () => {
  it('plans a due-soon nudge for incomplete roster students', () => {
    const plans = pickTeacherAssignmentReminders({
      now: NOW,
      assignments: [assignment],
      memberships: roster,
      completions: [{ assignmentId: 'a1', studentId: 's1' }],
      alreadySent: [],
    });
    expect(plans).toHaveLength(1);
    expect(plans[0].dueSoon).toEqual([
      expect.objectContaining({ assignmentId: 'a1', missingCount: 1, kind: 'due_soon' }),
    ]);
    expect(plans[0].overdue).toEqual([]);
  });

  it('plans an overdue nudge that the progress-report email can deep-link', () => {
    const overdue = {
      ...assignment,
      dueDate: new Date(NOW - 2 * 60 * 60 * 1000).toISOString(),
    };
    const plans = pickTeacherAssignmentReminders({
      now: NOW,
      assignments: [overdue],
      memberships: roster,
      completions: [],
      alreadySent: [],
    });
    expect(plans[0].overdue[0]).toMatchObject({
      assignmentId: 'a1',
      classroomId: 'c1',
      missingCount: 2,
      kind: 'overdue',
    });
    expect(reportsUrl('he', plans[0].overdue[0].classroomId)).toBe(
      'https://www.lexiclash.live/he/teacher/reports?classroomId=c1',
    );
  });

  it('skips fully completed assignments and already-sent kinds', () => {
    expect(
      pickTeacherAssignmentReminders({
        now: NOW,
        assignments: [assignment],
        memberships: roster,
        completions: [
          { assignmentId: 'a1', studentId: 's1' },
          { assignmentId: 'a1', studentId: 's2' },
        ],
        alreadySent: [],
      }),
    ).toEqual([]);

    expect(
      pickTeacherAssignmentReminders({
        now: NOW,
        assignments: [assignment],
        memberships: roster,
        completions: [],
        alreadySent: [{ assignmentId: 'a1', recipientId: 't1', kind: 'due_soon' }],
      }),
    ).toEqual([]);
  });

  it('does not nag overdue work older than OVERDUE_MAX_AGE_MS', () => {
    const stale = {
      ...assignment,
      dueDate: new Date(NOW - OVERDUE_MAX_AGE_MS - 1000).toISOString(),
    };
    expect(
      pickTeacherAssignmentReminders({
        now: NOW,
        assignments: [stale],
        memberships: roster,
        completions: [],
        alreadySent: [],
      }),
    ).toEqual([]);
  });

  it('reminderSendRows matches the planned assignment/kind pairs', () => {
    const overdue = {
      ...assignment,
      id: 'a2',
      dueDate: new Date(NOW - 1000).toISOString(),
    };
    const plans = pickTeacherAssignmentReminders({
      now: NOW,
      assignments: [assignment, overdue],
      memberships: roster,
      completions: [],
      alreadySent: [],
    });
    expect(reminderSendRows(plans[0])).toEqual([
      { assignmentId: 'a1', recipientId: 't1', kind: 'due_soon' },
      { assignmentId: 'a2', recipientId: 't1', kind: 'overdue' },
    ]);
  });
});
