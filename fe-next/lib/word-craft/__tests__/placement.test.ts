import { describe, it, expect } from 'vitest';
import { createBoard, placeTiles } from '../board';
import {
  inferAxis,
  nextEmptyAlongAxis,
  resolveTap,
  resolveDrag,
  type Axis,
} from '../placement';
import type { PlacedTile, RackTile } from '../types';

function p(row: number, col: number, letter = 'A', rackTileId = `t${row},${col}`): PlacedTile {
  return { row, col, letter, value: 1, isBlank: false, rackTileId };
}

function rackTile(letter = 'A', id = 'r1'): RackTile {
  return { id, letter, value: 1, isBlank: false };
}

describe('inferAxis', () => {
  it('returns null when there are fewer than 2 pending tiles', () => {
    expect(inferAxis([])).toBeNull();
    expect(inferAxis([p(7, 7)])).toBeNull();
  });

  it('detects horizontal axis when row matches', () => {
    expect(inferAxis([p(7, 7), p(7, 9)])).toBe<Axis>('h');
  });

  it('detects vertical axis when column matches', () => {
    expect(inferAxis([p(7, 7), p(9, 7)])).toBe<Axis>('v');
  });

  it('returns null for diagonal placement', () => {
    expect(inferAxis([p(7, 7), p(8, 8)])).toBeNull();
  });

  it('uses the first two pending tiles even when more exist', () => {
    expect(inferAxis([p(7, 7), p(7, 9), p(7, 11)])).toBe<Axis>('h');
  });
});

describe('nextEmptyAlongAxis', () => {
  it('returns null when axis cannot be inferred', () => {
    const board = createBoard(15);
    expect(nextEmptyAlongAxis([], board)).toBeNull();
    expect(nextEmptyAlongAxis([p(7, 7)], board)).toBeNull();
  });

  it('returns next empty cell to the right of the rightmost pending in horizontal axis', () => {
    const board = createBoard(15);
    const next = nextEmptyAlongAxis([p(7, 7), p(7, 8)], board);
    expect(next).toEqual({ row: 7, col: 9 });
  });

  it('skips already-pending cells', () => {
    const board = createBoard(15);
    const next = nextEmptyAlongAxis([p(7, 7), p(7, 8), p(7, 9)], board);
    expect(next).toEqual({ row: 7, col: 10 });
  });

  it('skips already-placed tiles on the board', () => {
    const board = createBoard(15);
    placeTiles(board, [p(7, 9, 'X', 'placed-1')]);
    const next = nextEmptyAlongAxis([p(7, 7), p(7, 8)], board);
    expect(next).toEqual({ row: 7, col: 10 });
  });

  it('falls back to leftward direction when right edge is reached', () => {
    const board = createBoard(15);
    const next = nextEmptyAlongAxis([p(7, 13), p(7, 14)], board);
    expect(next).toEqual({ row: 7, col: 12 });
  });

  it('returns null when no empty cell exists on the axis', () => {
    const board = createBoard(15);
    const fullRow: PlacedTile[] = [];
    for (let c = 0; c < 15; c++) {
      fullRow.push(p(7, c, 'A', `pre-${c}`));
    }
    placeTiles(board, fullRow.slice(2)); // place all but first two on board
    const pending = [fullRow[0], fullRow[1]];
    expect(nextEmptyAlongAxis(pending, board)).toBeNull();
  });

  it('handles vertical axis correctly', () => {
    const board = createBoard(15);
    const next = nextEmptyAlongAxis([p(7, 7), p(8, 7)], board);
    expect(next).toEqual({ row: 9, col: 7 });
  });
});

describe('resolveTap (fast-path)', () => {
  it('returns no-axis-yet reason when there are zero pending tiles', () => {
    const board = createBoard(15);
    const result = resolveTap(rackTile('A', 'r1'), [], board);
    expect(result).toEqual({ reason: 'no-axis-yet' });
  });

  it('with one pending tile, places the next tap horizontally to the right', () => {
    const board = createBoard(15);
    const result = resolveTap(rackTile('Z', 'r1'), [p(7, 7)], board);
    expect(result).toEqual({
      placement: { row: 7, col: 8, letter: 'Z', value: 1, isBlank: false, rackTileId: 'r1' },
    });
  });

  it('with one pending tile at the right edge, falls back leftward', () => {
    const board = createBoard(15);
    const result = resolveTap(rackTile('Z', 'r1'), [p(7, 14)], board);
    expect(result).toEqual({
      placement: { row: 7, col: 13, letter: 'Z', value: 1, isBlank: false, rackTileId: 'r1' },
    });
  });

  it('with one pending tile, skips an occupied neighbour cell', () => {
    const board = createBoard(15);
    placeTiles(board, [p(7, 8, 'X', 'placed-1')]);
    const result = resolveTap(rackTile('Z', 'r1'), [p(7, 7)], board);
    expect('placement' in result && result.placement.col).toBe(9);
  });

  it('places tile at next empty axis cell when axis is locked', () => {
    const board = createBoard(15);
    const r = rackTile('Z', 'r1');
    const result = resolveTap(r, [p(7, 7), p(7, 8)], board);
    expect(result).toEqual({
      placement: {
        row: 7,
        col: 9,
        letter: 'Z',
        value: 1,
        isBlank: false,
        rackTileId: 'r1',
      },
    });
  });

  it('returns no-empty-on-axis when axis row is full', () => {
    const board = createBoard(15);
    const fullRow: PlacedTile[] = [];
    for (let c = 0; c < 15; c++) {
      fullRow.push(p(7, c, 'A', `pre-${c}`));
    }
    placeTiles(board, fullRow.slice(2));
    const result = resolveTap(rackTile('Z', 'r1'), [fullRow[0], fullRow[1]], board);
    expect(result).toEqual({ reason: 'no-empty-on-axis' });
  });
});

