import { describe, it, expect } from 'vitest';
import { buildClassMastery, type MasterySessionRow } from '@/lib/education/wordMasteryTrend';
import {
  buildWordMasteryReport,
  toFreePreview,
  buildSpacedReviewDates,
  SPACED_REVIEW_DAYS,
  HARDEST_WORDS_LIMIT,
  FREE_PREVIEW_WORDS,
} from '@/lib/education/wordMasteryReport';

function row(studentId: string, at: string, game: string, asked: string[], found: string[]): MasterySessionRow {
  return {
    studentId,
    startedAt: at,
    results: { gameCode: game, gameMode: 'vocab-quiz', lessonWordsAsked: asked, lessonWordsFound: found },
  };
}

const ROWS: MasterySessionRow[] = [
  row('s1', '2026-09-01T10:00:00Z', 'G1', ['bridge', 'castle', 'apple'], ['apple']),
  row('s2', '2026-09-01T10:00:00Z', 'G1', ['bridge', 'castle', 'apple'], ['apple', 'castle']),
  row('s3', '2026-09-01T10:00:00Z', 'G1', ['bridge', 'castle', 'apple'], ['apple', 'castle', 'bridge']),
  row('s1', '2026-09-02T10:00:00Z', 'G2', ['bridge', 'apple'], ['apple']),
];

describe('buildWordMasteryReport', () => {
  it('ranks the hardest words by misses, with the raw counts beside the rate', () => {
    const report = buildWordMasteryReport(buildClassMastery(ROWS));
    expect(report.hardestWords.map((w) => w.word)).toEqual(['bridge', 'castle']);
    expect(report.hardestWords[0]).toMatchObject({ attempts: 4, missed: 3, missRate: 75, studentsMissing: 2, studentsAsked: 3 });
    expect(report.hardestWords[1]).toMatchObject({ attempts: 3, missed: 1, missRate: 33 });
  });

  it('never ranks a word nobody missed, and caps the list at ten', () => {
    const many = Array.from({ length: 14 }, (_, i) => `w${String(i).padStart(2, '0')}`);
    const rows = [
      row('a', '2026-09-01T10:00:00Z', 'G', [...many, 'easy'], ['easy']),
      row('b', '2026-09-01T10:00:00Z', 'G', [...many, 'easy'], ['easy']),
    ];
    const report = buildWordMasteryReport(buildClassMastery(rows));
    expect(report.hardestWords).toHaveLength(HARDEST_WORDS_LIMIT);
    expect(report.hardestWords.some((w) => w.word === 'easy')).toBe(false);
  });

  it('needs two attempts before a word can rank — one miss is a single data point', () => {
    const rows = [row('a', '2026-09-01T10:00:00Z', 'G', ['lonely', 'bridge'], [])];
    const withTwo = [...rows, row('b', '2026-09-01T10:00:00Z', 'G', ['bridge'], [])];
    expect(buildWordMasteryReport(buildClassMastery(rows)).hardestWords).toEqual([]);
    expect(buildWordMasteryReport(buildClassMastery(withTwo)).hardestWords.map((w) => w.word)).toEqual(['bridge']);
  });

  it('summarises the class: accuracy, students, words, sessions', () => {
    const report = buildWordMasteryReport(buildClassMastery(ROWS));
    expect(report.totals).toEqual({ students: 3, words: 3, sessions: 4, attempts: 11, correct: 7, classAccuracy: 64 });
  });

  it('lists students weakest first with their own accuracy', () => {
    const report = buildWordMasteryReport(buildClassMastery(ROWS));
    expect(report.students.map((s) => s.studentId)).toEqual(['s1', 's2', 's3']);
    expect(report.students[0]).toMatchObject({ attempts: 5, correct: 2, accuracy: 40 });
  });

  it('builds a student x word heatmap over the hardest words first', () => {
    const report = buildWordMasteryReport(buildClassMastery(ROWS));
    expect(report.heatmap.words.map((w) => w.word)).toEqual(['bridge', 'castle', 'apple']);
    expect(report.heatmap.cells.s1.bridge).toEqual({ attempts: 2, correct: 0 });
    expect(report.heatmap.cells.s3.castle).toEqual({ attempts: 1, correct: 1 });
  });

  it('is empty, not broken, for a class with no asked-word evidence', () => {
    const report = buildWordMasteryReport(buildClassMastery([]));
    expect(report.totals.sessions).toBe(0);
    expect(report.hardestWords).toEqual([]);
    expect(report.heatmap.words).toEqual([]);
  });
});

describe('toFreePreview', () => {
  it('hands a free teacher only the top words and totals — never the per-student grid', () => {
    const preview = toFreePreview(buildWordMasteryReport(buildClassMastery(ROWS)));
    expect(preview.hardestWords.length).toBeLessThanOrEqual(FREE_PREVIEW_WORDS);
    expect(preview.totals.students).toBe(3);
    expect(preview.hiddenWords).toBe(0);
    expect(preview).not.toHaveProperty('students');
    expect(preview).not.toHaveProperty('heatmap');
  });
});

describe('buildSpacedReviewDates', () => {
  it('schedules the 1/3/7-day rounds from the teacher\'s own calendar day', () => {
    expect(SPACED_REVIEW_DAYS).toEqual([1, 3, 7]);
    expect(buildSpacedReviewDates('2026-10-01')).toEqual(['2026-10-02', '2026-10-04', '2026-10-08']);
  });

  it('crosses month and year boundaries without drifting a day', () => {
    expect(buildSpacedReviewDates('2026-12-30')).toEqual(['2026-12-31', '2027-01-02', '2027-01-06']);
  });

  it('rejects a malformed day rather than scheduling from garbage', () => {
    expect(() => buildSpacedReviewDates('10/01/2026')).toThrow();
  });
});
