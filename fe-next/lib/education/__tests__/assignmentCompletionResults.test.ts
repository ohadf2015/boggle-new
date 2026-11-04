import { describe, it, expect } from 'vitest';
import { buildAssignmentResults } from '../assignmentCompletionResults';

const roster = [
  { studentId: 's1', name: 'Noa' },
  { studentId: 's2', name: 'Ari' },
  { studentId: 's3', name: 'Dana' },
  { studentId: 's4', name: 'Yoni' },
];

const row = (student_id: string, words: Record<string, [number, number]>, mastered: string[] = []) => ({
  student_id,
  words_attempted: Object.fromEntries(Object.entries(words).map(([w, [correct, attempts]]) => [w, { correct, attempts }])),
  words_mastered: mastered,
});

describe('buildAssignmentResults', () => {
  it('names who played and who has not, from the roster', () => {
    const r = buildAssignmentResults({ rows: [row('s1', { cat: [2, 2] })], roster, fallbackName: 'Student' });
    expect(r.played.map((p) => p.name)).toEqual(['Noa']);
    expect(r.notPlayed.map((p) => p.name)).toEqual(['Ari', 'Dana', 'Yoni']);
    expect(r.total).toBe(4);
  });

  it('lists each student\'s missed words and skips ones they have since mastered', () => {
    const r = buildAssignmentResults({
      rows: [row('s1', { cat: [1, 3], dog: [2, 2], sun: [0, 1] }, ['sun'])],
      roster,
      fallbackName: 'Student',
    });
    expect(r.played[0].missed).toEqual(['cat']);
    expect(r.played[0].accuracy).toBe(50);
  });

  it('ranks the most missed words by how many students missed them', () => {
    const r = buildAssignmentResults({
      rows: [
        row('s1', { cat: [0, 1], dog: [0, 1] }),
        row('s2', { cat: [0, 2], sun: [1, 1] }),
        row('s3', { Cat: [1, 2] }),
      ],
      roster,
      fallbackName: 'Student',
    });
    expect(r.difficultWords[0]).toEqual({ word: 'cat', missedBy: 3, played: 3 });
    expect(r.difficultWords.map((w) => w.word)).toEqual(['cat', 'dog']);
  });

  it('puts the lowest scorers under 70% in need-help, at most three', () => {
    const r = buildAssignmentResults({
      rows: [
        row('s1', { a: [1, 4] }),
        row('s2', { a: [3, 4] }),
        row('s3', { a: [0, 4] }),
        row('s4', { a: [2, 4] }),
        row('s5', { a: [3, 5] }),
      ],
      roster,
      fallbackName: 'Student',
    });
    expect(r.needHelp.map((s) => s.name)).toEqual(['Dana', 'Noa', 'Yoni']);
    expect(r.needHelp.every((s) => (s.accuracy ?? 100) < 70)).toBe(true);
  });

  it('reads a completed row with no word data as played with no misses, never NaN', () => {
    const r = buildAssignmentResults({
      rows: [{ student_id: 's1', words_attempted: null, words_mastered: null }],
      roster,
      fallbackName: 'Student',
    });
    expect(r.played[0]).toEqual({ studentId: 's1', name: 'Noa', accuracy: null, missed: [] });
    expect(r.needHelp).toEqual([]);
    expect(r.difficultWords).toEqual([]);
  });

  it('keeps a student who played and later left the class, named from their profile', () => {
    const r = buildAssignmentResults({
      rows: [{ student_id: 'gone', profiles: { display_name: 'Lior' }, words_attempted: {} }],
      roster: [],
      fallbackName: 'Student',
    });
    expect(r.played[0].name).toBe('Lior');
    expect(r.total).toBe(1);
  });

  it('counts one student once when the same student has two rows', () => {
    const r = buildAssignmentResults({
      rows: [row('s1', { cat: [0, 1] }), row('s1', { cat: [1, 1] })],
      roster,
      fallbackName: 'Student',
    });
    expect(r.played).toHaveLength(1);
    expect(r.played[0].missed).toEqual(['cat']);
    expect(r.difficultWords[0].missedBy).toBe(1);
  });
});
