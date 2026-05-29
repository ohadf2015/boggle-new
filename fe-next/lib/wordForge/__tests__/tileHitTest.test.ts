import { describe, it, expect } from 'vitest';
import { tileFromPoint, stepPath, type TilePos } from '../tileHitTest';

// A 5x5 grid laid out exactly like WordForgeGrid:
//   container: padding 8px all sides, gap 4px between cells
//   measured box (border-box): 300px wide/tall, top-left at (0,0)
const RECT = { left: 0, top: 0, width: 300, height: 300 };
const GRID = 5;
const PAD = 8;
const GAP = 4;
// inner = 300 - 16 = 284 ; cell = (284 - 4*4)/5 = (284-16)/5 = 53.6
const CELL = (300 - PAD * 2 - GAP * (GRID - 1)) / GRID; // 53.6
const opts = (rtl: boolean) => ({ gridSize: GRID, padding: PAD, gap: GAP, rtl });

// center x of visual column `c` (counted from the left edge)
const colCenterX = (c: number) => PAD + c * (CELL + GAP) + CELL / 2;
const rowCenterY = (r: number) => PAD + r * (CELL + GAP) + CELL / 2;

describe('tileFromPoint', () => {
  it('LTR: maps a tap at a cell center to that logical column', () => {
    for (let c = 0; c < GRID; c++) {
      expect(tileFromPoint(colCenterX(c), rowCenterY(0), RECT, opts(false))).toEqual({ row: 0, col: c });
    }
  });

  it('LTR: maps rows correctly', () => {
    for (let r = 0; r < GRID; r++) {
      expect(tileFromPoint(colCenterX(2), rowCenterY(r), RECT, opts(false))).toEqual({ row: r, col: 2 });
    }
  });

  it('RTL: mirrors the column — leftmost visual cell is the LAST logical column', () => {
    // tap leftmost visual cell (visual c=0) → logical col 4 in rtl
    expect(tileFromPoint(colCenterX(0), rowCenterY(0), RECT, opts(true))).toEqual({ row: 0, col: GRID - 1 });
    // tap rightmost visual cell (visual c=4) → logical col 0 in rtl
    expect(tileFromPoint(colCenterX(4), rowCenterY(0), RECT, opts(true))).toEqual({ row: 0, col: 0 });
    // rows are NOT mirrored
    expect(tileFromPoint(colCenterX(0), rowCenterY(3), RECT, opts(true))).toEqual({ row: 3, col: GRID - 1 });
  });

  it('REGRESSION (padding/gap): a tap in the right-edge cell does not overflow', () => {
    // Without padding/gap accounting, x near the right edge divided by (width/gridSize)
    // would land out of range. With correct math it must resolve to the last column.
    const nearRight = RECT.left + RECT.width - PAD - 1; // just inside the right padding
    expect(tileFromPoint(nearRight, rowCenterY(0), RECT, opts(false))).toEqual({ row: 0, col: GRID - 1 });
  });

  it('returns null outside the inner grid (in the padding band)', () => {
    expect(tileFromPoint(RECT.left + 2, rowCenterY(0), RECT, opts(false))).toBeNull(); // left padding
    expect(tileFromPoint(colCenterX(0), RECT.top + 2, RECT, opts(false))).toBeNull(); // top padding
    expect(tileFromPoint(-50, -50, RECT, opts(false))).toBeNull();
  });
});

describe('stepPath (drag selection + backtrack)', () => {
  const adjacent = (a: TilePos, b: TilePos) =>
    Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1;

  it('extends the path onto an adjacent, unused tile', () => {
    const path: TilePos[] = [{ row: 0, col: 0 }];
    expect(stepPath(path, { row: 0, col: 1 }, adjacent)).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);
  });

  it('ignores a non-adjacent tile', () => {
    const path: TilePos[] = [{ row: 0, col: 0 }];
    expect(stepPath(path, { row: 4, col: 4 }, adjacent)).toEqual(path);
  });

  it('ignores the current last tile (no-op when finger stays put)', () => {
    const path: TilePos[] = [{ row: 0, col: 0 }, { row: 0, col: 1 }];
    expect(stepPath(path, { row: 0, col: 1 }, adjacent)).toEqual(path);
  });

  it('BACKTRACK: dragging back onto the second-to-last tile pops the last', () => {
    const path: TilePos[] = [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }];
    expect(stepPath(path, { row: 0, col: 1 }, adjacent)).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);
  });

  it('ignores an already-used tile that is NOT the backtrack target', () => {
    const path: TilePos[] = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 1 },
    ];
    // {0,0} is in the path but it's not the second-to-last → no change
    expect(stepPath(path, { row: 0, col: 0 }, adjacent)).toEqual(path);
  });
});
