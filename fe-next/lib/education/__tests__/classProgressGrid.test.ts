import { describe, it, expect } from 'vitest';
import {
  bestWordFromProgress,
  buildClassProgressGrid,
  buildWeeklySummary,
  classGridCompletionFromRow,
  formatWeeklySummary,
  type ClassGridAssignment,
  type ClassGridStudent,
  type WeeklySummaryLabels,
} from '../classProgressGrid';

/** Wednesday of the ISO week that starts Monday 2026-10-05. */
const NOW = Date.parse('2026-10-07T12:00:00.000Z');

const students: ClassGridStudent[] = [
  { id: 's1', name: 'Ada' },
  { id: 's2', name: 'Ben' },
];

const assignments: ClassGridAssignment[] = [
  { id: 'a1', title: 'Week 1 nouns', dueDate: '2026-10-06' },
  { id: 'a2', title: 'Old verbs', dueDate: '2026-09-01' },
];

const LABELS: WeeklySummaryLabels = {
  due: 'Assignments due',
  completed: 'Completed',
  topWords: 'Top words',
  attention: 'Needs attention',
  none: 'none',
  missing: (name, count) => `${name} (${count} missing)`,
};

describe('bestWordFromProgress', () => {
  it('picks the longest word the student got right, then code-unit order', () => {
    expect(
      bestWordFromProgress({
        words_attempted: {
          cat: { attempts: 3, correct: 2 },
          dog: { attempts: 1, correct: 0 },
          abandon: { attempts: 1, correct: 1 },
        },
        words_mastered: ['dog'],
      }),
    ).toBe('abandon');
  });

  it('breaks a length tie on code-unit order', () => {
    expect(
      bestWordFromProgress({
        words_attempted: {
          dog: { attempts: 1, correct: 1 },
          cat: { attempts: 1, correct: 1 },
        },
        words_mastered: [],
      }),
    ).toBe('cat');
  });

  it('falls back to mastered words when no attempt was correct', () => {
    expect(
      bestWordFromProgress({
        words_attempted: { cat: { attempts: 2, correct: 0 } },
        words_mastered: ['cat', 'elephant'],
      }),
    ).toBe('elephant');
  });

  it('is null when nothing was got right', () => {
    expect(
      bestWordFromProgress({
        words_attempted: { cat: { attempts: 1, correct: 0 } },
        words_mastered: [],
      }),
    ).toBeNull();
    expect(bestWordFromProgress({ words_attempted: null, words_mastered: null })).toBeNull();
  });
});

describe('classGridCompletionFromRow', () => {
  it('derives the same score the assignment list uses, plus the best word', () => {
    const completion = classGridCompletionFromRow('a1', {
      student_id: 's1',
      words_attempted: {
        cat: { attempts: 3, correct: 2 },
        dog: { attempts: 1, correct: 1 },
      },
      words_mastered: ['dog'],
      completed_at: '2026-10-06T00:00:00.000Z',
    });
    expect(completion).toEqual({
      assignmentId: 'a1',
      studentId: 's1',
      score: 75,
      bestWord: 'cat',
    });
  });
});

describe('buildClassProgressGrid', () => {
  it('builds a student × assignment cell with status, best word and best score', () => {
    const grid = buildClassProgressGrid({
      students,
      assignments,
      completions: [
        { assignmentId: 'a1', studentId: 's1', score: 40, bestWord: 'cat' },
        { assignmentId: 'a1', studentId: 's1', score: 90, bestWord: 'fig' },
        { assignmentId: 'a1', studentId: 's1', score: 80, bestWord: 'castle' },
      ],
    });

    expect(grid.cells).toHaveLength(2);
    expect(grid.cells[0]).toHaveLength(2);
    expect(grid.cells[0][0]).toEqual({ status: 'completed', score: 90, bestWord: 'fig' });
    expect(grid.cells[0][1]).toEqual({ status: 'missing', score: null, bestWord: null });
    expect(grid.cells[1][0]).toEqual({ status: 'missing', score: null, bestWord: null });
  });

  it('keeps the longer best word when scores tie', () => {
    const grid = buildClassProgressGrid({
      students: [students[0]],
      assignments: [assignments[0]],
      completions: [
        { assignmentId: 'a1', studentId: 's1', score: 80, bestWord: 'cat' },
        { assignmentId: 'a1', studentId: 's1', score: 80, bestWord: 'castle' },
      ],
    });
    expect(grid.cells[0][0]).toEqual({ status: 'completed', score: 80, bestWord: 'castle' });
  });

  it('ignores completions for students or assignments that are not on the grid', () => {
    const grid = buildClassProgressGrid({
      students: [students[0]],
      assignments: [assignments[0]],
      completions: [{ assignmentId: 'other', studentId: 's1', score: 10, bestWord: 'nope' }],
    });
    expect(grid.cells[0][0].status).toBe('missing');
  });
});

