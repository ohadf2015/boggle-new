import { describe, expect, it } from 'vitest';
import {
  FAST_SOLVE_MS,
  MASTERED_MIN_SCORE,
  classifyWordMastery,
  pickWeakestWords,
  scoreWordMastery,
  buildMasteryLists,
  type WordAttempt,
} from './score';

describe('scoreWordMastery', () => {
  it('shouldReturnUnseenWhenNoAttempts', () => {
    // GIVEN
    const attempts: WordAttempt[] = [];

    // WHEN
    const result = scoreWordMastery(attempts);

    // THEN
    expect(result.status).toBe('unseen');
    expect(result.score).toBe(0);
  });

  it('shouldMarkMasteredWhenSolvedFastWithoutHints', () => {
    // GIVEN — solved quickly, no hints, no fails
    const attempts: WordAttempt[] = [
      { outcome: 'solved', usedHint: false, durationMs: FAST_SOLVE_MS - 500 },
    ];

    // WHEN
    const result = scoreWordMastery(attempts);

    // THEN
    expect(result.status).toBe('mastered');
    expect(result.score).toBeGreaterThanOrEqual(MASTERED_MIN_SCORE);
  });

  it('shouldMarkLearningWhenHintsWereUsed', () => {
    // GIVEN
    const attempts: WordAttempt[] = [
      { outcome: 'solved', usedHint: true, durationMs: 3_000 },
    ];

    // WHEN
    const result = scoreWordMastery(attempts);

    // THEN
    expect(result.status).toBe('learning');
    expect(result.score).toBeLessThan(MASTERED_MIN_SCORE);
  });

  it('shouldMarkLearningWhenAnyAttemptFailed', () => {
    // GIVEN
    const attempts: WordAttempt[] = [
      { outcome: 'failed', usedHint: false, durationMs: null },
      { outcome: 'solved', usedHint: false, durationMs: 2_000 },
    ];

    // WHEN
    const result = scoreWordMastery(attempts);

    // THEN
    expect(result.status).toBe('learning');
  });

  it('shouldMarkLearningWhenSolvedUnhintedButSlow', () => {
    // GIVEN — no hints, no fails, but slower than the fast bar
    const attempts: WordAttempt[] = [
      { outcome: 'solved', usedHint: false, durationMs: FAST_SOLVE_MS + 2_000 },
    ];

    // WHEN
    const result = scoreWordMastery(attempts);

    // THEN
    expect(result.status).toBe('learning');
  });

  it('shouldClampScoreBetweenZeroAndOneHundred', () => {
    // GIVEN — a pile of failures
    const attempts: WordAttempt[] = Array.from({ length: 12 }, () => ({
      outcome: 'failed' as const,
      usedHint: true,
      durationMs: null,
    }));

    // WHEN
    const result = scoreWordMastery(attempts);

    // THEN
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('shouldRaiseScoreForRepeatedFastUnhintedSolves', () => {
    // GIVEN
    const once = scoreWordMastery([
      { outcome: 'solved', usedHint: false, durationMs: 2_000 },
    ]);
    const twice = scoreWordMastery([
      { outcome: 'solved', usedHint: false, durationMs: 2_000 },
      { outcome: 'solved', usedHint: false, durationMs: 1_500 },
    ]);

    // THEN
    expect(twice.score).toBeGreaterThan(once.score);
  });
});

describe('classifyWordMastery', () => {
  it('shouldReturnUnseenForEmptyAttempts', () => {
    expect(classifyWordMastery([])).toBe('unseen');
  });
});

describe('buildMasteryLists', () => {
  it('shouldSplitMasteredAndLearningSortedByScore', () => {
    // GIVEN
    const rows = [
      { word: 'cat', status: 'mastered' as const, score: 80, language: 'en' },
      { word: 'dog', status: 'mastered' as const, score: 95, language: 'en' },
      { word: 'quiz', status: 'learning' as const, score: 40, language: 'en' },
      { word: 'axiom', status: 'learning' as const, score: 15, language: 'en' },
    ];

    // WHEN
    const { mastered, learning } = buildMasteryLists(rows);

    // THEN
    expect(mastered.map((r) => r.word)).toEqual(['dog', 'cat']);
    expect(learning.map((r) => r.word)).toEqual(['axiom', 'quiz']);
  });
});

describe('pickWeakestWords', () => {
  it('shouldReturnLowestScoringLearningWordsFirst', () => {
    // GIVEN
    const rows = [
      { word: 'cat', status: 'mastered' as const, score: 90 },
      { word: 'quiz', status: 'learning' as const, score: 20 },
      { word: 'zebra', status: 'learning' as const, score: 40 },
      { word: 'axiom', status: 'learning' as const, score: 10 },
    ];

    // WHEN
    const weakest = pickWeakestWords(rows, 2);

    // THEN
    expect(weakest).toEqual(['axiom', 'quiz']);
  });

  it('shouldReturnEmptyWhenNoLearningWords', () => {
    // GIVEN
    const rows = [{ word: 'cat', status: 'mastered' as const, score: 90 }];

    // WHEN
    const weakest = pickWeakestWords(rows, 5);

    // THEN
    expect(weakest).toEqual([]);
  });

  it('shouldCapAtRequestedLimit', () => {
    // GIVEN
    const rows = [
      { word: 'a', status: 'learning' as const, score: 10 },
      { word: 'b', status: 'learning' as const, score: 11 },
      { word: 'c', status: 'learning' as const, score: 12 },
    ];

    // WHEN
    const weakest = pickWeakestWords(rows, 1);

    // THEN
    expect(weakest).toEqual(['a']);
  });
});
