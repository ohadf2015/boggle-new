/**
 * The accuracy-only dial (RED first).
 *
 * Quizizz's de-gameify move: the same quiz with speed scoring OFF, so the kid
 * who thinks slowly still scores exactly like the kid who taps fast. The speed
 * dial is what Pro sells, so OFF zeroes ONLY the reflex half — the streak
 * stays, because a streak rewards getting it right repeatedly, not tapping.
 */
import { describe, it, expect } from 'vitest';
import { VOCAB_QUIZ_BASE_POINTS, scoreAnswer } from '../vocabQuizScoring';

describe('scoreAnswer with speed scoring OFF', () => {
  it('gives a fast correct answer no speed bonus — base and streak only', () => {
    const r = scoreAnswer({
      correct: true, elapsedMs: 100, limitMs: 20_000, streakBefore: 0, speedScoring: false,
    });
    expect(r.speedBonus).toBe(0);
    expect(r.points).toBe(VOCAB_QUIZ_BASE_POINTS);
  });

  it('gives a slow correct answer the same points as a fast one', () => {
    const fast = scoreAnswer({
      correct: true, elapsedMs: 100, limitMs: 20_000, streakBefore: 0, speedScoring: false,
    });
    const slow = scoreAnswer({
      correct: true, elapsedMs: 19_900, limitMs: 20_000, streakBefore: 0, speedScoring: false,
    });
    expect(slow.points).toBe(fast.points);
  });

  it('keeps the streak bonus — accuracy over time still counts', () => {
    const r = scoreAnswer({
      correct: true, elapsedMs: 100, limitMs: 20_000, streakBefore: 2, speedScoring: false,
    });
    expect(r.streakBonus).toBeGreaterThan(0);
    expect(r.streakAfter).toBe(3);
  });

  it('defaults to speed scoring ON when the dial is absent', () => {
    const r = scoreAnswer({ correct: true, elapsedMs: 0, limitMs: 20_000, streakBefore: 0 });
    expect(r.speedBonus).toBeGreaterThan(0);
  });
});
