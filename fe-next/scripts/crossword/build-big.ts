/**
 * Bake the newspaper-size (11×11) EN puzzle pool.
 *
 * Why baked rather than generated in the browser like the mini: a 5×5 fills in ~350ms, but an
 * 11×11 with 40+ doubly-checked slots takes seconds per attempt and fails roughly half of them.
 * Inline that is a multi-second stall on the loader, and on a low-end Android it is far worse.
 *
 * Baking also buys the quality the runtime can't afford. Offline we can generate many candidates
 * per template and keep only the best-scoring fills; inline the generator has to accept the first
 * grid that passes the gate.
 *
 * Only the GRIDS are written out — clues are looked up from the clue bank at runtime. That keeps
 * the payload at ~150 bytes per puzzle instead of ~2KB, and means clue-bank improvements flow
 * into already-baked puzzles for free.
 *
 * Usage: npx tsx scripts/crossword/build-big.ts [--count=200] [--size=11] [--steps=200000]
 *                                              [--locale=en|he]
 *
 * The 11×11 block patterns are pure geometry (every white run is 3–5 long), so they are reused
 * across locales — only the clue bank and the across-direction change. `rtl` MUST match what
 * bigPool.toPuzzle passes to buildGrid at load time, or every across answer comes back reversed.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDictIndex, fillGrid } from '../../lib/crossword/generate.core';
import { isRealCrossword, templatesFor } from '../../lib/crossword/templates';
import { buildGrid } from '../../lib/crossword/grid';
import { mulberry32 } from '../../lib/rng/seededRandom';
import { isRtlLocale } from '../../lib/crossword/format';
import type { PuzzleLocale } from '../../lib/crossword/types';
import enClueBankJson from '../../lib/crossword/data/clueBank.en.json';
import heClueBankJson from '../../lib/crossword/data/clueBank.he.json';

type ClueBank = Record<string, { clue: string; score: number }>;
const BANKS: Record<string, ClueBank> = {
  en: enClueBankJson as unknown as ClueBank,
  he: heClueBankJson as unknown as ClueBank,
};

function arg(name: string, dflt: number): number {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split('=')[1]) : dflt;
}

function strArg(name: string, dflt: string): string {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : dflt;
}

function main() {
  const locale = strArg('locale', 'en') as PuzzleLocale;
  const clueBank = BANKS[locale];
  if (!clueBank) {
    console.error(`No clue bank bundled for locale "${locale}" — add it to BANKS.`);
    process.exit(1);
  }
  const rtl = isRtlLocale(locale);
  const size = arg('size', 11);
  const target = arg('count', 200);
  const maxSteps = arg('steps', 30000);
  // Shard id. The fill is single-threaded and slow, so the pool is baked by several processes at
  // once; the shard only shifts the seed stream so they explore different fills, and `--out`
  // keeps their outputs apart for merging.
  const shard = arg('shard', 0);

  const templates = templatesFor(locale, size);
  if (!templates.length) {
    console.error(`No ${size}×${size} templates registered — run search-templates.ts first.`);
    process.exit(1);
  }

  const words = Object.keys(clueBank);
  const idx = buildDictIndex(words);
  // Commonness rank: 0 = the single commonest word in the bank. Used both to bias the fill and
  // to judge it afterwards.
  const byCommon = [...words].sort((a, b) => clueBank[b].score - clueBank[a].score);
  const rank = new Map(byCommon.map((w, i) => [w, i]));
  const prefer = new Set(byCommon.slice(0, 800));

  const seen = new Set<string>();
  const kept: { rows: string[]; mean: number; worst: number }[] = [];
  const started = Date.now();
  // Counted, not silent: a filter that rejects everything looks exactly like a slow run, and
  // "produced zero and said nothing" is the failure mode that costs the most time here.
  const rejected = { fill: 0, gate: 0, unclued: 0, obscure: 0, dupe: 0 };
  // The rarity gate is an absolute rank cut, so its right value scales with BANK SIZE, not taste.
  // en ranks 2,400 words and 0.7 leaves ~720 of headroom; he ranks 1,206 of which only 1,089 are
  // the 3–5 letters a grid can use, so 0.7 puts the cut at rank 844 and every one of 38 slots has
  // to dodge the top-tail — it rejected 411 of 500 valid fills and baked ZERO. Keep the gate for
  // genuinely broken grids and let the mean-commonness sort below do the actual quality work.
  const RARITY_LIMIT = arg('rarity', locale === 'he' ? 0.97 : 0.7);

  // Spend a fixed attempt budget and keep the BEST `target`, rather than stopping at the first
  // `target` that pass. Oversampling is what makes the commonness ranking mean anything — stop
  // early and "best" is just "first".
  const budget = arg('attempts', target * 6);
  for (let attempt = 0; attempt < budget; attempt++) {
    const tpl = templates[attempt % templates.length];
    const grid = fillGrid({ size: tpl.size, rtl, blocks: tpl.blocks }, idx, {
      rng: mulberry32(0x9e3779b9 ^ ((attempt + shard * 100000) * 2654435761)),
      maxSteps,
      prefer,
    });
    if (!grid) {
      rejected.fill++;
      continue;
    }
    if (!isRealCrossword(grid, rtl)) {
      rejected.gate++;
      continue;
    }

    const { slots } = buildGrid({ rtl, solution: grid });
    if (slots.some((s) => !clueBank[s.answer]?.clue)) {
      rejected.unclued++;
      continue; // unclued answer — unusable
    }

    // Quality is a RANKING, not a gate. Gating on the single worst answer threw away 239 of 276
    // valid fills: across 42 crossings, at least one word from the bank's long tail is close to
    // unavoidable, so the gate rejected excellent grids for one obscure crossing. Instead every
    // valid fill stays in contention and the pool takes the best by average commonness.
    const ranks = slots.map((s) => rank.get(s.answer) ?? words.length);
    const worst = Math.max(...ranks);
    if (worst > words.length * RARITY_LIMIT) {
      rejected.obscure++;
      continue;
    }
    const mean = ranks.reduce((a, b) => a + b, 0) / ranks.length;

    const rows = grid.map((row) => row.map((c) => c ?? '#').join(''));
    const key = rows.join('|');
    if (seen.has(key)) {
      rejected.dupe++;
      continue;
    }
    seen.add(key);
    kept.push({ rows, mean, worst });
    if (kept.length % 5 === 0) {
      console.log(
        `${kept.length} kept · attempt ${attempt + 1}/${budget} · ` +
          `${Math.round((Date.now() - started) / 1000)}s · rejected ${JSON.stringify(rejected)}`,
      );
    }
  }

  console.log(`rejected: ${JSON.stringify(rejected)}`);
  if (!kept.length) {
    console.error('Baked ZERO puzzles — check the reject counts above before shipping this pool.');
    process.exit(1);
  }
  kept.sort((a, b) => a.mean - b.mean); // commonest-vocabulary puzzles first
  const pool = kept.slice(0, target);
  const out = { size, grids: pool.map((k) => k.rows) };
  const suffix = shard ? `.shard${shard}` : '';
  const path = join(__dirname, `../../lib/crossword/data/grids.${locale}${size}${suffix}.json`);
  writeFileSync(path, JSON.stringify(out));
  console.log(
    `wrote ${kept.length} grids → ${path} ` +
      `(kept ${pool.length} of ${kept.length} valid fills; ` +
      `mean commonness rank ${Math.round(pool.reduce((a, k) => a + k.mean, 0) / (pool.length || 1))} ` +
      `of ${words.length})`,
  );
}

main();
