/**
 * Word Tower — clue gate: capped at CLUE_RUN_CAP clues per run, every clue
 * requires a rewarded ad watch (no free daily clue).
 */
import { describe, it, expect } from 'vitest';
import { CLUE_RUN_CAP, canRequestClue } from '../clueGate';

describe('clueGate', () => {
  it('allows requesting a clue while under the run cap', () => {
    expect(canRequestClue(0)).toBe(true);
    expect(canRequestClue(CLUE_RUN_CAP - 1)).toBe(true);
  });

  it('blocks requesting once the run cap is reached', () => {
    expect(canRequestClue(CLUE_RUN_CAP)).toBe(false);
    expect(canRequestClue(CLUE_RUN_CAP + 1)).toBe(false);
  });

  it('the cap is exactly 3', () => {
    expect(CLUE_RUN_CAP).toBe(3);
  });
});
