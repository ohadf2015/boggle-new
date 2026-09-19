import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// The solver is mocked so the bot turn's failure paths are exercised directly.
vi.mock('../botMove', () => ({
  findBestBotMove: vi.fn(),
}));

import { findBestBotMove } from '../botMove';
import { useWordCraftGame } from '../useWordCraftGame';

const mockedFind = vi.mocked(findBestBotMove);

describe('useWordCraftGame bot turn', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 360 });
    mockedFind.mockReset();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('Given the solver throws, When the bot turn runs, Then the bot skips (not a wedge, not a game-ending pass)', () => {
    mockedFind.mockImplementation(() => {
      throw new Error('solver blew up');
    });
    const { result } = renderHook(() =>
      useWordCraftGame({ seed: 1, locale: 'en', dict: new Set(['CAT']), difficulty: 'hard' }),
    );

    act(() => result.current.pass());
    expect(result.current.state.turn).toBe('bot');
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.state.turn).toBe('player');
    expect(result.current.state.history.at(-1)).toMatchObject({ who: 'bot', kind: 'skip', score: 0 });
  });

  it('Given the solver finds no move, When the bot turn runs, Then the bot swaps letters and the game continues', () => {
    mockedFind.mockReturnValue(null);
    const { result } = renderHook(() =>
      useWordCraftGame({ seed: 1, locale: 'en', dict: new Set(['CAT']), difficulty: 'hard' }),
    );
    const rackBefore = result.current.state.bot.rack.map((t) => t.id).join();

    act(() => result.current.pass());
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.state.turn).toBe('player');
    expect(result.current.state.history.at(-1)).toMatchObject({ who: 'bot', kind: 'swap', score: 0, placedTileIds: [] });
    expect(result.current.state.bot.rack.map((t) => t.id).join()).not.toBe(rackBefore);
  });

  it('Given the player passed, When the easy bot voluntarily skips, Then the game does NOT end', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { result } = renderHook(() =>
      useWordCraftGame({ seed: 1, locale: 'en', dict: new Set(['CAT']), difficulty: 'easy' }),
    );

    act(() => result.current.pass());
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.state.turn).toBe('player');
    expect(result.current.state.history.at(-1)).toMatchObject({ who: 'bot', kind: 'skip' });
    expect(mockedFind).not.toHaveBeenCalled();
  });
});

describe('reducer — swap history', () => {
  it('Given the player swaps, Then history records a PLAYER swap (so the UI never announces it as the bot)', async () => {
    const { wordCraftReducer, buildInitialState } = await import('../useWordCraftGame');
    const s0 = buildInitialState({ seed: 1, boardSize: 15, locale: 'en' });
    const s1 = wordCraftReducer(s0, { type: 'SWAP', tilesToReturn: s0.player.rack.slice(0, 2), replacements: s0.bag.tiles.slice(0, 2) });
    expect(s1.history.at(-1)).toMatchObject({ who: 'player', kind: 'swap' });
    expect(s1.turn).toBe('bot');
  });
});
