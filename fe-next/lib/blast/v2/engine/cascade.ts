import type { BlastLevel, CellId } from '../types';
import type { LocaleConfig } from '../locale-config';
import { cellId } from './cell-id';

export type Cascade = { word: string; cells: CellId[] };

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

function findMatchForWord(
  word: string,
  level: BlastLevel,
  grid: Map<CellId, string>,
  norm: (s: string) => string,
  claimed: Set<CellId>,
): CellId[] | null {
  const normW = norm(word);
  for (const col of level.columns) {
    for (let r = 0; r < col.tiles.length; r++) {
      for (const dir of DIRS) {
        const cells: CellId[] = [];
        let s = '';
        let ok = true;
        for (let i = 0; i < word.length; i++) {
          const cc = col.index + dir[0] * i;
          const cr = r + dir[1] * i;
          const id = cellId(cc, cr);
          const v = grid.get(id);
          if (!v || claimed.has(id)) {
            ok = false;
            break;
          }
          s += v;
          cells.push(id);
        }
        if (ok && norm(s) === normW) return cells;
      }
    }
  }
  return null;
}

export function detectAllCascades(
  level: BlastLevel,
  foundWords: Set<string>,
  config: LocaleConfig,
): Cascade[] {
  const norm = (s: string) => config.normalize(s);
  const remaining = level.words.filter((w) => !foundWords.has(w));
  if (remaining.length === 0) return [];

  const grid = new Map<CellId, string>();
  for (const col of level.columns) {
    for (let r = 0; r < col.tiles.length; r++) grid.set(cellId(col.index, r), col.tiles[r]!);
  }

  const claimed = new Set<CellId>();
  const out: Cascade[] = [];
  for (const word of remaining) {
    const cells = findMatchForWord(word, level, grid, norm, claimed);
    if (cells) {
      out.push({ word, cells });
      for (const id of cells) claimed.add(id);
    }
  }
  return out;
}

export function detectCascade(
  level: BlastLevel,
  foundWords: Set<string>,
  config: LocaleConfig,
): Cascade | null {
  return detectAllCascades(level, foundWords, config)[0] ?? null;
}
