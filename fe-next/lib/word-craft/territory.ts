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
export interface ResolveCapturesOptions {
  /**
   * `land_grab` modifier: after the direct anchor captures, each captured cell
   * also flips the opponent cells immediately orthogonally adjacent to it — a
   * single extra ring (NOT a flood; spread cells do not spread again). Keeps the
   * blast bounded and symmetric for both seats.
   */
  spreadToNeighbors?: boolean;
  /**
   * `golden_tiles` modifier: each listed coord (a golden tile placed this
   * turn) also captures the opponent cells orthogonally adjacent to it — same
   * one-ring, no-flood contract as spreadToNeighbors.
   */
  ringCenters?: readonly Coord[];
}

export function resolveCaptures(
  prevBoard: Board,
  placements: PlacedTile[],
  wordCoordLists: readonly Coord[][],
  by: Owner,
  options: ResolveCapturesOptions = {},
): CaptureResult {
  const placedKeys = new Set(placements.map((p) => coordKey(p.row, p.col)));
  const captured = new Map<string, Coord>();
  let bonus = 0;

  // Try to capture a single opponent-owned, tiled, not-just-placed cell. Returns
  // its tile value when it newly flips, else 0 (already captured / not eligible).
  const tryCapture = (r: number, c: number): number => {
    const key = coordKey(r, c);
    if (placedKeys.has(key)) return 0;
    if (captured.has(key)) return 0;
    const cell = prevBoard.cells[r]?.[c];
    if (!cell || !cell.tile) return 0;
    const owner = cell.claim ?? null;
    if (owner === null || owner === by) return 0;
    captured.set(key, { row: r, col: c });
    return cell.tile.value;
  };

  // Pass 1: direct anchors the played words cross.
  const directCells: Coord[] = [];
  for (const word of wordCoordLists) {
    for (const c of word) {
      const gained = tryCapture(c.row, c.col);
      if (gained > 0) {
        bonus += gained;
        directCells.push({ row: c.row, col: c.col });
      }
    }
  }

  // Pass 1b (golden_tiles): one orthogonal ring around each golden placement.
  if (options.ringCenters) {
    for (const cell of options.ringCenters) {
      const ring: [number, number][] = [
        [cell.row - 1, cell.col],
        [cell.row + 1, cell.col],
        [cell.row, cell.col - 1],
        [cell.row, cell.col + 1],
      ];
      for (const [r, c] of ring) bonus += tryCapture(r, c);
    }
  }

  // Pass 2 (land_grab): one orthogonal ring around each direct capture.
  if (options.spreadToNeighbors) {
    for (const cell of directCells) {
      const ring: [number, number][] = [
        [cell.row - 1, cell.col],
        [cell.row + 1, cell.col],
        [cell.row, cell.col - 1],
        [cell.row, cell.col + 1],
      ];
      for (const [r, c] of ring) bonus += tryCapture(r, c);
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
