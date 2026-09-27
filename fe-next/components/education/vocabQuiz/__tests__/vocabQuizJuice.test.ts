/**
 * Live Vocab Quiz — the payoff rules (RED first).
 *
 * Every celebration in the quiz is decided here, as a pure function of state
 * the server already sent. Nothing in this file plays a sound or draws a frame;
 * the hook and the components read these and act, so "when does the flame
 * grow", "when is that a class sweep" and "which face is the mascot wearing"
 * are answerable without mounting anything.
 */
import { describe, it, expect } from 'vitest';
import type { VocabQuizReveal, VocabQuizStanding } from '@/shared/types/vocabQuiz';
import {
  streakStinger,
  flameScale,
  isClassSweep,
  tickRate,
  mascotStateFor,
  isPerfectRound,
} from '../vocabQuizJuice';

const standing = (username: string): VocabQuizStanding => ({
  username,
  score: 100,
  streak: 1,
  bestStreak: 1,
  correctCount: 1,
});

const reveal = (over: Partial<VocabQuizReveal> = {}): VocabQuizReveal => ({
  gameCode: 'ABC123',
  index: 0,
  total: 5,
  answerIndex: 1,
  answer: 'fragile',
  word: 'brittle',
  distribution: [0, 0, 0, 0],
  standings: [],
  nextInMs: 3_000,
  isLast: false,
  ...over,
});

describe('streakStinger', () => {
  it('says nothing for the first two in a row', () => {
    expect(streakStinger(0)).toBe('none');
    expect(streakStinger(1)).toBe('none');
    expect(streakStinger(2)).toBe('none');
  });

  it('fires the build stinger at exactly three', () => {
    expect(streakStinger(3)).toBe('build');
    expect(streakStinger(4)).toBe('none');
  });

  it('fires the fire stinger at five and every fifth after it', () => {
    expect(streakStinger(5)).toBe('fire');
    expect(streakStinger(10)).toBe('fire');
    expect(streakStinger(15)).toBe('fire');
    expect(streakStinger(7)).toBe('none');
  });
});

describe('flameScale', () => {
  it('has no flame below a streak of two', () => {
    expect(flameScale(1)).toBe(0);
  });

  it('grows with the streak', () => {
    expect(flameScale(3)).toBeGreaterThan(flameScale(2));
    expect(flameScale(5)).toBeGreaterThan(flameScale(3));
  });

  it('stops growing so a long streak cannot eat the header', () => {
    expect(flameScale(40)).toBe(flameScale(12));
  });
});

describe('isClassSweep', () => {
  it('is true only when every student answered and every one was right', () => {
    expect(
      isClassSweep(
        reveal({ answerIndex: 1, distribution: [0, 3, 0, 0], standings: [standing('a'), standing('b'), standing('c')] })
      )
    ).toBe(true);
  });

  it('is false when one student picked a distractor', () => {
    expect(
      isClassSweep(
        reveal({ answerIndex: 1, distribution: [1, 2, 0, 0], standings: [standing('a'), standing('b'), standing('c')] })
      )
    ).toBe(false);
  });

  it('is false when somebody never answered', () => {
    // Two votes, three students in the room — not a sweep, however right they were.
    expect(
      isClassSweep(
        reveal({ answerIndex: 1, distribution: [0, 2, 0, 0], standings: [standing('a'), standing('b'), standing('c')] })
      )
    ).toBe(false);
  });

  it('is false for an empty room rather than vacuously true', () => {
    expect(isClassSweep(reveal({ distribution: [0, 0, 0, 0], standings: [] }))).toBe(false);
  });
});

describe('tickRate', () => {
  it('rises as the clock runs out so the tick tightens', () => {
    expect(tickRate(1)).toBeGreaterThan(tickRate(5));
  });

  it('stays inside a range a phone speaker can render', () => {
    expect(tickRate(5)).toBeGreaterThanOrEqual(1);
    expect(tickRate(1)).toBeLessThanOrEqual(2);
  });
});

describe('isPerfectRound', () => {
  it('is true when a student answered every question correctly', () => {
    expect(isPerfectRound({ correctCount: 10, totalQuestions: 10 })).toBe(true);
  });

  it('is false one short', () => {
    expect(isPerfectRound({ correctCount: 9, totalQuestions: 10 })).toBe(false);
  });

  it('is false for a round with no questions rather than vacuously true', () => {
    expect(isPerfectRound({ correctCount: 0, totalQuestions: 0 })).toBe(false);
  });
});

describe('mascotStateFor', () => {
  it('thinks while the clock runs', () => {
    expect(mascotStateFor({ phase: 'question', answered: false, correct: null, streak: 0 })).toBe('thinking');
  });

  it('holds its breath once the student has locked in', () => {
    expect(mascotStateFor({ phase: 'question', answered: true, correct: null, streak: 0 })).toBe('spectating');
  });

  it('cheers a correct answer and oops a wrong one', () => {
    expect(mascotStateFor({ phase: 'reveal', answered: true, correct: true, streak: 1 })).toBe('celebration');
    expect(mascotStateFor({ phase: 'reveal', answered: true, correct: false, streak: 0 })).toBe('oops');
  });

  it('is mindblown at a five-streak, which outranks the plain cheer', () => {
    expect(mascotStateFor({ phase: 'reveal', answered: true, correct: true, streak: 5 })).toBe('mindblown');
  });

  it('catches fire on the way there', () => {
    expect(mascotStateFor({ phase: 'reveal', answered: true, correct: true, streak: 3 })).toBe('onfire');
  });

  it('takes the trophy when the round is over', () => {
    expect(mascotStateFor({ phase: 'ended', answered: false, correct: null, streak: 0 })).toBe('trophy');
  });
});
