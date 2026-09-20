import { describe, it, expect } from 'vitest';
import { wordPoints, boardTotalScore } from '../scoreRun';
import { calculateWordScore } from '@/shared/utils/scoring';

describe('wordPoints rarity', () => {
  it('given equal-length words, when scored in English, then rarer letters pay more', () => {
    expect(wordPoints('quartz', 'en')).toBeGreaterThan(wordPoints('raised', 'en'));
  });

  it('given a plain common word, when scored, then it matches the flat base score', () => {
    expect(wordPoints('raise', 'en')).toBe(calculateWordScore('raise'));
  });

  it('given a non-Latin language, when scored, then rarity is flat so length is not paid twice', () => {
    // LETTER_RARITY covers A-Z only; elsewhere only its length bonus would survive,
    // which the exponential base score already rewards.
    for (const lang of ['he', 'ja', 'ru']) {
      expect(wordPoints('abcdefg', lang)).toBe(calculateWordScore('abcdefg'));
    }
  });

  it('given Latin-script siblings, when scored, then they all get the rarity treatment', () => {
    for (const lang of ['en', 'es', 'sv']) {
      expect(wordPoints('quartz', lang)).toBeGreaterThan(calculateWordScore('quartz'));
    }
  });

  it('given no language, when scored, then it falls back to the flat base score', () => {
    // Back-compat: relic/HUD callers that never passed a language keep their numbers.
    expect(wordPoints('quartz')).toBe(calculateWordScore('quartz'));
  });
});

describe('boardTotalScore', () => {
  it('given a solve, when totalled, then it sums the same points a run would credit', () => {
    expect(boardTotalScore(['quartz', 'raise'], 'en')).toBe(wordPoints('quartz', 'en') + wordPoints('raise', 'en'));
  });

  it('given an empty solve, when totalled, then it is zero', () => {
    expect(boardTotalScore([], 'en')).toBe(0);
  });
});
