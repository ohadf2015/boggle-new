/**
 * cascadeBlastWord — per-player cascade independence (REAL logic, no mocks).
 *
 * Proves the core "tiles shouldn't be synced between players" fix: applying a
 * word's tile-clear + gravity to one player's board must not touch another's.
 * Uses the real processTilesForWord/computeGravityResult so this actually
 * verifies behavior (the handler tests mock those).
 */
import { describe, it, expect } from 'vitest';
import { initBlastModeState, getOrInitPlayerBoard, cascadeBlastWord } from '../blastModeManager';

const GRID = [
  ['C', 'A', 'T'],
  ['D', 'O', 'G'],
  ['B', 'I', 'N'],
];

describe('cascadeBlastWord — per-player independence', () => {
  it("clears tiles on the submitting player's board only", () => {
    const state = initBlastModeState(GRID, ['alice', 'bob'], 1, 4242);
    const alice = getOrInitPlayerBoard(state, 'alice');
    const bobBefore = JSON.stringify(getOrInitPlayerBoard(state, 'bob').tileStates);

    // Alice plays a 2-tile word along the top row.
    const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }];
    const result = cascadeBlastWord(alice, path, 'CA', 1, 'en');

    expect(result.totalMoves).toBe(1);
    expect(alice.totalMoves).toBe(1);
    // Bob's board is byte-for-byte unchanged.
    expect(JSON.stringify(getOrInitPlayerBoard(state, 'bob').tileStates)).toBe(bobBefore);
    expect(getOrInitPlayerBoard(state, 'bob').totalMoves).toBe(0);
  });

  it('advances the same board across consecutive words (totalMoves increments)', () => {
    const state = initBlastModeState(GRID, ['alice'], 1, 4242);
    const alice = getOrInitPlayerBoard(state, 'alice');
    cascadeBlastWord(alice, [{ row: 0, col: 0 }], 'C', 1, 'en');
    const second = cascadeBlastWord(alice, [{ row: 0, col: 1 }], 'A', 1, 'en');
    expect(second.totalMoves).toBe(2);
    expect(alice.totalMoves).toBe(2);
  });
});
