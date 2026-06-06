/**
 * Validate hand-authored crossword grids against the real dictionary. Prints every across/down
 * run and flags any that are NOT valid dictionary words. Used while hand-seeding puzzles.
 *
 * Usage: npx tsx scripts/crossword/validate.ts
 */
import {
  createSafeReadFile,
  loadEnglishDictionary,
  loadHebrewDictionary,
} from '../../backend/dictionaryLoaders';
import { buildGrid } from '../../lib/crossword/grid';
import { normalizeHebrewWord } from '../../shared/utils/wordNormalization';
import type { PuzzleLocale } from '../../lib/crossword/types';

type Grid = (string | null)[][];

// Candidate grids to validate. Edit freely while authoring.
const EN_GRIDS: Record<string, Grid> = {
  'en-heart': [
    ['h', 'e', 'a', 'r', 't'],
    ['e', 'm', 'b', 'e', 'r'],
    ['a', 'b', 'u', 's', 'e'],
    ['r', 'e', 's', 'i', 'n'],
    ['t', 'r', 'e', 'n', 'd'],
  ],
  'en-bread': [
    ['b', 'r', 'e', 'a', 'd'],
    ['r', 'a', 'i', 's', 'e'],
    ['e', 'i', 'g', 'h', 't'],
    ['a', 's', 'h', 'e', 'n'],
    ['d', 'e', 't', 'e', 'r'],
  ],
};

const HE_GRIDS: Record<string, Grid> = {
  // Small REAL crosswords (across != down), normalized letters, words cross at one cell.
  'he-1': [
    ['ש', 'מ', 'ש'],
    [null, null, 'ל'],
    ['מ', 'י', 'מ'],
  ],
  'he-2': [
    ['א', 'ו', 'ר'],
    [null, null, 'ו'],
    [null, null, 'ח'],
  ],
  'he-3': [
    ['פ', 'ר', 'י'],
    [null, null, 'ר'],
    [null, null, 'ח'],
  ],
};

function check(label: string, grid: Grid, locale: PuzzleLocale, dict: Set<string>) {
  const rtl = locale === 'he';
  const { slots } = buildGrid({ rtl, solution: grid });
  let bad = 0;
  const lines: string[] = [];
  for (const s of slots) {
    const word = locale === 'he' ? normalizeHebrewWord(s.answer) : s.answer;
    const ok = dict.has(word);
    if (!ok) bad++;
    lines.push(`   ${ok ? 'OK ' : 'XX '} ${s.id} ${s.dir} "${s.answer}"`);
  }
   
  console.log(`\n[${label}] ${locale} — ${slots.length} runs, ${bad} invalid`);
   
  console.log(lines.join('\n'));
}

async function main() {
  const safeRead = createSafeReadFile();
  const [en, he] = await Promise.all([
    loadEnglishDictionary(safeRead),
    loadHebrewDictionary(safeRead),
  ]);
  for (const [label, grid] of Object.entries(EN_GRIDS)) check(label, grid, 'en', en);
  for (const [label, grid] of Object.entries(HE_GRIDS)) check(label, grid, 'he', he);
}

main().catch((e) => {
   
  console.error(e);
  process.exit(1);
});
