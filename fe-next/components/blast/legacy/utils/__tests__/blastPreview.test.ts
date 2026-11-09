import { describe, it, expect } from 'vitest';
import { buildBlastPreview } from '../blastPreview';
import type { BlastTileState, BlastTileType } from '../../types';

function grid(overrides: Array<{ row: number; col: number; type: BlastTileType; gem?: BlastTileState['gem'] }> = []): BlastTileState[][] {
  const g: BlastTileState[][] = Array.from({ length: 6 }, (_, r) =>
    Array.from({ length: 6 }, (_, c) => ({ uid: `${r}-${c}`, row: r, col: c, type: 'standard' as BlastTileType, isCleared: false, activationEffect: null, hitsRemaining: 0 })),
  );
  for (const o of overrides) Object.assign(g[o.row][o.col], { type: o.type, gem: o.gem });
  return g;
}

describe('buildBlastPreview', () => {
  it('shows nothing for a plain short word', () => {
    expect(buildBlastPreview(grid(), [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }], 6)).toBeNull();
  });

  it('marks the 3x3 a bomb in the word will clear, without the word itself', () => {
    const tiles = grid([{ row: 2, col: 2, type: 'bomb' }]);
    const marks = buildBlastPreview(tiles, [{ row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 }], 6)!;
    expect(marks.size).toBe(6);
    expect(marks.get('1-2')).toBe('hit');
    expect(marks.has('2-2')).toBe(false);
  });

  it('marks a gem the blast will collect as a gem', () => {
    const tiles = grid([{ row: 2, col: 2, type: 'bomb' }, { row: 3, col: 3, type: 'diamond', gem: 'emerald' }]);
    const marks = buildBlastPreview(tiles, [{ row: 2, col: 1 }, { row: 2, col: 2 }], 6)!;
    expect(marks.get('3-3')).toBe('gem');
  });

  it('does not change the board it previews', () => {
    const tiles = grid([{ row: 2, col: 2, type: 'bomb' }]);
    buildBlastPreview(tiles, [{ row: 2, col: 2 }], 6);
    expect(tiles.flat().every(t => !t.isCleared)).toBe(true);
  });
});
