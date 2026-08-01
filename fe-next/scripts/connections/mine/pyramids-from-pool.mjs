// Deterministic pyramid miner over the CURATED regular pool (zero LLM).
//
//   node scripts/connections/mine/pyramids-from-pool.mjs <locale...> [--max N]
//
// A pyramid needs: meta M + 3 base puzzles whose bridges P1..P3 are distinct,
// ≠ M, and each combine with M into a real compound/phrase. Both facts are
// already encoded in the active pool:
//   - partner evidence: an active puzzle containing M as word1 with bridge Pi
//     (M+Pi real) or as word2 (Pi+M real) proves the Pi↔M combination.
//   - base puzzles: any OTHER active puzzle whose bridge == Pi and which does
//     not mention M (so the base doesn't spoil the finale).
// Every word came through the curated quality gate, so mined pyramids inherit
// native-judged quality. Output: scripts/connections/mine/out/pyramids-<locale>.json
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
config({ path: '.env.local', override: true });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const args = process.argv.slice(2);
const maxIdx = args.indexOf('--max');
const MAX = maxIdx >= 0 ? Number(args[maxIdx + 1]) : 40;
const locales = args.filter((a, i) => !a.startsWith('--') && i !== maxIdx + 1);

const low = (s) => String(s ?? '').trim().toLowerCase();

for (const locale of locales) {
  const { data: pool, error } = await sb
    .from('connections_puzzles')
    .select('id,word1,bridge,word2,hint,difficulty,quality_score')
    .eq('locale', locale)
    .eq('is_active', true)
    .gte('quality_score', 60);
  if (error) throw error;

  // partner evidence: meta word → set of bridges proven to combine with it
  const partners = new Map(); // lowMeta → Map(lowBridge → {side, srcId})
  // base index: bridge → puzzles with that bridge
  const byBridge = new Map();
  for (const p of pool) {
    const b = low(p.bridge);
    for (const [word, side] of [[low(p.word1), 'left'], [low(p.word2), 'right']]) {
      if (!word || word === b) continue;
      if (!partners.has(word)) partners.set(word, new Map());
      if (!partners.get(word).has(b)) partners.get(word).set(b, { side, srcId: p.id });
    }
    if (!byBridge.has(b)) byBridge.set(b, []);
    byBridge.get(b).push(p);
  }

  // deterministic order: metas sorted, partners sorted
  const out = [];
  const usedBaseIds = new Set();
  const metas = [...partners.keys()].sort();
  let n = 0;
  for (const meta of metas) {
    if (out.length >= MAX) break;
    const partnerBridges = [...partners.get(meta).keys()].sort();
    if (partnerBridges.length < 3) continue;
    // pick 3 partners that each have an unused base puzzle not mentioning meta
    const chosen = [];
    for (const pb of partnerBridges) {
      if (chosen.length === 3) break;
      const candidates = (byBridge.get(pb) ?? [])
        .filter((q) => low(q.word1) !== meta && low(q.word2) !== meta && !usedBaseIds.has(q.id))
        .sort((a, b2) => (b2.quality_score ?? 0) - (a.quality_score ?? 0));
      if (candidates.length) chosen.push({ bridge: pb, puzzle: candidates[0] });
    }
    if (chosen.length < 3) continue;
    chosen.forEach((c) => usedBaseIds.add(c.puzzle.id));
    const metaDisplay = pool.find((p) => low(p.word1) === meta)?.word1
      ?? pool.find((p) => low(p.word2) === meta)?.word2 ?? meta;
    n++;
    out.push({
      id: `${locale}-pyr-m${String(n).padStart(3, '0')}`,
      locale,
      meta_answer: metaDisplay,
      meta_accepted: [],
      meta_hint: null,
      base: chosen.map((c, i) => ({
        id: `${locale}-pyr-m${String(n).padStart(3, '0')}-b${i + 1}`,
        word1: c.puzzle.word1,
        word2: c.puzzle.word2,
        bridge: c.puzzle.bridge,
        hint: c.puzzle.hint ?? null,
        accepted: [],
        difficulty: c.puzzle.difficulty,
      })),
      // evidence for review: which pool puzzles prove each meta↔bridge combo
      _evidence: chosen.map((c) => partners.get(meta).get(c.bridge)),
      difficulty: chosen.filter((c) => c.puzzle.difficulty === 'hard').length >= 2 ? 'hard'
        : chosen.some((c) => c.puzzle.difficulty !== 'easy') ? 'medium' : 'easy',
      quality_score: 80,
      source: 'mined',
    });
  }

  const outDir = join(dirname(fileURLToPath(import.meta.url)), 'out');
  mkdirSync(outDir, { recursive: true });
  const file = join(outDir, `pyramids-${locale}.json`);
  writeFileSync(file, JSON.stringify({ pyramids: out }, null, 1));
  console.log(`${locale}: pool=${pool.length} metas=${metas.length} pyramids=${out.length} → ${file}`);
}
