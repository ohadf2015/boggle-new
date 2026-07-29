/**
 * Error Analysis Tests
 *
 * Tests for session error classification and pattern analysis.
 */

import {
  classifyError,
  levenshteinDistance,
  analyzeSessionErrors,
  type WordAttemptRecord,
} from './errorAnalysis';

function makeAttempt(overrides: Partial<WordAttemptRecord> = {}): WordAttemptRecord {
  return {
    word: 'apple',
    userAnswer: 'apple',
    correct: true,
    timeSpentMs: 500,
    attemptNumber: 1,
    ...overrides,
  };
}

describe('levenshteinDistance', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshteinDistance('apple', 'apple')).toBe(0);
  });

  it('returns 1 for single insertion', () => {
    expect(levenshteinDistance('apple', 'aple')).toBe(1);
  });

  it('returns 1 for single deletion', () => {
    expect(levenshteinDistance('aple', 'apple')).toBe(1);
  });

  it('returns 1 for single substitution', () => {
    expect(levenshteinDistance('apple', 'apble')).toBe(1);
  });

  it('returns correct distance for multi-character changes', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
  });

  it('returns length of b when a is empty', () => {
    expect(levenshteinDistance('', 'abc')).toBe(3);
  });

  it('returns length of a when b is empty', () => {
    expect(levenshteinDistance('abc', '')).toBe(3);
  });

  it('handles same-length different strings', () => {
    expect(levenshteinDistance('cat', 'dog')).toBe(3);
  });
});

describe('classifyError', () => {
  it('returns null for correct answers', () => {
    const attempt = makeAttempt({ correct: true });
    expect(classifyError(attempt)).toBeNull();
  });

  it('returns typo for Levenshtein distance <= 2', () => {
    const attempt = makeAttempt({
      word: 'apple',
      userAnswer: 'aple',
      correct: false,
      timeSpentMs: 800,
    });
    expect(classifyError(attempt)).toBe('typo');
  });

  it('returns typo for distance exactly 2', () => {
    const attempt = makeAttempt({
      word: 'apple',
      userAnswer: 'aplle',  // distance 2
      correct: false,
      timeSpentMs: 800,
    });
    // 'apple' vs 'aplle': a-p-p-l-e vs a-p-l-l-e — distance 2
    expect(classifyError(attempt)).toBe('typo');
  });

  it('returns timeout when timeSpentMs > 10000', () => {
    const attempt = makeAttempt({
      word: 'banana',
      userAnswer: 'xyz',
      correct: false,
      timeSpentMs: 11000,
    });
    expect(classifyError(attempt)).toBe('timeout');
  });

  it('returns repeated when attemptNumber >= 3', () => {
    const attempt = makeAttempt({
      word: 'banana',
      userAnswer: 'banaana',
      correct: false,
      timeSpentMs: 800,
      attemptNumber: 3,
    });
    // distance('banana','banaana') = 1 — but repeated takes priority
    // Actually: typo (distance 1) vs repeated (attempt 3)
    // Per spec: repeated = same word wrong 3+ times → attemptNumber >= 3
    expect(classifyError(attempt)).toBe('repeated');
  });

  it('returns conceptual for large edit distance and no timeout or repeat', () => {
    const attempt = makeAttempt({
      word: 'elephant',
      userAnswer: 'cat',
      correct: false,
      timeSpentMs: 2000,
      attemptNumber: 1,
    });
    expect(classifyError(attempt)).toBe('conceptual');
  });

  it('prioritizes timeout over typo when both conditions met', () => {
    const attempt = makeAttempt({
      word: 'apple',
      userAnswer: 'aple',
      correct: false,
      timeSpentMs: 15000, // timeout
      attemptNumber: 1,
    });
    // timeout takes priority over typo
    expect(classifyError(attempt)).toBe('timeout');
  });

  it('prioritizes repeated over typo', () => {
    const attempt = makeAttempt({
      word: 'apple',
      userAnswer: 'aple',
      correct: false,
      timeSpentMs: 500,
      attemptNumber: 3,
    });
    expect(classifyError(attempt)).toBe('repeated');
  });
});

