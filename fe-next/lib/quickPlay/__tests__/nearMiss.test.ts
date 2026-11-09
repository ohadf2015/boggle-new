import { describe, it, expect } from 'vitest';
import { nearMissFor } from '../nearMiss';

describe('nearMissFor', () => {
  it('says how many points BEAT the best (gap + 1), from real numbers', () => {
    expect(nearMissFor({ score: 90, prevBest: 100, wordsFound: 8, parWords: 10 })).toEqual({ kind: 'pointsToBeatBest', points: 11 });
    expect(nearMissFor({ score: 100, prevBest: 100, wordsFound: 8, parWords: 10 })).toEqual({ kind: 'pointsToBeatBest', points: 1 });
  });

  it('celebrates a new best by the real margin', () => {
    expect(nearMissFor({ score: 130, prevBest: 100, wordsFound: 8, parWords: 10 })).toEqual({ kind: 'newBestBy', points: 30 });
  });

  it('stays quiet when the best is far away (not a near miss)', () => {
    expect(nearMissFor({ score: 10, prevBest: 100, wordsFound: 1, parWords: 10 })).toBeNull();
  });

  it('falls back to words-to-par on a first round, only when close', () => {
    expect(nearMissFor({ score: 40, prevBest: 0, wordsFound: 6, parWords: 8 })).toEqual({ kind: 'wordsToPar', words: 2 });
    expect(nearMissFor({ score: 40, prevBest: 0, wordsFound: 1, parWords: 20 })).toBeNull();
    expect(nearMissFor({ score: 0, prevBest: 0, wordsFound: 0, parWords: 8 })).toBeNull();
    expect(nearMissFor({ score: 80, prevBest: 0, wordsFound: 9, parWords: 8 })).toBeNull();
  });
});
