import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useWordCraftGame,
  wordCraftReducer,
  buildInitialState,
} from '../useWordCraftGame';
import type { RackTile } from '../types';

// First two non-blank tiles of a rack (avoid '_' which can't form a word).
function firstTwoLetters(rack: RackTile[]): [RackTile, RackTile] {
  const real = rack.filter((t) => t.letter !== '_' && !t.isBlank);
  return [real[0], real[1]];
}

function addWord(dict: Set<string>, word: string) {
  dict.add(word.toUpperCase());
  dict.add(word.toLowerCase());
}

describe('useWordCraftGame — hot-seat (pass-and-play) reducer', () => {
  it('buildInitialState carries the hotseat flag (default false)', () => {
    // GIVEN no flag THEN hotseat defaults off
    expect(buildInitialState({ seed: 1 }).hotseat).toBe(false);
    // GIVEN the flag THEN it is reflected in state
    expect(buildInitialState({ seed: 1, hotseat: true }).hotseat).toBe(true);
  });

  it('RESET preserves the hotseat flag', () => {
    const start = buildInitialState({ seed: 1, hotseat: true });
    const reset = wordCraftReducer(start, {
      type: 'RESET',
      seed: 2,
      boardSize: 15,
      locale: 'en',
    });
    expect(reset.hotseat).toBe(true);
  });

  it('COMMIT_PLAYER builds heat in bot mode but stays neutral in hot-seat', () => {
    // GIVEN a fresh state in each mode
    const bot = buildInitialState({ seed: 1, hotseat: false });
    const hot = buildInitialState({ seed: 1, hotseat: true });
    const commit = { type: 'COMMIT_PLAYER' as const, placements: [], score: 30, words: [] };

    // WHEN player scores 30
    const afterBot = wordCraftReducer(bot, commit);
    const afterHot = wordCraftReducer(hot, commit);

    // THEN bot mode accrues heat; hot-seat does not (no asymmetric overdrive)
    expect(afterBot.heat).toBeGreaterThan(0);
    expect(afterHot.heat).toBe(0);
  });
});

describe('useWordCraftGame — hot-seat (pass-and-play) hook', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 360 });
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function setup() {
    const { result, rerender } = renderHook(
      (props: { dict: Set<string> }) =>
        useWordCraftGame({ seed: 7, locale: 'en', dict: props.dict, hotseat: true }),
      { initialProps: { dict: new Set<string>() } },
    );
    const size = result.current.state.board.size;
    const ctr = Math.floor(size / 2);
    return { result, rerender, ctr };
  }

  // Drive a valid 2-tile first move for the player, returning the played word.
  function playFirstMove(
    result: ReturnType<typeof setup>['result'],
    rerender: ReturnType<typeof setup>['rerender'],
    ctr: number,
  ): { dict: Set<string>; played: string } {
    const [t0, t1] = firstTwoLetters(result.current.state.player.rack);
    act(() => {
      result.current.placeTileOnBoard(t0.id, ctr, ctr);
      result.current.placeTileOnBoard(t1.id, ctr, ctr + 1);
    });
    const dict = new Set<string>();
    addWord(dict, t0.letter + t1.letter);
    rerender({ dict });
    act(() => {
      result.current.submitMove();
    });
    return { dict, played: t0.letter + t1.letter };
  }

  it('does not auto-move the bot in hot-seat — turn waits for player 2', () => {
    const { result, rerender, ctr } = setup();
    playFirstMove(result, rerender, ctr);

    // After the player's move the turn passes to the second human (the "bot"
    // side). The auto-bot must NOT take it.
    expect(result.current.state.turn).toBe('bot');
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.state.turn).toBe('bot');
    expect(result.current.state.bot.score).toBe(0);
  });

  it("places from the active side's rack on the second human's turn", () => {
    const { result, rerender, ctr } = setup();
    playFirstMove(result, rerender, ctr);
    expect(result.current.state.turn).toBe('bot');

    // A bogus id is ignored (not in the active rack)...
    act(() => {
      result.current.placeTileOnBoard('not-a-real-tile', ctr - 1, ctr);
    });
    expect(result.current.state.pendingPlacements).toHaveLength(0);

    // ...but a tile from player 2's (the bot side's) rack stages a placement.
    const b0 = result.current.state.bot.rack.find((t) => t.letter !== '_' && !t.isBlank)!;
    act(() => {
      result.current.placeTileOnBoard(b0.id, ctr, ctr + 2);
    });
    expect(result.current.state.pendingPlacements).toHaveLength(1);
    expect(result.current.state.pendingPlacements[0].rackTileId).toBe(b0.id);
  });

  it('submitMove on player 2 turn scores for the bot side and returns the turn', () => {
    const { result, rerender, ctr } = setup();
    const { played } = playFirstMove(result, rerender, ctr);
    expect(result.current.state.turn).toBe('bot');

    // Player 2 extends the opening word by one tile at (ctr, ctr+2).
    const b0 = result.current.state.bot.rack.find((t) => t.letter !== '_' && !t.isBlank)!;
    act(() => {
      result.current.placeTileOnBoard(b0.id, ctr, ctr + 2);
    });
    // The full horizontal span is now played+b0; register it as valid.
    const dict = new Set<string>();
    addWord(dict, played);
    addWord(dict, played + b0.letter);
    rerender({ dict });

    act(() => {
      result.current.submitMove();
    });

    expect(result.current.state.bot.score).toBeGreaterThan(0);
    expect(result.current.state.turn).toBe('player');
  });
});
