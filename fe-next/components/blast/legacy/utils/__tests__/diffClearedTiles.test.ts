/**
 * Bug 2 — "tiles just disappear without any effect".
 *
 * The FX layer was fed only the submitted word's tiles, so bomb/lightning/prism
 * chain-cleared neighbours vanished with no shatter/debris. diffClearedTiles
 * recovers the FULL cleared set by diffing the pre-clear grid against the
 * post-clear grid (gravity has not run yet, so isCleared flags are intact),
 * tagging each cell with its pre-clear type for the right FX.
 */
import { diffClearedTiles } from '../diffClearedTiles';
import type { BlastTileState } from '@/shared/types/blast';

function tile(row: number, col: number, type: BlastTileState['type'] = 'standard', overrides?: Partial<BlastTileState>): BlastTileState {
  return { uid: `${row}-${col}`, row, col, type, isCleared: false, activationEffect: null, hitsRemaining: 0, ...overrides };
}
function grid(gridSize: number): BlastTileState[][] {
  const g: BlastTileState[][] = [];
  for (let r = 0; r < gridSize; r++) { g[r] = []; for (let c = 0; c < gridSize; c++) g[r][c] = tile(r, c); }
  return g;
}
function clone(g: BlastTileState[][]): BlastTileState[][] {
  return g.map(row => row.map(t => ({ ...t })));
}

describe('diffClearedTiles', () => {
  it('returns every tile that became cleared, including chain neighbours not in the word', () => {
    const pre = grid(4);
    pre[1][1] = tile(1, 1, 'bomb');
    const post = clone(pre);
    // Word cleared (1,1) bomb; its BFS cleared the surrounding standard neighbours.
    for (const [r, c] of [[1, 1], [0, 0], [0, 1], [0, 2], [1, 0], [1, 2], [2, 0], [2, 1], [2, 2]] as const) {
      post[r][c].isCleared = true;
    }
    const result = diffClearedTiles(pre, post);
    expect(result).toHaveLength(9);
    // The bomb tile carries its real type so the FX layer fires the bomb shatter.
    expect(result).toContainEqual({ row: 1, col: 1, type: 'bomb' });
    // A chain-cleared neighbour is present with its standard type (cheap debris FX).
    expect(result).toContainEqual({ row: 0, col: 0, type: 'standard' });
  });

  it('ignores tiles that were already cleared before the move', () => {
    const pre = grid(3);
    pre[0][0].isCleared = true; // a hole from a prior move
    const post = clone(pre);
    post[2][2].isCleared = true; // only this one newly cleared
    const result = diffClearedTiles(pre, post);
    expect(result).toEqual([{ row: 2, col: 2, type: 'standard' }]);
  });

  it('returns empty when nothing newly cleared', () => {
    const pre = grid(3);
    const post = clone(pre);
    expect(diffClearedTiles(pre, post)).toEqual([]);
  });

  it('reads type from the PRE grid (the type before clearing), not the post grid', () => {
    const pre = grid(2);
    pre[0][0] = tile(0, 0, 'ice');
    const post = clone(pre);
    post[0][0].isCleared = true;
    post[0][0].type = 'standard'; // engine may overwrite type post-clear
    const result = diffClearedTiles(pre, post);
    expect(result).toEqual([{ row: 0, col: 0, type: 'ice' }]);
  });
});
