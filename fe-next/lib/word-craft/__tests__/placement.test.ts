import { describe, it, expect } from 'vitest';
import { createBoard, placeTiles } from '../board';
import {
  inferAxis,
  nextEmptyAlongAxis,
  resolveTap,
  resolveDrag,
  preferredAxis,
  clueAnchors,
  centerOpeningMove,
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

describe('preferredAxis (direction for tap-to-build after the first tile, replaces the Across/Down chip)', () => {
  it('Given a lone tile with no neighbours, Then it defaults to across', () => {
    const board = createBoard(11);
    expect(preferredAxis(board, p(5, 5))).toBe('h');
  });

  it('Given the tile sits directly under a board letter, Then it continues down', () => {
    const board = createBoard(11);
    placeTiles(board, [p(4, 5, 'C')]);
    expect(preferredAxis(board, p(5, 5))).toBe('v');
  });

  it('Given the tile sits right of a board letter, Then it continues across', () => {
    const board = createBoard(11);
    placeTiles(board, [p(5, 4, 'C')]);
    expect(preferredAxis(board, p(5, 5))).toBe('h');
  });

  it('Given letters on both axes, Then horizontal neighbours win the tie', () => {
    const board = createBoard(11);
    placeTiles(board, [p(5, 4, 'C'), p(5, 6, 'T'), p(4, 5, 'X')]);
    expect(preferredAxis(board, p(5, 5))).toBe('h');
  });
});

describe('clueAnchors (existing board letters a suggested word hooks onto)', () => {
  it('Given a word built through a board letter, Then that letter is the anchor', () => {
    const board = createBoard(11);
    placeTiles(board, [p(5, 5, 'A')]);
    const anchors = clueAnchors(board, [p(5, 4, 'C'), p(5, 6, 'T')], [
      { row: 5, col: 4 },
      { row: 5, col: 5 },
      { row: 5, col: 6 },
    ]);
    expect(anchors).toEqual([{ row: 5, col: 5, letter: 'A' }]);
  });

  it('Given a word on empty cells only, Then there are no anchors', () => {
    const board = createBoard(11);
    expect(clueAnchors(board, [p(5, 4, 'C')], [{ row: 5, col: 4 }])).toEqual([]);
  });
});

describe('centerOpeningMove (opening word starts on the centre cell, where auto-centre drops the first tile)', () => {
  it('Given an opening move in the corner, Then it is shifted so its first tile sits on the centre, same direction', () => {
    const board = createBoard(11);
    const moved = centerOpeningMove(board, [p(0, 0, 'C'), p(0, 1, 'A'), p(0, 2, 'T')]);
    expect(moved.map((t) => [t.row, t.col, t.letter])).toEqual([
      [5, 5, 'C'],
      [5, 6, 'A'],
      [5, 7, 'T'],
    ]);
  });

  it('Given a board that already has tiles, Then placements are untouched', () => {
    const board = createBoard(11);
    placeTiles(board, [p(2, 2, 'X')]);
    const orig = [p(2, 3, 'A')];
    expect(centerOpeningMove(board, orig)).toBe(orig);
  });

  it('Given a long word that would overflow from the centre, Then it is pulled back inside the board', () => {
    const board = createBoard(11);
    const word = [0, 1, 2, 3, 4, 5, 6].map((c) => p(0, c, 'A'));
    const moved = centerOpeningMove(board, word);
    expect(Math.max(...moved.map((t) => t.col))).toBe(10);
    expect(moved.every((t) => t.row === 5)).toBe(true);
  });
});
