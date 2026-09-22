import { describe, it, expect } from 'vitest';
import {
  buildAssignmentProgressRows,
  assignmentProgressToCsv,
} from '../assignmentProgressReport';

const students = [
  { studentId: 's1', name: 'Ada' },
  { studentId: 's2', name: 'Ben' },
];

const assignments = [
  { id: 'a1', title: 'Week 1 nouns' },
  { id: 'a2', title: 'Week 2 verbs' },
];

const CSV_LABELS = {
  student: 'Student',
  assignment: 'Assignment',
  status: 'Status',
  score: 'Score',
  accuracy: 'Accuracy',
  completedAt: 'Completed at',
  completed: 'Completed',
  missing: 'Missing',
};

describe('buildAssignmentProgressRows', () => {
  it('marks every student/assignment pair completed or missing', () => {
    const rows = buildAssignmentProgressRows({
      students,
      assignments,
      completions: [
        { assignmentId: 'a1', studentId: 's1', score: 12, accuracy: 80, completedAt: '2026-09-01T00:00:00.000Z' },
      ],
    });

    expect(rows).toHaveLength(4);
    const adaWeek1 = rows.find((r) => r.studentId === 's1' && r.assignmentId === 'a1');
    expect(adaWeek1).toMatchObject({
      studentName: 'Ada',
      assignmentTitle: 'Week 1 nouns',
      status: 'completed',
      score: 12,
      accuracy: 80,
      completedAt: '2026-09-01T00:00:00.000Z',
    });
    const benWeek1 = rows.find((r) => r.studentId === 's2' && r.assignmentId === 'a1');
    expect(benWeek1?.status).toBe('missing');
    expect(benWeek1?.score).toBeNull();
  });

  it('keeps score/accuracy null when the completion has no word-level score', () => {
    const rows = buildAssignmentProgressRows({
      students: [{ studentId: 's1', name: 'Ada' }],
      assignments: [{ id: 'a1', title: 'Drill' }],
      completions: [{ assignmentId: 'a1', studentId: 's1', completedAt: '2026-09-01T00:00:00.000Z' }],
    });
    expect(rows[0]).toMatchObject({ status: 'completed', score: null, accuracy: null });
  });

  it('returns an empty list when there are no assignments or no students', () => {
    expect(buildAssignmentProgressRows({ students, assignments: [], completions: [] })).toEqual([]);
    expect(buildAssignmentProgressRows({ students: [], assignments, completions: [] })).toEqual([]);
  });
});

describe('assignmentProgressToCsv', () => {
  it('emits a header plus one row per student/assignment with RFC4180 quoting', () => {
    const rows = buildAssignmentProgressRows({
      students: [{ studentId: 's1', name: 'Ada, "the first"' }],
      assignments: [{ id: 'a1', title: 'Week 1, nouns' }],
      completions: [{ assignmentId: 'a1', studentId: 's1', score: 9, accuracy: 90, completedAt: '2026-09-01T00:00:00.000Z' }],
    });
    const csv = assignmentProgressToCsv(rows, CSV_LABELS);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('Student,Assignment,Status,Score,Accuracy,Completed at');
    expect(lines[1]).toBe('"Ada, ""the first""","Week 1, nouns",Completed,9,90,2026-09-01T00:00:00.000Z');
  });

  it('leaves score/accuracy blank for missing work', () => {
    const rows = buildAssignmentProgressRows({
      students: [{ studentId: 's1', name: 'Ada' }],
      assignments: [{ id: 'a1', title: 'Drill' }],
      completions: [],
    });
    const csv = assignmentProgressToCsv(rows, CSV_LABELS);
    expect(csv.split('\n')[1]).toBe('Ada,Drill,Missing,,,');
  });
});
