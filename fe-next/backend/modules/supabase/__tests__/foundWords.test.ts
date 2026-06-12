import { describe, it, expect } from 'vitest';
import { extractFoundWords } from '../foundWords';

describe('extractFoundWords', () => {
  it('maps validated word details to the game_sessions WordFound shape', () => {
    const result = extractFoundWords([
      { word: 'cat', score: 30, validated: true, timestamp: 1234 },
      { word: 'house', score: 90, validated: true, timestamp: 5678 },
    ]);

    expect(result).toEqual([
      { word: 'cat', points: 30, length: 3, timestamp: 1234 },
      { word: 'house', points: 90, length: 5, timestamp: 5678 },
    ]);
  });

  it('drops non-validated details defensively (only credited words count as "found")', () => {
    const result = extractFoundWords([
      { word: 'cat', score: 30, validated: true, timestamp: 1 },
      { word: 'xqz', score: 0, validated: false, timestamp: 2 },
    ]);

    expect(result).toEqual([{ word: 'cat', points: 30, length: 3, timestamp: 1 }]);
  });

  it('defaults a missing/null timestamp to 0 and a missing score to 0', () => {
    const result = extractFoundWords([
      { word: 'dog', validated: true, timestamp: null },
      { word: 'fox', validated: true },
    ]);

    expect(result).toEqual([
      { word: 'dog', points: 0, length: 3, timestamp: 0 },
      { word: 'fox', points: 0, length: 3, timestamp: 0 },
    ]);
  });

  it('skips entries with no word and tolerates undefined input', () => {
    expect(extractFoundWords([{ score: 10, validated: true } as never])).toEqual([]);
    expect(extractFoundWords(undefined)).toEqual([]);
    expect(extractFoundWords([])).toEqual([]);
  });

  it('keeps legitimate duplicates a player actually found (no isDuplicate filtering)', () => {
    const result = extractFoundWords([
      { word: 'cat', score: 30, validated: true, isDuplicate: true, timestamp: 1 },
    ]);

    expect(result).toEqual([{ word: 'cat', points: 30, length: 3, timestamp: 1 }]);
  });
});
