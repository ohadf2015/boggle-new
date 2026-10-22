import { describe, it, expect } from 'vitest';
import { tallyStudentWords, summarizeStudentWords, summarizeTally, wordKey } from '../wordTally';

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
    expect(tally.get('tree')).toEqual({ word: 'tree', correct: 5, attempts: 5, lastAt: '2026-10-05T00:00:00Z', mastered: true });
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

describe('word key', () => {
  it('counts Tree and tree from two lessons as one word, shown in the most recent spelling', () => {
    const tally = tallyStudentWords([
      { words_mastered: ['Tree'], words_attempted: { Tree: { correct: 1, attempts: 2, lastAttemptAt: '2026-10-01T00:00:00Z' } } },
      { words_mastered: [], words_attempted: { ' tree ': { correct: 3, attempts: 3, lastAttemptAt: '2026-10-09T00:00:00Z' } } },
    ]);
    expect(tally.size).toBe(1);
    expect(tally.get(wordKey('TREE'))).toEqual({ word: 'tree', correct: 4, attempts: 5, lastAt: '2026-10-09T00:00:00Z', mastered: true });
    expect(summarizeTally(tally)).toMatchObject({ wordsMastered: 1, wordsPracticed: 1 });
  });

  it('keeps the first spelling when no attempt carries a date', () => {
    const tally = tallyStudentWords([
      { words_mastered: null, words_attempted: { Paris: { correct: 1, attempts: 1 } } },
      { words_mastered: ['paris'], words_attempted: null },
    ]);
    expect([...tally.values()].map((w) => w.word)).toEqual(['Paris']);
  });

  it('leaves Hebrew finals, niqqud and Japanese exactly as stored', () => {
    expect(wordKey('שלום')).toBe('שלום');
    expect(wordKey('שָׁלוֹם')).toBe('שָׁלוֹם'.normalize('NFC'));
    expect(wordKey('ねこ')).toBe('ねこ');
    const tally = tallyStudentWords([{ words_mastered: ['עץ'], words_attempted: { עץ: { correct: 1, attempts: 1 }, עצ: { correct: 0, attempts: 1 } } }]);
    expect(tally.size).toBe(2);
    expect(tally.get('עץ')?.word).toBe('עץ');
  });

  it('folds case in Swedish, Spanish and Russian', () => {
    expect(wordKey('Ålder')).toBe(wordKey('ålder'));
    expect(wordKey('Ñandú')).toBe('ñandú');
    expect(wordKey('Ёж')).toBe('ёж');
  });
});
