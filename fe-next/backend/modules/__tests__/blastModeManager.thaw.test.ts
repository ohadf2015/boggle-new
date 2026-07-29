/**
 * cascadeBlastWord — server-side ice/frozen THAW (MP parity with client).
 *
 * Bug: in MP the server is authoritative and emits a full board, but
 * cascadeBlastWord never computed `isThawed`. The client computes thaw locally
 * (useBlastEngine.computeThawedCells), then the server's replacement board
 * (without isThawed) overwrites it → ice/frozen tiles re-lock and the "locked"
 * overlay sticks permanently. These tests pin the server thaw so MP matches SP.
 *
 * Uses the REAL processTilesForWord/computeGravityResult (no mocks).
 */
import { describe, it, expect } from 'vitest';
import { initBlastModeState, getOrInitPlayerBoard, cascadeBlastWord } from '../blastModeManager';

const GRID = [
  ['C', 'A', 'T'],
  ['D', 'O', 'G'],
  ['B', 'I', 'N'],
];

describe('cascadeBlastWord — ice/frozen thaw (MP)', () => {
  it('thaws an ice tile adjacent to the submitted word path', () => {
    const state = initBlastModeState(GRID, ['alice'], 1, 4242);
    const alice = getOrInitPlayerBoard(state, 'alice');

    // Plant an un-thawed ICE tile at bottom-left (2,0). It is 8-dir adjacent to
    // (1,0), which is in the word path below.
    alice.tileStates[2][0] = {
      ...alice.tileStates[2][0],
      type: 'ice',
      isThawed: false,
      isCleared: false,
    };

    // Play a 2-tile word along the middle row: (1,0)+(1,1). (1,0) is directly
    // above the ice at (2,0) → ice must thaw.
    cascadeBlastWord(alice, [{ row: 1, col: 0 }, { row: 1, col: 1 }], 'DO', 1, 'en');

    // Ice sits at the bottom row; the cleared cell is above it, so gravity keeps
    // it at (2,0). It must now be thawed (selectable → no locked overlay).
    const ice = alice.tileStates[2][0];
    expect(ice.type).toBe('ice');
    expect(ice.isThawed).toBe(true);
  });

  it('does NOT thaw an ice tile far from the word path', () => {
    const state = initBlastModeState(GRID, ['alice'], 1, 4242);
    const alice = getOrInitPlayerBoard(state, 'alice');

    // Ice at top-left (0,0); word path on bottom row — not adjacent.
    alice.tileStates[0][0] = {
      ...alice.tileStates[0][0],
      type: 'ice',
      isThawed: false,
      isCleared: false,
    };

    cascadeBlastWord(alice, [{ row: 2, col: 1 }, { row: 2, col: 2 }], 'IN', 1, 'en');

    // The ice tile (now possibly fallen, but column 0 unchanged by a col 1/2
    // clear) stays un-thawed.
    const ice = alice.tileStates.flat().find((t) => t.type === 'ice');
    expect(ice).toBeDefined();
    expect(ice?.isThawed).toBeFalsy();
  });

  it('thaws a frozen tile adjacent to the path (frozen is thawable too)', () => {
    const state = initBlastModeState(GRID, ['alice'], 1, 4242);
    const alice = getOrInitPlayerBoard(state, 'alice');

    alice.tileStates[2][2] = {
      ...alice.tileStates[2][2],
      type: 'frozen',
      isThawed: false,
      isCleared: false,
    };

    // Path (1,1)+(1,2); (1,2) is directly above frozen (2,2).
    cascadeBlastWord(alice, [{ row: 1, col: 1 }, { row: 1, col: 2 }], 'OG', 1, 'en');

    const frozen = alice.tileStates[2][2];
    expect(frozen.type).toBe('frozen');
    expect(frozen.isThawed).toBe(true);
  });
});
