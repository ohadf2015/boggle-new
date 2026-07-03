// Materialize ACTIVE, judge-passed Bridge Pyramid puzzles from the DB
// (source-of-truth) into committed static .ts pool files (the runtime load
// path). Same fail-closed gate + determinism contract as materialize-puzzles.
//
//   node scripts/connections/materialize-pyramids.mjs en he
//
// Writes lib/connections/puzzles/generated/pyramid.<locale>.generated.ts.
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';
config({ path: '.env.local', override: true });

const locales = process.argv.slice(2);
if (locales.length === 0) {
  console.error('usage: materialize-pyramids.mjs <locale...>');
  process.exit(1);
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE,
);

// Fail-closed quality gate: NULL quality_score never ships (.gte excludes NULLs).
const QUALITY_GATE = 60;

const j = (v) => JSON.stringify(v);

for (const locale of locales) {
  const { data, error } = await sb
    .from('connections_pyramid_puzzles')
    .select('id,meta_answer,meta_accepted,meta_hint,base,difficulty')
    .eq('locale', locale)
    .eq('is_active', true)
    .gte('quality_score', QUALITY_GATE)
    .order('id', { ascending: true });
  if (error) {
    console.error(locale, 'ERR', error.message);
    process.exit(1);
  }
  // Structural invariants (fail-closed — learned 2026-07-03 when generators
  // produced bases whose bridge/word WAS the finale answer): exactly 3 base
  // riddles, 3 distinct bridges, and the meta answer never visible in any
  // base slot (it would print the finale answer on screen).
  const up = (s) => String(s ?? '').toUpperCase();
  const bad = data.filter((p) => {
    if (!Array.isArray(p.base) || p.base.length !== 3) return true;
    const bridges = new Set(p.base.map((b) => up(b.bridge)));
    if (bridges.size !== 3) return true;
    const meta = up(p.meta_answer);
    return p.base.some((b) => up(b.bridge) === meta || up(b.word1) === meta || up(b.word2) === meta);
  });
  if (bad.length) {
    console.error(locale, 'ERR structurally invalid pyramids:', bad.map((p) => p.id).join(','));
    process.exit(1);
  }
  const constName = `${locale.toUpperCase()}_PYRAMIDS`;
  const items = data.map((p) => {
    const base = p.base.map((b) => {
      const fields = [`id: ${j(b.id)}`, `word1: ${j(b.word1)}`, `bridge: ${j(b.bridge)}`, `word2: ${j(b.word2)}`];
      if (b.accepted?.length) fields.push(`acceptedAnswers: ${j(b.accepted)}`);
      if (b.hint) fields.push(`hint: ${j(b.hint)}`);
      fields.push(`difficulty: ${j(b.difficulty)}`);
      return `{ ${fields.join(', ')} }`;
    });
    const fields = [`id: ${j(p.id)}`, `metaAnswer: ${j(p.meta_answer)}`];
    if (p.meta_accepted?.length) fields.push(`metaAccepted: ${j(p.meta_accepted)}`);
    if (p.meta_hint) fields.push(`metaHint: ${j(p.meta_hint)}`);
    fields.push(`base: [${base.join(', ')}]`);
    fields.push(`difficulty: ${j(p.difficulty)}`);
    return `  { ${fields.join(', ')} },`;
  });
  const out = `/**
 * AUTO-GENERATED — do not edit by hand.
 * Materialized from public.connections_pyramid_puzzles (is_active=true,
 * quality_score>=${QUALITY_GATE}, locale='${locale}') via
 * scripts/connections/materialize-pyramids.mjs. The DB is the source of
 * truth; this committed snapshot is the deterministic runtime load path.
 */
import type { PyramidPuzzle } from '../../pyramid/types';

export const ${constName}: PyramidPuzzle[] = [
${items.join('\n')}
];
`;
  const path = `lib/connections/puzzles/generated/pyramid.${locale}.generated.ts`;
  writeFileSync(path, out);
  console.log(`wrote ${path} (${data.length} pyramids)`);
}
