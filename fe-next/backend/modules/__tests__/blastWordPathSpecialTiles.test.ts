/**
 * Regression test for a player report: "in a multiplayer game with bots,
 * special squares don't behave as special and don't explode."
 *
 * Root cause: the blast MP client submitted only the word string. The server
 * reconstructed an ARBITRARY matching path via DFS (getWordPath); whenever the
 * word had multiple valid paths (repeated letters), the reconstruction could
 * skip the special tiles the player actually dragged through. The client
 * optimistically cleared the coin / detonated the bomb, the authoritative
 * cascade did not, and the follow-up blastBoardUpdate visibly resurrected the
 * special tiles.
 *
 * Fix: the client now sends the dragged `path`; the server validates it
 * (validateBlastWordPath) and cascades/scores on THOSE cells.
 *
 * These tests are keyed off isCleared / clearedCount on the authoritative
 * board — the exact observable the player reported as stuck.
 */
import { describe, it, expect } from 'vitest';
import {
  initBlastModeState,
  getOrInitPlayerBoard,
  safeCascadeBlastWord,
  cascadeBlastWord,
  validateBlastWordPath,
  getTilesOnBoardPath,
  getWordPath,
} from '../blastModeManager';
import { makePositionsMap } from '../wordValidator';
import type { BlastTileState } from '@/shared/types/blast';

/**
 * 3x3 board where "ABC" has TWO valid paths:
 *   legacy DFS order: (0,0)→(0,1)→(0,2)   — all standard tiles
 *   player's drag:    (1,0)→(1,1)→(0,2)   — COIN then BOMB then standard
 * (0,0)→(0,1) comes first in row-major position order, so getWordPath picks it.
 */
const GRID = [
  ['A', 'B', 'C'],
  ['A', 'B', 'X'],
  ['Q', 'Z', 'W'],
];
const LEGACY_PATH = [
  { row: 0, col: 0 },
  { row: 0, col: 1 },
  { row: 0, col: 2 },
];
const PLAYER_PATH = [
  { row: 1, col: 0 }, // coin
  { row: 1, col: 1 }, // bomb
  { row: 0, col: 2 },
];
const WORD = 'ABC';
const WAVE = 3; // MP wave

type BlastState = ReturnType<typeof initBlastModeState>;

function stateWithSpecials(): BlastState {
  const state = initBlastModeState(GRID.map((r) => [...r]), ['ron', 'bot-1'], WAVE, 42);
  state.overlay.push({ row: 1, col: 0, type: 'gold' }, { row: 1, col: 1, type: 'bomb' });
  state.overlayMap.set('1,0', 'gold');
  state.overlayMap.set('1,1', 'bomb');
  const ts = state.tileStates!;
  ts[1][0] = { ...ts[1][0], type: 'gold', hitsRemaining: 0 };
  ts[1][1] = { ...ts[1][1], type: 'bomb', hitsRemaining: 0 };
  state.playerBoards = {}; // drop boards cloned before specials were forced
  return state;
}

function tileAt(ts: BlastTileState[][], row: number, col: number) {
  return ts[row][col];
}

describe('validateBlastWordPath', () => {
  it('accepts a legal dragged path', () => {
    expect(validateBlastWordPath(WORD, PLAYER_PATH, GRID, 'en')).toEqual(PLAYER_PATH);
    expect(validateBlastWordPath(WORD, LEGACY_PATH, GRID, 'en')).toEqual(LEGACY_PATH);
  });

  it('rejects malformed paths (never crash, caller falls back)', () => {
    expect(validateBlastWordPath(WORD, undefined, GRID, 'en')).toBeNull();
    expect(validateBlastWordPath(WORD, null, GRID, 'en')).toBeNull();
    expect(validateBlastWordPath(WORD, [], GRID, 'en')).toBeNull();
    // wrong length
    expect(validateBlastWordPath(WORD, PLAYER_PATH.slice(0, 2), GRID, 'en')).toBeNull();
    // letter mismatch (Q ≠ A)
    expect(validateBlastWordPath(WORD, [{ row: 2, col: 0 }, ...PLAYER_PATH.slice(1)], GRID, 'en')).toBeNull();
    // non-adjacent jump
    expect(
      validateBlastWordPath(WORD, [{ row: 1, col: 0 }, { row: 0, col: 2 }, { row: 0, col: 1 }].map((c, i) => ({ ...c })), GRID, 'en'),
    ).toBeNull();
    // reused cell
    expect(
      validateBlastWordPath(WORD, [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 0 }], GRID, 'en'),
    ).toBeNull();
    // out of bounds
    expect(
      validateBlastWordPath(WORD, [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 0, col: 9 }], GRID, 'en'),
    ).toBeNull();
  });
});

describe('blast MP special tiles: client path is authoritative (the reported bug)', () => {
  it('sanity: DFS reconstruction picks the special-free path — reproducing the report', () => {
    const positions = makePositionsMap(GRID, 'en');
    expect(getWordPath(WORD, positions)).toEqual(LEGACY_PATH);
  });

  it('HUMAN path: coin clears and bomb explodes when the dragged path crosses them', () => {
    const state = stateWithSpecials();
    const board = getOrInitPlayerBoard(state, 'ron');

    const clientPath = validateBlastWordPath(WORD, PLAYER_PATH, board.grid, 'en');
    expect(clientPath).not.toBeNull();
    const result = safeCascadeBlastWord(board, clientPath!, WORD, WAVE, 'en');
    expect(result.ok).toBe(true);

    const ts = result.board.tileStates!;
    const coin = tileAt(ts, 1, 0);
    const bomb = tileAt(ts, 1, 1);
    expect(coin.isCleared).toBe(true);
    expect(bomb.isCleared).toBe(true);
    // Bomb blast radius clears MORE than the 3 path tiles.
    expect(result.clearedCount).toBeGreaterThanOrEqual(3);
  });

  it('control: without a client path (legacy behaviour) the specials stay untouched', () => {
    const state = stateWithSpecials();
    const board = getOrInitPlayerBoard(state, 'ron');

    const result = safeCascadeBlastWord(board, getWordPath(WORD, makePositionsMap(board.grid, 'en')), WORD, WAVE, 'en');
    expect(result.ok).toBe(true);

    const ts = result.board.tileStates!;
    const coin = tileAt(ts, 1, 0);
    const bomb = tileAt(ts, 1, 1);
    // This is exactly what the player saw: word scored, coin/bomb never moved.
    expect(coin.isCleared).toBe(false);
    expect(bomb.isCleared).toBe(false);
  });

  it('tile bonus counts the special tiles on the DRAGGED path', () => {
    const state = stateWithSpecials();
    const board = getOrInitPlayerBoard(state, 'ron');
    const tiles = getTilesOnBoardPath(board.tileStates, PLAYER_PATH);
    expect(tiles).toEqual(['gold', 'bomb', 'standard']);
  });

  it('BOT path: the bot board cascade also clears coins and detonates bombs', () => {
    const state = stateWithSpecials();
    const board = getOrInitPlayerBoard(state, 'bot-1');

    cascadeBlastWord(board, PLAYER_PATH, WORD, WAVE, 'en');

    const ts = board.tileStates!;
    expect(tileAt(ts, 1, 0).isCleared).toBe(true);
    expect(tileAt(ts, 1, 1).isCleared).toBe(true);
  });
});
