/**
 * Bug 3 — "too much blast radius at once / half the level disappears".
 *
 * Bomb BFS (processBombBFS) and lightning recursion (fireLightningColumn) chain
 * with only visited-set guards — no depth or total-cleared bound. A dense cluster
 * of bombs/lightning lets a single word detonate most of the board in one move.
 *
 * These tests pin a hard per-move cap on chain-cleared tiles so a runaway chain
 * can never wipe more than ~half the board, while ordinary 1–2-special chains are
 * left untouched (no visible clipping for normal play).
 */
import { processTilesForWord, type TileProcessingInput } from '../utils/clearTilesProcessor';
import type { BlastTileState } from '@/shared/types/blast';

function tile(row: number, col: number, type: BlastTileState['type'] = 'standard', overrides?: Partial<BlastTileState>): BlastTileState {
  return { uid: `${row}-${col}`, row, col, type, isCleared: false, activationEffect: null, hitsRemaining: 0, ...overrides };
}

function makeGrid(gridSize: number, overrides?: Array<{ row: number; col: number; tile: Partial<BlastTileState> }>): BlastTileState[][] {
  const grid: BlastTileState[][] = [];
  for (let r = 0; r < gridSize; r++) {
    grid[r] = [];
    for (let c = 0; c < gridSize; c++) grid[r][c] = tile(r, c);
  }
  for (const o of overrides ?? []) {
    grid[o.row][o.col] = tile(o.row, o.col, (o.tile.type ?? 'standard') as BlastTileState['type'], o.tile);
  }
  return grid;
}

function makeInput(grid: BlastTileState[][], path: Array<{ row: number; col: number }>, word: string, opts?: Partial<TileProcessingInput>): TileProcessingInput {
  return { prev: grid, path, word, baseScore: 10, gridSize: grid.length, currentWave: 1, preDetectedCombos: [], ...opts };
}

describe('blast chain cap — runaway blast radius', () => {
  it('a fully-bomb-packed 6x6 board does NOT clear the whole board from one word', () => {
    // Every cell is a bomb. Submitting a 2-letter word lights one, whose BFS would
    // (uncapped) chain-detonate all 36. The cap must keep total clears at ~half.
    const overrides: Array<{ row: number; col: number; tile: Partial<BlastTileState> }> = [];
    for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) overrides.push({ row: r, col: c, tile: { type: 'bomb' } });
    const grid = makeGrid(6, overrides);
    const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }];

    const result = processTilesForWord(makeInput(grid, path, 'AB'));

    // 36-tile board → cap ~ floor(36*0.5)=18 chain tiles + the 2 word tiles + a
    // small atomic overshoot. Must be well under "half the level" (i.e. << 36).
    expect(result.newlyClearedCount).toBeLessThanOrEqual(22);
  });

  it('lightning-packed board does NOT clear the whole board via recursive columns', () => {
    // A 7-letter word triggers the row-clear path, which fires each lightning in
    // the target row → recursive column clears. Uncapped this floods the board.
    const overrides: Array<{ row: number; col: number; tile: Partial<BlastTileState> }> = [];
    for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) overrides.push({ row: r, col: c, tile: { type: 'lightning' } });
    const grid = makeGrid(6, overrides);
    const path = [
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 },
      { row: 1, col: 3 }, { row: 1, col: 2 }, { row: 1, col: 1 },
    ];

    const result = processTilesForWord(makeInput(grid, path, 'ABCDEFG'));

    expect(result.newlyClearedCount).toBeLessThanOrEqual(22);
  });

  it('leaves an ordinary single-bomb word fully intact (no clipping for normal play)', () => {
    // One bomb in the path, standard everywhere else. Bomb clears its full 3x3
    // (8 neighbours) — well under the cap — so nothing is clipped.
    const grid = makeGrid(6, [{ row: 2, col: 2, tile: { type: 'bomb' } }]);
    const path = [{ row: 2, col: 2 }, { row: 2, col: 3 }, { row: 2, col: 4 }];

    const result = processTilesForWord(makeInput(grid, path, 'ABC'));

    // 3 word tiles + bomb's 8 neighbours (minus the 2 path neighbours already counted)
    // — every neighbour cleared, none dropped by the cap.
    expect(result.newlyClearedCount).toBeGreaterThanOrEqual(9);
  });
});
