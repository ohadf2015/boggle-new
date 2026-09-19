import type { Board, BoardCell } from './board';
import type { Coord, Owner } from './territory';
import type { PlacedTile } from './types';

/**
 * Surprise boxes — the per-turn variable reward. A "?" box appears near the
 * action every round; whoever covers it with a tile reveals a random reward.
 * Rewards pay out in the game's real currency (claimed squares) so they swing
 * the result, and every roll is a pure function of (seed, turn) so a replayed
 * or duelled board draws the same boxes. Language-agnostic, symmetric.
 */
export type SurpriseKind = 'paint' | 'mega' | 'steal' | 'clue';

export const SURPRISE_KINDS: readonly SurpriseKind[] = ['paint', 'mega', 'steal', 'clue'];

export interface SurpriseBox {
  row: number;
  col: number;
  kind: SurpriseKind;
}

// Common splash, occasional steal/clue, rare mega — a jackpot has to be rare
// to feel like one.
const WEIGHTED: readonly SurpriseKind[] = [
  'paint', 'paint', 'paint', 'paint', 'paint',
  'steal', 'steal', 'steal',
  'clue', 'clue',
  'mega',
];

/** Most boxes live on the board at once. */
export const MAX_SURPRISES = 2;

function hash(seed: number, turn: number, salt: number): number {
  let a = ((seed >>> 0) ^ Math.imul(turn + 1, 0x9e3779b9) ^ Math.imul(salt + 1, 0x85ebca6b)) >>> 0;
  a = Math.imul(a ^ (a >>> 16), 0x21f0aaad);
  a = Math.imul(a ^ (a >>> 15), 0x735a2d97);
  return (a ^ (a >>> 15)) >>> 0;
}

export function rollSurpriseKind(seed: number, turn: number): SurpriseKind {
  return WEIGHTED[hash(seed, turn, 1) % WEIGHTED.length];
}

/**
 * Pick an empty cell 1-2 steps from an existing tile (reachable next turn,
 * never on top of another box). Null on an empty board.
 */
export function spawnSurprise(board: Board, existing: readonly SurpriseBox[], seed: number, turn: number): SurpriseBox | null {
  const taken = new Set(existing.map((b) => `${b.row},${b.col}`));
  const size = board.cells.length;
  const candidates: Coord[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board.cells[r][c].tile || taken.has(`${r},${c}`)) continue;
      let near = false;
      for (let dr = -2; dr <= 2 && !near; dr++) {
        for (let dc = -2; dc <= 2 && !near; dc++) {
          if (board.cells[r + dr]?.[c + dc]?.tile) near = true;
        }
      }
      if (near) candidates.push({ row: r, col: c });
    }
  }
  if (candidates.length === 0) return null;
  const pick = candidates[hash(seed, turn, 2) % candidates.length];
  return { ...pick, kind: rollSurpriseKind(seed, turn) };
}

export function surprisesCovered(boxes: readonly SurpriseBox[], placements: readonly PlacedTile[]): SurpriseBox[] {
  const placed = new Set(placements.map((p) => `${p.row},${p.col}`));
  return boxes.filter((b) => placed.has(`${b.row},${b.col}`));
}

export interface SurpriseResult {
  board: Board;
  /** Cells that changed hands (painted or stolen). */
  cells: Coord[];
  /** Kind actually paid out (steal with no target / bot clue → paint). */
  kind: SurpriseKind;
  /** The opener earned a clue. */
  clue: boolean;
}

function cloneCells(board: Board): BoardCell[][] {
  return board.cells.map((row) => row.map((c) => ({ ...c })));
}

// Paint claims EMPTY cells only — tiles change hands through steal/captures,
// never a splash. A rival tile later placed on a painted cell takes it back.
function paint(board: Board, box: SurpriseBox, by: Owner, radius: number, kind: SurpriseKind): SurpriseResult {
  const cells = cloneCells(board);
  const changed: Coord[] = [];
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      const cell = cells[box.row + dr]?.[box.col + dc];
      if (!cell || cell.tile || cell.claim === by) continue;
      cell.claim = by;
      changed.push({ row: box.row + dr, col: box.col + dc });
    }
  }
  return { board: { cells, size: board.size }, cells: changed, kind, clue: false };
}

export function openSurprise(board: Board, box: SurpriseBox, by: Owner): SurpriseResult {
  if (box.kind === 'clue') {
    if (by === 'player') return { board, cells: [], kind: 'clue', clue: true };
    return paint(board, box, by, 1, 'paint');
  }
  if (box.kind === 'mega') return paint(board, box, by, 2, 'mega');
  if (box.kind === 'steal') {
    const rivals: (Coord & { d: number })[] = [];
    board.cells.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell.tile && cell.claim && cell.claim !== by) {
          rivals.push({ row: r, col: c, d: Math.max(Math.abs(r - box.row), Math.abs(c - box.col)) });
        }
      }),
    );
    if (rivals.length === 0) return paint(board, box, by, 1, 'paint');
    rivals.sort((a, b) => a.d - b.d || a.row - b.row || a.col - b.col);
    const cells = cloneCells(board);
    const stolen = rivals.slice(0, 3).map(({ row, col }) => {
      cells[row][col].claim = by;
      return { row, col };
    });
    return { board: { cells, size: board.size }, cells: stolen, kind: 'steal', clue: false };
  }
  return paint(board, box, by, 1, 'paint');
}

/** Ranking bonus per box a candidate move would open (~a couple of stolen squares). */
export const SURPRISE_MOVE_VALUE = 4;

export function surpriseValue(boxes: readonly SurpriseBox[], placements: readonly PlacedTile[]): number {
  return surprisesCovered(boxes, placements).length * SURPRISE_MOVE_VALUE;
}
