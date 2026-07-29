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

  it('preserves isThawed on ice tile after fall', () => {
    // Top tile cleared → bottom ice tile stays, should keep isThawed
    const { grid, tileStates } = makeGrid(false, { type: 'ice', isThawed: true, hitsRemaining: 1 });
    const result = noRefill(grid, tileStates);
    expect(result.newTileStates[1][0].isThawed).toBe(true);
  });

  it('preserves portalPairId through gravity', () => {
    const { grid, tileStates } = makeGrid(false, { type: 'portal', portalPairId: 'pair-A' });
    const result = noRefill(grid, tileStates);
    expect(result.newTileStates[1][0].portalPairId).toBe('pair-A');
  });

  it('preserves fuseTimer and fuseGroupId through gravity', () => {
    const { grid, tileStates } = makeGrid(false, { type: 'fuse', fuseTimer: 2, fuseGroupId: 'fuse-1' });
    const result = noRefill(grid, tileStates);
    expect(result.newTileStates[1][0].fuseTimer).toBe(2);
    expect(result.newTileStates[1][0].fuseGroupId).toBe('fuse-1');
  });

  it('preserves crystalMultiplier through gravity', () => {
    const { grid, tileStates } = makeGrid(false, { type: 'crystal', crystalMultiplier: 3 });
    const result = noRefill(grid, tileStates);
    expect(result.newTileStates[1][0].crystalMultiplier).toBe(3);
  });

  it('preserves colorTag through gravity', () => {
    const { grid, tileStates } = makeGrid(false, { type: 'standard', colorTag: 'lime' });
    const result = noRefill(grid, tileStates);
    expect(result.newTileStates[1][0].colorTag).toBe('lime');
  });

  it('preserves countdown on countdown tile', () => {
    const { grid, tileStates } = makeGrid(false, { type: 'countdown', countdown: 3 });
    const result = noRefill(grid, tileStates);
    expect(result.newTileStates[1][0].countdown).toBe(3);
  });

  it('tile stays at bottom and keeps special state after clearing above it', () => {
    // 3×3 grid: col 0 has rows 0+1 cleared, row 2 has a crystal tile carrying
    // special state. After gravity the tile stays at row 2 (already at bottom).
    const grid = [
      ['A', 'X', 'X'],
      ['B', 'X', 'X'],
      ['C', 'X', 'X'],
    ];
    const row = (r: number, col0: Partial<BlastTileState>) => [
      baseTile({ uid: uid(r * 3 + 1), row: r, col: 0, ...col0 }),
      baseTile({ uid: uid(r * 3 + 2), row: r, col: 1 }),
      baseTile({ uid: uid(r * 3 + 3), row: r, col: 2 }),
    ];
    const tileStates: BlastTileState[][] = [
      row(0, { isCleared: true }),
      row(1, { isCleared: true }),
      row(2, { type: 'crystal', crystalMultiplier: 4, colorTag: 'pink' }),
    ];
    const result = computeGravityResult(grid, tileStates, 3, 'en', 0, undefined, 0, undefined, false);
    expect(result.newTileStates[2][0].crystalMultiplier).toBe(4);
    expect(result.newTileStates[2][0].colorTag).toBe('pink');
  });
});
