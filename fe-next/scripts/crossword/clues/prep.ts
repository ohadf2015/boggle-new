// Split the enriched pool into clean input batches for the clue-craft agents. Dedupes by word,
// keeps the top 2 cleaned senses (enough for the editor to pick an angle), writes
// batches/input-NN.json + manifest.json.
//
// Usage: npx tsx scripts/crossword/clues/prep.ts [batchSize=100]

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { DatamuseEntry } from './datamuse';

const BATCH = Number(process.argv[2] ?? 100);
const DIR = join(__dirname, 'batches');

function cleanSense(d: string): string {
  return d
    .replace(/^[a-z]+\t/, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\.+$/, '')
    .trim();
}

function main() {
  const pool = JSON.parse(readFileSync(join(__dirname, 'pool.en.json'), 'utf8')) as DatamuseEntry[];
  const seen = new Set<string>();
  const items: { word: string; pos: string; score: number; senses: string[] }[] = [];
  for (const e of pool) {
    if (seen.has(e.word)) continue;
    seen.add(e.word);
    const senses = e.defs.map(cleanSense).filter(Boolean).slice(0, 2);
    if (!senses.length) continue;
    items.push({ word: e.word, pos: e.pos, score: e.score, senses });
  }

  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
  const batches: string[] = [];
  for (let i = 0; i < items.length; i += BATCH) {
    const n = String(batches.length + 1).padStart(2, '0');
    const file = join(DIR, `input-${n}.json`);
    writeFileSync(file, JSON.stringify(items.slice(i, i + BATCH)));
    batches.push(`input-${n}.json`);
  }
  writeFileSync(join(DIR, 'manifest.json'), JSON.stringify({ count: batches.length, batches, words: items.length }, null, 2));
  console.log(`${items.length} unique words → ${batches.length} batches of ${BATCH} in ${DIR}`);
}

main();
