/**
 * Construct REAL crosswords (black blocks, varied word lengths, every cell checked) by filling
 * 180°-rotationally-symmetric BLOCK templates with the curated common pool, then gating on
 * crossword-quality invariants. This replaces findReal.ts's blockless `[]` templates, which only
 * ever yield double word squares (every row AND column a word) — mechanically valid but visually
 * a letter grid, not a crossword.
 *
 * Output: per locale, JSON grid + per-slot (id/dir/answer) for manual clue authoring → seed.ts.
 *
 * Usage: npx tsx scripts/crossword/build.ts
 */
import {
  createSafeReadFile,
  loadEnglishDictionary,
  loadHebrewDictionary,
} from '../../backend/dictionaryLoaders';
import { buildGrid } from '../../lib/crossword/grid';
import { buildDictIndex, fillGrid, type FillTemplate } from '../../lib/crossword/generate.core';
import { COMMON_EN, COMMON_HE } from './commonWords';
import { normalizeHebrewWord } from '../../shared/utils/wordNormalization';
import type { PuzzleLocale } from '../../lib/crossword/types';

// Common 6–7 letter English words, so 7×7 long runs fill with words players actually know.
const LONG_EN: string[] = [
  // 6
  'garden', 'flower', 'forest', 'summer', 'winter', 'autumn', 'spring', 'animal', 'monkey',
  'rabbit', 'turtle', 'donkey', 'parrot', 'falcon', 'salmon', 'pepper', 'tomato', 'carrot',
  'cheese', 'butter', 'coffee', 'orange', 'cherry', 'banana', 'guitar', 'violin', 'pencil',
  'bottle', 'basket', 'window', 'castle', 'bridge', 'planet', 'rocket', 'school', 'friend',
  'family', 'mother', 'father', 'sister', 'dragon', 'wizard', 'knight', 'island', 'desert',
  'valley', 'meadow', 'breeze', 'sunset', 'purple', 'yellow', 'silver', 'golden', 'bright',
  'gentle', 'simple', 'little', 'strong', 'pretty', 'frozen', 'hidden', 'listen', 'wonder',
  'market', 'ticket', 'jungle', 'kitten', 'puppy', 'cookie', 'candle', 'pillow', 'mirror',
  // 7
  'rainbow', 'dolphin', 'penguin', 'giraffe', 'leopard', 'hamster', 'octopus', 'peacock',
  'sparrow', 'kitchen', 'bedroom', 'library', 'station', 'village', 'harvest', 'evening',
  'morning', 'holiday', 'journey', 'picture', 'drawing', 'freedom', 'courage', 'mystery',
  'diamond', 'crystal', 'blossom', 'thunder', 'gravity', 'science', 'history', 'teacher',
  'student', 'brother', 'sunrise', 'feather', 'whisper', 'sweater', 'biscuit', 'pumpkin',
];

interface Template {
  size: number;
  blocks: [number, number][];
  /** human label so curated grids keep their template identity. */
  label: string;
}

// Every template below: 180° rotational symmetry (block (r,c) ⇒ block (size-1-r, size-1-c)),
// no run shorter than 3, and (verified by gate) every white cell checked in both directions.
const EN_TEMPLATES: Template[] = [
  { label: '5x5-diag', size: 5, blocks: [[0, 0], [4, 4]] },
  { label: '5x5-antidiag', size: 5, blocks: [[0, 4], [4, 0]] },
  { label: '5x5-corners', size: 5, blocks: [[0, 0], [0, 4], [4, 0], [4, 4]] },
];

// Hebrew common vocabulary is compact (few common 5-letter words), so a doubly-checked 5×5 won't
// fill. A 4×4 with diagonal blocks (3- and 4-letter words) is a genuine mini crossword that fits.
const HE_TEMPLATES: Template[] = [
  { label: '4x4-diag', size: 4, blocks: [[0, 0], [3, 3]] },
  { label: '4x4-antidiag', size: 4, blocks: [[0, 3], [3, 0]] },
];

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fill index = the curated COMMON pool only (re-validated against the live dict). With ~1500
// common words the pool is now dense enough to constrain a doubly-checked 5×5, and every fill is
// all-common BY CONSTRUCTION — no ranking, no obscure glue, and fast (small length buckets).
function commonWords(pool: string[], dict: Set<string>, normalize: (w: string) => string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of pool) {
    const w = normalize(raw);
    if (w.length >= 3 && w.length <= 7 && dict.has(w) && !seen.has(w)) {
      seen.add(w);
      out.push(w);
    }
  }
  return out;
}

