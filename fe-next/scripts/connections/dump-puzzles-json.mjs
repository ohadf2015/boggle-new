// Compile the static puzzle pools and dump every EN/HE puzzle as JSON so the
// seed step can upsert them into public.connections_puzzles. One-shot helper —
// the DB becomes source-of-truth afterward; this captures the current pools.
import { build } from 'esbuild';
import { writeFileSync } from 'node:fs';

const result = await build({
  entryPoints: ['lib/connections/puzzles/index.ts'],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
});
const code = result.outputFiles[0].text;
const mod = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

const out = [];
for (const locale of ['en', 'he']) {
  for (const p of mod.getPuzzlesForLocale(locale)) {
    out.push({
      id: p.id,
      locale,
      word1: p.word1,
      bridge: p.bridge,
      word2: p.word2,
      accepted_answers: p.acceptedAnswers ?? [],
      hint: p.hint ?? null,
      difficulty: p.difficulty,
      source: p.id.includes('-online') || /online/i.test(p.id) ? 'online' : 'authored',
    });
  }
}
writeFileSync('/tmp/connections-seed.json', JSON.stringify(out));
console.log(`dumped ${out.length} puzzles (en+he)`);