describe('buildWeeklySummary', () => {
  const grid = buildClassProgressGrid({
    students,
    assignments,
    completions: [
      { assignmentId: 'a1', studentId: 's1', score: 75, bestWord: 'abandon' },
      { assignmentId: 'a2', studentId: 's1', score: 50, bestWord: 'ancient' },
    ],
  });

  it('counts only assignments due this ISO week, and names who is missing them', () => {
    const summary = buildWeeklySummary({ className: 'English 101', grid, now: NOW });
    expect(summary.scope).toBe('week');
    expect(summary.dueCount).toBe(1);
    expect(summary.completedCount).toBe(0);
    expect(summary.topWords).toEqual(['abandon']);
    expect(summary.needsAttention).toEqual([{ studentId: 's2', name: 'Ben', missingCount: 1 }]);
  });

  it('counts an assignment completed only when every student finished it', () => {
    const both = buildClassProgressGrid({
      students,
      assignments,
      completions: [
        { assignmentId: 'a1', studentId: 's1', score: 75, bestWord: 'abandon' },
        { assignmentId: 'a1', studentId: 's2', score: 60, bestWord: 'abandon' },
      ],
    });
    const summary = buildWeeklySummary({ className: 'English 101', grid: both, now: NOW });
    expect(summary.completedCount).toBe(1);
    expect(summary.needsAttention).toEqual([]);
    expect(summary.topWords).toEqual(['abandon']);
  });

  it('falls back to every assignment when nothing is due this week', () => {
    const undated = buildClassProgressGrid({
      students,
      assignments: [
        { id: 'a2', title: 'Old verbs', dueDate: '2026-09-01' },
        { id: 'a3', title: 'Undated', dueDate: null },
      ],
      completions: [],
    });
    const summary = buildWeeklySummary({ className: 'English 101', grid: undated, now: NOW });
    expect(summary.scope).toBe('all');
    expect(summary.dueCount).toBe(2);
    expect(summary.completedCount).toBe(0);
    expect(summary.needsAttention.map((s) => s.name)).toEqual(['Ada', 'Ben']);
  });

  it('treats the next Monday as the following week, and a date-only Monday as this week', () => {
    const edges = buildClassProgressGrid({
      students: [students[0]],
      assignments: [
        { id: 'mon', title: 'Monday', dueDate: '2026-10-05' },
        { id: 'next', title: 'Next Monday', dueDate: '2026-10-12' },
        { id: 'bad', title: 'Bad', dueDate: 'nope' },
      ],
      completions: [{ assignmentId: 'mon', studentId: 's1', score: 100, bestWord: 'lime' }],
    });
    const summary = buildWeeklySummary({ className: 'English 101', grid: edges, now: NOW });
    expect(summary.scope).toBe('week');
    expect(summary.dueCount).toBe(1);
    expect(summary.completedCount).toBe(1);
    expect(summary.topWords).toEqual(['lime']);
  });

  it('keeps the five most common best words', () => {
    const words = ['fig', 'apple', 'zebra', 'mango', 'kiwi', 'date'];
    const many = buildClassProgressGrid({
      students: words.map((word, i) => ({ id: `s${i}`, name: word })),
      assignments: [{ id: 'a1', title: 'Week', dueDate: '2026-10-06' }],
      completions: words.map((word, i) => ({
        assignmentId: 'a1',
        studentId: `s${i}`,
        score: 10,
        bestWord: word,
      })),
    });
    const summary = buildWeeklySummary({ className: 'English 101', grid: many, now: NOW });
    expect(summary.topWords).toEqual(['apple', 'date', 'fig', 'kiwi', 'mango']);
    expect(summary.topWords).not.toContain('zebra');
  });

  it('reports zero completed when the class has no students', () => {
    const empty = buildClassProgressGrid({
      students: [],
      assignments,
      completions: [],
    });
    const summary = buildWeeklySummary({ className: 'English 101', grid: empty, now: NOW });
    expect(summary.dueCount).toBe(1);
    expect(summary.completedCount).toBe(0);
    expect(summary.needsAttention).toEqual([]);
  });
});

describe('formatWeeklySummary', () => {
  it('prints class name, due/completed, top words and students needing attention', () => {
    const grid = buildClassProgressGrid({
      students,
      assignments,
      completions: [{ assignmentId: 'a1', studentId: 's1', score: 75, bestWord: 'abandon' }],
    });
    const text = formatWeeklySummary(
      buildWeeklySummary({ className: 'English 101', grid, now: NOW }),
      LABELS,
    );
    expect(text).toBe(
      [
        'English 101',
        'Assignments due: 1 · Completed: 0',
        'Top words: abandon',
        'Needs attention: Ben (1 missing)',
      ].join('\n'),
    );
    expect(text).not.toContain('Old verbs');
  });

  it('says none when there are no top words and nobody is missing work', () => {
    const grid = buildClassProgressGrid({
      students: [students[0]],
      assignments: [assignments[0]],
      completions: [{ assignmentId: 'a1', studentId: 's1', score: 100, bestWord: null }],
    });
    const text = formatWeeklySummary(
      buildWeeklySummary({ className: 'English 101', grid, now: NOW }),
      LABELS,
    );
    expect(text).toContain('Top words: none');
    expect(text).toContain('Needs attention: none');
    expect(text).toContain('Completed: 1');
  });
});
