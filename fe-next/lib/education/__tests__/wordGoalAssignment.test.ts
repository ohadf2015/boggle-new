import { describe, it, expect } from 'vitest';
import {
  parseWordList,
  uniqueWordCount,
  isWordGoalComplete,
  validateWordGoal,
  wordGoalLessonName,
  WORD_COUNT_DEFAULT,
} from '../wordGoalAssignment';

describe('parseWordList', () => {
  it('splits commas, newlines and semicolons, trims, and de-dupes case-insensitively', () => {
    expect(parseWordList('Cat, dog\nFISH; cat')).toEqual(['Cat', 'dog', 'FISH']);
  });

  it('drops empty chunks', () => {
    expect(parseWordList('  , \n , bird ')).toEqual(['bird']);
  });
});

describe('validateWordGoal', () => {
  it('rejects a missing due date', () => {
    expect(validateWordGoal({ kind: 'word_count', dueDate: '', target: 10 })).toEqual({
      ok: false,
      error: 'missing_due_date',
    });
  });

  it('accepts a word-count goal in range', () => {
    expect(validateWordGoal({ kind: 'word_count', dueDate: '2026-10-17', target: WORD_COUNT_DEFAULT })).toEqual({
      ok: true,
      goal: { kind: 'word_count', target: 10, dueDate: '2026-10-17' },
    });
  });

  it('rejects a non-integer or out-of-range count', () => {
    expect(validateWordGoal({ kind: 'word_count', dueDate: '2026-10-17', target: 0 }).ok).toBe(false);
    expect(validateWordGoal({ kind: 'word_count', dueDate: '2026-10-17', target: 3.5 }).ok).toBe(false);
    expect(validateWordGoal({ kind: 'word_count', dueDate: '2026-10-17', target: 101 }).ok).toBe(false);
  });

  it('requires at least 3 unique words for a list goal', () => {
    expect(validateWordGoal({ kind: 'word_list', dueDate: '2026-10-17', wordListRaw: 'cat, dog' })).toEqual({
      ok: false,
      error: 'word_list_too_short',
    });
  });

  it('accepts a pasted list of 3+ words', () => {
    const result = validateWordGoal({
      kind: 'word_list',
      dueDate: '2026-10-17',
      wordListRaw: 'cat\ndog\nfish',
    });
    expect(result).toEqual({
      ok: true,
      goal: { kind: 'word_list', words: ['cat', 'dog', 'fish'], dueDate: '2026-10-17' },
    });
  });
});

describe('isWordGoalComplete', () => {
  it('counts unique attempted words toward a word-count goal', () => {
    const goal = { kind: 'word_count' as const, target: 3, dueDate: '2026-10-17' };
    expect(isWordGoalComplete(goal, { wordsAttempted: { cat: { attempts: 1 }, dog: { attempts: 1 } } })).toBe(false);
    expect(
      isWordGoalComplete(goal, {
        wordsAttempted: { cat: { attempts: 1 }, dog: { attempts: 1 } },
        extraWords: ['fish'],
      }),
    ).toBe(true);
  });

  it('completes a word-list goal only when every required word was attempted', () => {
    const goal = { kind: 'word_list' as const, words: ['cat', 'dog', 'fish'], dueDate: '2026-10-17' };
    expect(isWordGoalComplete(goal, { wordsAttempted: { cat: { attempts: 1 }, dog: { attempts: 1 } } })).toBe(false);
    expect(
      isWordGoalComplete(goal, {
        wordsAttempted: { CAT: { attempts: 1 }, dog: { attempts: 1 }, fish: { attempts: 1 } },
      }),
    ).toBe(true);
  });
});

describe('uniqueWordCount', () => {
  it('is 0 for empty progress', () => {
    expect(uniqueWordCount(null)).toBe(0);
    expect(uniqueWordCount({})).toBe(0);
  });
});

describe('wordGoalLessonName', () => {
  it('uses the find-N copy for a count goal', () => {
    expect(
      wordGoalLessonName({ kind: 'word_count', target: 12, dueDate: '2026-10-17' }, (n) => `Find ${n} words`),
    ).toBe('Find 12 words');
  });
});
