/**
 * Spaced Repetition (SM-2 Algorithm) Tests
 *
 * Tests for the SM-2 spaced repetition scheduling algorithm.
 */

import {
  calculateNextReview,
  createWordReviewData,
  isWordDueForReview,
  sortByReviewPriority,
  type WordReviewData,
  type ReviewResult,
} from './spacedRepetition';

// Helper to create a base review data object
function makeReviewData(overrides: Partial<WordReviewData> = {}): WordReviewData {
  return {
    word: 'apple',
    easeFactor: 2.5,
    interval: 1,
    repetitions: 0,
    nextReviewDate: '2026-02-25',
    lastReviewDate: '2026-02-24',
    ...overrides,
  };
}

describe('createWordReviewData', () => {
  it('creates initial review data with correct defaults', () => {
    const data = createWordReviewData('banana');
    expect(data.word).toBe('banana');
    expect(data.easeFactor).toBe(2.5);
    expect(data.interval).toBe(1);
    expect(data.repetitions).toBe(0);
    expect(data.nextReviewDate).toBeDefined();
    expect(data.lastReviewDate).toBeDefined();
  });

  it('sets nextReviewDate to today', () => {
    const data = createWordReviewData('cat');
    const today = new Date().toISOString().split('T')[0];
    expect(data.nextReviewDate).toBe(today);
  });
});

describe('calculateNextReview', () => {
  describe('incorrect answers (quality < 3)', () => {
    it('resets repetitions to 0 on quality 0', () => {
      const current = makeReviewData({ repetitions: 3, interval: 10 });
      const result = calculateNextReview(current, { quality: 0 });
      expect(result.repetitions).toBe(0);
    });

    it('resets interval to 1 day on quality 0', () => {
      const current = makeReviewData({ repetitions: 3, interval: 10 });
      const result = calculateNextReview(current, { quality: 0 });
      expect(result.interval).toBe(1);
    });

    it('resets repetitions to 0 on quality 2', () => {
      const current = makeReviewData({ repetitions: 5, interval: 30 });
      const result = calculateNextReview(current, { quality: 2 });
      expect(result.repetitions).toBe(0);
    });

    it('decreases easeFactor on incorrect answer', () => {
      const current = makeReviewData({ easeFactor: 2.5 });
      const result = calculateNextReview(current, { quality: 0 });
      // EF' = 2.5 + (0.1 - (5-0) * (0.08 + (5-0) * 0.02))
      // EF' = 2.5 + (0.1 - 5 * (0.08 + 5 * 0.02))
      // EF' = 2.5 + (0.1 - 5 * 0.18) = 2.5 + (0.1 - 0.9) = 2.5 - 0.8 = 1.7
      expect(result.easeFactor).toBeCloseTo(1.7, 5);
    });

    it('enforces easeFactor floor of 1.3', () => {
      const current = makeReviewData({ easeFactor: 1.3 });
      const result = calculateNextReview(current, { quality: 0 });
      expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
    });
  });

  describe('correct answers (quality >= 3)', () => {
    it('sets interval to 1 on first correct repetition (repetitions == 0)', () => {
      const current = makeReviewData({ repetitions: 0, interval: 1 });
      const result = calculateNextReview(current, { quality: 4 });
      expect(result.interval).toBe(1);
      expect(result.repetitions).toBe(1);
    });

    it('sets interval to 6 on second correct repetition (repetitions == 1)', () => {
      const current = makeReviewData({ repetitions: 1, interval: 1 });
      const result = calculateNextReview(current, { quality: 4 });
      expect(result.interval).toBe(6);
      expect(result.repetitions).toBe(2);
    });

    it('multiplies interval by easeFactor on third+ repetition', () => {
      const current = makeReviewData({ repetitions: 2, interval: 6, easeFactor: 2.5 });
      const result = calculateNextReview(current, { quality: 4 });
      expect(result.interval).toBe(Math.round(6 * 2.5));
      expect(result.repetitions).toBe(3);
    });

    it('increases easeFactor on quality 5', () => {
      const current = makeReviewData({ easeFactor: 2.5 });
      const result = calculateNextReview(current, { quality: 5 });
      // EF' = 2.5 + (0.1 - (5-5) * (0.08 + (5-5) * 0.02))
      // EF' = 2.5 + 0.1 = 2.6
      expect(result.easeFactor).toBeCloseTo(2.6, 5);
    });

    it('slightly decreases easeFactor on quality 3', () => {
      const current = makeReviewData({ easeFactor: 2.5 });
      const result = calculateNextReview(current, { quality: 3 });
      // EF' = 2.5 + (0.1 - (5-3) * (0.08 + (5-3) * 0.02))
      // EF' = 2.5 + (0.1 - 2 * (0.08 + 0.04)) = 2.5 + (0.1 - 0.24) = 2.5 - 0.14 = 2.36
      expect(result.easeFactor).toBeCloseTo(2.36, 5);
    });

    it('sets nextReviewDate to interval days from now', () => {
      const current = makeReviewData({ repetitions: 1, interval: 1 });
      const before = new Date();
      const result = calculateNextReview(current, { quality: 4 });
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + result.interval);
      const resultDate = new Date(result.nextReviewDate);
      // Allow 1 day tolerance for date boundary edge cases
      const diff = Math.abs(resultDate.getTime() - expectedDate.getTime());
      expect(diff).toBeLessThan(48 * 60 * 60 * 1000);
      expect(before).toBeDefined(); // suppress unused var
    });

    it('updates lastReviewDate to today', () => {
      const current = makeReviewData();
      const result = calculateNextReview(current, { quality: 4 });
      const today = new Date().toISOString().split('T')[0];
      expect(result.lastReviewDate).toBe(today);
    });

    it('preserves word field', () => {
      const current = makeReviewData({ word: 'mango' });
      const result = calculateNextReview(current, { quality: 4 });
      expect(result.word).toBe('mango');
    });
  });

  describe('easeFactor floor enforcement', () => {
    it('never lets easeFactor drop below 1.3 after multiple incorrect answers', () => {
      let current = makeReviewData({ easeFactor: 1.4 });
      for (let i = 0; i < 5; i++) {
        current = calculateNextReview(current, { quality: 0 });
        expect(current.easeFactor).toBeGreaterThanOrEqual(1.3);
      }
    });
  });

  describe('full review cycle', () => {
    it('follows 1 -> 6 -> EF-multiplied progression', () => {
      let data = createWordReviewData('test');

      // First correct review
      data = calculateNextReview(data, { quality: 4 });
      expect(data.interval).toBe(1);
      expect(data.repetitions).toBe(1);

      // Second correct review
      data = calculateNextReview(data, { quality: 4 });
      expect(data.interval).toBe(6);
      expect(data.repetitions).toBe(2);

      // Third correct review
      const prevEF = data.easeFactor;
      data = calculateNextReview(data, { quality: 4 });
      expect(data.interval).toBe(Math.round(6 * prevEF));
      expect(data.repetitions).toBe(3);
    });

    it('resets progression after wrong answer mid-streak', () => {
      let data = createWordReviewData('test');
      data = calculateNextReview(data, { quality: 4 });
      data = calculateNextReview(data, { quality: 4 });
      expect(data.repetitions).toBe(2);

      // Wrong answer resets
      data = calculateNextReview(data, { quality: 1 });
      expect(data.repetitions).toBe(0);
      expect(data.interval).toBe(1);
    });
  });
});

