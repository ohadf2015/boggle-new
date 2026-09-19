import type { Board } from './board';
import type { PlacedTile, RackTile } from './types';

export type Axis = 'h' | 'v' | null;

export interface Cell {
  row: number;
  col: number;
}

export type ResolveResult =
  | { placement: PlacedTile }
  | { reason: 'no-axis-yet' | 'no-empty-on-axis' | 'occupied' | 'breaks-line' };

export function inferAxis(pending: PlacedTile[]): Axis {
  if (pending.length < 2) return null;
  const [a, b] = pending;
  if (a.row === b.row) return 'h';
  if (a.col === b.col) return 'v';
  return null;
}

function buildPendingPositionSet(pending: PlacedTile[]): Set<string> {
  return new Set(pending.map((p) => `${p.row},${p.col}`));
}

function isCellOccupied(board: Board, pendingSet: Set<string>, row: number, col: number): boolean {
  if (pendingSet.has(`${row},${col}`)) return true;
  const cell = board.cells[row]?.[col];
  return Boolean(cell?.tile);
}

export function nextEmptyAlongAxis(pending: PlacedTile[], board: Board): Cell | null {
  const axis = inferAxis(pending);
  if (!axis) return null;
  const size = board.cells.length;
  const pendingSet = buildPendingPositionSet(pending);

  if (axis === 'h') {
    const row = pending[0].row;
    let maxCol = -1;
    let minCol = size;
    for (const p of pending) {
      if (p.col > maxCol) maxCol = p.col;
      if (p.col < minCol) minCol = p.col;
    }
    for (let c = maxCol + 1; c < size; c++) {
      if (!isCellOccupied(board, pendingSet, row, c)) return { row, col: c };
    }
    for (let c = minCol - 1; c >= 0; c--) {
      if (!isCellOccupied(board, pendingSet, row, c)) return { row, col: c };
    }
    return null;
  }

  const col = pending[0].col;
  let maxRow = -1;
  let minRow = size;
  for (const p of pending) {
    if (p.row > maxRow) maxRow = p.row;
    if (p.row < minRow) minRow = p.row;
  }
  for (let r = maxRow + 1; r < size; r++) {
    if (!isCellOccupied(board, pendingSet, r, col)) return { row: r, col };
  }
  for (let r = minRow - 1; r >= 0; r--) {
    if (!isCellOccupied(board, pendingSet, r, col)) return { row: r, col };
  }
  return null;
}

function tileToPlacement(rackTile: RackTile, row: number, col: number): PlacedTile {
  return {
    row,
    col,
    letter: rackTile.letter,
    value: rackTile.value,
    isBlank: rackTile.isBlank,
    rackTileId: rackTile.id,
  };
}

export function resolveTap(
  rackTile: RackTile,
  pending: PlacedTile[],
  board: Board,
  chosenAxis: Axis = 'h',
): ResolveResult {
  if (pending.length === 0) return { reason: 'no-axis-yet' };

  // One pending tile: no axis is locked yet, so honor the player's pre-selected
  // direction (default horizontal). Drop the tap in the first empty cell along
  // that axis, scanning forward then falling back at the board edge. This lets
  // the player keep tapping rack letters to extend a word — in either
  // orientation — from the very first tile instead of dragging each one. Once a
  // second tile lands, inferAxis takes over below and chosenAxis is ignored.
  if (pending.length === 1) {
    const { row, col } = pending[0];
    const size = board.cells.length;
    const pendingSet = buildPendingPositionSet(pending);
    if (chosenAxis === 'v') {
      for (let r = row + 1; r < size; r++) {
        if (!isCellOccupied(board, pendingSet, r, col)) {
          return { placement: tileToPlacement(rackTile, r, col) };
        }
      }
      for (let r = row - 1; r >= 0; r--) {
        if (!isCellOccupied(board, pendingSet, r, col)) {
          return { placement: tileToPlacement(rackTile, r, col) };
        }
      }
      return { reason: 'no-empty-on-axis' };
    }
    for (let c = col + 1; c < size; c++) {
      if (!isCellOccupied(board, pendingSet, row, c)) {
        return { placement: tileToPlacement(rackTile, row, c) };
      }
    }
    for (let c = col - 1; c >= 0; c--) {
      if (!isCellOccupied(board, pendingSet, row, c)) {
        return { placement: tileToPlacement(rackTile, row, c) };
      }
    }
    return { reason: 'no-empty-on-axis' };
  }

  const axis = inferAxis(pending);
  if (!axis) return { reason: 'no-axis-yet' };
  const next = nextEmptyAlongAxis(pending, board);
  if (!next) return { reason: 'no-empty-on-axis' };
  return { placement: tileToPlacement(rackTile, next.row, next.col) };
}

