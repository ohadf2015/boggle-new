/**
 * blastGravity — tests that tile state fields survive the gravity pass.
 *
 * The gravity loop moves surviving tiles down-column to fill cleared gaps.
 * Every optional BlastTileState field must be re-attached to the landed tile
 * or special-tile mechanics silently break after the first word is played.
 */

import { computeGravityResult } from '../blastGravity';
import type { BlastTileState } from '../../types';

const uid = (n: number) => `t${n}`;

const baseTile = (overrides: Partial<BlastTileState> = {}): BlastTileState => ({
  uid: uid(0),
  row: 0,
  col: 0,
  type: 'standard',
  isCleared: false,
  activationEffect: null,
  hitsRemaining: 0,
  ...overrides,
});

// 2×2 grid: top-left cleared, bottom-left has special state, right col untouched.
// computeGravityResult assumes a square gridSize×gridSize grid.
// We only assert on col 0 where our special tile lives.
const GRID_SIZE = 2;

function makeGrid(topCleared: boolean, bottomState: Partial<BlastTileState>) {
  const grid = [
    ['A', 'X'],
    ['B', 'Y'],
  ];
  const tileStates: BlastTileState[][] = [
    [
      baseTile({ uid: uid(1), row: 0, col: 0, isCleared: topCleared }),
      baseTile({ uid: uid(3), row: 0, col: 1 }),
    ],
    [
      baseTile({ uid: uid(2), row: 1, col: 0, ...bottomState }),
      baseTile({ uid: uid(4), row: 1, col: 1 }),
    ],
  ];
  return { grid, tileStates };
}

// Gravity with no refill so new-tile randomness doesn't interfere with assertions.
// Signature: (grid, tileStates, gridSize, language, specialTileChance, customDist?, spawnModifier?, rng?, refill?)
const noRefill = (grid: string[][], tileStates: BlastTileState[][]) =>
  computeGravityResult(grid, tileStates, GRID_SIZE, 'en', 0, undefined, 0, undefined, false);

describe('computeGravityResult — tile state preservation', () => {
  it('preserves standard tile that does not move', () => {
    const { grid, tileStates } = makeGrid(false, { type: 'standard' });
    const result = noRefill(grid, tileStates);
    expect(result.newTileStates[1][0].type).toBe('standard');
    expect(result.newTileStates[1][0].uid).toBe(uid(2));
  });

  it('preserves colorTag through gravity', () => {
    const { grid, tileStates } = makeGrid(false, { type: 'standard', colorTag: 'lime' });
    const result = noRefill(grid, tileStates);
    expect(result.newTileStates[1][0].colorTag).toBe('lime');
  });

  // Helper: find any "playable blank" — a non-cleared cell whose letter is empty.
  // This is the exact bad state the user reports ("blank tiles left after cascade
  // or explosion"): {isCleared:false, letter:''} renders as a selectable empty tile.
  const findLiveBlank = (
    newGrid: string[][],
    newTileStates: BlastTileState[][],
  ): { row: number; col: number } | null => {
    for (let row = 0; row < newTileStates.length; row++) {
      for (let col = 0; col < newTileStates[row].length; col++) {
        if (!newTileStates[row][col].isCleared && !newGrid[row][col]) {
          return { row, col };
        }
      }
    }
    return null;
  };

  it('never emits a playable blank when a survivor arrives with an empty letter (refill=false)', () => {
    // Upstream desync (vortex/shuffle/server-sync) can leave a tile marked alive
    // (isCleared:false) whose grid letter is ''. Gravity must repair it, not
    // pass the blank through as a selectable cell.
    const grid = [
      ['A', 'X'],
      ['', 'Y'], // bottom-left survivor has lost its letter
    ];
    const tileStates: BlastTileState[][] = [
      [
        baseTile({ uid: uid(1), row: 0, col: 0, isCleared: true }),
        baseTile({ uid: uid(3), row: 0, col: 1 }),
      ],
      [
        baseTile({ uid: uid(2), row: 1, col: 0, isCleared: false }), // alive but blank
        baseTile({ uid: uid(4), row: 1, col: 1 }),
      ],
    ];
    const result = noRefill(grid, tileStates);
    expect(findLiveBlank(result.newGrid, result.newTileStates)).toBeNull();
  });

  it('never emits a playable blank when a survivor has an empty letter (refill=true)', () => {
    const grid = [
      ['A', 'X'],
      ['', 'Y'],
    ];
    const tileStates: BlastTileState[][] = [
      [
        baseTile({ uid: uid(1), row: 0, col: 0, isCleared: true }),
        baseTile({ uid: uid(3), row: 0, col: 1 }),
      ],
      [
        baseTile({ uid: uid(2), row: 1, col: 0, isCleared: false }),
        baseTile({ uid: uid(4), row: 1, col: 1 }),
      ],
    ];
    const result = computeGravityResult(grid, tileStates, GRID_SIZE, 'en', 0, undefined, 0, undefined, true);
    expect(findLiveBlank(result.newGrid, result.newTileStates)).toBeNull();
  });

  it('refill=true fully populates every non-cleared cell (no holes after refill)', () => {
    // 3×3, col 0 fully cleared on top two rows → refill must fill them all.
    const grid = [
      ['A', 'X', 'X'],
      ['B', 'X', 'X'],
      ['C', 'X', 'X'],
    ];
    const mk = (r: number, clearedCol0: boolean) => [
      baseTile({ uid: uid(r * 3 + 1), row: r, col: 0, isCleared: clearedCol0 }),
      baseTile({ uid: uid(r * 3 + 2), row: r, col: 1 }),
      baseTile({ uid: uid(r * 3 + 3), row: r, col: 2 }),
    ];
    const tileStates: BlastTileState[][] = [mk(0, true), mk(1, true), mk(2, false)];
    const result = computeGravityResult(grid, tileStates, 3, 'en', 0, undefined, 0, undefined, true);
    expect(findLiveBlank(result.newGrid, result.newTileStates)).toBeNull();
  });

});
