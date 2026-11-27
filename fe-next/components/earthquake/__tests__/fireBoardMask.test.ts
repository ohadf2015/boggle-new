import { describe, it, expect } from 'vitest';
import { boardCellMask, isMaskedCell } from '../FireBottomEffect';

describe('fire embers never draw over the board', () => {
  it('maps the board rect (plus its hard shadow) onto canvas cells, rounding outward', () => {
    const mask = boardCellMask({ left: 21, top: 102, right: 369, bottom: 451 }, 5);
    expect(mask).toEqual({ c0: 4, c1: 76, r0: 20, r1: 92 });
  });

  it('masks every cell the board covers and nothing outside it', () => {
    const mask = boardCellMask({ left: 20, top: 100, right: 370, bottom: 450 }, 5);
    expect(isMaskedCell(mask, 4, 20)).toBe(true);
    expect(isMaskedCell(mask, 74, 90)).toBe(true);
    expect(isMaskedCell(mask, 3, 50)).toBe(false);
    expect(isMaskedCell(mask, 50, 120)).toBe(false);
  });

  it('masks nothing when no board is on screen', () => {
    expect(boardCellMask(null, 5)).toBeNull();
    expect(isMaskedCell(null, 10, 10)).toBe(false);
  });
});