describe('resolveTap with chosenAxis (pre-selected direction)', () => {
  it('with one pending tile + vertical axis, places the next tap downward', () => {
    const board = createBoard(15);
    const result = resolveTap(rackTile('Z', 'r1'), [p(7, 7)], board, 'v');
    expect('placement' in result && result.placement.row).toBe(8);
    expect('placement' in result && result.placement.col).toBe(7);
  });

  it('with one pending tile at the bottom edge + vertical axis, falls back upward', () => {
    const board = createBoard(15);
    const result = resolveTap(rackTile('Z', 'r1'), [p(14, 7)], board, 'v');
    expect('placement' in result && result.placement.row).toBe(13);
    expect('placement' in result && result.placement.col).toBe(7);
  });

  it('still defaults to horizontal when chosenAxis is "h" or omitted', () => {
    const board = createBoard(15);
    expect(resolveTap(rackTile('Z', 'r1'), [p(7, 7)], board, 'h')).toEqual({
      placement: { row: 7, col: 8, letter: 'Z', value: 1, isBlank: false, rackTileId: 'r1' },
    });
    expect(resolveTap(rackTile('Z', 'r1'), [p(7, 7)], board)).toEqual({
      placement: { row: 7, col: 8, letter: 'Z', value: 1, isBlank: false, rackTileId: 'r1' },
    });
  });

  it('lets the inferred axis win once 2+ tiles lock a line (chosenAxis ignored)', () => {
    const board = createBoard(15);
    // Two tiles share a row → locked horizontal; a stale vertical preference
    // must not override the committed line.
    const result = resolveTap(rackTile('Z', 'r1'), [p(7, 7), p(7, 8)], board, 'v');
    expect('placement' in result && result.placement.row).toBe(7);
    expect('placement' in result && result.placement.col).toBe(9);
  });
});

describe('resolveDrag', () => {
  it('rejects drop on occupied cell', () => {
    const board = createBoard(15);
    placeTiles(board, [p(7, 7, 'X', 'placed-1')]);
    const result = resolveDrag(rackTile('Z', 'r1'), { row: 7, col: 7 }, [], board);
    expect(result).toEqual({ reason: 'occupied' });
  });

  it('rejects drop on existing pending cell', () => {
    const board = createBoard(15);
    const result = resolveDrag(rackTile('Z', 'r1'), { row: 7, col: 7 }, [p(7, 7)], board);
    expect(result).toEqual({ reason: 'occupied' });
  });

  it('accepts free drop with no axis yet', () => {
    const board = createBoard(15);
    const result = resolveDrag(rackTile('Z', 'r1'), { row: 7, col: 7 }, [], board);
    expect(result).toEqual({
      placement: {
        row: 7,
        col: 7,
        letter: 'Z',
        value: 1,
        isBlank: false,
        rackTileId: 'r1',
      },
    });
  });

  it('accepts on-axis drop when axis is locked horizontal', () => {
    const board = createBoard(15);
    const result = resolveDrag(
      rackTile('Z', 'r1'),
      { row: 7, col: 9 },
      [p(7, 7), p(7, 8)],
      board,
    );
    expect('placement' in result && result.placement.row).toBe(7);
    expect('placement' in result && result.placement.col).toBe(9);
  });

  it('returns breaks-line when drop is off the locked axis', () => {
    const board = createBoard(15);
    const result = resolveDrag(
      rackTile('Z', 'r1'),
      { row: 9, col: 9 },
      [p(7, 7), p(7, 8)],
      board,
    );
    expect(result).toEqual({ reason: 'breaks-line' });
  });

  it('allows drop on same row/col but distant from anchor while still on axis', () => {
    const board = createBoard(15);
    const result = resolveDrag(
      rackTile('Z', 'r1'),
      { row: 7, col: 12 },
      [p(7, 7), p(7, 8)],
      board,
    );
    expect('placement' in result).toBe(true);
  });
});
