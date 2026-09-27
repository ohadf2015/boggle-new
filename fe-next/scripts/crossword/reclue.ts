/**
 * Re-clue the generated EN puzzles from the current clue bank WITHOUT changing any grids.
 *
 * The generated puzzles in puzzles.en.json bake their clues at build time, so when the clue bank
 * is cleaned/improved (e.g. definition-style clues rewritten), the already-served puzzles keep the
 * stale clues. This refreshes every slot's clue from the live bank, leaving grids/ids untouched.
 *
 * Usage: npx tsx scripts/crossword/reclue.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildGrid } from '../../lib/crossword/grid';
import { getClue } from '../../lib/crossword/clueBank';

interface SeedPuzzle {
  id: string;
  rtl: boolean;
  grid: (string | null)[][];
  clues: Record<string, string>;
  [k: string]: unknown;
}

const path = join(__dirname, '../../lib/crossword/data/puzzles.en.json');
const puzzles = JSON.parse(readFileSync(path, 'utf8')) as SeedPuzzle[];

let refreshed = 0;
let missing = 0;
for (const pz of puzzles) {
  const { slots } = buildGrid({ rtl: pz.rtl, solution: pz.grid });
  const clues: Record<string, string> = {};
  for (const s of slots) {
    const c = getClue(s.answer);
    if (c) {
      if (c !== pz.clues[s.id]) refreshed++;
      clues[s.id] = c;
    } else {
      missing++;
      clues[s.id] = pz.clues[s.id]; // keep old if the word left the bank
    }
  }
  pz.clues = clues;
}

writeFileSync(path, JSON.stringify(puzzles));
console.log(`re-clued ${puzzles.length} puzzles · ${refreshed} clues refreshed · ${missing} kept (not in bank)`);
