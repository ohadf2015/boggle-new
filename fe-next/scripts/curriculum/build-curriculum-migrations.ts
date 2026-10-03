#!/usr/bin/env tsx
/**
 * Regenerates the curriculum v2 migrations from lib/education/curriculum/data/<lang>.json
 * and prints the dictionary check for every word. Writes files only; never applies them.
 *
 *   node_modules/.bin/tsx scripts/curriculum/build-curriculum-migrations.ts [--report <file>]
 */
import fs from 'fs';
import { CURRICULUM_SEEDS, buildCurriculumMigration, loadCurriculumSeed, migrationPath } from '../../lib/education/curriculum/curriculumSeed';
import { dictionaryKey, loadShippedDictionary } from '../../lib/education/curriculum/curriculumDictCheck';

const reportIdx = process.argv.indexOf('--report');
const reportFile = reportIdx > -1 ? process.argv[reportIdx + 1] : null;
const lines: string[] = [];
const dicts = new Map<string, Set<string>>();
let missingTotal = 0;

for (const name of CURRICULUM_SEEDS) {
  const seed = loadCurriculumSeed(name);
  fs.writeFileSync(migrationPath(seed), buildCurriculumMigration(seed));
  const words = seed.lists.reduce((n, l) => n + l.words.length, 0);
  lines.push(`== ${name}: ${seed.lists.length} lists, ${words} words -> supabase/migrations/${seed.migration}`);
  for (const list of seed.lists) {
    if (!dicts.has(list.language)) dicts.set(list.language, loadShippedDictionary(list.language));
    const dict = dicts.get(list.language)!;
    const misses = list.words.filter((w) => !dict.has(dictionaryKey(w.word, list.language)));
    missingTotal += misses.length;
    lines.push(
      `  ${list.code} [${list.language}/${list.grade}/${list.subject}] ${list.words.length} words, ${list.words.length - misses.length} in ${list.language}.dict.gz` +
        (misses.length ? `  MISSING: ${misses.map((w) => `${w.word}(${dictionaryKey(w.word, list.language)})`).join(', ')}` : ''),
    );
    lines.push(`    ${list.words.map((w) => `${w.word}=${dictionaryKey(w.word, list.language)}`).join(' ')}`);
  }
}
lines.push(missingTotal === 0 ? 'RESULT: every word found in its shipped dictionary' : `RESULT: ${missingTotal} word(s) MISSING`);

const out = lines.join('\n');
console.log(out);
if (reportFile) fs.writeFileSync(reportFile, `${out}\n`);
process.exitCode = missingTotal === 0 ? 0 : 1;
