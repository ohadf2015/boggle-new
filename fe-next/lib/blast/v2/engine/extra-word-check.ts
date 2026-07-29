import type { BlastLevel } from '../types';
import { LOCALE_CONFIGS } from '../locale-config';

/**
 * Scans every horizontal and vertical contiguous line segment of the board
 * (length >= minLength, both reading directions) and returns any segment that
 * forms a real dictionary word NOT present in level.words.
 * Dictionary injected as a predicate so this stays pure and testable.
 */
export function findExtraWords(
  level: BlastLevel,
  isWord: (word: string) => boolean,
  minLength: number,
): string[] {
  const config = LOCALE_CONFIGS[level.locale];
  const norm = (s: string) => config.normalize(s);
  const intended = new Set(level.words.map(norm));

  const grid = new Map<string, string>();
  let maxRow = 0;
  for (const col of level.columns) {
    for (let r = 0; r < col.tiles.length; r++) {
      grid.set(`${col.index},${r}`, col.tiles[r]!);
      if (r > maxRow) maxRow = r;
    }
  }
  const cols = level.columns.map((c) => c.index);
  const minCol = Math.min(...cols);
  const maxCol = Math.max(...cols);

  const found = new Set<string>();
  const consider = (s: string) => {
    if (s.length < minLength) return;
    for (const candidate of [s, [...s].reverse().join('')]) {
      const n = norm(candidate);
      if (intended.has(n)) continue;
      if (isWord(candidate)) found.add(candidate);
    }
  };

  // Horizontal scans: for each row, scan across columns
  for (let r = 0; r <= maxRow; r++) {
    let run = '';
    for (let c = minCol; c <= maxCol; c++) {
      const cell = grid.get(`${c},${r}`);
      if (cell) {
        run += cell;
      } else {
        emitSubsegments(run, minLength, consider);
        run = '';
      }
    }
    emitSubsegments(run, minLength, consider);
  }

  // Vertical scans: for each column, scan tiles (bottom to top)
  for (const col of level.columns) {
    emitSubsegments(col.tiles.join(''), minLength, consider);
  }

  return [...found];
}

function emitSubsegments(
  run: string,
  minLength: number,
  consider: (s: string) => void,
): void {
  if (run.length < minLength) return;
  for (let start = 0; start < run.length; start++) {
    for (let end = start + minLength; end <= run.length; end++) {
      consider(run.slice(start, end));
    }
  }
}
