import type { Board } from '../board';
import {
  GEM_COLORS,
  type GemCell,
  type GemColor,
  type GemRarity,
} from './types';
import { mulberry32 } from '@/lib/rng/seededRandom';

/** Target on-board gem count at any time. Chosen so 4 colors fit comfortably. */
export const DEFAULT_TARGET_COUNT = 8;

/** Probability weights for rarity rolls. Chips most common, crowns rare. */
const RARITY_WEIGHTS: Record<GemRarity, number> = {
  1: 60,
  2: 30,
  3: 10,
};

function rollRarity(rand: () => number): GemRarity {
  const total = RARITY_WEIGHTS[1] + RARITY_WEIGHTS[2] + RARITY_WEIGHTS[3];
  let r = rand() * total;
  if ((r -= RARITY_WEIGHTS[1]) < 0) return 1;
  if ((r -= RARITY_WEIGHTS[2]) < 0) return 2;
  return 3;
}

function pickFreeCell(
  rand: () => number,
  board: Board,
  blocked: Set<string>,
): { row: number; col: number } | null {
  // Up to 30 tries before giving up — board is 121–225 cells, almost always
  // succeeds first try when board is mostly empty.
  for (let i = 0; i < 60; i++) {
    const row = Math.floor(rand() * board.size);
    const col = Math.floor(rand() * board.size);
    const key = `${row},${col}`;
    if (blocked.has(key)) continue;
    blocked.add(key);
    return { row, col };
  }
  return null;
}

export interface RollGemCellsArgs {
  board: Board;
  /** Cells already occupied — `${row},${col}` strings. */
  occupied: Set<string>;
  seed: number;
  /** How many gems to roll. Defaults to DEFAULT_TARGET_COUNT. */
  count?: number;
}

export function rollGemCells({ board, occupied, seed, count = DEFAULT_TARGET_COUNT }: RollGemCellsArgs): GemCell[] {
  const rand = mulberry32(seed);
  const blocked = new Set(occupied);
  const cells: GemCell[] = [];
  // Always seed with one of each color first so all 4 colors are reachable.
  const colorQueue: GemColor[] = [...GEM_COLORS];
  // Then top up with random colors.
  while (colorQueue.length < count) {
    colorQueue.push(GEM_COLORS[Math.floor(rand() * GEM_COLORS.length)]);
  }
  for (let i = 0; i < count; i++) {
    const spot = pickFreeCell(rand, board, blocked);
    if (!spot) break;
    cells.push({
      row: spot.row,
      col: spot.col,
      color: colorQueue[i],
      rarity: rollRarity(rand),
      id: `g-${seed}-${i}`,
    });
  }
  return cells;
}

export interface ReplenishArgs {
  board: Board;
  occupied: Set<string>;
  current: GemCell[];
  seed: number;
  target?: number;
}

export function replenishGemCells({ board, occupied, current, seed, target = DEFAULT_TARGET_COUNT }: ReplenishArgs): GemCell[] {
  const need = target - current.length;
  if (need <= 0) return current;
  const blocked = new Set(occupied);
  for (const cell of current) blocked.add(`${cell.row},${cell.col}`);
  // Use a different sub-seed so successive replenishes don't repeat the same
  // pattern but still stay deterministic for a given (seed, current) tuple.
  const rolled = rollGemCells({ board, occupied: blocked, seed: seed + current.length * 7919, count: need });
  // Replenished cells get a unique id namespace so React keys don't collide.
  const fresh = rolled.map((cell, i) => ({ ...cell, id: `g-${seed}-r${current.length}-${i}` }));
  return [...current, ...fresh];
}
