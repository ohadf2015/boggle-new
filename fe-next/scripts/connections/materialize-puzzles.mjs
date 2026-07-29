// Materialize ACTIVE puzzles from the DB (source-of-truth) into committed
// static .ts pool files (the runtime load path). Keeps the daily a pure,
// deterministic function over a frozen snapshot — leaderboard stays comparable.
//
//   node scripts/connections/materialize-puzzles.mjs es sv
//
// Writes lib/connections/puzzles/generated/<locale>.generated.ts per locale.
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';
config({ path: '.env.local', override: true });

const locales = process.argv.slice(2);
if (locales.length === 0) {
  console.error('usage: materialize-puzzles.mjs <locale...>');
  process.exit(1);
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE,
);

const j = (v) => JSON.stringify(v);

for (const locale of locales) {
  const { data, error } = await sb
    .from('connections_puzzles')
    .select('id,word1,bridge,word2,accepted_answers,hint,examples,difficulty,source')
    .eq('locale', locale)
    .eq('is_active', true)
    .order('id', { ascending: true });
  if (error) {
    console.error(locale, 'ERR', error.message);
    process.exit(1);
  }
  const constName = `${locale.toUpperCase()}_PUZZLES`;
  const items = data.map((p) => {
    const fields = [`id: ${j(p.id)}`, `word1: ${j(p.word1)}`, `bridge: ${j(p.bridge)}`, `word2: ${j(p.word2)}`];
    if (p.accepted_answers?.length) fields.push(`acceptedAnswers: ${j(p.accepted_answers)}`);
    if (p.hint) fields.push(`hint: ${j(p.hint)}`);
    if (p.examples?.length) fields.push(`examples: ${j(p.examples)}`);
    fields.push(`difficulty: ${j(p.difficulty)}`);
    if (p.source) fields.push(`source: ${j(p.source)}`);
    return `  { ${fields.join(', ')} },`;
  });
  const out = `/**
 * AUTO-GENERATED — do not edit by hand.
 * Materialized from public.connections_puzzles (is_active=true, locale='${locale}')
 * via scripts/connections/materialize-puzzles.mjs. The DB is the source of
 * truth; this committed snapshot is the deterministic runtime load path.
 */
import type { ConnectionPuzzle } from '../../types';

export const ${constName}: ConnectionPuzzle[] = [
${items.join('\n')}
];
`;
  const path = `lib/connections/puzzles/generated/${locale}.generated.ts`;
  writeFileSync(path, out);
  console.log(`wrote ${path} (${data.length} puzzles)`);
}