export function resolveDrag(
  rackTile: RackTile,
  target: Cell,
  pending: PlacedTile[],
  board: Board,
): ResolveResult {
  const pendingSet = buildPendingPositionSet(pending);
  if (isCellOccupied(board, pendingSet, target.row, target.col)) {
    return { reason: 'occupied' };
  }
  const axis = inferAxis(pending);
  if (axis === 'h' && target.row !== pending[0].row) return { reason: 'breaks-line' };
  if (axis === 'v' && target.col !== pending[0].col) return { reason: 'breaks-line' };
  return { placement: tileToPlacement(rackTile, target.row, target.col) };
}

/**
 * Direction to extend a lone pending tile when the player taps rack letters
 * (no second tile placed yet). Continues whatever word the tile is touching:
 * a board letter left/right → across, above/below → down, otherwise across.
 * Replaced the manual Across/Down chip, which cost a whole row of board height.
 */
export function preferredAxis(board: Board, tile: { row: number; col: number }): Axis {
  const has = (r: number, c: number) => Boolean(board.cells[r]?.[c]?.tile);
  if (has(tile.row, tile.col - 1) || has(tile.row, tile.col + 1)) return 'h';
  if (has(tile.row - 1, tile.col) || has(tile.row + 1, tile.col)) return 'v';
  return 'h';
}

/**
 * Existing board letters inside a suggested word — the "hook it onto this
 * letter" cells a clue highlights so the player sees how the word connects.
 */
export function clueAnchors(
  board: Board,
  placements: PlacedTile[],
  wordCells: { row: number; col: number }[],
): { row: number; col: number; letter: string }[] {
  const placed = new Set(placements.map((p) => `${p.row},${p.col}`));
  const out: { row: number; col: number; letter: string }[] = [];
  for (const c of wordCells) {
    if (placed.has(`${c.row},${c.col}`)) continue;
    const tile = board.cells[c.row]?.[c.col]?.tile;
    if (tile) out.push({ row: c.row, col: c.col, letter: tile.letter });
  }
  return out;
}

/**
 * An opening move (empty board) re-anchored so its first tile sits on the
 * centre cell — where the opening auto-centre drops the player's first tile —
 * keeping direction, clamped inside the board. Territory boards have no centre
 * star, so the solver's own pick is the top-left corner. Non-opening moves are
 * returned as-is.
 */
export function centerOpeningMove(board: Board, placements: PlacedTile[]): PlacedTile[] {
  if (placements.length === 0 || board.cells.some((row) => row.some((c) => c.tile))) return placements;
  const size = board.cells.length;
  const mid = Math.floor(size / 2);
  const first = placements[0];
  const maxR = Math.max(...placements.map((t) => t.row - first.row));
  const maxC = Math.max(...placements.map((t) => t.col - first.col));
  const row0 = Math.min(mid, size - 1 - maxR);
  const col0 = Math.min(mid, size - 1 - maxC);
  return placements.map((t) => ({ ...t, row: row0 + (t.row - first.row), col: col0 + (t.col - first.col) }));
}
