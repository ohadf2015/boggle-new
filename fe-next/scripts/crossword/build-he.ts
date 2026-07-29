/**
 * Generate Hebrew 4×4 mini crosswords. Unlike the EN build (which fills from the clue bank), the
 * HE clue bank is small, so we fill from the curated COMMON word list (backend/common_hunt_words_he,
 * intersected with the live Hebrew dictionary) — that pool is dense enough for the 4×4 filler to
 * succeed AND keeps every answer fair/recognizable. Each landed word is then clued from
 * clueBank.he.json; a puzzle is dropped if any of its words has no clue.
 *
 * Deterministic (fixed seeds) so the landed-word set is stable and fully cluable.
 * Output: lib/crossword/data/puzzles.he.json (SeedPuzzle[]), consumed by the daily picker.
 *
 * Usage: npx tsx scripts/crossword/build-he.ts
 */
import { createSafeReadFile, loadHebrewDictionary } from '../../backend/dictionaryLoaders';
import { buildGrid } from '../../lib/crossword/grid';
import { buildDictIndex, fillGrid, type FillTemplate } from '../../lib/crossword/generate.core';
import clueBankJson from '../../lib/crossword/data/clueBank.he.json';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PuzzleLocale } from '../../lib/crossword/types';

const clueBank = clueBankJson as Record<string, { clue: string; score: number }>;
const normHe = (w: string) =>
  w.replace(/ם/g, 'מ').replace(/ן/g, 'נ').replace(/ץ/g, 'צ').replace(/ף/g, 'פ').replace(/ך/g, 'כ');

const TEMPLATES = [
  { label: '4x4-corners', size: 4, blocks: [[0, 0], [3, 3]] as [number, number][] },
  { label: '4x4-antidiag', size: 4, blocks: [[0, 3], [3, 0]] as [number, number][] },
];
const MAX_PUZZLES = 20;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isRealCrossword(grid: (string | null)[][], rtl: boolean): boolean {
  if (!grid.some((r) => r.some((c) => c === null))) return false;
  const { slots } = buildGrid({ rtl, solution: grid });
  const across = slots.filter((s) => s.dir === 'across');
  const down = slots.filter((s) => s.dir === 'down');
  if (!across.length || !down.length) return false;
  const downWords = new Set(down.map((s) => s.answer));
  if (across.some((s) => downWords.has(s.answer))) return false; // no word squares
  if (new Set(slots.map((s) => s.length)).size < 2) return false; // varied lengths
  const inA = new Set<string>(), inD = new Set<string>();
  for (const s of across) for (const c of s.cells) inA.add(`${c.row},${c.col}`);
  for (const s of down) for (const c of s.cells) inD.add(`${c.row},${c.col}`);
  for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid.length; c++) {
    if (grid[r][c] === null) continue;
    if (!inA.has(`${r},${c}`) || !inD.has(`${r},${c}`)) return false; // doubly-checked
  }
  return true;
}

interface SeedPuzzle {
  id: string;
  locale: PuzzleLocale;
  difficulty: 'easy' | 'medium' | 'hard';
  rtl: boolean;
  grid: (string | null)[][];
  clues: Record<string, string>;
}

async function main() {
  const dict = await loadHebrewDictionary(createSafeReadFile());
  const commonRaw = readFileSync(join(__dirname, '../../backend/common_hunt_words_he.txt'), 'utf8');
  const pool = [
    ...new Set(
      commonRaw.split('\n').map((w) => normHe(w.trim())).filter((w) => w.length >= 3 && w.length <= 4 && dict.has(w)),
    ),
  ];
  console.log(`HE common 3-4 pool: ${pool.length} (dict ${dict.size})`);
  const idx = buildDictIndex(pool);

  const puzzles: SeedPuzzle[] = [];
  const sigs = new Set<string>();
  let fillOk = 0, realOk = 0, dropped = 0;

  for (const tpl of TEMPLATES) {
    for (let seed = 1; seed <= 400 && puzzles.length < MAX_PUZZLES; seed++) {
      const t: FillTemplate = { size: tpl.size, rtl: true, blocks: tpl.blocks };
      const grid = fillGrid(t, idx, { rng: mulberry32(seed * 131 + 7), maxSteps: 20_000 });
      if (!grid) continue;
      fillOk++;
      if (!isRealCrossword(grid, true)) continue;
      realOk++;
      const sig = grid.map((row) => row.map((c) => c ?? '#').join('')).join('|');
      if (sigs.has(sig)) continue;

      const { slots } = buildGrid({ rtl: true, solution: grid });
      const clues: Record<string, string> = {};
      let missing = false;
      for (const s of slots) {
        const c = clueBank[s.answer]?.clue;
        if (!c) { missing = true; break; }
        clues[s.id] = c;
      }
      if (missing) { dropped++; continue; } // drop puzzles with any unclued word
      sigs.add(sig);
      puzzles.push({ id: '', locale: 'he', difficulty: 'easy', rtl: true, grid, clues });
    }
  }

  puzzles.forEach((p, i) => { p.id = `he-gen-${String(i + 1).padStart(3, '0')}`; });

  const outPath = join(__dirname, '../../lib/crossword/data/puzzles.he.json');
  writeFileSync(outPath, JSON.stringify(puzzles));
  console.log(`fillOk ${fillOk} | realOk ${realOk} | dropped(unclued) ${dropped} | wrote ${puzzles.length} HE puzzles -> ${outPath}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
