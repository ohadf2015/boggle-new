/**
 * Live Vocab Quiz — scoring rules (RED first).
 *
 * Blooket-ish: a correct answer is worth a flat base plus a speed bonus that
 * decays across the question's own clock, plus a streak bonus that rewards
 * consecutive correct answers. A wrong answer scores nothing and resets the
 * streak — that is the whole tension of the mode.
 */
import { describe, it, expect } from 'vitest';
import {
  VOCAB_QUIZ_BASE_POINTS,
  VOCAB_QUIZ_MAX_SPEED_BONUS,
  VOCAB_QUIZ_MAX_STREAK_BONUS,
  scoreAnswer,
  sortStandings,
} from '../vocabQuizScoring';

const LIMIT = 20_000;

describe('scoreAnswer', () => {
  describe('given a wrong answer', () => {
    it('scores zero and resets the streak', () => {
      const result = scoreAnswer({ correct: false, elapsedMs: 1_000, limitMs: LIMIT, streakBefore: 4 });
      expect(result.points).toBe(0);
      expect(result.streakAfter).toBe(0);
      expect(result.speedBonus).toBe(0);
      expect(result.streakBonus).toBe(0);
    });
  });

  describe('given a correct answer', () => {
    it('awards base + full speed bonus at zero elapsed', () => {
      const result = scoreAnswer({ correct: true, elapsedMs: 0, limitMs: LIMIT, streakBefore: 0 });
      expect(result.speedBonus).toBe(VOCAB_QUIZ_MAX_SPEED_BONUS);
      expect(result.streakBonus).toBe(0);
      expect(result.points).toBe(VOCAB_QUIZ_BASE_POINTS + VOCAB_QUIZ_MAX_SPEED_BONUS);
      expect(result.streakAfter).toBe(1);
    });

    it('awards base only when the answer lands as the clock expires', () => {
      const result = scoreAnswer({ correct: true, elapsedMs: LIMIT, limitMs: LIMIT, streakBefore: 0 });
      expect(result.speedBonus).toBe(0);
      expect(result.points).toBe(VOCAB_QUIZ_BASE_POINTS);
    });

    it('decays the speed bonus linearly across the question clock', () => {
      const half = scoreAnswer({ correct: true, elapsedMs: LIMIT / 2, limitMs: LIMIT, streakBefore: 0 });
      expect(half.speedBonus).toBe(Math.round(VOCAB_QUIZ_MAX_SPEED_BONUS / 2));
    });

    it('never pays a negative speed bonus when an answer arrives after the clock', () => {
      const late = scoreAnswer({ correct: true, elapsedMs: LIMIT * 3, limitMs: LIMIT, streakBefore: 0 });
      expect(late.speedBonus).toBe(0);
      expect(late.points).toBe(VOCAB_QUIZ_BASE_POINTS);
    });

    it('pays no streak bonus for the first correct answer', () => {
      expect(scoreAnswer({ correct: true, elapsedMs: 0, limitMs: LIMIT, streakBefore: 0 }).streakBonus).toBe(0);
    });

    it('grows the streak bonus with each consecutive correct answer', () => {
      const second = scoreAnswer({ correct: true, elapsedMs: 0, limitMs: LIMIT, streakBefore: 1 });
      const third = scoreAnswer({ correct: true, elapsedMs: 0, limitMs: LIMIT, streakBefore: 2 });
      expect(second.streakBonus).toBeGreaterThan(0);
      expect(third.streakBonus).toBeGreaterThan(second.streakBonus);
      expect(second.streakAfter).toBe(2);
      expect(third.streakAfter).toBe(3);
    });

    it('caps the streak bonus so one runaway student cannot lap the class', () => {
      const huge = scoreAnswer({ correct: true, elapsedMs: 0, limitMs: LIMIT, streakBefore: 50 });
      expect(huge.streakBonus).toBe(VOCAB_QUIZ_MAX_STREAK_BONUS);
    });
  });

  describe('given a degenerate question clock', () => {
    it('treats a zero limit as "no speed bonus" rather than dividing by zero', () => {
      const result = scoreAnswer({ correct: true, elapsedMs: 0, limitMs: 0, streakBefore: 0 });
      expect(Number.isFinite(result.points)).toBe(true);
      expect(result.points).toBe(VOCAB_QUIZ_BASE_POINTS);
    });
  });
});

describe('sortStandings', () => {
  it('ranks by score descending', () => {
    const ranked = sortStandings([
      { username: 'ana', score: 10, streak: 0, bestStreak: 0, correctCount: 1 },
      { username: 'bo', score: 90, streak: 0, bestStreak: 0, correctCount: 3 },
    ]);
    expect(ranked.map((p) => p.username)).toEqual(['bo', 'ana']);
  });

  it('breaks a score tie on correct count, then on name, so standings never flicker', () => {
    const ranked = sortStandings([
      { username: 'zoe', score: 100, streak: 0, bestStreak: 0, correctCount: 1 },
      { username: 'ana', score: 100, streak: 0, bestStreak: 0, correctCount: 1 },
      { username: 'mo', score: 100, streak: 0, bestStreak: 0, correctCount: 2 },
    ]);
    expect(ranked.map((p) => p.username)).toEqual(['mo', 'ana', 'zoe']);
  });

  it('does not mutate the input array', () => {
    const input = [
      { username: 'ana', score: 10, streak: 0, bestStreak: 0, correctCount: 0 },
      { username: 'bo', score: 90, streak: 0, bestStreak: 0, correctCount: 0 },
    ];
    sortStandings(input);
    expect(input[0].username).toBe('ana');
  });
});
