// Rebuild the en pool from the judged clean set: archive all old en rows
// (is_active=false — the 225 broken + everything else) and install the 147
// validated puzzles as the new active en pool. The DB is the source of truth;
// materialize-puzzles.mjs then writes the static snapshot the runtime loads.
import { readFileSync } from 'node:fs';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
config({ path: '.env.local', override: true });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const kept = JSON.parse(readFileSync('/tmp/en-pool-judged.json', 'utf8'));

const SRC = { orig: 'authored', gen: 'generated', council: 'council-seed' };
const pad = (n) => String(n).padStart(3, '0');

// order easy→medium→hard for stable ids
const order = { easy: 0, medium: 1, hard: 2 };
kept.sort((a, b) => (order[a.difficulty] - order[b.difficulty]) || a.bridge.localeCompare(b.bridge));

const rows = kept.map((p, i) => ({
  id: `en-q-${pad(i + 1)}`,
  locale: 'en',
  word1: p.word1.toUpperCase(),
  bridge: p.bridge.toUpperCase(),
  word2: p.word2.toUpperCase(),
  accepted_answers: [],
  hint: p.hint || null,
  examples: [{ w1: `${p.word1}${p.bridge}`, bridge: p.bridge, w2: `${p.bridge}${p.word2}` }],
  difficulty: p.difficulty,
  source: SRC[p.src] || 'authored',
  is_active: true,
}));

// 1. archive ALL existing en rows
const { error: e1 } = await sb.from('connections_puzzles').update({ is_active: false }).eq('locale', 'en');
if (e1) { console.error('archive failed', e1.message); process.exit(1); }

// 2. install the clean pool
const { error: e2 } = await sb.from('connections_puzzles').upsert(rows, { onConflict: 'id' });
if (e2) { console.error('upsert failed', e2.message); process.exit(1); }

const { count } = await sb.from('connections_puzzles').select('*', { count: 'exact', head: true }).eq('locale', 'en').eq('is_active', true);
console.log(`en rebuilt: ${rows.length} clean puzzles installed, active count=${count}`);