// Quality gates — this is the "is a real crossword" spec, enforced before a grid is even shown.
function isRealCrossword(grid: (string | null)[][], rtl: boolean): boolean {
  const hasBlock = grid.some((row) => row.some((c) => c === null));
  if (!hasBlock) return false;

  const { slots } = buildGrid({ rtl, solution: grid });
  const across = slots.filter((s) => s.dir === 'across');
  const down = slots.filter((s) => s.dir === 'down');
  if (!across.length || !down.length) return false;

  // double: no across answer equals any down answer (kills symmetric word squares)
  const downWords = new Set(down.map((s) => s.answer));
  if (across.some((s) => downWords.has(s.answer))) return false;

  // varied lengths: a word square has every entry the same length
  const lengths = new Set(slots.map((s) => s.length));
  if (lengths.size < 2) return false;

  // every white cell checked: in both an across AND a down slot
  const inAcross = new Set<string>();
  const inDown = new Set<string>();
  for (const s of across) for (const c of s.cells) inAcross.add(`${c.row},${c.col}`);
  for (const s of down) for (const c of s.cells) inDown.add(`${c.row},${c.col}`);
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid.length; c++) {
      if (grid[r][c] === null) continue;
      const k = `${r},${c}`;
      if (!inAcross.has(k) || !inDown.has(k)) return false;
    }
  }
  return true;
}

interface Candidate {
  grid: (string | null)[][];
  slots: ReturnType<typeof buildGrid>['slots'];
  commonRatio: number;
  rareWords: string[];
  template: string;
}

function build(
  label: string,
  locale: PuzzleLocale,
  dict: Set<string>,
  pool: string[],
  normalize: (w: string) => string,
  templates: Template[],
  topN: number,
) {
  const words = commonWords(pool, dict, normalize);
  const idx = buildDictIndex(words);
  const rtl = locale === 'he';
  console.log(`\n##### ${label} (pool=${words.length}) #####`);
  for (const tpl of templates) {
    const cands: Candidate[] = [];
    const sigs = new Set<string>();
    for (let seed = 1; seed <= 4000 && cands.length < topN; seed++) {
      const t: FillTemplate = { size: tpl.size, rtl, blocks: tpl.blocks };
      const grid = fillGrid(t, idx, { rng: mulberry32(seed * 131 + 7), maxSteps: 80_000 });
      if (!grid || !isRealCrossword(grid, rtl)) continue;
      const sig = grid.map((row) => row.map((c) => c ?? '#').join('')).join('|');
      if (sigs.has(sig)) continue;
      sigs.add(sig);
      const { slots } = buildGrid({ rtl, solution: grid });
      cands.push({ grid, slots, commonRatio: 1, rareWords: [], template: tpl.label });
    }
    console.log(`\n--- ${tpl.label} (${cands.length}) ---`);
    cands.forEach((c, i) => {
      console.log(`\n# ${tpl.label}-${i + 1}`);
      console.log(JSON.stringify(c.grid));
      console.log('  ' + c.slots.map((s) => `${s.id}:${s.answer}`).join('  '));
    });
  }
}

async function main() {
  const safeRead = createSafeReadFile();
  const [en, he] = await Promise.all([
    loadEnglishDictionary(safeRead),
    loadHebrewDictionary(safeRead),
  ]);
  const enNorm = (w: string) => w.trim().toLowerCase();

  if (process.env.LOCALE !== 'he') build('EN', 'en', en, [...COMMON_EN, ...LONG_EN], enNorm, EN_TEMPLATES, 12);
  if (process.env.LOCALE !== 'en') build('HE', 'he', he, COMMON_HE, normalizeHebrewWord, HE_TEMPLATES, 12);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
