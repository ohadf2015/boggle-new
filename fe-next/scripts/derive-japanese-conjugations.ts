/**
 * Expand the Japanese validation dictionary with DERIVED CONJUGATIONS.
 *
 * JMdict is a lemma dictionary, so inflected forms (たべた, のんだ, たかかった …)
 * are missing — yet they are trivially formable on a hiragana board and a fluent
 * player expects them. Conjugation is deterministic given the verb class, which
 * JMdict declares via <pos>. This re-runnable script:
 *   1. downloads JMdict,
 *   2. extracts conjugatable readings + their POS (parseJmdictInflectables),
 *   3. derives a conservative core of forms per lemma (deriveForms — skips
 *      irregular/special classes so we mint zero junk),
 *   4. dedupes against the existing base+approved wordlists,
 *   5. appends the genuinely-new forms to japanese_words_approved.txt.
 *
 * Run:  npx tsx scripts/derive-japanese-conjugations.ts
 * Then: npx tsx scripts/build-dict-assets.ts   (regenerates public/dicts/ja.dict.gz)
 *
 * Flags: --dry-run  (report counts, write nothing)
 */

import { gunzipSync } from 'node:zlib';
import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { parseJmdictInflectables } from '../lib/jmdict/readings';
import { deriveForms } from '../lib/jmdict/conjugate';
import { extractHiraganaWords } from '../shared/constants/japaneseLetters';

const JMDICT_URL = 'http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz';
const BACKEND = path.join(__dirname, '..', 'backend');
const APPROVED = path.join(BACKEND, 'japanese_words_approved.txt');
const BASE = path.join(BACKEND, 'japanese_words.txt');
const DRY_RUN = process.argv.includes('--dry-run');

async function main(): Promise<void> {
  console.log('[conjugate] downloading', JMDICT_URL);
  const res = await fetch(JMDICT_URL, { headers: { 'User-Agent': 'LexiClash/1.0 (dictionary conjugation)' } });
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  const gz = Buffer.from(await res.arrayBuffer());
  const xml = gunzipSync(gz).toString('utf-8');
  console.log(`[conjugate] decompressed ${(xml.length / 1e6).toFixed(1)} MB xml`);

  const inflectables = parseJmdictInflectables(xml);
  console.log(`[conjugate] conjugatable entries: ${inflectables.length}`);

  // Generate every form, dedupe within the run.
  const generated = new Set<string>();
  let lemmaCount = 0;
  for (const { reading, pos } of inflectables) {
    const forms = deriveForms(reading, pos);
    if (forms.length) lemmaCount++;
    for (const f of forms) generated.add(f);
  }
  console.log(`[conjugate] ${lemmaCount} lemmas → ${generated.size} distinct conjugated forms`);

  // Existing words (base + approved) — dedupe target.
  const existing = new Set<string>();
  for (const f of [BASE, APPROVED]) {
    if (existsSync(f)) for (const w of extractHiraganaWords(readFileSync(f, 'utf-8'))) existing.add(w);
  }
  const fresh = [...generated].filter((w) => !existing.has(w)).sort();
  console.log(`[conjugate] existing ja words: ${existing.size}`);
  console.log(`[conjugate] NEW conjugated forms to add: ${fresh.length}`);
  console.log('[conjugate] sample:', fresh.slice(0, 20).join(' '));

  if (DRY_RUN) {
    console.log('[conjugate] --dry-run: writing nothing.');
    return;
  }
  if (fresh.length === 0) {
    console.log('[conjugate] nothing to add.');
    return;
  }

  const current = existsSync(APPROVED) ? readFileSync(APPROVED, 'utf-8') : '';
  if (current.length > 0 && !current.endsWith('\n')) appendFileSync(APPROVED, '\n');
  appendFileSync(APPROVED, fresh.join('\n') + '\n');

  const after = extractHiraganaWords(readFileSync(APPROVED, 'utf-8')).length;
  console.log(`[conjugate] DONE — approved file now has ${after} hiragana words (+${fresh.length})`);
  console.log('[conjugate] next: npx tsx scripts/build-dict-assets.ts');
}

main().catch((err) => {
  console.error('[conjugate] FAILED', err);
  process.exit(1);
});
