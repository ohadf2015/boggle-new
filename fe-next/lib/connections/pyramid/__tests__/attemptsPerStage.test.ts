/**
 * Pyramid per-stage attempts.
 *
 * The pyramid used to spend ONE pool of 3 lives across all 4 stages, so three
 * wrong guesses on base riddle 1 ended the run before the player ever saw the
 * finale. Attempts are now budgeted per stage: burning them on a BASE stage
 * reveals that bridge and play continues (it still feeds the finale), while
 * burning them on the FINALE is the run's only real loss — which is exactly
 * where the ad-gated revive belongs.
 */
import { describe, it, expect } from 'vitest';
import {
  initPyramidState,
  pyramidGuess,
  pyramidAdvance,
  pyramidAttemptsLeft,
  PYRAMID_ATTEMPTS_PER_STAGE,
} from '../gameLogic';
import type { PyramidPuzzle } from '../types';

const base = (n: number, bridge: string) => ({
  id: `b${n}`,
  word1: 'A',
  word2: 'B',
  bridge,
  difficulty: 'easy' as const,
});

const PYRAMID: PyramidPuzzle = {
  id: 'p1',
  metaAnswer: 'META',
  base: [base(1, 'ONE'), base(2, 'TWO'), base(3, 'THREE')],
  difficulty: 'easy',
};

const burnStage = (s: ReturnType<typeof initPyramidState>) => {
  let out = s;
  for (let i = 0; i < PYRAMID_ATTEMPTS_PER_STAGE; i++) out = pyramidGuess(out, 'nope');
  return out;
};

describe('pyramid per-stage attempts', () => {
  it('given a wrong base guess, run lives are untouched', () => {
    const s = pyramidGuess(initPyramidState(PYRAMID), 'nope');
    expect(s.status).toBe('wrong');
    expect(s.wrongAttempts).toBe(1);
  });

  it('given a base stage burnt out, it reveals the bridge and the run survives', () => {
    const s = burnStage(initPyramidState(PYRAMID));
    expect(s.status).toBe('gaveUp');
    expect(s.solvedBridges).toEqual(['ONE']);
    const next = pyramidAdvance(s);
    expect(next.status).toBe('playing');
    expect(next.stage).toBe(1);
    expect(next.wrongAttempts).toBe(0);
  });

  it('given all three base stages burnt out, the player still reaches the finale with all clues', () => {
    let s = initPyramidState(PYRAMID);
    for (let i = 0; i < 3; i++) s = pyramidAdvance(burnStage(s));
    expect(s.stage).toBe(3);
    expect(s.status).toBe('playing');
    expect(s.solvedBridges).toEqual(['ONE', 'TWO', 'THREE']);
  });

  it('given the finale is burnt out, the run goes to outOfLives so the revive can be offered', () => {
    let s = initPyramidState(PYRAMID);
    for (let i = 0; i < 3; i++) s = pyramidAdvance(burnStage(s));
    s = burnStage(s);
    expect(s.status).toBe('outOfLives');
  });

  it('given a revive after the finale burnt out, attempts are restored and play resumes at the finale', () => {
    let s = initPyramidState(PYRAMID);
    for (let i = 0; i < 3; i++) s = pyramidAdvance(burnStage(s));
    s = burnStage(s);
    const revived = pyramidGuess({ ...s, status: 'playing', wrongAttempts: 0 }, 'META');
    expect(revived.status).toBe('won');
  });

  it('pyramidAttemptsLeft counts down within the stage and resets on advance', () => {
    let s = initPyramidState(PYRAMID);
    expect(pyramidAttemptsLeft(s)).toBe(PYRAMID_ATTEMPTS_PER_STAGE);
    s = pyramidGuess(s, 'nope');
    expect(pyramidAttemptsLeft(s)).toBe(PYRAMID_ATTEMPTS_PER_STAGE - 1);
    s = pyramidAdvance(pyramidGuess(s, 'ONE'));
    expect(pyramidAttemptsLeft(s)).toBe(PYRAMID_ATTEMPTS_PER_STAGE);
  });

  it('given a correct finale guess, the run is won', () => {
    let s = initPyramidState(PYRAMID);
    for (let i = 0; i < 3; i++) s = pyramidAdvance(burnStage(s));
    expect(pyramidGuess(s, 'META').status).toBe('won');
  });
});
