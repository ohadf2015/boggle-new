/**
 * Blast Board Regen — exhaustion decision tests.
 * The shrink-until-clear rule lives in isBlastBoardExhausted; both the human
 * word path and bot paths key off it, so it must be exactly right.
 */
import { describe, it, expect } from 'vitest';
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
