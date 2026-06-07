/**
 * emitWordCraftGameEnd — WordCraft game_completed telemetry.
 *
 * WordCraft never emitted a completion event, so finished games never reached
 * analytics_events and were invisible in the admin game log. This helper routes
 * the end-of-game through the shared trackGameEnd so it persists.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WordCraftState } from '@/lib/word-craft/useWordCraftGame';

const trackGameEnd = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGameEnd: (...args: unknown[]) => trackGameEnd(...args),
}));

import { emitWordCraftGameEnd } from '../wordCraftTelemetry';

function makeState(overrides: Partial<WordCraftState> = {}): WordCraftState {
  return {
    player: { id: 'player', name: 'You', score: 120, rack: [], isBot: false },
    bot: { id: 'bot', name: 'Bot', score: 90, rack: [], isBot: true },
    turn: 'over',
    history: [
      { who: 'player', words: ['cat', 'dog'], score: 60, placedTileIds: [] },
      { who: 'bot', words: ['ox'], score: 30, placedTileIds: [] },
      { who: 'player', words: ['bird'], score: 60, placedTileIds: [] },
    ],
    ...overrides,
  } as unknown as WordCraftState;
}

describe('emitWordCraftGameEnd', () => {
  beforeEach(() => trackGameEnd.mockClear());

  it("fires trackGameEnd('word-craft', playerScore, playerWordCount, completed=true)", () => {
    emitWordCraftGameEnd(makeState(), { hotseat: false });

    expect(trackGameEnd).toHaveBeenCalledTimes(1);
    expect(trackGameEnd).toHaveBeenCalledWith(
      'word-craft',
      120,
      3, // player words: cat, dog, bird — bot's 'ox' excluded
      true,
      undefined,
      expect.objectContaining({ isWinner: true, hotseat: false }),
    );
  });

  it('marks isWinner=false when the bot scores at least as high', () => {
    emitWordCraftGameEnd(
      makeState({
        player: { id: 'p', name: 'You', score: 50, rack: [], isBot: false },
        bot: { id: 'b', name: 'Bot', score: 70, rack: [], isBot: true },
      } as unknown as Partial<WordCraftState>),
      { hotseat: false },
    );
    expect((trackGameEnd.mock.calls[0][5] as Record<string, unknown>).isWinner).toBe(false);
  });

  it('passes hotseat through to extras', () => {
    emitWordCraftGameEnd(makeState(), { hotseat: true });
    expect((trackGameEnd.mock.calls[0][5] as Record<string, unknown>).hotseat).toBe(true);
  });
});
