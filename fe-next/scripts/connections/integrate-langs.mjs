// Integrate fresh council batches for non-English locales (es/sv/ja). These
// scripts can't use the English dictionary validator, so quality rests on the
// council + structural checks + dedupe; they ship behind is_active + the ban
// system (same posture as the original es/sv seeds).
//   node scripts/connections/integrate-langs.mjs es sv ja
import { readFileSync } from 'node:fs';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
config({ path: '.env.local', override: true });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const locales = process.argv.slice(2);

function extract(text) {
  const out = [];
  const re = /```json\s*([\s\S]*?)```/g; let m;
  while ((m = re.exec(text))) { try { const a = JSON.parse(m[1]); if (Array.isArray(a)) out.push(...a); } catch { /* */ } }
  return out;
}

const clean = (s) => String(s || '').trim();

for (const locale of locales) {
  let council;
  try { council = JSON.parse(readFileSync(`/tmp/c-${locale}-out.json`, 'utf8')); }
  catch { console.log(`${locale}: no output file, skipping`); continue; }

  const cands = [];
  for (const p of Object.values(council.round1 || {})) {
    if (p.status === 'success') for (const q of extract(p.response)) {
      if (q.word1 && q.bridge && q.word2) cands.push(q);
    }
  }

  // existing active chains for dedupe + current max harvest index
  const { data: existing } = await sb
    .from('connections_puzzles').select('id,word1,bridge,word2')
    .eq('locale', locale).eq('is_active', true);
  const have = new Set(existing.map((p) => `${p.word1}|${p.bridge}|${p.word2}`.toLowerCase()));
  let hIdx = existing.filter((p) => p.id.startsWith(`${locale}-h-`)).length;

  const seen = new Set();
  const rows = [];
  for (const c of cands) {
    const w1 = clean(c.word1), b = clean(c.bridge), w2 = clean(c.word2);
    if (!w1 || !b || !w2) continue;
    if (w1 === w2 || w1 === b || w2 === b) continue;               // non-degenerate
    if (!c.examples || !c.examples[0]?.w1 || !c.examples[0]?.w2) continue; // needs why-it-works
    const key = `${w1}|${b}|${w2}`.toLowerCase();
    if (have.has(key) || seen.has(key)) continue;
    seen.add(key);
    rows.push({
      id: `${locale}-h-${String(++hIdx).padStart(3, '0')}`,
      locale,
      word1: w1, bridge: b, word2: w2,
      accepted_answers: [],
      hint: c.hint ? clean(c.hint) : null,
      examples: [{ w1: clean(c.examples[0].w1), bridge: b, w2: clean(c.examples[0].w2) }],
      difficulty: ['easy', 'medium', 'hard'].includes(c.difficulty) ? c.difficulty : 'medium',
      source: 'council-seed',
      is_active: true,
    });
  }
  if (rows.length) {
    const { error } = await sb.from('connections_puzzles').upsert(rows, { onConflict: 'id' });
    if (error) { console.error(`${locale} upsert err`, error.message); continue; }
  }
  const { count } = await sb.from('connections_puzzles')
    .select('*', { count: 'exact', head: true }).eq('locale', locale).eq('is_active', true);
  console.log(`${locale}: ${cands.length} candidates → +${rows.length} new (deduped) → active total ${count}`);
}
