/**
 * Validate the COMMITTED crossword bank (lib/crossword/puzzles/seed.ts) against the real
 * dictionary. Prints every across/down entry and flags any that is NOT a valid dictionary word —
 * the offline guard against authoring/transcription typos. Exits non-zero if anything is invalid.
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
import { EN_SEED, HE_SEED, type SeedPuzzle } from '../../lib/crossword/puzzles/seed';

function check(seed: SeedPuzzle, dict: Set<string>): number {
  const { slots } = buildGrid({ rtl: seed.rtl, solution: seed.grid });
  let bad = 0;
  const lines: string[] = [];
  for (const s of slots) {
    const word = seed.locale === 'he' ? normalizeHebrewWord(s.answer) : s.answer;
    const ok = dict.has(word);
    const clued = (seed.clues[s.id] ?? '').trim().length > 0;
    if (!ok || !clued) bad++;
    lines.push(`   ${ok ? 'OK ' : 'XX '}${clued ? '' : '(NO CLUE) '}${s.id} ${s.dir} "${s.answer}"`);
  }

  console.log(`\n[${seed.id}] ${seed.locale} — ${slots.length} runs, ${bad} problem(s)`);

  console.log(lines.join('\n'));
  return bad;
}

async function main() {
  const safeRead = createSafeReadFile();
  const [en, he] = await Promise.all([
    loadEnglishDictionary(safeRead),
    loadHebrewDictionary(safeRead),
  ]);
  let problems = 0;
  for (const seed of EN_SEED) problems += check(seed, en);
  for (const seed of HE_SEED) problems += check(seed, he);

  console.log(`\n===== ${problems} total problem(s) across ${EN_SEED.length + HE_SEED.length} puzzles =====`);
  if (problems > 0) process.exit(1);
}

main().catch((e) => {
   
  console.error(e);
  process.exit(1);
});
