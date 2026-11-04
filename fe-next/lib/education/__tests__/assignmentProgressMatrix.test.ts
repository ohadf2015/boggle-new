import { describe, it, expect } from 'vitest';
import {
  buildAssignmentProgressMatrix,
  sortAssignmentsByDueDate,
} from '@/lib/education/assignmentProgressMatrix';
import { mapProgressRowToCompletion } from '@/lib/education/assignmentProgressReport';

const STUDENTS = [
  { studentId: 's1', name: 'Ada' },
  { studentId: 's2', name: 'Ben' },
];

describe('sortAssignmentsByDueDate', () => {
  it('orders by due date ascending, then created time, undated last', () => {
    const sorted = sortAssignmentsByDueDate([
      { id: 'a3', title: 'Undated', dueDate: null, createdAt: '2026-10-01T00:00:00Z' },
      { id: 'a2', title: 'Later', dueDate: '2026-10-09', createdAt: '2026-10-01T00:00:00Z' },
      { id: 'a1', title: 'Earlier', dueDate: '2026-10-02', createdAt: '2026-10-05T00:00:00Z' },
      { id: 'a4', title: 'Same day older', dueDate: '2026-10-02', createdAt: '2026-09-20T00:00:00Z' },
    ]);
    expect(sorted.map((a) => a.id)).toEqual(['a4', 'a1', 'a2', 'a3']);
  });

  it('does not mutate the input array', () => {
    const input = [
      { id: 'b', title: 'B', dueDate: '2026-10-09' },
      { id: 'a', title: 'A', dueDate: '2026-10-02' },
    ];
    sortAssignmentsByDueDate(input);
    expect(input.map((a) => a.id)).toEqual(['b', 'a']);
  });
});

describe('buildAssignmentProgressMatrix', () => {
  const ASSIGNMENTS = [
    { id: 'a1', title: 'First', dueDate: '2026-09-01' },
    { id: 'a2', title: 'Second', dueDate: '2026-10-01' },
    { id: 'a3', title: 'Third', dueDate: '2026-11-01' },
  ];

  it('builds one row per roster student with cells in due-date order', () => {
    const matrix = buildAssignmentProgressMatrix({
      students: STUDENTS,
      // Pass assignments scrambled: the builder owns the ordering.
      assignments: [ASSIGNMENTS[2], ASSIGNMENTS[0], ASSIGNMENTS[1]],
      completions: [{ assignmentId: 'a2', studentId: 's1', score: 80, completedAt: '2026-10-02T00:00:00Z' }],
    });
    expect(matrix.assignments.map((a) => a.id)).toEqual(['a1', 'a2', 'a3']);
    expect(matrix.rows).toHaveLength(2);

    const ada = matrix.rows[0];
    expect(ada.studentName).toBe('Ada');
    expect(ada.cells).toEqual([
      { completed: false, correctness: null },
      { completed: true, correctness: 80 },
      { completed: false, correctness: null },
    ]);

    const ben = matrix.rows[1];
    expect(ben.cells.every((c) => !c.completed && c.correctness === null)).toBe(true);
  });

  it('derives correctness the way the passback does: words_attempted, with completion credit when empty', () => {
    const withWords = mapProgressRowToCompletion('a1', {
      student_id: 's1',
      assignment_id: 'a1',
      completed_at: '2026-09-02T00:00:00Z',
      words_attempted: { cat: { attempts: 3, correct: 2 }, abandon: { attempts: 1, correct: 1 } },
    });
    // 3/4 correct = 75 — the same number the Google Classroom grade passback pushes.
    expect(withWords.score).toBe(75);

    const completionCredit = mapProgressRowToCompletion('a2', {
      student_id: 's1',
      assignment_id: 'a2',
      completed_at: '2026-10-02T00:00:00Z',
      words_attempted: null,
    });
    expect(completionCredit.score).toBe(100);

    const matrix = buildAssignmentProgressMatrix({
      students: [STUDENTS[0]],
      assignments: ASSIGNMENTS.slice(0, 2),
      completions: [withWords, completionCredit],
    });
    expect(matrix.rows[0].cells.map((c) => c.correctness)).toEqual([75, 100]);
  });

  it('trends up, down, flat from the last two scored assignments and none below two', () => {
    const trendFor = (scores: Array<number | null>) => {
      const matrix = buildAssignmentProgressMatrix({
        students: [STUDENTS[0]],
        assignments: ASSIGNMENTS,
        completions: scores.map((score, i) => ({
          assignmentId: ASSIGNMENTS[i].id,
          studentId: 's1',
          score,
          completedAt: score == null ? null : '2026-09-0' + (i + 1) + 'T00:00:00Z',
        })),
      });
      return matrix.rows[0].trend;
    };

    expect(trendFor([50, null, 80])).toBe('up'); // skips the unscored middle cell
    expect(trendFor([80, 70, 60])).toBe('down');
    expect(trendFor([70, 70])).toBe('flat');
    expect(trendFor([70])).toBe('none');
    expect(trendFor([null, null, null])).toBe('none');
  });
});
