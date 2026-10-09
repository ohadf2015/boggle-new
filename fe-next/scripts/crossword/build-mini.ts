/**
 * Generate mini crosswords for es / sv / ru / ja from the locale's clue bank only. The fill pool is
 * the clue-bank words that are also in the shipped dictionary, so every landed word already has a
 * clue. Deterministic. Output: lib/crossword/data/puzzles.<locale>.json.
 *
 * Usage: npx tsx scripts/crossword/build-mini.ts <es|sv|ru|ja>            (4x4 sample, sv/ja)
 *        npx tsx scripts/crossword/build-mini.ts <es|sv|ru|ja> --exhaustive (MP pool, es)
 *
 * --exhaustive enumerates EVERY fill of each symmetric 4x4/5x5/6x6 pattern (the runtime filler
 * returns one fill per seed, so it never sees the full candidate set) and keeps the largest subset
 * whose puzzles pairwise share at most MAX_SHARED_ANSWERS answers. es must be built this way: the
 * plain 4x4 path yields 3 puzzles, below the 5 the mini.es-sv test requires.
 */
import { createSafeReadFile, loadJapaneseDictionary, loadRussianDictionary, loadSpanishDictionary, loadSwedishDictionary } from '../../backend/dictionaryLoaders';
import { foldEsAccents, foldJaKana } from '../../lib/crossword/answer';
import { buildGrid } from '../../lib/crossword/grid';
import { buildDictIndex, fillGrid, type FillTemplate } from '../../lib/crossword/generate.core';
import { isRealCrossword, MINI_TEMPLATES_4 } from '../../lib/crossword/templates';
import { enumerateFills, selectDistinct, symmetricPatterns, toCandidates, type Template } from './mpPool';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadBank } from './loadBank';

const LOCALES = ['es', 'sv', 'ru', 'ja'] as const;
interface Puzzle { id: string; locale: Locale; difficulty: 'easy'; rtl: false; grid: (string | null)[][]; clues: Record<string, string> }
type Locale = (typeof LOCALES)[number];
const MAX_PUZZLES = 20;
const SEEDS = 600;
const MAX_SHARED_ANSWERS = 2; // two puzzles may share at most this many answers
const EXHAUSTIVE = process.argv.includes('--exhaustive');
const MP_MAX_GRIDS = 5000;
const MP_TEMPLATES: Template[] = [...symmetricPatterns(4, 4), ...symmetricPatterns(5, 5), ...symmetricPatterns(6, 6)];
// Answers reviewed by hand and rejected (bad or obscure clue). Any grid using one is dropped.
// es: 'ire' (archaic), 'ana' (obscure), 'ese' (clued as "allá" but far demonstrative is 'aquel'),
// 'mas' (archaic for 'pero'), 'rie'/'den'/'vas'/'das'/'aca'/'ahi'/'des'/'usa'/'oye' (fragments or verb forms
// with no crossword-worthy clue) rejected.
const MP_DENYLIST: Record<Locale, ReadonlySet<string>> = {
  es: new Set(['ire', 'ana', 'ese', 'mas', 'rie', 'den', 'vas', 'das', 'aca', 'ahi', 'des', 'usa', 'oye']),
  sv: new Set(),
  ru: new Set(),
  ja: new Set(),
};

// Grid letters are stored the way the answer checker normalizes typed input (es accents, ru ё).
const FOLD: Record<Locale, (w: string) => string> = {
  es: foldEsAccents,
  sv: (w) => w,
  ru: (w) => w.replace(/ё/g, 'е'),
  ja: foldJaKana, // ja bank keys are already folded; idempotent
};

