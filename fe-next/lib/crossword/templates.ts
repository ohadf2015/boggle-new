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

// 11×11 "full" — the newspaper board. Found by scripts/crossword/search-templates.ts, which
// enumerates 180°-symmetric patterns whose every white run is 3–5 (the bank's answer lengths),
// filters them for LOOK (26% black, 42 slots — the density real newspaper grids sit at), and then
// fill-tests each against the live clue bank. These two are the ones that actually fill; most
// candidates at this density fail every seed. Puzzles from them are BAKED, not generated inline —
// a fill takes 10–40s here versus ~350ms for a mini. See scripts/crossword/build-big.ts.
// Fill difficulty varies enormously between patterns that look almost identical: of the five the
// search turned up, these three fill 3–5 of every 8 seeds in 2–5s, while the other two managed
// 1/8 at up to 16s. Only the fast ones are kept — a template that rarely fills is pure cost.
export const EN_TEMPLATES_11: BlockTemplate[] = [
  {
    // 42 slots · 32 blocks (26% black) · fills 5/8 seeds @ ~2.2s
    label: '11x11-a',
    size: 11,
    blocks: [
      [0, 5], [0, 6], [0, 7], [1, 5], [2, 5], [3, 3], [3, 9], [3, 10], [4, 3], [4, 4], [4, 8],
      [4, 9], [4, 10], [5, 0], [5, 1], [5, 2], [5, 8], [5, 9], [5, 10], [6, 0], [6, 1], [6, 2],
      [6, 6], [6, 7], [7, 0], [7, 1], [7, 7], [8, 5], [9, 5], [10, 3], [10, 4], [10, 5],
    ],
  },
  {
    // 42 slots · 34 blocks (28% black) · fills 3/8 seeds @ ~3.3s
    label: '11x11-b',
    size: 11,
    blocks: [
      [0, 0], [0, 1], [0, 6], [1, 0], [1, 6], [2, 0], [2, 6], [3, 0], [3, 4], [3, 5], [4, 0],
      [4, 1], [4, 7], [5, 0], [5, 1], [5, 2], [5, 3], [5, 7], [5, 8], [5, 9], [5, 10], [6, 3],
      [6, 9], [6, 10], [7, 5], [7, 6], [7, 10], [8, 4], [8, 10], [9, 4], [9, 10], [10, 4],
      [10, 9], [10, 10],
    ],
  },
  {
    // 42 slots · 32 blocks (26% black) · fills 3/8 seeds @ ~5.0s
    label: '11x11-c',
    size: 11,
    blocks: [
      [0, 5], [0, 6], [0, 7], [1, 5], [1, 6], [1, 7], [2, 5], [3, 3], [3, 4], [3, 10], [4, 0],
      [4, 4], [4, 10], [5, 0], [5, 1], [5, 2], [5, 8], [5, 9], [5, 10], [6, 0], [6, 6], [6, 10],
      [7, 0], [7, 6], [7, 7], [8, 5], [9, 3], [9, 4], [9, 5], [10, 3], [10, 4], [10, 5],
    ],
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
const MINI_4_LOCALES: ReadonlySet<string> = new Set(['he', 'es', 'sv']);

/** Default grid size for a locale's mini. */
export function defaultSize(locale: PuzzleLocale): number {
  return MINI_4_LOCALES.has(locale) ? 4 : 5;
}

/** Templates available for a (locale, size). Empty array = unsupported combination. */
export function templatesFor(locale: PuzzleLocale, size: number): BlockTemplate[] {
  if (MINI_4_LOCALES.has(locale)) return size === 4 ? MINI_TEMPLATES_4 : [];
  // en + en-fallback locales
  if (size === 11) return EN_TEMPLATES_11;
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

  // No answer may appear twice ANYWHERE in the puzzle. Across-vs-down duplication is what kills
  // word squares; same-direction duplication is the defect that only shows up at newspaper scale,
  // where 40+ slots are drawn from one bank and collisions stop being unlikely.
  const answers = new Set<string>();
  for (const s of slots) {
    if (answers.has(s.answer)) return false;
    answers.add(s.answer);
  }

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
