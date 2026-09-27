// Validate every en puzzle: BOTH word1+bridge and bridge+word2 must be real
// compounds. Uses Datamuse word frequency (Google-Books per-million) as the
// signal — fake compounds (stonenote, stonecastle) sit at ~0 while real ones
// (sandcastle 0.033, keystone 0.99) are higher. Classifies BROKEN / SUSPECT / OK.
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';
config({ path: '.env.local', override: true });

const BROKEN_MAX = 0.03; // ≤ this on a side = almost certainly not a word
const SUSPECT_MAX = 0.15; // ≤ this = borderline, eyeball it

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE,
);

const freqCache = new Map();
async function freq(word) {
  const key = word.toLowerCase();
  if (freqCache.has(key)) return freqCache.get(key);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(key)}&md=f&max=1`);
      const d = await r.json();
      let f = 0;
      if (d.length && d[0].word.toLowerCase() === key) {
        const tag = (d[0].tags || []).find((t) => t.startsWith('f:'));
        f = tag ? parseFloat(tag.slice(2)) : 0;
      }
      freqCache.set(key, f);
      return f;
    } catch {
      await new Promise((res) => setTimeout(res, 300));
    }
  }
  freqCache.set(key, null);
  return null; // network failure — don't classify
}

const { data, error } = await sb
  .from('connections_puzzles')
  .select('id,word1,bridge,word2,difficulty,source')
  .eq('locale', 'en')
  .order('id');
if (error) { console.error(error.message); process.exit(1); }

const results = [];
// modest concurrency
const POOL = 6;
let i = 0;
async function worker() {
  while (i < data.length) {
    const p = data[i++];
    const left = `${p.word1}${p.bridge}`;
    const right = `${p.bridge}${p.word2}`;
    const lf = await freq(left);
    const rf = await freq(right);
    results.push({ ...p, left, right, lf, rf });
  }
}
await Promise.all(Array.from({ length: POOL }, worker));
results.sort((a, b) => a.id.localeCompare(b.id));

const classify = (r) => {
  if (r.lf == null || r.rf == null) return 'UNKNOWN';
  const min = Math.min(r.lf, r.rf);
  if (min <= BROKEN_MAX) return 'BROKEN';
  if (min <= SUSPECT_MAX) return 'SUSPECT';
  return 'OK';
};

const broken = [], suspect = [];
for (const r of results) {
  const c = classify(r);
  const bad = [];
  if (r.lf != null && r.lf <= SUSPECT_MAX) bad.push(`${r.left}=${r.lf?.toFixed(3)}`);
  if (r.rf != null && r.rf <= SUSPECT_MAX) bad.push(`${r.right}=${r.rf?.toFixed(3)}`);
  const row = { id: r.id, chain: `${r.word1}+${r.bridge}+${r.word2}`, bad: bad.join(' '), source: r.source };
  if (c === 'BROKEN') broken.push(row);
  else if (c === 'SUSPECT') suspect.push(row);
}

console.log(`en total ${results.length} | BROKEN ${broken.length} | SUSPECT ${suspect.length}`);
console.log('\n=== BROKEN (deactivate/fix) ===');
for (const r of broken) console.log(`  ${r.id}  ${r.chain}  → ${r.bad}  [${r.source}]`);
console.log('\n=== SUSPECT (review) ===');
for (const r of suspect) console.log(`  ${r.id}  ${r.chain}  → ${r.bad}  [${r.source}]`);
writeFileSync('/tmp/en-bridge-audit.json', JSON.stringify({ broken, suspect }, null, 2));
