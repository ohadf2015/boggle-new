/**
 * Tests for huntMode — Sprint 3 backfill (M20)
 * Verifies Wordle-style letter feedback and hunt target selection.
 */

import {
  computeLetterFeedback,
  pickHuntTarget,
  HUNT_WRONG_GUESS_DAMAGE,
  HUNT_MAX_ATTEMPTS,
  getHuntLifePoints,
} from '../huntMode';

describe('computeLetterFeedback', () => {
  it('marks all correct for exact match', () => {
    const feedback = computeLetterFeedback('HELLO', 'HELLO');
    expect(feedback).toEqual(['correct', 'correct', 'correct', 'correct', 'correct']);
  });

  it('marks all absent for no match', () => {
    const feedback = computeLetterFeedback('ABCDE', 'FGHIJ');
    expect(feedback).toEqual(['absent', 'absent', 'absent', 'absent', 'absent']);
  });

  it('marks present for right letter wrong position', () => {
    const feedback = computeLetterFeedback('HEART', 'EARTH');
    // H: in target at pos 4, but guessed at 0 → present
    // E: in target at 0, guessed at 1 → present
    // A: in target at 1, guessed at 2 → present
    // R: in target at 2, guessed at 3 → present
    // T: in target at 3, guessed at 4 → present
    expect(feedback.every(f => f === 'present' || f === 'correct')).toBe(true);
  });

  it('handles duplicate letters with frequency awareness', () => {
    // Target: POOLS — P(1), O(2), L(1), S(1)
    // Guess:  PROOF — P(correct), R(absent), O(present-pos2 matches O at pos1), O(present? only 1 O left), F(absent)
    const feedback = computeLetterFeedback('PROOF', 'POOLS');
    expect(feedback[0]).toBe('correct'); // P matches
    expect(feedback[1]).toBe('absent');  // R not in target
    // O appears twice in target; one consumed by exact logic or present logic
  });

  it('correct takes priority over present for same letter', () => {
    // Target: AABBC, Guess: AAXXA
    // A at 0: correct (exact)
    // A at 1: correct (exact)
    // X at 2: absent
    // X at 3: absent
    // A at 4: absent (both A's consumed by exact matches)
    const feedback = computeLetterFeedback('AAXXA', 'AABBC');
    expect(feedback[0]).toBe('correct');
    expect(feedback[1]).toBe('correct');
    expect(feedback[4]).toBe('absent'); // no remaining A's
  });

  it('is case-insensitive', () => {
    const feedback = computeLetterFeedback('hello', 'HELLO');
    expect(feedback).toEqual(['correct', 'correct', 'correct', 'correct', 'correct']);
  });

  it('handles single letter', () => {
    expect(computeLetterFeedback('A', 'A')).toEqual(['correct']);
    expect(computeLetterFeedback('A', 'B')).toEqual(['absent']);
  });

  it('uses min length when guess and target differ', () => {
    // Guess longer than target — only processes min(len) characters
    const feedback = computeLetterFeedback('ABCDEF', 'ABC');
    expect(feedback).toHaveLength(3);
    expect(feedback).toEqual(['correct', 'correct', 'correct']);
  });
});

describe('pickHuntTarget', () => {
  it('returns null for empty set', () => {
    expect(pickHuntTarget(new Set())).toBeNull();
  });

  it('prefers words of length 4-6', () => {
    const words = new Set(['HI', 'CAT', 'WORD', 'SEVEN', 'LONGER', 'EXTREMELY']);
    // Run multiple times to check statistical behavior
    const results = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const result = pickHuntTarget(words);
      if (result) results.add(result);
    }
    // All results should be length 4-6 (WORD, SEVEN, LONGER)
    Array.from(results).forEach(r => {
      expect(r.length).toBeGreaterThanOrEqual(4);
      expect(r.length).toBeLessThanOrEqual(6);
    });
  });

  it('falls back to 3+ letter words when no 4-6 available', () => {
    const words = new Set(['HI', 'CAT']);
    const result = pickHuntTarget(words);
    // CAT (3 letters) is the only fallback candidate (HI is < 3)
    expect(result).toBe('CAT');
  });

  it('returns null when all words are too short', () => {
    const words = new Set(['HI', 'AB', 'I']);
    expect(pickHuntTarget(words)).toBeNull();
  });

  it('returns uppercase result', () => {
    const words = new Set(['word']);
    expect(pickHuntTarget(words)).toBe('WORD');
  });

  it('respects custom length params', () => {
    const words = new Set(['AB', 'ABC', 'ABCDEFGH']);
    const result = pickHuntTarget(words, 3, 3);
    expect(result).toBe('ABC');
  });
});

describe('constants', () => {
  it('HUNT_WRONG_GUESS_DAMAGE is 15', () => {
    expect(HUNT_WRONG_GUESS_DAMAGE).toBe(15);
  });

  it('HUNT_MAX_ATTEMPTS is 7', () => {
    expect(HUNT_MAX_ATTEMPTS).toBe(7);
  });
});

describe('getHuntLifePoints', () => {
  it('returns 120 for EASY worlds (1-3)', () => {
    expect(getHuntLifePoints(1)).toBe(120);
    expect(getHuntLifePoints(2)).toBe(120);
    expect(getHuntLifePoints(3)).toBe(120);
  });

  it('returns 100 for MEDIUM worlds (4-6)', () => {
    expect(getHuntLifePoints(4)).toBe(100);
    expect(getHuntLifePoints(5)).toBe(100);
    expect(getHuntLifePoints(6)).toBe(100);
  });

  it('returns 75 for HARD worlds (7-10)', () => {
    expect(getHuntLifePoints(7)).toBe(75);
    expect(getHuntLifePoints(10)).toBe(75);
  });

  it('treats endless (world=0) as EASY baseline', () => {
    expect(getHuntLifePoints(0)).toBe(120);
  });

  it('allows at least 5 wrong guesses on hardest worlds', () => {
    expect(getHuntLifePoints(10)).toBeGreaterThanOrEqual(HUNT_WRONG_GUESS_DAMAGE * 5);
  });
});
