/**
 * Find symmetric word squares (grid[i][j] === grid[j][i]) from a curated common-word pool,
 * validated against the real dictionary. A symmetric square reads identically across & down
 * and in RTL, so it's a robust, guaranteed-valid source for hand-seeded mini puzzles while the
 * frequency-ranked generator is future work.
 *
 * Usage: npx tsx scripts/crossword/findSquares.ts
 */
import {
  createSafeReadFile,
  loadEnglishDictionary,
  loadHebrewDictionary,
} from '../../backend/dictionaryLoaders';
import { COMMON_EN, COMMON_HE } from './commonWords';
import { normalizeHebrewWord } from '../../shared/utils/wordNormalization';

function poolByLen(words: string[], dict: Set<string>, n: number, normalize: (w: string) => string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of words) {
    const w = normalize(raw);
    if (w.length !== n) continue;
    if (!dict.has(w)) continue;
    if (seen.has(w)) continue;
    seen.add(w);
    out.push(w);
  }
  return out;
}

// Build a prefix index: prefix -> words starting with it, for fast column-constraint lookup.
function prefixIndex(words: string[]): Map<string, string[]> {
  const idx = new Map<string, string[]>();
  for (const w of words) {
    for (let i = 1; i <= w.length; i++) {
      const p = w.slice(0, i);
      const b = idx.get(p) ?? [];
      b.push(w);
      idx.set(p, b);
    }
  }
  return idx;
}

/** Find up to `limit` symmetric squares of size n from pool. */
function findSquares(pool: string[], n: number, limit: number): string[][] {
  const idx = prefixIndex(pool);
  const results: string[][] = [];

  const recurse = (rows: string[]) => {
    if (results.length >= limit) return;
    const r = rows.length;
    if (r === n) {
      results.push([...rows]);
      return;
    }
    // For row r, columns 0..r-1 are fixed by symmetry (col c = rows[c][r]).
    const prefix = rows.map((row) => row[r]).join('');
    const candidates = idx.get(prefix) ?? (prefix === '' ? pool : []);
    for (const w of candidates) {
      if (w.length !== n) continue;
      if (rows.includes(w)) continue; // avoid trivial duplicate-row squares where possible
      rows.push(w);
      recurse(rows);
      rows.pop();
      if (results.length >= limit) return;
    }
  };
  recurse([]);
  return results;
}

async function main() {
  const safeRead = createSafeReadFile();
  const [en, he] = await Promise.all([
    loadEnglishDictionary(safeRead),
    loadHebrewDictionary(safeRead),
  ]);

  const enNorm = (w: string) => w.trim().toLowerCase();
  for (const n of [5, 4]) {
    const pool = poolByLen(COMMON_EN, en, n, enNorm);
    const squares = findSquares(pool, n, 6);
     
    console.log(`\n=== EN ${n}x${n} (pool ${pool.length}) — ${squares.length} squares ===`);
    for (const sq of squares) console.log('  ' + sq.join(' / '));
  }

  for (const n of [4, 3]) {
    const pool = poolByLen(COMMON_HE, he, n, normalizeHebrewWord);
    const squares = findSquares(pool, n, 8);
     
    console.log(`\n=== HE ${n}x${n} (pool ${pool.length}) — ${squares.length} squares ===`);
    for (const sq of squares) console.log('  ' + sq.join(' / '));
  }
}

main().catch((e) => {
   
  console.error(e);
  process.exit(1);
});
