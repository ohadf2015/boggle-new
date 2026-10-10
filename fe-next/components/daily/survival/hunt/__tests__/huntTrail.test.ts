import { describe, it, expect } from 'vitest';
import { cellCentre, trailPath, CELL_UNIT } from '../huntTrail';

describe('huntTrail', () => {
  it('puts each cell centre in the middle of its unit square', () => {
    expect(cellCentre({ row: 0, col: 0 })).toEqual({ x: CELL_UNIT / 2, y: CELL_UNIT / 2 });
    expect(cellCentre({ row: 2, col: 1 })).toEqual({ x: CELL_UNIT * 1.5, y: CELL_UNIT * 2.5 });
  });

  it('draws nothing for an empty path', () => {
    expect(trailPath([])).toBe('');
  });

  it('runs a polyline through the cells in order', () => {
    expect(trailPath([{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 2 }])).toBe('M50 50L150 50L250 150');
  });

});
