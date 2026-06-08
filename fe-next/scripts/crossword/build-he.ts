/**
 * Generate a bank of Hebrew 4×4 mini crosswords filled from the Hebrew clue bank.
 * Hebrew has fewer common 5-letter words, so 4×4 is the target (genuine mini, fully doubly-checked).
 *
 * This mirrors scripts/crossword/build.ts (EN 5×5) adapted for Hebrew 4×4.
 *
 * Usage: npx tsx scripts/crossword/build-he.ts
 */
import {
  createSafeReadFile,
  loadHebrewDictionary,
} from '../../backend/dictionaryLoaders';
import { buildGrid } from '../../lib/crossword/grid';
import { buildDictIndex, fillGrid, type FillTemplate } from '../../lib/crossword/generate.core';
import clueBankJson from '../../lib/crossword/data/clueBank.he.json';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PuzzleLocale } from '../../lib/crossword/types';
import { normalizeHebrewWord } from '../../shared/utils/wordNormalization';

const clueBankRaw = clueBankJson as Record<string, { clue: string; score: number }>;

// Create a normalized lookup map: normalized word -> { clue, score }
// This allows us to find clues for words filled into the grid (which are normalized)
const clueBank = new Map<string, { clue: string; score: number }>();
for (const [key, entry] of Object.entries(clueBankRaw)) {
  const norm = normalizeHebrewWord(key);
  // Keep the highest score if multiple raw keys normalize to the same word
  const existing = clueBank.get(norm);
  if (!existing || entry.score > existing.score) {
    clueBank.set(norm, entry);
  }
}

interface Template {
  size: number;
  blocks: [number, number][];
  label: string;
}

// 4×4, 180° rotational symmetry, block patterns that yield varied word lengths and all cells doubly-checked.
// The two-opposite-corners pattern (like he-mini-006) works well for 4×4.
// Only symmetric templates; single [[1,1]] is NOT 180° symmetric and creates short runs.
const HE_TEMPLATES: Template[] = [
  { label: '4x4-corners', size: 4, blocks: [[0, 0], [3, 3]] },
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

function clueScore(word: string): number {
  const entry = clueBank.get(word);
  return entry?.score ?? 0;
}

async function main() {
  const safeRead = createSafeReadFile();
  const dict = await loadHebrewDictionary(safeRead);

  // Fill universe = words in clue bank ∩ dictionary, 3–4 letter words only.
  // By construction, every filled word IS in clueBank → no line-143 rejections.
  // The clue bank size becomes the bottleneck (so 450-550 enables 12+ puzzles).

  // Collect unique (normalized) clue bank entries, preserving score (highest score = most common).
  // clueBank is already normalized and deduplicated by the map construction above.
  const uniqueWords = new Map<string, number>(); // word -> score
  for (const [word, entry] of clueBank) {
    if (dict.has(word) && word.length >= 3 && word.length <= 4) {
      uniqueWords.set(word, entry.score);
    }
  }

  // Sort by score descending (most common first)
  const all = [...uniqueWords.keys()].sort((a, b) => (uniqueWords.get(b) ?? 0) - (uniqueWords.get(a) ?? 0));

  // Prefer set: top 150 by score
  const prefer = new Set(all.slice(0, Math.min(150, all.length)));
  const idx = buildDictIndex(all);
  console.log(`HE fill universe: ${all.length} 3–4 letter words from clue bank ∩ dictionary (prefer ${prefer.size})`);

  const raws: RawPuzzle[] = [];
  const sigs = new Set<string>();
  const PER_TEMPLATE = 20;

  // Rejection counters for diagnostics
  let rejectFillGrid = 0;
  let rejectRealCrossword = 0;
  let rejectClueCoverage = 0;
  let rejectDuplicate = 0;

  for (const tpl of HE_TEMPLATES) {
    let made = 0;
    for (let seed = 1; seed <= 600 && made < PER_TEMPLATE; seed++) {
      const t: FillTemplate = { size: tpl.size, rtl: true, blocks: tpl.blocks };
      const grid = fillGrid(t, idx, { rng: mulberry32(seed * 131 + 7), maxSteps: 20_000, prefer });
      if (!grid) {
        rejectFillGrid++;
        continue;
      }
      if (!isRealCrossword(grid, true)) {
        rejectRealCrossword++;
        continue;
      }

      const sig = grid.map((row) => row.map((c) => c ?? '#').join('')).join('|');
      if (sigs.has(sig)) {
        rejectDuplicate++;
        continue;
      }
      sigs.add(sig);

      const { slots } = buildGrid({ rtl: true, solution: grid });
      const clues: Record<string, string> = {};
      let scoreSum = 0;
      for (const s of slots) {
        // s.answer is already normalized by fillGrid (we used normalized words)
        const answer = s.answer;
        const entry = clueBank.get(answer);
        if (entry?.clue) {
          clues[s.id] = entry.clue;
          scoreSum += clueScore(answer);
        } else {
          // Fallback: no clue in bank — this shouldn't happen if fill universe is correct.
          // (Keeping as safety check; if triggered, diagnose why.)
          clues[s.id] = ''; // placeholder; we'll skip below.
        }
      }
      // Only accept puzzles where every slot has a clue.
      if (slots.some((s) => !clues[s.id])) {
        rejectClueCoverage++;
        continue;
      }
      raws.push({ grid, clues, avgScore: scoreSum / slots.length });
      made++;
    }
    console.log(`  ${tpl.label}: ${made} puzzles`);
  }

  // Difficulty by commonness terciles.
  raws.sort((a, b) => b.avgScore - a.avgScore);
  const third = Math.ceil(raws.length / 3);
  const tierOf = (i: number): SeedPuzzle['difficulty'] =>
    i < third ? 'easy' : i < third * 2 ? 'medium' : 'hard';

  const puzzles: SeedPuzzle[] = raws.map((r, i) => ({
    id: `he-gen-${String(i + 1).padStart(3, '0')}`,
    locale: 'he' as const,
    difficulty: tierOf(i),
    rtl: true,
    grid: r.grid,
    clues: r.clues,
  }));

  const outPath = join(__dirname, '../../lib/crossword/data/puzzles.he.json');
  writeFileSync(outPath, JSON.stringify(puzzles));
  console.log(`\nwrote ${puzzles.length} HE puzzles → ${outPath}`);
  console.log(`\nDiagnostics:`);
  console.log(`  fillGrid failed: ${rejectFillGrid}`);
  console.log(`  isRealCrossword rejected: ${rejectRealCrossword}`);
  console.log(`  duplicate grid: ${rejectDuplicate}`);
  console.log(`  clue coverage failed: ${rejectClueCoverage}`);
  const totalAttempted = rejectFillGrid + rejectRealCrossword + rejectDuplicate + rejectClueCoverage + puzzles.length;
  console.log(`  total attempted: ${totalAttempted} (success rate: ${((puzzles.length / totalAttempted) * 100).toFixed(1)}%)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
