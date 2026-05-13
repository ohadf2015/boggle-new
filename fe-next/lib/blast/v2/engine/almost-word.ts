import type { BlastLevel, CellId } from '../types';
import type { LocaleConfig } from '../locale-config';
import { cellId } from './cell-id';

export type AlmostWord = {
  word: string;
  filledCells: CellId[];
  gapCell: { col: number; row: number };
  neededLetter: string;
};

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

function isColumnInRange(level: BlastLevel, col: number): boolean {
  return level.columns.some((c) => c.index === col);
}

function findAlmostForWord(
  word: string,
  level: BlastLevel,
  grid: Map<CellId, string>,
  norm: (s: string) => string,
): AlmostWord | null {
  for (const col of level.columns) {
    for (let r = 0; r < col.tiles.length; r++) {
      for (const dir of DIRS) {
        const filledCells: CellId[] = [];
        const mismatches: { idx: number; col: number; row: number }[] = [];
        for (let i = 0; i < word.length; i++) {
          const cc = col.index + dir[0] * i;
          const cr = r + dir[1] * i;
          const id = cellId(cc, cr);
          const v = grid.get(id);
          const expectedChar = word[i]!;
          if (v !== undefined && norm(v) === norm(expectedChar)) {
            filledCells.push(id);
          } else {
            mismatches.push({ idx: i, col: cc, row: cr });
            if (mismatches.length > 1) break;
          }
        }
        if (mismatches.length === 1) {
          const gap = mismatches[0]!;
          if (gap.col < 0 || gap.row < 0) continue;
          if (!isColumnInRange(level, gap.col)) continue;
          return {
            word,
            filledCells,
            gapCell: { col: gap.col, row: gap.row },
            neededLetter: word[gap.idx]!,
          };
        }
      }
    }
  }
  return null;
}

export function detectAlmostWords(
  level: BlastLevel,
  foundWords: Set<string>,
  config: LocaleConfig,
): AlmostWord[] {
  const norm = (s: string) => config.normalize(s);
  const remaining = level.words.filter((w) => !foundWords.has(w));
  if (remaining.length === 0) return [];

  const grid = new Map<CellId, string>();
  for (const col of level.columns) {
    for (let r = 0; r < col.tiles.length; r++) grid.set(cellId(col.index, r), col.tiles[r]!);
  }

  const out: AlmostWord[] = [];
  for (const word of remaining) {
    if (formableNow(word, level, grid, norm)) continue;
    const almost = findAlmostForWord(word, level, grid, norm);
    if (almost) out.push(almost);
  }
  return out;
}

function formableNow(
  word: string,
  level: BlastLevel,
  grid: Map<CellId, string>,
  norm: (s: string) => string,
): boolean {
  const normW = norm(word);
  for (const col of level.columns) {
    for (let r = 0; r < col.tiles.length; r++) {
      for (const dir of DIRS) {
        let s = '';
        let ok = true;
        for (let i = 0; i < word.length; i++) {
          const cc = col.index + dir[0] * i;
          const cr = r + dir[1] * i;
          const id = cellId(cc, cr);
          const v = grid.get(id);
          if (!v) {
            ok = false;
            break;
          }
          s += v;
        }
        if (ok && norm(s) === normW) return true;
      }
    }
  }
  return false;
}
