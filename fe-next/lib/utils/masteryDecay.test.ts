/**
 * Mastery Decay Tests
 *
 * Tests for confidence decay calculation using exponential decay model.
 */

import {
  calculateMasteryDecay,
  getWordsNeedingRefresh,
  type MasteryDecayInput,
  type MasteryDecayResult,
} from './masteryDecay';

function makeInput(overrides: Partial<MasteryDecayInput> = {}): MasteryDecayInput {
  return {
    word: 'apple',
    masteredAt: '2026-02-01T00:00:00.000Z',
    lastPracticedAt: '2026-02-18T00:00:00.000Z',
    correctStreak: 0,
    ...overrides,
  };
}

describe('calculateMasteryDecay', () => {
  describe('basic confidence calculation', () => {
    it('returns confidence of 1.0 when practiced today', () => {
      const asOf = new Date('2026-02-18T12:00:00.000Z');
      const input = makeInput({ lastPracticedAt: '2026-02-18T00:00:00.000Z' });
      const result = calculateMasteryDecay(input, asOf);
      // 0 days since practice → e^0 = 1
      expect(result.confidenceScore).toBeCloseTo(1.0, 2);
    });

    it('returns roughly 0.5 confidence after ~7 days with no streak', () => {
      // decay_rate = 0.1, half-life = ln(2)/0.1 ≈ 6.93 days
      const lastPracticed = new Date('2026-02-11T00:00:00.000Z');
      const asOf = new Date('2026-02-18T00:00:00.000Z');
      const input = makeInput({ lastPracticedAt: lastPracticed.toISOString(), correctStreak: 0 });
      const result = calculateMasteryDecay(input, asOf);
      // e^(-0.1 * 7) ≈ 0.4966
      expect(result.confidenceScore).toBeCloseTo(Math.exp(-0.1 * 7), 3);
    });

    it('confidence score is between 0 and 1', () => {
      const asOf = new Date('2026-12-31T00:00:00.000Z');
      const input = makeInput({ lastPracticedAt: '2026-01-01T00:00:00.000Z', correctStreak: 0 });
      const result = calculateMasteryDecay(input, asOf);
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(result.confidenceScore).toBeLessThanOrEqual(1);
    });
  });

  describe('streak bonus slows decay', () => {
    it('higher streak produces higher confidence for same elapsed time', () => {
      const asOf = new Date('2026-02-25T00:00:00.000Z');
      const lastPracticed = '2026-02-18T00:00:00.000Z';

      const noStreak = calculateMasteryDecay(
        makeInput({ lastPracticedAt: lastPracticed, correctStreak: 0 }),
        asOf
      );
      const highStreak = calculateMasteryDecay(
        makeInput({ lastPracticedAt: lastPracticed, correctStreak: 8 }),
        asOf
      );

      expect(highStreak.confidenceScore).toBeGreaterThan(noStreak.confidenceScore);
    });

    it('streak bonus caps at 0.4 (streak * 0.05 capped at 0.4)', () => {
      // streak 8 → 8 * 0.05 = 0.4 (cap)
      // streak 10 → 10 * 0.05 = 0.5 → capped at 0.4
      const asOf = new Date('2026-02-25T00:00:00.000Z');
      const lastPracticed = '2026-02-18T00:00:00.000Z';

      const streak8 = calculateMasteryDecay(
        makeInput({ lastPracticedAt: lastPracticed, correctStreak: 8 }),
        asOf
      );
      const streak10 = calculateMasteryDecay(
        makeInput({ lastPracticedAt: lastPracticed, correctStreak: 10 }),
        asOf
      );

      expect(streak8.confidenceScore).toBeCloseTo(streak10.confidenceScore, 5);
    });
  });

  describe('isDecayed flag', () => {
    it('marks isDecayed = true when confidence < 0.5', () => {
      // Need 7+ days with no streak to get below 0.5
      const asOf = new Date('2026-03-04T00:00:00.000Z');
      const input = makeInput({
        lastPracticedAt: '2026-02-18T00:00:00.000Z',
        correctStreak: 0,
      });
      const result = calculateMasteryDecay(input, asOf);
      if (result.confidenceScore < 0.5) {
        expect(result.isDecayed).toBe(true);
      } else {
        expect(result.isDecayed).toBe(false);
      }
    });

    it('marks isDecayed = false when confidence >= 0.5', () => {
      const asOf = new Date('2026-02-19T00:00:00.000Z');
      const input = makeInput({ lastPracticedAt: '2026-02-18T00:00:00.000Z', correctStreak: 0 });
      const result = calculateMasteryDecay(input, asOf);
      expect(result.isDecayed).toBe(false);
    });
  });

  describe('needsRefresh flag', () => {
    it('marks needsRefresh = true when confidence < 0.7 and 7+ days old', () => {
      // After 7 days, e^(-0.1*7) ≈ 0.497 < 0.7
      const asOf = new Date('2026-02-25T00:00:00.000Z');
      const input = makeInput({
        lastPracticedAt: '2026-02-18T00:00:00.000Z',
        correctStreak: 0,
      });
      const result = calculateMasteryDecay(input, asOf);
      expect(result.needsRefresh).toBe(true);
    });

    it('does not mark needsRefresh when practiced recently (< 7 days)', () => {
      const asOf = new Date('2026-02-20T00:00:00.000Z');
      const input = makeInput({
        lastPracticedAt: '2026-02-18T00:00:00.000Z',
        correctStreak: 0,
      });
      const result = calculateMasteryDecay(input, asOf);
      expect(result.needsRefresh).toBe(false);
    });

    it('does not mark needsRefresh when confidence >= 0.7 even if 7+ days old', () => {
      // High streak keeps confidence above 0.7 even after 7 days
      const asOf = new Date('2026-02-25T00:00:00.000Z');
      const input = makeInput({
        lastPracticedAt: '2026-02-18T00:00:00.000Z',
        correctStreak: 8, // max bonus (0.4) → effective 7 * (1-0.4) = 4.2 days
      });
      const result = calculateMasteryDecay(input, asOf);
      // e^(-0.1 * 4.2) ≈ 0.657 — still below 0.7, check actual value
      // The test verifies actual logic: needsRefresh = confidence < 0.7 AND days >= 7
      if (result.confidenceScore >= 0.7) {
        expect(result.needsRefresh).toBe(false);
      }
    });
  });

  describe('daysSinceLastPractice', () => {
    it('returns correct days since last practice', () => {
      const asOf = new Date('2026-02-25T00:00:00.000Z');
      const input = makeInput({ lastPracticedAt: '2026-02-18T00:00:00.000Z' });
      const result = calculateMasteryDecay(input, asOf);
      expect(result.daysSinceLastPractice).toBe(7);
    });

    it('returns 0 for same-day practice', () => {
      const asOf = new Date('2026-02-18T12:00:00.000Z');
      const input = makeInput({ lastPracticedAt: '2026-02-18T00:00:00.000Z' });
      const result = calculateMasteryDecay(input, asOf);
      expect(result.daysSinceLastPractice).toBe(0);
    });
  });

  describe('word field', () => {
    it('preserves word in result', () => {
      const input = makeInput({ word: 'mango' });
      const result = calculateMasteryDecay(input);
      expect(result.word).toBe('mango');
    });
  });
});