describe('isWordDueForReview', () => {
  it('returns true for past nextReviewDate', () => {
    const data = makeReviewData({ nextReviewDate: '2026-01-01' });
    expect(isWordDueForReview(data)).toBe(true);
  });

  it('returns true for today nextReviewDate', () => {
    const today = new Date().toISOString().split('T')[0];
    const data = makeReviewData({ nextReviewDate: today });
    expect(isWordDueForReview(data)).toBe(true);
  });

  it('returns false for future nextReviewDate', () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    const data = makeReviewData({ nextReviewDate: future.toISOString().split('T')[0] });
    expect(isWordDueForReview(data)).toBe(false);
  });

  it('accepts custom asOf date', () => {
    const data = makeReviewData({ nextReviewDate: '2026-02-25' });
    const past = new Date('2026-02-20');
    const future = new Date('2026-03-01');
    expect(isWordDueForReview(data, past)).toBe(false);
    expect(isWordDueForReview(data, future)).toBe(true);
  });
});

describe('sortByReviewPriority', () => {
  it('puts overdue words first', () => {
    const overdue = makeReviewData({ word: 'overdue', nextReviewDate: '2026-01-01', easeFactor: 2.5 });
    const future = makeReviewData({ word: 'future', nextReviewDate: '2099-01-01', easeFactor: 2.5 });
    const sorted = sortByReviewPriority([future, overdue]);
    expect(sorted[0].word).toBe('overdue');
  });

  it('sorts overdue words by easeFactor ascending (harder words first)', () => {
    const today = new Date().toISOString().split('T')[0];
    const easy = makeReviewData({ word: 'easy', nextReviewDate: today, easeFactor: 2.8 });
    const hard = makeReviewData({ word: 'hard', nextReviewDate: today, easeFactor: 1.4 });
    const sorted = sortByReviewPriority([easy, hard]);
    expect(sorted[0].word).toBe('hard');
  });

  it('returns empty array when given empty array', () => {
    expect(sortByReviewPriority([])).toEqual([]);
  });

  it('handles single item', () => {
    const data = makeReviewData();
    expect(sortByReviewPriority([data])).toEqual([data]);
  });

  it('places future reviews after due reviews', () => {
    const today = new Date().toISOString().split('T')[0];
    const future = new Date();
    future.setDate(future.getDate() + 10);

    const due = makeReviewData({ word: 'due', nextReviewDate: today, easeFactor: 2.5 });
    const notDue = makeReviewData({ word: 'notDue', nextReviewDate: future.toISOString().split('T')[0], easeFactor: 1.3 });
    const sorted = sortByReviewPriority([notDue, due]);
    expect(sorted[0].word).toBe('due');
    expect(sorted[1].word).toBe('notDue');
  });
});
