/**
 * Search for newspaper-scale block templates.
 *
 * The clue bank holds only 3–5 letter answers, so a big grid is only possible if EVERY white run
 * is 3–5 long. Random symmetric block placement essentially never satisfies that (the valid set is
 * a vanishingly small subset), so this enumerates constructively instead: each row is a composition
 * of the width into white runs of 3–5 separated by blocks, rows are placed by DFS, and column runs
 * are checked on the growing prefix so bad branches die early. Row i mirrors row n-1-i reversed,
 * which is the 180° rotational symmetry a real crossword needs.
 *
 * Candidates are then scored for LOOK (block fraction, slot count) before being fill-tested against
 * the real clue bank — otherwise the "best filling" template is always the most over-blocked one,
 * because heavy blocking satisfies the run constraints trivially.
 *
 * Usage: npx tsx scripts/crossword/search-templates.ts [--size=11] [--want=400] [--keep=8]
 */
import { buildDictIndex, fillGrid } from '../../lib/crossword/generate.core';
import { isRealCrossword } from '../../lib/crossword/templates';
import { buildGrid } from '../../lib/crossword/grid';
import clueBankJson from '../../lib/crossword/data/clueBank.en.json';

const clueBank = clueBankJson as unknown as Record<string, { score: number }>;

const MIN_RUN = 3;
const MAX_RUN = 5;

type Pt = [number, number];

function arg(name: string, dflt: number): number {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split('=')[1]) : dflt;
}

/** Every row pattern of width n whose white runs are all 3–5 long. true = block. */
function rowPatterns(n: number): boolean[][] {
  const out: boolean[][] = [];
  const cur: boolean[] = [];
  const rec = (pos: number) => {
    if (pos === n) {
      out.push([...cur]);
      return;
    }
    cur.push(true); // a block
    rec(pos + 1);
    cur.pop();
    for (let L = MIN_RUN; L <= MAX_RUN && pos + L <= n; L++) {
      const terminated = pos + L < n;
      for (let i = 0; i < L; i++) cur.push(false);
      if (terminated) cur.push(true); // a run must end at a block or the edge
      rec(pos + L + (terminated ? 1 : 0));
      for (let i = 0; i < L + (terminated ? 1 : 0); i++) cur.pop();
    }
  };
  rec(0);
  return out;
}

/** Column runs over the rows placed so far. `final` also checks the run touching the last row. */
function colsOk(rows: boolean[][], n: number, final: boolean): boolean {
  for (let c = 0; c < n; c++) {
    let run = 0;
    for (let r = 0; r < rows.length; r++) {
      if (rows[r][c]) {
        if (run > 0 && (run < MIN_RUN || run > MAX_RUN)) return false;
        run = 0;
      } else if (++run > MAX_RUN) return false;
    }
    if (final && run > 0 && (run < MIN_RUN || run > MAX_RUN)) return false;
  }
  return true;
}

/** A crossword's white squares must form one connected region. */
function connected(rows: boolean[][], n: number): boolean {
  let start: Pt | null = null;
  let total = 0;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (!rows[r][c]) {
        total++;
        start ??= [r, c];
      }
  if (!start) return false;
  const seen = new Set([`${start[0]},${start[1]}`]);
  const stack: Pt[] = [start];
  while (stack.length) {
    const [r, c] = stack.pop()!;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= n || nc >= n) continue;
      const k = `${nr},${nc}`;
      if (rows[nr][nc] || seen.has(k)) continue;
      seen.add(k);
      stack.push([nr, nc]);
    }
  }
  return seen.size === total;
}

