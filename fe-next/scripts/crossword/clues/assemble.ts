// Merge the clue-craft agent batch outputs into the committed clue bank, enforcing the
// unit-tested pure gates (circular / length). Each batch agent wrote batches/output-NN.json
// as [{ word, clue, alt }]; the per-word frequency/pos come from pool.en.json.
//
// Output: lib/crossword/data/clueBank.en.json  ({ word: { clue, pos, score, alts } })
// Usage: npx tsx scripts/crossword/clues/assemble.ts

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isCircularClue, clueLengthOk, normalizeClue } from '../../../lib/crossword/clues/clueText';
import type { DatamuseEntry } from './datamuse';

const DIR = join(__dirname, 'batches');

interface ClueEntry {
  clue: string;
  pos: string;
  score: number;
  alts?: string[];
}

function passes(word: string, clue: string): boolean {
  const c = normalizeClue(clue || '');
  return clueLengthOk(c) && !isCircularClue(c, word);
}

function main() {
  // pos + score lookup from the enriched pool
  const pool = JSON.parse(readFileSync(join(__dirname, 'pool.en.json'), 'utf8')) as DatamuseEntry[];
  const meta = new Map<string, { pos: string; score: number }>();
  for (const e of pool) if (!meta.has(e.word)) meta.set(e.word, { pos: e.pos, score: e.score });

  const outFiles = readdirSync(DIR).filter((f) => /^output-\d+\.json$/.test(f)).sort();
  const bank: Record<string, ClueEntry> = {};
  let seen = 0;
  let gateReject = 0;
  let dupSkip = 0;

  for (const f of outFiles) {
    let rows: { word: string; clue: string; alt?: string }[];
    try {
      rows = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
    } catch {
      console.warn(`! ${f} unparseable — skipped`);
      continue;
    }
    for (const r of rows) {
      const word = (r.word || '').toLowerCase().trim();
      if (!word) continue;
      seen++;
      if (bank[word]) {
        dupSkip++;
        continue;
      }
      if (!passes(word, r.clue)) {
        gateReject++;
        continue;
      }
      const m = meta.get(word) ?? { pos: 'n', score: 0 };
      const alts = r.alt && passes(word, r.alt) ? [normalizeClue(r.alt)] : undefined;
      bank[word] = { clue: normalizeClue(r.clue), pos: m.pos, score: m.score, ...(alts ? { alts } : {}) };
    }
  }

  const outPath = join(__dirname, '../../../lib/crossword/data/clueBank.en.json');
  writeFileSync(outPath, JSON.stringify(bank));
  console.log(
    `clue bank: ${Object.keys(bank).length} words kept · ${seen} seen · ${gateReject} gate-rejected · ${dupSkip} dups → ${outPath}`,
  );
}

main();
