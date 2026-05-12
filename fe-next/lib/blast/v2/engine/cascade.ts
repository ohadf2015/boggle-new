import type { BlastLevel, CellId } from '../types';
import type { LocaleConfig } from '../locale-config';
import { cellId } from './cell-id';

export type Cascade = { word: string; cells: CellId[] };

export function detectCascade(level: BlastLevel, foundWords: Set<string>, config: LocaleConfig): Cascade | null {
  const norm = (s: string) => config.normalize(s);
  const remaining = level.words.filter((w) => !foundWords.has(w));
  if (remaining.length === 0) return null;
  const grid = new Map<CellId, string>();
  for (const col of level.columns) {
    for (let r = 0; r < col.tiles.length; r++) grid.set(cellId(col.index, r), col.tiles[r]!);
  }
  for (const word of remaining) {
    const normW = norm(word);
    for (const col of level.columns) {
      for (let r = 0; r < col.tiles.length; r++) {
        for (const dir of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const cells: CellId[] = [];
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
            cells.push(id);
          }
          if (ok && norm(s) === normW) return { word, cells };
        }
      }
    }
  }
  return null;
}
