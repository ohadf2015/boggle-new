// Block templates + the "is a real crossword" quality gate, shared by build-time baking
// (scripts/crossword/build*.ts) and runtime generation (generate.runtime.ts) so the two paths
// can never drift. All templates are 180°-rotationally symmetric and shaped so every word run is
// 3–5 letters (the clue bank holds only 3–5 letter words).

import { buildGrid } from './grid';
import type { PuzzleLocale } from './types';

export interface BlockTemplate {
  label: string;
  size: number;
  blocks: ReadonlyArray<[number, number]>;
}

// 5×5 minis (NYT-Mini format). The only 5×5 symmetric patterns that keep every run ≥ 3.
export const EN_TEMPLATES_5: BlockTemplate[] = [
  { label: '5x5-diag', size: 5, blocks: [[0, 0], [4, 4]] },
  { label: '5x5-antidiag', size: 5, blocks: [[0, 4], [4, 0]] },
  { label: '5x5-corners', size: 5, blocks: [[0, 0], [0, 4], [4, 0], [4, 4]] },
];

// 7×7 "midi" — interior blocks split every length-7 run so nothing exceeds 5 letters. Only used
// when the fill experiment confirms a healthy fill-rate with the current pool (see size decision).
export const EN_TEMPLATES_7: BlockTemplate[] = [
  { label: '7x7-pinwheel', size: 7, blocks: [[0, 3], [3, 0], [3, 3], [3, 6], [6, 3]] },
  {
    label: '7x7-cross',
    size: 7,
    blocks: [[0, 3], [3, 0], [3, 3], [3, 6], [6, 3], [2, 2], [4, 4]],
  },
];

// 4×4 minis. Diagonal block pair gives mixed 3/4-letter runs, all doubly checked. Pure geometry —
// used by he (RTL) and es. (Spanish fills a 4×4 only with accent-folded keys; its 5×5 pool is too
// thin. The HE_ name is kept for back-compat; MINI_TEMPLATES_4 is the locale-neutral alias.)
export const MINI_TEMPLATES_4: BlockTemplate[] = [
  { label: '4x4-corners', size: 4, blocks: [[0, 0], [3, 3]] },
  { label: '4x4-antidiag', size: 4, blocks: [[0, 3], [3, 0]] },
];
export const HE_TEMPLATES_4 = MINI_TEMPLATES_4;

// Languages whose clue bank fills a 4×4 mini but not a doubly-checked 5×5 (needs ~2k words).
const MINI_4_LOCALES: ReadonlySet<string> = new Set(['he', 'es']);

/** Default grid size for a locale's mini. */
export function defaultSize(locale: PuzzleLocale): number {
  return MINI_4_LOCALES.has(locale) ? 4 : 5;
}

/** Templates available for a (locale, size). Empty array = unsupported combination. */
export function templatesFor(locale: PuzzleLocale, size: number): BlockTemplate[] {
  if (MINI_4_LOCALES.has(locale)) return size === 4 ? MINI_TEMPLATES_4 : [];
  // en + en-fallback locales
  if (size === 7) return EN_TEMPLATES_7;
  return EN_TEMPLATES_5;
}

/**
 * The "is a real crossword" spec: a black block exists, both directions have words, no across
 * answer duplicates a down answer (kills word squares), runs vary in length, and EVERY white cell
 * is checked in both directions (no orphan cells). Ported verbatim from scripts/crossword/build.ts.
 */
export function isRealCrossword(grid: (string | null)[][], rtl: boolean): boolean {
  const hasBlock = grid.some((row) => row.some((c) => c === null));
  if (!hasBlock) return false;

  const { slots } = buildGrid({ rtl, solution: grid });
  const across = slots.filter((s) => s.dir === 'across');
  const down = slots.filter((s) => s.dir === 'down');
  if (!across.length || !down.length) return false;

  const downWords = new Set(down.map((s) => s.answer));
  if (across.some((s) => downWords.has(s.answer))) return false; // kills word squares

  if (new Set(slots.map((s) => s.length)).size < 2) return false; // varied lengths

  const inAcross = new Set<string>();
  const inDown = new Set<string>();
  for (const s of across) for (const c of s.cells) inAcross.add(`${c.row},${c.col}`);
  for (const s of down) for (const c of s.cells) inDown.add(`${c.row},${c.col}`);
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid.length; c++) {
      if (grid[r][c] === null) continue;
      const k = `${r},${c}`;
      if (!inAcross.has(k) || !inDown.has(k)) return false; // every white cell doubly-checked
    }
  }
  return true;
}
