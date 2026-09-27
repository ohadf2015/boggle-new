/**
 * Bulk-expand the Japanese validation dictionary from JMdict.
 *
 * The JA validation set was ~12k hiragana words (vs en ~417k) — players typed
 * valid words and were constantly rejected. JMdict (the dictionary Jisho uses)
 * has ~190k entries with kana readings. This one-shot, re-runnable import folds
 * every kana reading to hiragana, drops sensitive/X-rated entries, dedupes against
 * the existing wordlists, and appends the new words to japanese_words_approved.txt.
 *
 * Run:  npx tsx scripts/import-jmdict-readings.ts
 * Then: npx tsx scripts/build-dict-assets.ts   (regenerates public/dicts/ja.dict.gz)
 */

import { gunzipSync } from 'node:zlib';
import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { parseJmdictReadings } from '../lib/jmdict/readings';
import { extractHiraganaWords } from '../shared/constants/japaneseLetters';

const JMDICT_URL = 'http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz';
const BACKEND = path.join(__dirname, '..', 'backend');
const APPROVED = path.join(BACKEND, 'japanese_words_approved.txt');
const BASE = path.join(BACKEND, 'japanese_words.txt');

async function main(): Promise<void> {
  console.log('[jmdict] downloading', JMDICT_URL);
  const res = await fetch(JMDICT_URL, { headers: { 'User-Agent': 'LexiClash/1.0 (dictionary import)' } });
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  const gz = Buffer.from(await res.arrayBuffer());
  console.log(`[jmdict] downloaded ${(gz.length / 1e6).toFixed(1)} MB gz`);

  const xml = gunzipSync(gz).toString('utf-8');
  console.log(`[jmdict] decompressed ${(xml.length / 1e6).toFixed(1)} MB xml`);

  const readings = parseJmdictReadings(xml);
  console.log(`[jmdict] extracted ${readings.size} clean hiragana readings`);

  // Existing words (base + approved) — dedupe target.
  const existing = new Set<string>();
  for (const f of [BASE, APPROVED]) {
    if (existsSync(f)) for (const w of extractHiraganaWords(readFileSync(f, 'utf-8'))) existing.add(w);
  }
  console.log(`[jmdict] existing ja words: ${existing.size}`);

  const fresh = [...readings].filter(w => !existing.has(w)).sort();
  console.log(`[jmdict] NEW words to add: ${fresh.length}`);
  if (fresh.length === 0) { console.log('[jmdict] nothing to add'); return; }

  // Append (keep the file newline-terminated).
  const current = existsSync(APPROVED) ? readFileSync(APPROVED, 'utf-8') : '';
  if (current.length > 0 && !current.endsWith('\n')) appendFileSync(APPROVED, '\n');
  appendFileSync(APPROVED, fresh.join('\n') + '\n');

  const after = extractHiraganaWords(readFileSync(APPROVED, 'utf-8')).length;
  console.log(`[jmdict] DONE — approved file now has ${after} hiragana words (+${fresh.length})`);
  console.log('[jmdict] next: npx tsx scripts/build-dict-assets.ts');
}

main().catch(err => { console.error('[jmdict] FAILED', err); process.exit(1); });
