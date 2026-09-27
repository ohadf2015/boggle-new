// Enrich the curated EN common pool (COMMON_EN, ~2700 words) with Datamuse definitions +
// POS + frequency score, writing pool.en.json. First run warms the disk cache (~90ms/word,
// polite rate); reruns are instant/offline. This is the raw material the clue-craft
// workflow turns into crossword clues.
//
// Usage: npx tsx scripts/crossword/clues/enrich.ts

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { COMMON_EN } from '../commonWords';
import { fetchDatamuse, type DatamuseEntry } from './datamuse';

async function main() {
  const out: DatamuseEntry[] = [];
  let missing = 0;
  for (let i = 0; i < COMMON_EN.length; i++) {
    const w = COMMON_EN[i];
    const e = await fetchDatamuse(w);
    if (e && e.defs.length) out.push(e);
    else missing++;
    if (i % 200 === 0) console.log(`${i}/${COMMON_EN.length} (${out.length} kept, ${missing} no-def)`);
    await new Promise((r) => setTimeout(r, 80)); // ~12 req/s polite
  }
  out.sort((a, b) => b.score - a.score);
  const path = join(__dirname, 'pool.en.json');
  writeFileSync(path, JSON.stringify(out));
  console.log(`wrote ${out.length} entries → ${path} (${missing} words had no definition)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
