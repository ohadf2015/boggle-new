/**
 * Find REAL interlocking mini crosswords (across words != down words) from the curated common
 * pool, validated against the real dictionary. Uses the no-duplicate-word CSP so an open grid
 * yields a double word square (all entries distinct) — a genuine crossword, not a symmetric
 * square. Prints grid + per-slot (id/dir/answer) so clues can be authored by slot id.
 *
 * Usage: npx tsx scripts/crossword/findReal.ts
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

function commonIndex(pool: string[], dict: Set<string>, normalize: (w: string) => string) {
  const seen = new Set<string>();
  const words: string[] = [];
  for (const raw of pool) {
    const w = normalize(raw);
    if (w.length < 3 || w.length > 5) continue;
    if (!dict.has(w) || seen.has(w)) continue;
    seen.add(w);
    words.push(w);
  }
  return buildDictIndex(words);
}

function isDouble(grid: (string | null)[][]): boolean {
  const { slots } = buildGrid({ rtl: false, solution: grid });
  const across = slots.filter((s) => s.dir === 'across').map((s) => s.answer);
  const down = slots.filter((s) => s.dir === 'down').map((s) => s.answer);
  // real crossword: no across answer equals a down answer (no shared word at all)
  return !across.some((a) => down.includes(a));
}

function tryFind(
  label: string,
  locale: PuzzleLocale,
  dict: Set<string>,
  pool: string[],
  normalize: (w: string) => string,
  templates: Array<{ size: number; blocks: [number, number][] }>,
  want: number,
) {
  const index = commonIndex(pool, dict, normalize);
  const found: (string | null)[][][] = [];
  const sigs = new Set<string>();
  for (const tpl of templates) {
    for (let seed = 1; seed <= 400 && found.length < want; seed++) {
      const t: FillTemplate = { size: tpl.size, rtl: false, blocks: tpl.blocks };
      const grid = fillGrid(t, index, { rng: mulberry32(seed * 131 + 7), maxSteps: 60_000 });
      if (!grid) continue;
      if (!isDouble(grid)) continue;
      const sig = grid.map((r) => r.map((c) => c ?? '#').join('')).join('|');
      if (sigs.has(sig)) continue;
      sigs.add(sig);
      found.push(grid);
    }
    if (found.length >= want) break;
  }

   
  console.log(`\n##### ${label}: ${found.length} real crosswords`);
  found.forEach((grid, i) => {
    const { slots } = buildGrid({ rtl: locale === 'he', solution: grid });
     
    console.log(`\n-- ${label}-${i + 1} --`);
     
    console.log(JSON.stringify(grid.map((r) => r.map((c) => c ?? null))));
    for (const s of slots) {
       
      console.log(`   ${s.id} ${s.dir} = ${s.answer}`);
    }
  });
}

async function main() {
  const safeRead = createSafeReadFile();
  const [en, he] = await Promise.all([
    loadEnglishDictionary(safeRead),
    loadHebrewDictionary(safeRead),
  ]);
  const enNorm = (w: string) => w.trim().toLowerCase();

  tryFind('EN', 'en', en, COMMON_EN, enNorm, [
    { size: 3, blocks: [] },
    { size: 4, blocks: [] },
  ], 6);

  tryFind('HE', 'he', he, COMMON_HE, normalizeHebrewWord, [
    { size: 3, blocks: [] },
  ], 6);
}

main().catch((e) => {
   
  console.error(e);
  process.exit(1);
});
