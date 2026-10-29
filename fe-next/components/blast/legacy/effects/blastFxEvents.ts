/**
 * Maps a tile-clear event to the FX cues the Pixi layer plays. Pure, so the
 * "which special gets which signature" contract is tested without WebGL.
 */
import type { BlastTileState, BlastTileType } from '../types';
import { wordFxIntensity, type WordFxIntensity } from './blastFxIntensity';

export interface FxTile {
  row: number;
  col: number;
  type: BlastTileType;
}

export type FxCue =
  | { kind: 'bomb'; x: number; y: number }
  | { kind: 'coin'; x: number; y: number; stackIndex: number }
  | { kind: 'diamond'; x: number; y: number };

export interface ClearFxPlan {
  cues: FxCue[];
  centroid: { x: number; y: number };
  /** 0 = no bomb; grows (sub-linearly) with simultaneous bombs. */
  bombPower: number;
  /** Word-level intensity; null for chain/cascade clears. */
  word: WordFxIntensity | null;
}

export function planClearFx(
  tiles: readonly FxTile[],
  { cellSize, isWordPop, score }: { cellSize: number; isWordPop: boolean; score: number },
): ClearFxPlan {
  const cues: FxCue[] = [];
  let coins = 0;
  let bombs = 0;
  let sx = 0;
  let sy = 0;
  for (const t of tiles) {
    const x = t.col * cellSize + cellSize / 2;
    const y = t.row * cellSize + cellSize / 2;
    sx += x;
    sy += y;
    if (t.type === 'bomb') {
      bombs++;
      cues.push({ kind: 'bomb', x, y });
    } else if (t.type === 'gold') cues.push({ kind: 'coin', x, y, stackIndex: coins++ });
    else if (t.type === 'diamond') cues.push({ kind: 'diamond', x, y });
  }
  const n = tiles.length;
  return {
    cues,
    centroid: n ? { x: sx / n, y: sy / n } : { x: 0, y: 0 },
    bombPower: bombs ? Math.min(1, 0.6 + 0.4 * Math.log2(bombs)) : 0,
    word: isWordPop && n > 0 ? wordFxIntensity(n, score) : null,
  };
}

/** Pick the next idle-shimmer tile from a [0,1) roll, or null when over budget. */
export function nextShimmer<T>(specials: readonly T[], roll: number, active: number, budget: number): T | null {
  if (specials.length === 0 || active >= budget) return null;
  return specials[Math.min(specials.length - 1, Math.floor(roll * specials.length))];
}

export type SpecialFxTile = { row: number; col: number; type: 'bomb' | 'gold' | 'diamond' };

export function listSpecialTiles(grid: readonly (readonly (BlastTileState | undefined)[])[]): SpecialFxTile[] {
  const out: SpecialFxTile[] = [];
  grid.forEach((cells, row) =>
    cells.forEach((t, col) => {
      if (t && !t.isCleared && (t.type === 'bomb' || t.type === 'gold' || t.type === 'diamond')) out.push({ row, col, type: t.type });
    }),
  );
  return out;
}

type Cells = readonly { row: number; col: number }[];

/** Drag path hand-off from the board to the FX canvas; skips a React render per cell. */
export function createCellsChannel() {
  let listener: ((cells: Cells) => void) | null = null;
  return {
    set: (cells: Cells) => listener?.(cells),
    subscribe(fn: (cells: Cells) => void) {
      listener = fn;
      return () => {
        if (listener === fn) listener = null;
      };
    },
  };
}

export type CellsChannel = ReturnType<typeof createCellsChannel>;
