/**
 * Generate a bank of REAL 5×5 mini crosswords (black blocks, varied word lengths, every cell
 * checked in both directions) by filling 180°-rotationally-symmetric BLOCK templates from the
 * lexicon-derived CLUE BANK — so every answer is guaranteed to carry a real, hand-feeling clue
 * (Datamuse definition → LLM-crafted clue → judged → gated; see scripts/crossword/clues/*).
 *
 * The fill is frequency-biased (common words first) via the filler's `prefer` set, and each
 * generated puzzle is auto-clued from the bank. Output: lib/crossword/data/puzzles.en.json
 * (SeedPuzzle[]), consumed by the runtime daily picker.
 *
 * The clue bank holds only 3–5 letter words, so 5×5 is the ceiling — and per design that is the
 * target: NYT-Mini-grade minis with excellent clues, not bigger grids.
 *
 * Usage: npx tsx scripts/crossword/build.ts
 */
import {
  createSafeReadFile,
  loadEnglishDictionary,
} from '../../backend/dictionaryLoaders';
import { buildGrid } from '../../lib/crossword/grid';
import { buildDictIndex, fillGrid, type FillTemplate } from '../../lib/crossword/generate.core';
import { getClue, clueScore } from '../../lib/crossword/clueBank';
import clueBankJson from '../../lib/crossword/data/clueBank.en.json';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PuzzleLocale } from '../../lib/crossword/types';

const clueBank = clueBankJson as Record<string, { clue: string; score: number }>;

interface Template {
  size: number;
  blocks: [number, number][];
  label: string;
}

// 5×5, 180° rotational symmetry, every run ≥ 3, every white cell checked in both directions
// (verified by the gate). These are the only 5×5 block patterns that keep all runs ≥ 3.
const EN_TEMPLATES: Template[] = [
  { label: '5x5-diag', size: 5, blocks: [[0, 0], [4, 4]] },
  { label: '5x5-antidiag', size: 5, blocks: [[0, 4], [4, 0]] },
  { label: '5x5-corners', size: 5, blocks: [[0, 0], [0, 4], [4, 0], [4, 4]] },
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

// Quality gates — the "is a real crossword" spec, enforced before a grid is accepted.
function isRealCrossword(grid: (string | null)[][], rtl: boolean): boolean {
  const hasBlock = grid.some((row) => row.some((c) => c === null));
  if (!hasBlock) return false;

  const { slots } = buildGrid({ rtl, solution: grid });
  const across = slots.filter((s) => s.dir === 'across');
  const down = slots.filter((s) => s.dir === 'down');
  if (!across.length || !down.length) return false;

  const downWords = new Set(down.map((s) => s.answer));
  if (across.some((s) => downWords.has(s.answer))) return false; // kills word squares

  const lengths = new Set(slots.map((s) => s.length));
  if (lengths.size < 2) return false; // varied lengths

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

interface SeedPuzzle {
  id: string;
  locale: PuzzleLocale;
  difficulty: 'easy' | 'medium' | 'hard';
  rtl: boolean;
  grid: (string | null)[][];
  clues: Record<string, string>;
}

interface RawPuzzle {
  grid: (string | null)[][];
  clues: Record<string, string>;
  avgScore: number;
}

async function main() {
  const safeRead = createSafeReadFile();
  const dict = await loadEnglishDictionary(safeRead);

  // Fill universe = clue-bank words (re-validated against the live dictionary). Every fill is
  // therefore guaranteed cluable. Frequency bias: the top tercile by Datamuse score is the
  // filler's `prefer` set, so the most recognizable words land first.
  // Full cluable pool — a DENSE pool is what makes doubly-checked 5×5 crossings solvable
  // (capping it starves the crossings and fills drop to zero). Frequency bias comes from the
  // `prefer` set: the top ~800 by Datamuse score are tried first, so common words land first
  // and rarer pool words act only as crossing glue.
  const all = Object.keys(clueBank).filter((w) => w.length >= 3 && w.length <= 5 && dict.has(w));
  const byScoreDesc = [...all].sort((a, b) => clueScore(b) - clueScore(a));
  const prefer = new Set(byScoreDesc.slice(0, 800));
  const idx = buildDictIndex(all);
  console.log(`EN fill universe: ${all.length} cluable words (prefer top ${prefer.size})`);

  const raws: RawPuzzle[] = [];
  const sigs = new Set<string>();
  const PER_TEMPLATE = 20;

  for (const tpl of EN_TEMPLATES) {
    let made = 0;
    // maxSteps 20k: successful fills finish well under it; failed attempts fail ~4× faster than
    // at 80k. seeds capped at 600 — at ~55% fill success that's plenty for PER_TEMPLATE unique.
    for (let seed = 1; seed <= 600 && made < PER_TEMPLATE; seed++) {
      const t: FillTemplate = { size: tpl.size, rtl: false, blocks: tpl.blocks };
      const grid = fillGrid(t, idx, { rng: mulberry32(seed * 131 + 7), maxSteps: 20_000, prefer });
      if (!grid || !isRealCrossword(grid, false)) continue;
      const sig = grid.map((row) => row.map((c) => c ?? '#').join('')).join('|');
      if (sigs.has(sig)) continue;
      sigs.add(sig);

      const { slots } = buildGrid({ rtl: false, solution: grid });
      const clues: Record<string, string> = {};
      let missing = false;
      let scoreSum = 0;
      for (const s of slots) {
        const c = getClue(s.answer);
        if (!c) {
          missing = true;
          break;
        }
        clues[s.id] = c;
        scoreSum += clueScore(s.answer);
      }
      if (missing) continue; // belt-and-suspenders: universe ⊆ clueBank, so this should never hit
      raws.push({ grid, clues, avgScore: scoreSum / slots.length });
      made++;
    }
    console.log(`  ${tpl.label}: ${made} puzzles`);
  }

  // Difficulty by commonness terciles: most-common answers => easy, least-common => hard.
  raws.sort((a, b) => b.avgScore - a.avgScore);
  const third = Math.ceil(raws.length / 3);
  const tierOf = (i: number): SeedPuzzle['difficulty'] =>
    i < third ? 'easy' : i < third * 2 ? 'medium' : 'hard';

  const puzzles: SeedPuzzle[] = raws.map((r, i) => ({
    id: `en-gen-${String(i + 1).padStart(3, '0')}`,
    locale: 'en',
    difficulty: tierOf(i),
    rtl: false,
    grid: r.grid,
    clues: r.clues,
  }));

  const outPath = join(__dirname, '../../lib/crossword/data/puzzles.en.json');
  writeFileSync(outPath, JSON.stringify(puzzles));
  console.log(`\nwrote ${puzzles.length} EN puzzles → ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
