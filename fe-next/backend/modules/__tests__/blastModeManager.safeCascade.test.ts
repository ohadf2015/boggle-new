/**
 * Blast cascade integrity — clone + commit-on-success.
 *
 * Bug: wordValidationHandler cascaded the player's board IN PLACE inside a broad
 * try/catch and emitted the board update INSIDE the try. A mid-cascade throw left
 * the authoritative board half-mutated, never resynced to the client, yet the word
 * still scored — every later word compounded the corruption (silent, no Sentry).
 *
 * cloneBlastBoard + safeCascadeBlastWord fix it: cascade runs on a deep clone and
 * is committed only on success; on failure the authoritative board is returned
 * untouched so the caller can always resync the client to server truth.
 */
import { describe, it, expect } from 'vitest';
import { initBlastModeState, getOrInitPlayerBoard, cloneBlastBoard, safeCascadeBlastWord } from '../blastModeManager';

const GRID = [
  ['C', 'A', 'T'],
  ['D', 'O', 'G'],
  ['R', 'A', 'T'],
];

describe('cloneBlastBoard', () => {
  it('produces a deep, independent copy (mutating the clone never touches the original)', () => {
    const state = initBlastModeState(GRID, ['alice'], 1, 42);
    const original = getOrInitPlayerBoard(state, 'alice');
    const clone = cloneBlastBoard(original);

    // Distinct references for every nested mutable structure.
    expect(clone).not.toBe(original);
    expect(clone.grid).not.toBe(original.grid);
    expect(clone.tileStates).not.toBe(original.tileStates);
    expect(clone.overlay).not.toBe(original.overlay);
    expect(clone.overlayMap).not.toBe(original.overlayMap);
    expect(clone.overlayMap).toBeInstanceOf(Map);

    // Same values though.
    expect(clone.grid).toEqual(original.grid);
    expect(clone.tileStates).toEqual(original.tileStates);

    // Mutating the clone leaves the original pristine.
    clone.grid[0][0] = 'Z';
    clone.tileStates[0][0].isCleared = true;
    clone.totalMoves = 99;
    expect(original.grid[0][0]).toBe('C');
    expect(original.tileStates[0][0].isCleared).toBeFalsy();
    expect(original.totalMoves).toBe(0);
  });
});

describe('safeCascadeBlastWord', () => {
  it('on success commits the cascade and reports ok, without mutating the original board', () => {
    const state = initBlastModeState(GRID, ['alice'], 1, 42);
    const live = getOrInitPlayerBoard(state, 'alice');
    const gridBefore = JSON.stringify(live.grid);
    const wordPath = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ]; // C-A-T

    const result = safeCascadeBlastWord(live, wordPath, 'CAT', 1, 'en');

    expect(result.ok).toBe(true);
    // Returned board is a fresh committed board, NOT the original reference.
    expect(result.board).not.toBe(live);
    expect(result.totalMoves).toBe(1);
    // The original authoritative board was NOT mutated by the cascade.
    expect(JSON.stringify(live.grid)).toBe(gridBefore);
    expect(live.totalMoves).toBe(0);
  });

  it('on cascade failure returns the UNTOUCHED authoritative board and ok=false', () => {
    const state = initBlastModeState(GRID, ['alice'], 1, 42);
    const live = getOrInitPlayerBoard(state, 'alice');
    const gridBefore = JSON.stringify(live.grid);
    const statesBefore = JSON.stringify(live.tileStates);

    // Inject a cascade that throws mid-work (simulates a corrupted overlay / bad
    // tile state after a Redis restore). Integrity must hold: no corruption.
    const throwingCascade = () => {
      throw new Error('cascade boom');
    };

    const result = safeCascadeBlastWord(
      live,
      [{ row: 0, col: 0 }],
      'C',
      1,
      'en',
      throwingCascade as never,
    );

    expect(result.ok).toBe(false);
    // Caller gets the authoritative board to resync the client — same reference.
    expect(result.board).toBe(live);
    expect(result.clearedCount).toBe(0);
    // Authoritative board is byte-for-byte intact (no half-mutation).
    expect(JSON.stringify(live.grid)).toBe(gridBefore);
    expect(JSON.stringify(live.tileStates)).toBe(statesBefore);
  });
});
