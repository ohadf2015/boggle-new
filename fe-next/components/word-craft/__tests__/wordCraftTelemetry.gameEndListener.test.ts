/**
 * onWordCraftGameEnd — lets a host (the classroom Word Craft assignment) learn a
 * game finished without threading a prop through the 1,275-line game view.
 */
import { describe, it, expect, vi } from 'vitest';
import type { WordCraftState } from '@/lib/word-craft/useWordCraftGame';

vi.mock('@/utils/growthTracking', () => ({ trackGameEnd: vi.fn(), trackGameStart: vi.fn() }));

import { emitWordCraftGameEnd, onWordCraftGameEnd } from '../wordCraftTelemetry';

const state = {
  player: { score: 50 },
  bot: { score: 40 },
  turn: 'over',
  history: [{ who: 'player', words: ['cat'], score: 50, placedTileIds: [] }],
} as unknown as WordCraftState;

describe('onWordCraftGameEnd', () => {
  it('Given a subscriber, When a game ends, Then it receives the final state and hotseat flag', () => {
    const listener = vi.fn();
    const off = onWordCraftGameEnd(listener);
    emitWordCraftGameEnd(state, { hotseat: false });
    expect(listener).toHaveBeenCalledWith(state, { hotseat: false });
    off();
  });

  it('Given an unsubscribed listener, When a game ends, Then it is not called', () => {
    const listener = vi.fn();
    onWordCraftGameEnd(listener)();
    emitWordCraftGameEnd(state, { hotseat: false });
    expect(listener).not.toHaveBeenCalled();
  });

  it('Given a throwing listener, When a game ends, Then other listeners still run', () => {
    const bad = vi.fn(() => { throw new Error('boom'); });
    const good = vi.fn();
    const offBad = onWordCraftGameEnd(bad);
    const offGood = onWordCraftGameEnd(good);
    expect(() => emitWordCraftGameEnd(state, { hotseat: false })).not.toThrow();
    expect(good).toHaveBeenCalledTimes(1);
    offBad(); offGood();
  });
});