describe('analyzeSessionErrors', () => {
  it('returns empty patterns for all-correct attempts', () => {
    const attempts = [
      makeAttempt({ word: 'cat', userAnswer: 'cat', correct: true, timeSpentMs: 400 }),
      makeAttempt({ word: 'dog', userAnswer: 'dog', correct: true, timeSpentMs: 500 }),
    ];
    const result = analyzeSessionErrors(attempts);
    expect(result.patterns).toHaveLength(0);
    expect(result.overallAccuracy).toBe(1.0);
  });

  it('calculates overallAccuracy correctly', () => {
    const attempts = [
      makeAttempt({ word: 'a', correct: true }),
      makeAttempt({ word: 'b', correct: true }),
      makeAttempt({ word: 'c', correct: false, userAnswer: 'xyz', timeSpentMs: 500 }),
      makeAttempt({ word: 'd', correct: false, userAnswer: 'abc', timeSpentMs: 500 }),
    ];
    const result = analyzeSessionErrors(attempts);
    expect(result.overallAccuracy).toBeCloseTo(0.5, 5);
  });

  it('identifies strong words (correct first try, fast)', () => {
    const attempts = [
      makeAttempt({ word: 'cat', correct: true, timeSpentMs: 500, attemptNumber: 1 }),
      makeAttempt({ word: 'dog', correct: true, timeSpentMs: 2000, attemptNumber: 1 }),
    ];
    const result = analyzeSessionErrors(attempts);
    expect(result.strongWords).toContain('cat');
    expect(result.strongWords).not.toContain('dog'); // too slow
  });

  it('identifies weak words with multiple errors', () => {
    const attempts = [
      makeAttempt({ word: 'banana', correct: false, userAnswer: 'banan', timeSpentMs: 500, attemptNumber: 1 }),
      makeAttempt({ word: 'banana', correct: false, userAnswer: 'banan', timeSpentMs: 500, attemptNumber: 2 }),
      makeAttempt({ word: 'banana', correct: true, userAnswer: 'banana', timeSpentMs: 500, attemptNumber: 3 }),
    ];
    const result = analyzeSessionErrors(attempts);
    expect(result.weakWords).toContain('banana');
  });

  it('generates error patterns for incorrect attempts', () => {
    const attempts = [
      makeAttempt({
        word: 'elephant',
        userAnswer: 'cat',
        correct: false,
        timeSpentMs: 500,
        attemptNumber: 1,
      }),
    ];
    const result = analyzeSessionErrors(attempts);
    expect(result.patterns.length).toBeGreaterThan(0);
    const pattern = result.patterns.find(p => p.word === 'elephant');
    expect(pattern).toBeDefined();
    expect(pattern?.errorType).toBe('conceptual');
  });

  it('returns recommendedFocus with at most 5 words', () => {
    const attempts: WordAttemptRecord[] = Array.from({ length: 10 }, (_, i) => ({
      word: `word${i}`,
      userAnswer: `wrong${i}`,
      correct: false,
      timeSpentMs: 500,
      attemptNumber: 1,
    }));
    const result = analyzeSessionErrors(attempts);
    expect(result.recommendedFocus.length).toBeLessThanOrEqual(5);
  });

  it('handles empty attempts array', () => {
    const result = analyzeSessionErrors([]);
    expect(result.strongWords).toEqual([]);
    expect(result.weakWords).toEqual([]);
    expect(result.patterns).toEqual([]);
    expect(result.overallAccuracy).toBe(0);
    expect(result.recommendedFocus).toEqual([]);
  });

  it('counts error frequency per word', () => {
    const attempts = [
      makeAttempt({ word: 'cat', userAnswer: 'catz', correct: false, timeSpentMs: 500, attemptNumber: 1 }),
      makeAttempt({ word: 'cat', userAnswer: 'catz', correct: false, timeSpentMs: 500, attemptNumber: 2 }),
    ];
    const result = analyzeSessionErrors(attempts);
    const pattern = result.patterns.find(p => p.word === 'cat');
    expect(pattern?.frequency).toBe(2);
  });

  it('timeout errors produce timeout pattern', () => {
    const attempts = [
      makeAttempt({
        word: 'elephant',
        userAnswer: '',
        correct: false,
        timeSpentMs: 12000,
        attemptNumber: 1,
      }),
    ];
    const result = analyzeSessionErrors(attempts);
    const pattern = result.patterns.find(p => p.word === 'elephant');
    expect(pattern?.errorType).toBe('timeout');
  });
});
