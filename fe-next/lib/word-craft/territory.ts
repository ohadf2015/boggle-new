import type { Board, BoardCell, CellOwner } from './board';
import type { PlacedTile } from './types';

export type Owner = Exclude<CellOwner, null>;

export interface Coord {
  row: number;
  col: number;
}

export interface CaptureResult {
  capturedCells: Coord[];
  bonus: number;
}

/** Per-claimed-cell endgame point award. Final score adds N × claimed. */
export const TERRITORY_ENDGAME_POINTS_PER_CELL = 2;

function coordKey(r: number, c: number): string {
  return `${r},${c}`;
}

/**
 * Walk every word played this turn. For each anchor cell (a cell the word
 * crosses that was NOT placed this turn) owned by the opponent, mark it
 * captured and add its existing tile value to the bonus. Newly-placed cells
 * and own-owned anchors are ignored — newly-placed cells get claimed by
 * applyClaims separately.
 *
 * Cross-words can share an anchor; the result deduplicates so a cell flips
 * (and scores its value) at most once per turn.
 */
export function resolveCaptures(
  prevBoard: Board,
  placements: PlacedTile[],
  wordCoordLists: readonly Coord[][],
  by: Owner,
): CaptureResult {
  const placedKeys = new Set(placements.map((p) => coordKey(p.row, p.col)));
  const captured = new Map<string, Coord>();
  let bonus = 0;
  for (const word of wordCoordLists) {
    for (const c of word) {
      const key = coordKey(c.row, c.col);
      if (placedKeys.has(key)) continue;
      if (captured.has(key)) continue;
      const cell = prevBoard.cells[c.row]?.[c.col];
      if (!cell || !cell.tile) continue;
      const owner = cell.claim ?? null;
      if (owner === null || owner === by) continue;
      captured.set(key, { row: c.row, col: c.col });
      bonus += cell.tile.value;
    }
  }
  return { capturedCells: Array.from(captured.values()), bonus };
}

/**
 * Returns a NEW board where every newly-placed cell and every captured cell
 * is marked claimed by `by`. The input board is not mutated.
 */
export function applyClaims(
  prevBoard: Board,
  placements: PlacedTile[],
  capturedCells: readonly Coord[],
  by: Owner,
): Board {
  const cells: BoardCell[][] = prevBoard.cells.map((row) => row.map((c) => ({ ...c })));
  for (const p of placements) {
    cells[p.row][p.col].claim = by;
  }
  for (const c of capturedCells) {
    cells[c.row][c.col].claim = by;
  }
  return { cells, size: prevBoard.size };
}

export function countClaimed(board: Board, by: Owner): number {
  let n = 0;
  for (const row of board.cells) {
    for (const cell of row) {
      if (cell.claim === by) n++;
    }
  }
  return n;
}

export function endgameTerritoryBonus(board: Board, by: Owner): number {
  return countClaimed(board, by) * TERRITORY_ENDGAME_POINTS_PER_CELL;
}
