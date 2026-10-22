import { describe, it, expect } from 'vitest';
import { tallyStudentWords, summarizeStudentWords } from '../wordTally';

const lessonA = {
  words_mastered: ['tree'],
  words_attempted: { tree: { correct: 3, attempts: 3, lastAttemptAt: '2026-10-01T00:00:00Z' }, sun: { correct: 1, attempts: 4 } },
};
const lessonB = {
  words_mastered: ['tree'],
  words_attempted: { tree: { correct: 2, attempts: 2, lastAttemptAt: '2026-10-05T00:00:00Z' } },
};

describe('tallyStudentWords', () => {
  it('merges a word practised in two lessons into one entry with summed attempts', () => {
    const tally = tallyStudentWords([lessonA, lessonB]);
    expect(tally.size).toBe(2);
    expect(tally.get('tree')).toEqual({ correct: 5, attempts: 5, lastAt: '2026-10-05T00:00:00Z', mastered: true });
    expect(tally.get('sun')).toMatchObject({ correct: 1, attempts: 4, mastered: false });
  });

  it('ignores malformed rows', () => {
    const tally = tallyStudentWords([{ words_mastered: null, words_attempted: null }, { words_mastered: ['x'], words_attempted: { y: null } }]);
    expect([...tally.keys()]).toEqual(['x']);
  });
});

describe('summarizeStudentWords', () => {
  it('counts a word mastered in two lessons once', () => {
    expect(summarizeStudentWords([lessonA, lessonB])).toEqual({ wordsMastered: 1, wordsPracticed: 2, correct: 6, attempts: 9, accuracy: 67 });
  });
});
