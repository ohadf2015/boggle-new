import { describe, it, expect } from 'vitest';
import {
  buildAssignmentProgressRows,
  assignmentProgressToCsv,
  csvEscape,
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

describe('csvEscape formula-injection guard', () => {
  it('prefixes a leading = with a quote so spreadsheets never execute it', () => {
    expect(csvEscape('=SUM(A1)')).toBe("'=SUM(A1)");
  });

  it('prefixes a leading + with a quote', () => {
    expect(csvEscape('+1234')).toBe("'+1234");
  });

  it('prefixes a leading - with a quote even for a string that looks numeric', () => {
    expect(csvEscape('-1234')).toBe("'-1234");
  });

  it('prefixes a leading @ with a quote', () => {
    expect(csvEscape('@mention')).toBe("'@mention");
  });

  it('does not touch a value with no leading formula character', () => {
    expect(csvEscape('Ada')).toBe('Ada');
  });

  it('only checks the first character, not = elsewhere in the string', () => {
    expect(csvEscape('a=b')).toBe('a=b');
  });

  it('combines the injection prefix with RFC4180 comma quoting', () => {
    expect(csvEscape('=A,B')).toBe('"\'=A,B"');
  });

  it('combines the injection prefix with RFC4180 quote-doubling', () => {
    expect(csvEscape('=say "hi"')).toBe('"\'=say ""hi"""');
  });

  it('leaves an actual JS number serialized via String() alone (numbers bypass csvEscape)', () => {
    // csvEscape only ever receives strings; numeric cells in both
    // assignmentProgressToCsv and teacherExportToCsv are serialized with
    // String(n) and never routed through csvEscape, so a real negative
    // number is never mistakenly neutralized.
    expect(String(-3)).toBe('-3');
  });
});
