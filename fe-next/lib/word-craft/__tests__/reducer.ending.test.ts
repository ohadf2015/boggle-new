import { describe, it, expect } from 'vitest';
import { wordCraftReducer, buildInitialState } from '../useWordCraftGame';

// Direct proof that a WordCraft game actually REACHES an end — the user's
// "no ending" report. Two consecutive passes (one per side) terminate the game.
describe('wordCraftReducer reaches a game-over', () => {
  it('ends after two consecutive passes', () => {
    const start = buildInitialState({ seed: 1, locale: 'en', viewportDims: { size: 11, bagSize: 54 } });
    expect(start.turn).toBe('player');

    const afterFirstPass = wordCraftReducer(start, { type: 'PASS' });
    expect(afterFirstPass.turn).toBe('bot'); // not over yet — one pass
    expect(afterFirstPass.consecutivePasses).toBe(1);

    const afterSecondPass = wordCraftReducer(afterFirstPass, { type: 'PASS' });
    expect(afterSecondPass.turn).toBe('over'); // two in a row → game over
  });

  it('a commit between passes resets the deadlock counter (does not falsely end)', () => {
    const start = buildInitialState({ seed: 1, locale: 'en', viewportDims: { size: 11, bagSize: 54 } });
    const afterPass = wordCraftReducer(start, { type: 'PASS' });
    expect(afterPass.consecutivePasses).toBe(1);
    // A scoring commit clears the pass streak (real play keeps the game alive).
    const afterCommit = wordCraftReducer(afterPass, {
      type: 'COMMIT_BOT',
      placements: [],
      score: 0,
      words: [],
    });
    expect(afterCommit.consecutivePasses).toBe(0);
  });
});