function searchGrids(n: number, want: number): boolean[][][] {
  // Row order decides which candidates the DFS ever reaches. Strict sparse-first sounds right —
  // a newspaper grid is mostly white — but it makes the search explore an enormous subtree of
  // near-blockless rows that no column assignment can complete, and it never returns. A seeded
  // shuffle reaches a varied sample fast; the look gate below is what enforces sparseness.
  const rng = mulberry32(20260814);
  const pats = rowPatterns(n)
    .map((p) => ({ p, k: rng() }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.p);
  const found: boolean[][][] = [];
  const half = Math.floor(n / 2);
  const rows: boolean[][] = new Array(n);

  const rec = (r: number): void => {
    if (found.length >= want) return;
    if (r > half) {
      if (colsOk(rows, n, true) && connected(rows, n)) found.push(rows.map((x) => [...x]));
      return;
    }
    for (const p of pats) {
      if (found.length >= want) return;
      const mirror = [...p].reverse();
      const mr = n - 1 - r;
      if (mr === r && p.join() !== mirror.join()) continue; // centre row must be self-symmetric
      rows[r] = p;
      if (mr !== r) rows[mr] = mirror;
      if (colsOk(rows.slice(0, r + 1), n, false)) rec(r + 1);
    }
  };
  rec(0);
  return found;
}

function toBlocks(rows: boolean[][], n: number): Pt[] {
  const out: Pt[] = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (rows[r][c]) out.push([r, c]);
  return out;
}

function main() {
  const size = arg('size', 11);
  const want = arg('want', 400);
  const keep = arg('keep', 8);
  const attempts = arg('attempts', 8);

  const words = Object.keys(clueBank);
  const idx = buildDictIndex(words);
  const prefer = new Set(
    [...words].sort((a, b) => clueBank[b].score - clueBank[a].score).slice(0, 800),
  );

  const grids = searchGrids(size, want);
  const cells = size * size;
  console.log(`${size}×${size}: ${grids.length} symmetric all-runs-3..5 patterns`);

  // LOOK gate, applied before fill-testing. A newspaper grid is 20–32% black; below that the
  // 3–5 run constraint can't hold, above it reads as a Scandinavian filler rather than a crossword.
  const shaped = grids
    .map((rows) => {
      const blocks = toBlocks(rows, size);
      const solution = rows.map((r) => r.map((b) => (b ? null : 'a')));
      const { slots } = buildGrid({ rtl: false, solution });
      return { rows, blocks, slots: slots.length, blockFrac: blocks.length / cells };
    })
    .filter((c) => c.blockFrac >= arg('minBlack', 0.18) && c.blockFrac <= arg('maxBlack', 0.36) && c.slots >= size * 3)
    .sort((a, b) => a.blockFrac - b.blockFrac);

  console.log(`${shaped.length} pass the look gate (18–32% black, ≥${size * 3} slots)`);

  const scored: { blocks: Pt[]; slots: number; blockFrac: number; ok: number; ms: number }[] = [];
  for (const cand of shaped.slice(0, 60)) {
    let ok = 0;
    const t0 = Date.now();
    for (let a = 0; a < attempts; a++) {
      const g = fillGrid({ size, rtl: false, blocks: cand.blocks }, idx, {
        rng: mulberry32(9000 + a * 77),
        maxSteps: 30000,
        prefer,
      });
      if (g && isRealCrossword(g, false)) ok++;
    }
    const entry = { ...cand, ok, ms: Math.round((Date.now() - t0) / attempts) };
    scored.push(entry);
    console.log(
      `  cand ${scored.length}/${Math.min(shaped.length, 60)}: ${entry.slots} slots, ` +
        `${entry.blocks.length} blocks (${Math.round(entry.blockFrac * 100)}%), fill ${ok}/${attempts} @ ${entry.ms}ms` +
        (ok >= Math.ceil(attempts / 2) ? `\n    KEEP ${JSON.stringify(entry.blocks)}` : ''),
    );
  }

  scored.sort((a, b) => b.ok - a.ok || a.blockFrac - b.blockFrac);
  const winners = scored.filter((s) => s.ok >= Math.ceil(attempts / 2)).slice(0, keep);

  console.log(`\n// ${winners.length} templates, each filling ≥50% of seeds from the live bank`);
  console.log(`export const EN_TEMPLATES_${size}: BlockTemplate[] = [`);
  winners.forEach((w, i) => {
    console.log(
      `  // ${w.slots} slots, ${w.blocks.length} blocks (${Math.round(w.blockFrac * 100)}% black), ` +
        `fill ${w.ok}/${attempts} @ ${w.ms}ms`,
    );
    console.log(
      `  { label: '${size}x${size}-${i + 1}', size: ${size}, blocks: ${JSON.stringify(w.blocks)} },`,
    );
  });
  console.log('];');
}

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

main();
