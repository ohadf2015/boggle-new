/**
 * Blast Board Regen — exhaustion decision tests.
 * The shrink-until-clear rule lives in isBlastBoardExhausted; both the human
 * word path and bot paths key off it, so it must be exactly right.
 */
import { describe, it, expect, vi } from 'vitest';
import { isBlastBoardExhausted } from '../blastBoardRegen';
import type { BlastTileState } from '@/shared/types/blast';

function tile(isCleared: boolean): BlastTileState {
  return {
    uid: 't', row: 0, col: 0, type: 'standard',
    isCleared, activationEffect: null, hitsRemaining: 0,
  };
}

/** Build a 1-row board with `surviving` live tiles followed by `cleared` cleared tiles. */
function board(surviving: number, cleared: number): BlastTileState[][] {
  return [[
    ...Array.from({ length: surviving }, () => tile(false)),
    ...Array.from({ length: cleared }, () => tile(true)),
  ]];
}

describe('isBlastBoardExhausted', () => {
  it('is exhausted when every tile is cleared (full clear)', () => {
    expect(isBlastBoardExhausted(board(0, 9), 3)).toBe(true);
  });

  it('is NOT exhausted while plenty of tiles survive', () => {
    expect(isBlastBoardExhausted(board(20, 16), 3)).toBe(false);
  });

  it('is exhausted when survivors drop below minWordLength (soft-freeze guard)', () => {
    // 2 survivors, min length 3 → can never form a word → refresh.
    expect(isBlastBoardExhausted(board(2, 34), 3)).toBe(true);
  });

  it('is NOT exhausted when survivors exactly meet minWordLength', () => {
    expect(isBlastBoardExhausted(board(3, 33), 3)).toBe(false);
  });

  it('never freezes on a tiny min length: floors the threshold at 2', () => {
    // A degenerate minWordLength of 1 must still refresh a single-tile board.
    expect(isBlastBoardExhausted(board(1, 35), 1)).toBe(true);
    expect(isBlastBoardExhausted(board(2, 34), 1)).toBe(false);
  });
});

describe('isBlastBoardExhausted — a sparse board with no word left', () => {
  const DICT = new Set(['cat', 'act']);
  const hasWord = (w: string) => DICT.has(w.toLowerCase());
  /** 2x3 board; `live` letters on the bottom row, top row cleared. */
  function sparse(live: string[]) {
    const grid = [['a', 'a', 'a'], live];
    const tiles = [[tile(true), tile(true), tile(true)], live.map(() => tile(false))];
    return { grid, tiles };
  }

  it('Given few tiles that spell nothing, Then the board is exhausted (it would sit stuck until the timer)', () => {
    const { grid, tiles } = sparse(['x', 'q', 'z']);
    expect(isBlastBoardExhausted(tiles, 3, { grid, checkWord: hasWord })).toBe(true);
  });

  it('Given few tiles that still spell a word, Then play goes on', () => {
    const { grid, tiles } = sparse(['c', 'a', 't']);
    expect(isBlastBoardExhausted(tiles, 3, { grid, checkWord: hasWord })).toBe(false);
  });

  it('Given a full board, Then it never runs the word search (hot path)', () => {
    const checkWord = vi.fn(() => false);
    const grid = Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => 'x'));
    const tiles = Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => tile(false)));
    expect(isBlastBoardExhausted(tiles, 3, { grid, checkWord })).toBe(false);
    expect(checkWord).not.toHaveBeenCalled();
  });
});