// ja bank keys are kana-folded (しゃしん → しやしん), so membership is checked on the folded dictionary.
async function jaFoldedDict(safeRead: ReturnType<typeof createSafeReadFile>): Promise<Set<string>> {
  const { words } = await loadJapaneseDictionary(safeRead);
  return new Set([...words].map(foldJaKana));
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function exhaustivePuzzles(
  locale: Locale,
  bank: Record<string, { clue: string; score: number }>,
  bankKeyOf: Map<string, string>,
): Puzzle[] {
  const pool = [...bankKeyOf.keys()];
  const grids = MP_TEMPLATES.flatMap((t) => {
    const found = enumerateFills(t, pool, MP_MAX_GRIDS);
    console.log(`${t.size}x${t.size} ${t.blocks.length} blocks: ${found.length} fills`);
    return found;
  });
  const bankOf = (answer: string) => bank[bankKeyOf.get(answer) ?? ''];
  const cands = toCandidates(grids, (a) => bankOf(a)?.clue, MP_DENYLIST[locale], (a) => bankOf(a)?.score ?? 0);
  const picked = selectDistinct(cands, MAX_SHARED_ANSWERS, 1);
  console.log(`candidates ${cands.length} | distinct subset ${picked.length}`);
  return picked.map((c, i) => ({
    id: `${locale}-gen-${String(i + 1).padStart(3, '0')}`,
    locale,
    difficulty: 'easy' as const,
    rtl: false as const,
    grid: c.grid,
    clues: c.clues,
  }));
}

async function main() {
  const locale = process.argv[2] as Locale;
  if (!LOCALES.includes(locale)) throw new Error(`usage: build-mini.ts <${LOCALES.join('|')}>`);

  const dataDir = join(__dirname, '../../lib/crossword/data');
  const bank = loadBank(dataDir, locale);
  const safeRead = createSafeReadFile();
  const dict =
    locale === 'es' ? await loadSpanishDictionary(safeRead)
    : locale === 'ru' ? await loadRussianDictionary(safeRead)
    : locale === 'ja' ? await jaFoldedDict(safeRead)
    : await loadSwedishDictionary(safeRead);

  // folded grid answer -> bank key carrying its clue (prefers an exact key over a folded twin)
  const maxLen = EXHAUSTIVE ? 6 : 4;
  const bankKeyOf = new Map<string, string>();
  for (const w of Object.keys(bank)) {
    const f = FOLD[locale](w);
    if (f.length < 3 || f.length > maxLen || !bank[w].clue || !dict.has(f)) continue;
    if (!bankKeyOf.has(f) || w === f) bankKeyOf.set(f, w);
  }
  if (EXHAUSTIVE) {
    const outPath = join(dataDir, `puzzles.${locale}.json`);
    writeFileSync(outPath, JSON.stringify(exhaustivePuzzles(locale, bank, bankKeyOf)));
    console.log(`wrote exhaustive ${locale} pool -> ${outPath}`);
    return;
  }
  const pool = [...bankKeyOf.keys()];
  console.log(`${locale} bank ${Object.keys(bank).length} | 3-4 letter in dict: ${pool.length} (dict ${dict.size})`);
  const idx = buildDictIndex(pool);

  const puzzles: Puzzle[] = [];
  const sigs = new Set<string>();
  const answerSets: Set<string>[] = [];
  let fillOk = 0, realOk = 0;

  for (const tpl of MINI_TEMPLATES_4) {
    for (let seed = 1; seed <= SEEDS && puzzles.length < MAX_PUZZLES; seed++) {
      const t: FillTemplate = { size: tpl.size, rtl: false, blocks: tpl.blocks };
      const grid = fillGrid(t, idx, { rng: mulberry32(seed * 131 + 7), maxSteps: 20_000 });
      if (!grid) continue;
      fillOk++;
      if (!isRealCrossword(grid, false)) continue;
      realOk++;
      const sig = grid.map((row) => row.map((c) => c ?? '#').join('')).join('|');
      if (sigs.has(sig)) continue;
      const { slots } = buildGrid({ rtl: false, solution: grid });
      const clues: Record<string, string> = {};
      for (const s of slots) clues[s.id] = bank[bankKeyOf.get(s.answer)!].clue;
      const answers = new Set(slots.map((s) => s.answer));
      const sharesTooMuch = answerSets.some((o) => [...answers].filter((a) => o.has(a)).length > MAX_SHARED_ANSWERS);
      if (sharesTooMuch) continue;
      answerSets.push(answers);
      sigs.add(sig);
      puzzles.push({ id: '', locale, difficulty: 'easy', rtl: false, grid, clues });
    }
  }

  puzzles.forEach((p, i) => { p.id = `${locale}-gen-${String(i + 1).padStart(3, '0')}`; });
  const outPath = join(dataDir, `puzzles.${locale}.json`);
  writeFileSync(outPath, JSON.stringify(puzzles));
  console.log(`fillOk ${fillOk} | realOk ${realOk} | wrote ${puzzles.length} ${locale} puzzles -> ${outPath}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
