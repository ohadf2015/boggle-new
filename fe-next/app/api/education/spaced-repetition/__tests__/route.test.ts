/**
 * Spaced Repetition API Route - Unit Tests
 *
 * Tests the SM-2 calculation logic and DB persistence helpers
 * used by the route handler.
 */

import {
  calculateNextReview,
  createWordReviewData,
  isWordDueForReview,
  sortByReviewPriority,
  type WordReviewData,
} from '@/lib/utils/spacedRepetition';

// ============================================
// SM-2 CALCULATION TESTS (server-side validation)
// ============================================

describe('Spaced Repetition - Server-side SM-2 calculations', () => {
  it('creates initial review data with correct defaults', () => {
    // GIVEN — a new word
    const data = createWordReviewData('apple');

    // THEN — defaults are set correctly
    expect(data.word).toBe('apple');
    expect(data.easeFactor).toBe(2.5);
    expect(data.interval).toBe(1);
    expect(data.repetitions).toBe(0);
    expect(data.nextReviewDate).toBeTruthy();
  });

  it('resets to interval 1 on incorrect answer (quality < 3)', () => {
    // GIVEN — a word with established review schedule
    const current: WordReviewData = {
      word: 'apple',
      easeFactor: 2.5,
      interval: 6,
      repetitions: 3,
      nextReviewDate: '2026-03-22',
      lastReviewDate: '2026-03-16',
    };

    // WHEN — student answers incorrectly (quality = 1)
    const updated = calculateNextReview(current, { quality: 1 });

    // THEN — reset to interval 1, repetitions 0
    expect(updated.interval).toBe(1);
    expect(updated.repetitions).toBe(0);
  });

  it('progresses interval on correct answer (quality >= 3)', () => {
    // GIVEN — first correct answer
    const current = createWordReviewData('banana');

    // WHEN — student answers correctly (quality = 4)
    const after1 = calculateNextReview(current, { quality: 4 });
    expect(after1.repetitions).toBe(1);
    expect(after1.interval).toBe(1);

    // WHEN — second correct answer
    const after2 = calculateNextReview(after1, { quality: 4 });
    expect(after2.repetitions).toBe(2);
    expect(after2.interval).toBe(6);

    // WHEN — third correct answer
    const after3 = calculateNextReview(after2, { quality: 4 });
    expect(after3.repetitions).toBe(3);
    expect(after3.interval).toBeGreaterThan(6);
  });

  it('decreases ease factor on low quality (quality = 3)', () => {
    const current: WordReviewData = {
      word: 'test',
      easeFactor: 2.5,
      interval: 1,
      repetitions: 0,
      nextReviewDate: '2026-03-22',
      lastReviewDate: '2026-03-22',
    };

    const updated = calculateNextReview(current, { quality: 3 });
    expect(updated.easeFactor).toBeLessThan(2.5);
    expect(updated.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it('increases ease factor on perfect quality (quality = 5)', () => {
    const current: WordReviewData = {
      word: 'test',
      easeFactor: 2.5,
      interval: 1,
      repetitions: 0,
      nextReviewDate: '2026-03-22',
      lastReviewDate: '2026-03-22',
    };

    const updated = calculateNextReview(current, { quality: 5 });
    expect(updated.easeFactor).toBeGreaterThan(2.5);
  });

  it('never drops ease factor below 1.3', () => {
    const current: WordReviewData = {
      word: 'hard',
      easeFactor: 1.3,
      interval: 1,
      repetitions: 0,
      nextReviewDate: '2026-03-22',
      lastReviewDate: '2026-03-22',
    };

    const updated = calculateNextReview(current, { quality: 0 });
    expect(updated.easeFactor).toBeGreaterThanOrEqual(1.3);
  });
});

describe('Spaced Repetition - Word due detection', () => {
  it('returns true for words due today', () => {
    const today = new Date().toISOString().split('T')[0];
    const data: WordReviewData = {
      word: 'test',
      easeFactor: 2.5,
      interval: 1,
      repetitions: 0,
      nextReviewDate: today,
      lastReviewDate: today,
    };

    expect(isWordDueForReview(data)).toBe(true);
  });

  it('returns true for overdue words', () => {
    const data: WordReviewData = {
      word: 'test',
      easeFactor: 2.5,
      interval: 1,
      repetitions: 0,
      nextReviewDate: '2020-01-01',
      lastReviewDate: '2020-01-01',
    };

    expect(isWordDueForReview(data)).toBe(true);
  });

  it('returns false for future words', () => {
    const data: WordReviewData = {
      word: 'test',
      easeFactor: 2.5,
      interval: 1,
      repetitions: 0,
      nextReviewDate: '2099-01-01',
      lastReviewDate: '2099-01-01',
    };

    expect(isWordDueForReview(data)).toBe(false);
  });
});

describe('Spaced Repetition - Sort priority', () => {
  it('sorts overdue words before future words', () => {
    const overdue: WordReviewData = {
      word: 'overdue',
      easeFactor: 2.5,
      interval: 1,
      repetitions: 0,
      nextReviewDate: '2020-01-01',
      lastReviewDate: '2020-01-01',
    };

    const future: WordReviewData = {
      word: 'future',
      easeFactor: 2.5,
      interval: 1,
      repetitions: 0,
      nextReviewDate: '2099-01-01',
      lastReviewDate: '2099-01-01',
    };

    const sorted = sortByReviewPriority([future, overdue]);
    expect(sorted[0].word).toBe('overdue');
    expect(sorted[1].word).toBe('future');
  });

  it('sorts harder words first within same group', () => {
    const hard: WordReviewData = {
      word: 'hard',
      easeFactor: 1.3,
      interval: 1,
      repetitions: 0,
      nextReviewDate: '2020-01-01',
      lastReviewDate: '2020-01-01',
    };

    const easy: WordReviewData = {
      word: 'easy',
      easeFactor: 2.5,
      interval: 1,
      repetitions: 0,
      nextReviewDate: '2020-01-01',
      lastReviewDate: '2020-01-01',
    };

    const sorted = sortByReviewPriority([easy, hard]);
    expect(sorted[0].word).toBe('hard');
    expect(sorted[1].word).toBe('easy');
  });
});