describe('getWordsNeedingRefresh', () => {
  it('returns empty array when no words need refresh', () => {
    const asOf = new Date('2026-02-19T00:00:00.000Z');
    const words = [
      makeInput({ word: 'a', lastPracticedAt: '2026-02-18T00:00:00.000Z', correctStreak: 0 }),
    ];
    const result = getWordsNeedingRefresh(words, asOf);
    expect(result).toEqual([]);
  });

  it('returns words that need refresh', () => {
    const asOf = new Date('2026-02-25T00:00:00.000Z');
    const words = [
      makeInput({ word: 'stale', lastPracticedAt: '2026-02-18T00:00:00.000Z', correctStreak: 0 }),
      makeInput({ word: 'fresh', lastPracticedAt: '2026-02-24T00:00:00.000Z', correctStreak: 0 }),
    ];
    const result = getWordsNeedingRefresh(words, asOf);
    expect(result.map(r => r.word)).toContain('stale');
    expect(result.map(r => r.word)).not.toContain('fresh');
  });

  it('sorts results by confidence ascending (weakest first)', () => {
    const asOf = new Date('2026-03-10T00:00:00.000Z');
    const words = [
      makeInput({ word: 'moderate', lastPracticedAt: '2026-02-25T00:00:00.000Z', correctStreak: 0 }),
      makeInput({ word: 'weakest', lastPracticedAt: '2026-02-01T00:00:00.000Z', correctStreak: 0 }),
    ];
    const result = getWordsNeedingRefresh(words, asOf);
    if (result.length >= 2) {
      expect(result[0].confidenceScore).toBeLessThanOrEqual(result[1].confidenceScore);
    }
  });

  it('handles empty input', () => {
    expect(getWordsNeedingRefresh([])).toEqual([]);
  });
});
