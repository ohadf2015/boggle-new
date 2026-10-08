/**
 * Generate 4×4 LTR mini crosswords for es / sv / ru from the locale's clue bank only. The fill pool is
 * the 3-4 letter clue-bank words that are also in the shipped dictionary, so every landed word
 * already has a clue. Deterministic (fixed seeds). Output: lib/crossword/data/puzzles.<locale>.json.
 *
 * Usage: npx tsx scripts/crossword/build-mini.ts <es|sv|ru>
 */
import { createSafeReadFile, loadRussianDictionary, loadSpanishDictionary, loadSwedishDictionary } from '../../backend/dictionaryLoaders';
import { foldEsAccents } from '../../lib/crossword/answer';
import { buildGrid } from '../../lib/crossword/grid';
import { buildDictIndex, fillGrid, type FillTemplate } from '../../lib/crossword/generate.core';
import { isRealCrossword, MINI_TEMPLATES_4 } from '../../lib/crossword/templates';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const LOCALES = ['es', 'sv', 'ru'] as const;
type Locale = (typeof LOCALES)[number];
const MAX_PUZZLES = 20;
const SEEDS = Number(process.argv[3] ?? 600);
const MAX_SHARED_ANSWERS = 2; // two puzzles may share at most this many answers

// Grid letters are stored the way the answer checker normalizes typed input (es accents, ru ё).
const FOLD: Record<Locale, (w: string) => string> = {
  es: foldEsAccents,
  sv: (w) => w,
  ru: (w) => w.replace(/ё/g, 'е'),
};

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main() {
  const locale = process.argv[2] as Locale;
  if (!LOCALES.includes(locale)) throw new Error(`usage: build-mini.ts <${LOCALES.join('|')}>`);

  const dataDir = join(__dirname, '../../lib/crossword/data');
  const bank = JSON.parse(readFileSync(join(dataDir, `clueBank.${locale}.json`), 'utf8')) as Record<
    string,
    { clue: string; score: number }
  >;
  const safeRead = createSafeReadFile();
  const dict =
    locale === 'es' ? await loadSpanishDictionary(safeRead)
    : locale === 'ru' ? await loadRussianDictionary(safeRead)
    : await loadSwedishDictionary(safeRead);

  // folded grid answer -> bank key carrying its clue (prefers an exact key over a folded twin)
  const bankKeyOf = new Map<string, string>();
  for (const w of Object.keys(bank)) {
    const f = FOLD[locale](w);
    if (f.length < 3 || f.length > 4 || !bank[w].clue || !dict.has(f)) continue;
    if (!bankKeyOf.has(f) || w === f) bankKeyOf.set(f, w);
  }
  const pool = [...bankKeyOf.keys()];
  console.log(`${locale} bank ${Object.keys(bank).length} | 3-4 letter in dict: ${pool.length} (dict ${dict.size})`);
  const idx = buildDictIndex(pool);

  const puzzles: { id: string; locale: Locale; difficulty: 'easy'; rtl: false; grid: (string | null)[][]; clues: Record<string, string> }[] = [];
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
