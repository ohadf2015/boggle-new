/**
 * flattenTiles — converts a 2D tile grid to a flat array with stable ids + row/col coords.
 */
import { describe, it, expect } from 'vitest';
import { flattenTiles } from '../flattenTiles';
import type { TileState } from '@/types/adventure';

const t = (letter: string): TileState => ({ letter }) as unknown as TileState;

describe('flattenTiles', () => {
  it('flattens a 2x2 grid preserving row/col and assigning ids', () => {
    const grid: TileState[][] = [
      [t('A'), t('B')],
      [t('C'), t('D')],
    ];
    const flat = flattenTiles(grid);
    expect(flat).toHaveLength(4);
    expect(flat[0]).toMatchObject({ id: 'tile-0-0', row: 0, col: 0, letter: 'A' });
    expect(flat[1]).toMatchObject({ id: 'tile-0-1', row: 0, col: 1, letter: 'B' });
    expect(flat[2]).toMatchObject({ id: 'tile-1-0', row: 1, col: 0, letter: 'C' });
    expect(flat[3]).toMatchObject({ id: 'tile-1-1', row: 1, col: 1, letter: 'D' });
  });

  it('returns empty array for empty input', () => {
    expect(flattenTiles([])).toEqual([]);
  });

  it('handles non-square grids', () => {
    const grid: TileState[][] = [[t('X'), t('Y'), t('Z')]];
    const flat = flattenTiles(grid);
    expect(flat).toHaveLength(3);
    expect(flat[2]).toMatchObject({ id: 'tile-0-2', row: 0, col: 2 });
  });
});
