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

export function resolveTap(rackTile: RackTile, pending: PlacedTile[], board: Board): ResolveResult {
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
