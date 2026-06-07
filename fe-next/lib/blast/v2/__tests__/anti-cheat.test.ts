import { describe, it, expect } from 'vitest';
import {
  validateLevelClear,
  starRating,
  maxPossibleCoins,
  validateChainBounds,
  applyAntiCheatCaps,
  applyAntiCheatCapsWithLevel,
  type ClearSubmission,
} from '../anti-cheat';
import type { BlastLevel } from '../types';

const mockLevel: BlastLevel = {
  id: 'test-1',
  levelNumber: 1,
  theme: 'fruits',
  locale: 'en',
  words: ['apple', 'banana', 'cherry'],
  columns: [],
  resolvableOrder: [],
  tileFlags: {},
  difficulty: 1,
};

describe('anti-cheat', () => {
  describe('validateLevelClear', () => {
    it('accepts valid clear with all words found', () => {
      const submission: ClearSubmission = {
        levelNumber: 1,
        locale: 'en',
        wordsFound: ['apple', 'banana', 'cherry'],
        timeSeconds: 60,
        hintsUsed: 0,
        wrongAttempts: 0,
        cascadesTriggered: 0,
      };
      const validation = validateLevelClear(submission, mockLevel);
      expect(validation.ok).toBe(true);
    });

    it('accepts off-theme bonus words (apple in level, orange is a valid bonus find)', () => {
      // Bonus words are legitimate off-theme dictionary finds; rejecting them
      // here used to 400 the whole clear, losing all progress.
      const submission: ClearSubmission = {
        levelNumber: 1,
        locale: 'en',
        wordsFound: ['apple', 'orange'],
        timeSeconds: 60,
        hintsUsed: 0,
        wrongAttempts: 0,
        cascadesTriggered: 0,
      };
      const validation = validateLevelClear(submission, mockLevel);
      expect(validation.ok).toBe(true);
    });

    it('rejects time too fast (less than 5 seconds per word)', () => {
      const submission: ClearSubmission = {
        levelNumber: 1,
        locale: 'en',
        wordsFound: ['apple', 'banana', 'cherry'],
        timeSeconds: 10, // 3 words * 5 = 15s minimum
        hintsUsed: 0,
        wrongAttempts: 0,
        cascadesTriggered: 0,
      };
      const validation = validateLevelClear(submission, mockLevel);
      expect(validation.ok).toBe(false);
      if (!validation.ok) {
        expect(validation.reason).toContain('time too fast');
      }
    });

    it('accepts time at boundary', () => {
      const submission: ClearSubmission = {
        levelNumber: 1,
        locale: 'en',
        wordsFound: ['apple', 'banana', 'cherry'],
        timeSeconds: 15, // 3 words * 5 = 15s minimum
        hintsUsed: 0,
        wrongAttempts: 0,
        cascadesTriggered: 0,
      };
      const validation = validateLevelClear(submission, mockLevel);
      expect(validation.ok).toBe(true);
    });
  });

  describe('starRating', () => {
    const base = (over: Partial<ClearSubmission>): ClearSubmission => ({
      levelNumber: 1,
      locale: 'en',
      wordsFound: ['apple', 'banana', 'cherry'],
      timeSeconds: 80, // 3 words * 30 = 90s target
      hintsUsed: 0,
      wrongAttempts: 0,
      cascadesTriggered: 0,
      ...over,
    });

    it('returns 3 stars for a clean, fast clear', () => {
      expect(starRating(base({ wrongAttempts: 1, timeSeconds: 80 }), mockLevel)).toBe(3);
    });

    it('returns 3 stars for a clean clear that found a bonus word, even if slow (explorer path)', () => {
      // Slow (200s > 90s target) but spotless AND discovered an off-theme word.
      expect(starRating(base({ wrongAttempts: 0, timeSeconds: 200 }), mockLevel, 1)).toBe(3);
    });

    it('does NOT award 3 stars when slow AND no bonus word found', () => {
      expect(starRating(base({ wrongAttempts: 0, timeSeconds: 200 }), mockLevel, 0)).toBe(2);
    });

    it('does NOT award 3 stars when there were too many wrong attempts', () => {
      expect(starRating(base({ wrongAttempts: 4, timeSeconds: 80 }), mockLevel)).toBe(2);
    });

    it('counts bonus words in wordsFound without breaking the all-theme-words check', () => {
      // Regression: the old length-equality test mis-fired once a bonus word
      // padded wordsFound beyond level.words.length. All three theme words ARE
      // present, so a clean+fast run is still 3 stars.
      const sub = base({
        wordsFound: ['apple', 'banana', 'cherry', 'plea'],
        timeSeconds: 80,
        wrongAttempts: 0,
      });
      expect(starRating(sub, mockLevel, 1)).toBe(3);
    });

    it('returns 2 stars for a solid clear (a hint or a few misses)', () => {
      expect(starRating(base({ hintsUsed: 1, wrongAttempts: 2 }), mockLevel)).toBe(2);
    });

    it('returns 1 star for a messy clear (many misses and hints)', () => {
      expect(starRating(base({ hintsUsed: 3, wrongAttempts: 10, timeSeconds: 150 }), mockLevel)).toBe(1);
    });

    it('caps a PARTIAL finish (a theme word missing) at 1 star, even if otherwise spotless/fast', () => {
      // Player cleared the board / soft-locked without finding "cherry". A clean,
      // fast run that still missed a target is the "finish but fewer stars" case.
      const sub = base({ wordsFound: ['apple', 'banana'], hintsUsed: 0, wrongAttempts: 0, timeSeconds: 60 });
      expect(starRating(sub, mockLevel)).toBe(1);
    });

    it('caps a partial finish at 1 star even with a bonus word found', () => {
      const sub = base({ wordsFound: ['apple', 'banana', 'plea'], hintsUsed: 0, wrongAttempts: 0, timeSeconds: 60 });
      expect(starRating(sub, mockLevel, 1)).toBe(1);
    });
  });

  describe('maxPossibleCoins (level-less upper bound)', () => {
    it('sums per-word worst-case (165 coins per letter)', () => {
      const submission: ClearSubmission = {
        levelNumber: 1,
        locale: 'en',
        wordsFound: ['apple', 'banana', 'cherry'], // 5+6+6 letters = 17
        timeSeconds: 60,
        hintsUsed: 0,
        wrongAttempts: 0,
        cascadesTriggered: 0,
      };
      // 17 * 165 = 2805
      expect(maxPossibleCoins(submission)).toBe(2805);
    });

    it('returns 0 for empty wordsFound', () => {
      const submission: ClearSubmission = {
        levelNumber: 1,
        locale: 'en',
        wordsFound: [],
        timeSeconds: 60,
        hintsUsed: 0,
        wrongAttempts: 0,
        cascadesTriggered: 0,
      };
      expect(maxPossibleCoins(submission)).toBe(0);
    });
  });

  describe('validateChainBounds', () => {
    it('accepts cascadesTriggered <= wordsFound.length - 1', () => {
      const submission: ClearSubmission = {
        levelNumber: 1,
        locale: 'en',
        wordsFound: ['a', 'b', 'c'], // 3 words → max 2 cascades
        timeSeconds: 60,
        hintsUsed: 0,
        wrongAttempts: 0,
        cascadesTriggered: 2,
      };
      expect(validateChainBounds(submission).ok).toBe(true);
    });

    it('rejects cascadesTriggered > wordsFound.length - 1', () => {
      const submission: ClearSubmission = {
        levelNumber: 1,
        locale: 'en',
        wordsFound: ['a', 'b'], // 2 words → max 1 cascade
        timeSeconds: 60,
        hintsUsed: 0,
        wrongAttempts: 0,
        cascadesTriggered: 5,
      };
      const v = validateChainBounds(submission);
      expect(v.ok).toBe(false);
      if (!v.ok) expect(v.reason).toMatch(/cascade/i);
    });

    it('accepts zero cascades on single word', () => {
      const submission: ClearSubmission = {
        levelNumber: 1,
        locale: 'en',
        wordsFound: ['solo'],
        timeSeconds: 60,
        hintsUsed: 0,
        wrongAttempts: 0,
        cascadesTriggered: 0,
      };
      expect(validateChainBounds(submission).ok).toBe(true);
    });

    it('rejects cascades on zero words (degenerate)', () => {
      const submission: ClearSubmission = {
        levelNumber: 1,
        locale: 'en',
        wordsFound: [],
        timeSeconds: 60,
        hintsUsed: 0,
        wrongAttempts: 0,
        cascadesTriggered: 1,
      };
      expect(validateChainBounds(submission).ok).toBe(false);
    });
  });

  describe('applyAntiCheatCaps (server entry point)', () => {
    const baseSub: ClearSubmission = {
      levelNumber: 1,
      locale: 'en',
      wordsFound: ['cat', 'dog', 'sun'], // 9 letters → max 9*165 = 1485 coins
      timeSeconds: 60,
      hintsUsed: 0,
      wrongAttempts: 0,
      cascadesTriggered: 2,
    };

    it('returns clientCoins unchanged when within bounds', () => {
      const r = applyAntiCheatCaps(baseSub, 500);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.trustedCoins).toBe(500);
    });

    it('caps coins at maxPossibleCoins when client overstates', () => {
      const r = applyAntiCheatCaps(baseSub, 99999);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.trustedCoins).toBe(1485); // 9 letters * 165
    });

    it('rejects when cascade count exceeds possible', () => {
      const r = applyAntiCheatCaps({ ...baseSub, cascadesTriggered: 99 }, 500);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toMatch(/cascade/i);
    });

    it('clamps negative coins to 0', () => {
      const r = applyAntiCheatCaps(baseSub, -100);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.trustedCoins).toBe(0);
    });
  });

  describe('applyAntiCheatCapsWithLevel (level-aware)', () => {
    const levelCAT: BlastLevel = {
      id: 'l1',
      levelNumber: 1,
      theme: 'animals',
      locale: 'en',
      words: ['CAT', 'SUN', 'EGG'],
      columns: [
        { index: 0, tiles: ['C', 'S', 'E'] },
        { index: 1, tiles: ['A', 'U', 'G'] },
        { index: 2, tiles: ['T', 'N', 'G'] },
      ],
      resolvableOrder: ['CAT', 'SUN', 'EGG'],
      tileFlags: {},
      difficulty: 1,
    };

    it('accepts off-theme bonus words in wordsFound (matches the generated-level path)', () => {
      const sub: ClearSubmission = {
        levelNumber: 1,
        locale: 'en',
        wordsFound: ['CAT', 'SUN', 'EGG', 'TREE'], // TREE = off-theme bonus find
        timeSeconds: 60,
        hintsUsed: 0,
        wrongAttempts: 0,
        cascadesTriggered: 1,
      };
      const r = applyAntiCheatCapsWithLevel(sub, 500, levelCAT);
      expect(r.ok).toBe(true);
    });

    it('rejects when timeSeconds below per-word floor', () => {
      const sub: ClearSubmission = {
        levelNumber: 1,
        locale: 'en',
        wordsFound: ['CAT', 'SUN', 'EGG'],
        timeSeconds: 1, // floor = 5 * 3 = 15s
        hintsUsed: 0,
        wrongAttempts: 0,
        cascadesTriggered: 2,
      };
      const r = applyAntiCheatCapsWithLevel(sub, 100, levelCAT);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toMatch(/time too fast/i);
    });

    it('rejects cascade count exceeding wordsFound bound', () => {
      const sub: ClearSubmission = {
        levelNumber: 1,
        locale: 'en',
        wordsFound: ['CAT', 'SUN'],
        timeSeconds: 60,
        hintsUsed: 0,
        wrongAttempts: 0,
        cascadesTriggered: 99,
      };
      const r = applyAntiCheatCapsWithLevel(sub, 100, levelCAT);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toMatch(/cascade/i);
    });

    it('accepts legitimate submission and caps coins at ceiling', () => {
      const sub: ClearSubmission = {
        levelNumber: 1,
        locale: 'en',
        wordsFound: ['CAT', 'SUN', 'EGG'],
        timeSeconds: 60,
        hintsUsed: 0,
        wrongAttempts: 0,
        cascadesTriggered: 2,
      };
      const r = applyAntiCheatCapsWithLevel(sub, 200, levelCAT);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.trustedCoins).toBe(200); // within bound (9 letters * 165 = 1485)
    });

    it('caps overstated coins to level-aware ceiling', () => {
      const sub: ClearSubmission = {
        levelNumber: 1,
        locale: 'en',
        wordsFound: ['CAT'],
        timeSeconds: 30,
        hintsUsed: 0,
        wrongAttempts: 0,
        cascadesTriggered: 0,
      };
      const r = applyAntiCheatCapsWithLevel(sub, 99999, levelCAT);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.trustedCoins).toBe(3 * 165); // 495
    });
  });
});
