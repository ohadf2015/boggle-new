// Build the final clean en pool: council candidates + generated candidates,
// all run through the strict validator (real anchors, real both-side compounds,
// freq floors, affix blocklist). Dedupe by chain + cap per bridge for variety.
import { readFileSync, writeFileSync } from 'node:fs';
import { validateChain } from './validate-chain.mjs';

function extractJsonBlocks(text) {
  const out = [];
  const re = /```json\s*([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(text))) {
    try { const arr = JSON.parse(m[1]); if (Array.isArray(arr)) out.push(...arr); } catch { /* skip */ }
  }
  return out;
}

// 1. council candidates (both providers)
const council = JSON.parse(readFileSync('/tmp/council-en-out.json', 'utf8'));
const candidates = [];
for (const prov of Object.values(council.round1 || {})) {
  if (prov.status === 'success') {
    for (const p of extractJsonBlocks(prov.response)) {
      if (p.word1 && p.bridge && p.word2) {
        candidates.push({ word1: p.word1, bridge: p.bridge, word2: p.word2, hint: p.hint, difficulty: p.difficulty, src: 'council' });
      }
    }
  }
}
// 2. generated candidates
for (const p of JSON.parse(readFileSync('/tmp/generated-en-chains.json', 'utf8'))) {
  candidates.push({ word1: p.word1, bridge: p.bridge, word2: p.word2, difficulty: p.difficulty, src: 'gen' });
}

console.log(`candidates: ${candidates.length} (council + generated)`);

// 3. validate all
const valid = [];
const seen = new Set();
for (const c of candidates) {
  const key = `${c.word1}-${c.bridge}-${c.word2}`.toLowerCase();
  if (seen.has(key)) continue;
  const v = await validateChain(c);
  if (!v.ok) continue;
  seen.add(key);
  valid.push({ ...c, score: v.score, lf: v.lf, rf: v.rf });
}
console.log(`validated clean: ${valid.length}`);

// 4. cap per bridge (variety) + difficulty by freq
valid.sort((a, b) => b.score - a.score);
const perBridge = new Map();
const final = [];
for (const v of valid) {
  const n = perBridge.get(v.bridge) || 0;
  if (n >= 4) continue;
  perBridge.set(v.bridge, n + 1);
  const difficulty = v.score >= 3.0 ? 'easy' : v.score >= 0.8 ? 'medium' : 'hard';
  final.push({
    word1: v.word1.toLowerCase(), bridge: v.bridge.toLowerCase(), word2: v.word2.toLowerCase(),
    hint: v.hint || null, difficulty, src: v.src,
    examples: [{ w1: `${v.word1}${v.bridge}`.toLowerCase(), bridge: v.bridge.toLowerCase(), w2: `${v.bridge}${v.word2}`.toLowerCase() }],
  });
}
const byD = {}, bySrc = {};
for (const p of final) { byD[p.difficulty] = (byD[p.difficulty] || 0) + 1; bySrc[p.src] = (bySrc[p.src] || 0) + 1; }
console.log(`FINAL pool: ${final.length} | difficulty ${JSON.stringify(byD)} | source ${JSON.stringify(bySrc)}`);
console.log('\nsample (40):');
for (const p of final.slice(0, 40)) console.log(`  ${p.word1}+${p.bridge.toUpperCase()}+${p.word2}  [${p.difficulty}/${p.src}]  (${p.examples[0].w1} · ${p.examples[0].w2})`);
writeFileSync('/tmp/en-pool-final.json', JSON.stringify(final, null, 2));
