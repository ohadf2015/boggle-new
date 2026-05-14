import type { BlastColumn, BlastLevel, CellId, Locale } from '../types';
import { cellId } from './cell-id';
import { scanFormableThemeWords } from './word-scan';

export type InsertResult = { level: BlastLevel; cells: CellId[] };

/** Deterministic LCG so builds are reproducible per seed. */
function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]!] = [a[j]!, a[i]!];
  }
  return a;
}

function cloneColumns(columns: BlastColumn[]): BlastColumn[] {
  return columns.map((c) => ({ index: c.index, tiles: [...c.tiles] }));
}

/**
 * Backward construction step. Inserts `word` into `Sk` as a horizontal run so
 * that `word` is formable and none of `otherWordsOnBoard` is. Returns the new
 * board (`S_{k-1}`) and the cells `word` occupies, or null if no placement works.
 */
export function insertWord(
  Sk: BlastLevel,
  word: string,
  otherWordsOnBoard: string[],
  locale: Locale,
  seed: number,
): InsertResult | null {
  const letters = [...word];
  const L = letters.length;
  const cols = Sk.columns.length;
  if (L > cols) return null;

  const rand = rng(seed);
  type Cand = { c: number; r: number };
  const candidates: Cand[] = [];

  // Generate all valid placements: starting column c, row r such that
  // the word fits horizontally and row r is a valid insertion point.
  for (let c = 0; c + L <= cols; c++) {
    const affected = Array.from({ length: L }, (_, i) => Sk.columns[c + i]!.tiles.length);
    const maxR = Math.min(...affected);
    for (let r = 0; r <= maxR; r++) {
      candidates.push({ c, r });
    }
  }

  // Randomize candidate order for reproducibility via seed.
  const shuffled = shuffle(candidates, rand);

  for (const { c, r } of shuffled) {
    const columns = cloneColumns(Sk.columns);
    const cells: CellId[] = [];

    // Insert each letter at row r in its respective column.
    for (let i = 0; i < L; i++) {
      columns[c + i]!.tiles.splice(r, 0, letters[i]!);
      cells.push(cellId(c + i, r));
    }

    const level: BlastLevel = { ...Sk, columns };
    const matches = scanFormableThemeWords(level, [word, ...otherWordsOnBoard], locale);
    const formableWords = new Set(matches.map((m) => m.word));

    // Success: only `word` is formable.
    if (formableWords.size === 1 && formableWords.has(word)) {
      return { level, cells };
    }
  }

  return null;
}
