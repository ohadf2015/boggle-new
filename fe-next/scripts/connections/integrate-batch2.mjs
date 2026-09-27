// Validate the 2nd council harvest batch, dedupe against the live en pool,
// insert the new validated puzzles, re-materialize.
import { readFileSync } from 'node:fs';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { validateChain } from './validate-chain.mjs';
config({ path: '.env.local', override: true });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function extract(text) {
  const out = [];
  const re = /```json\s*([\s\S]*?)```/g; let m;
  while ((m = re.exec(text))) { try { const a = JSON.parse(m[1]); if (Array.isArray(a)) out.push(...a); } catch { /* */ } }
  return out;
}

const council = JSON.parse(readFileSync('/tmp/council-en-out2.json', 'utf8'));
const cands = [];
for (const p of Object.values(council.round1 || {})) {
  if (p.status === 'success') for (const q of extract(p.response)) if (q.word1 && q.bridge && q.word2) cands.push(q);
}

// existing active en chains (dedup) + max id
const { data: existing } = await sb.from('connections_puzzles').select('id,word1,bridge,word2').eq('locale', 'en').eq('is_active', true);
const have = new Set(existing.map((p) => `${p.word1}-${p.bridge}-${p.word2}`.toLowerCase()));

const valid = [];
const seen = new Set();
for (const c of cands) {
  const key = `${c.word1}-${c.bridge}-${c.word2}`.toLowerCase();
  if (have.has(key) || seen.has(key)) continue;
  const v = await validateChain(c);
  if (!v.ok) continue;
  seen.add(key);
  const difficulty = v.score >= 3.0 ? 'easy' : v.score >= 0.8 ? 'medium' : 'hard';
  valid.push({
    id: `en-h-${String(valid.length + 1).padStart(3, '0')}`,
    locale: 'en',
    word1: c.word1.toUpperCase(), bridge: c.bridge.toUpperCase(), word2: c.word2.toUpperCase(),
    accepted_answers: [], hint: c.hint || null,
    examples: [{ w1: `${c.word1}${c.bridge}`.toLowerCase(), bridge: c.bridge.toLowerCase(), w2: `${c.bridge}${c.word2}`.toLowerCase() }],
    difficulty, source: 'council-seed', is_active: true,
  });
}
console.log(`batch2 candidates ${cands.length} → new validated (deduped) ${valid.length}`);
for (const p of valid) console.log(`  ${p.word1}+${p.bridge}+${p.word2}`);
if (valid.length) {
  const { error } = await sb.from('connections_puzzles').upsert(valid, { onConflict: 'id' });
  if (error) { console.error('upsert err', error.message); process.exit(1); }
  const { count } = await sb.from('connections_puzzles').select('*', { count: 'exact', head: true }).eq('locale', 'en').eq('is_active', true);
  console.log(`inserted. en active total now ${count}`);
}
