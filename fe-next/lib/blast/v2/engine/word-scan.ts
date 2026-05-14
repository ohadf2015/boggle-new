import type { BlastLevel, CellId, Locale } from '../types';
import { LOCALE_CONFIGS } from '../locale-config';
import { cellId } from './cell-id';

export type WordMatch = { word: string; cells: CellId[] };

function at(level: BlastLevel, col: number, row: number): string | undefined {
  return level.columns[col]?.tiles[row];
}

/**
 * Scan a Blast level to find which target words are formable as straight-line runs.
 * A word match requires a contiguous horizontal (within a row, left→right) or
 * vertical (within a column, bottom→top) sequence of tiles.
 *
 * Matches are returned in the order they are found (row-major for horizontal,
 * then column-major for vertical).
 *
 * Normalization (e.g. Hebrew final forms) is applied per locale.
 */
export function scanFormableThemeWords(
  level: BlastLevel,
  targets: string[],
  locale: Locale = 'en',
): WordMatch[] {
  const config = LOCALE_CONFIGS[locale];
  const norm = (s: string): string => config.normalize(s);

  // Map normalized target words to their original form for output
  const wanted = new Map(targets.map((w) => [norm(w), w] as const));
  const matches: WordMatch[] = [];

  const cols = level.columns.length;
  const maxRow = Math.max(0, ...level.columns.map((c) => c.tiles.length));

  // Scan horizontal runs: for each row, check each starting column
  for (let row = 0; row < maxRow; row++) {
    for (let start = 0; start < cols; start++) {
      let run = '';
      const cells: CellId[] = [];
      for (let col = start; col < cols; col++) {
        const ch = at(level, col, row);
        if (ch === undefined) break;
        run += ch;
        cells.push(cellId(col, row));
        const hit = wanted.get(norm(run));
        if (hit && run.length >= 2) {
          matches.push({ word: hit, cells: [...cells] });
        }
      }
    }
  }

  // Scan vertical runs: for each column, check each starting row (from top down)
  for (let col = 0; col < cols; col++) {
    const tiles = level.columns[col]?.tiles ?? [];
    for (let topRow = tiles.length - 1; topRow >= 0; topRow--) {
      let run = '';
      const cells: CellId[] = [];
      for (let row = topRow; row >= 0; row--) {
        run += tiles[row];
        cells.push(cellId(col, row));
        const hit = wanted.get(norm(run));
        if (hit && run.length >= 2) {
          matches.push({ word: hit, cells: [...cells] });
        }
      }
    }
  }

  return matches;
}
