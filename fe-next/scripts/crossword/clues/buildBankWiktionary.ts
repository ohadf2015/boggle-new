/**
 * Additively grow a crossword clue bank from native Wiktionary definitions.
 *
 * Bigger clue banks => more cluable words => the grid filler drops fewer puzzles
 * (build-he.ts/build.ts discard any grid containing an unclued word). Datamuse is
 * English-only, so non-English banks are small (he 736, sv 610, es 437 vs en 2400).
 * This fills the gap natively, all 6 languages.
 *
 * Candidates: backend/common_hunt_words_<lang>.txt (curated common words), length 3..maxLen,
 * NOT already in the bank. Each gets a cleaned/de-circularized native clue; for sv/es it must
 * also pass the language clue-quality auditor. EXISTING entries are never modified — purely
 * additive, so already-built puzzles are unaffected.
 *
 * Usage:
 *   npx tsx scripts/crossword/clues/buildBankWiktionary.ts --lang=es [--limit=N] [--max-len=7] [--min-score=0.5] [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { wiktionaryClue } from './wiktionary';
import { evaluateSvClue, evaluateEsClue } from '../../../lib/crossword/clues/evaluateSvClue';

type Bank = Record<string, { clue: string; score: number }>;

const arg = (k: string, d?: string) =>
  process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const LANG = arg('lang');
const LIMIT = parseInt(arg('limit', String(Number.MAX_SAFE_INTEGER))!, 10);
const MAX_LEN = parseInt(arg('max-len', '7')!, 10);
const MIN_SCORE = parseFloat(arg('min-score', '0.5')!);
const DRY = process.argv.includes('--dry');
const NEW_WORD_SCORE = 50; // neutral difficulty tier (no corpus frequency for these). ponytail: refine if tiering matters

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Hebrew bank keys fold final letters (see build-he.ts); other langs key by lowercase.
const normHe = (w: string) =>
  w.replace(/ם/g, 'מ').replace(/ן/g, 'נ').replace(/ץ/g, 'צ').replace(/ף/g, 'פ').replace(/ך/g, 'כ');
const bankKey = (w: string, lang: string) => (lang === 'he' ? normHe(w) : w.toLowerCase());

function qualityOk(lang: string, answer: string, clue: string): boolean {
  if (lang === 'sv') return evaluateSvClue(answer, clue).score >= MIN_SCORE;
  if (lang === 'es') return evaluateEsClue(answer, clue).score >= MIN_SCORE;
  return true; // en/he/ru: no language auditor — definitionToClue gates already applied
}

async function main() {
  if (!LANG) throw new Error('pass --lang=<en|he|sv|es|ru>');
  const bankPath = join(__dirname, `../../../lib/crossword/data/clueBank.${LANG}.json`);
  const bank = JSON.parse(readFileSync(bankPath, 'utf8')) as Bank;
  const before = Object.keys(bank).length;

  const listPath = join(__dirname, `../../../backend/common_hunt_words_${LANG}.txt`);
  const candidates = [
    ...new Set(
      readFileSync(listPath, 'utf8')
        .split('\n')
        .map((w) => w.trim())
        .filter((w) => w.length >= 3 && w.length <= MAX_LEN),
    ),
  ].filter((w) => !(bankKey(w, LANG) in bank));

  console.log(`${DRY ? '[DRY] ' : ''}${LANG}: bank ${before} words, ${candidates.length} new candidates (len 3..${MAX_LEN})`);

  let added = 0, miss = 0, rejected = 0, processed = 0;
  for (const word of candidates) {
    if (processed >= LIMIT) break;
    processed++;
    let clue: string | null = null;
    try { clue = await wiktionaryClue(word, LANG); } catch { clue = null; }
    if (!clue) { miss++; await sleep(120); continue; }
    if (!qualityOk(LANG, word, clue)) { rejected++; await sleep(120); continue; }
    const key = bankKey(word, LANG);
    if (key in bank) { await sleep(120); continue; }
    added++;
    if (DRY) console.log(`  + ${key}: ${clue}`);
    else bank[key] = { clue, score: NEW_WORD_SCORE };
    await sleep(120);
  }

  if (!DRY) writeFileSync(bankPath, `${JSON.stringify(bank, null, 2)}\n`); // match the bank's pretty-printed format
  console.log(`DONE ${DRY ? '(dry)' : ''} ${LANG}: +${added} added, ${miss} no-def, ${rejected} low-quality. bank ${before} -> ${before + (DRY ? 0 : added)}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
