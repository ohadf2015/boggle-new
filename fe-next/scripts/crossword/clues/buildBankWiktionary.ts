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
 *   npx tsx scripts/crossword/clues/buildBankWiktionary.ts --lang=es [--limit=N] [--max-len=7] [--min-score=0.5] [--dry] [--source=nouns]
 *
 * --source=words (ja only) draws candidates from backend/japanese_words.txt instead: 3..4 hiragana that the shipped
 * Japanese dictionary also accepts. Bank keys are kana-folded (small kana full-size) to match the grid.
 *
 * --source=nouns also draws 3..4 letter candidates from backend/<lang>_nouns.txt (the big board-seeding list), kept
 * only if the (accent-folded) word is in the shipped dictionary and (es) appears >=2x in the repo's Spanish copy; they still need a clean Wiktionary clue + the auditor.
 *
 * --freq-top=N (es|ru) replaces that repo-copy proxy with our own Wikipedia frequency list (freq/<lang>.json, see
 * corpusFrequency.ts): 3..4 letter in-dictionary words ranked in the top N. es draws from es_nouns + common_hunt_words_es,
 * ru from russian_words + common_hunt_words_ru (ru must be a noun lemma). Keys are stored folded (es accents, ru ё).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { extractCachePath, fetchWiktExtract, wiktionaryClue, wiktionaryClueJa } from './wiktionary';
import { loadDeny, loadFreqRank, selectFreqCandidates, type FreqLang } from './frequency';
import { cleanMeaning } from '../../../lib/dictionary/wiktionaryMeaning';
import { clueEndsAtClause, definitionToClue } from '../../../lib/crossword/clues/clueText';
import { selectJaCandidates } from './jaCandidates';
import { evaluateSvClue, evaluateEsClue } from '../../../lib/crossword/clues/evaluateSvClue';
import { endsDangling } from '../../../lib/crossword/clues/danglingEnd';
import { evaluateRuClue } from '../../../lib/crossword/clues/evaluateRuClue';
import { createSafeReadFile, loadJapaneseDictionary, loadRussianDictionary, loadSpanishDictionary, loadSwedishDictionary } from '../../../backend/dictionaryLoaders';
import { esFirstSenseFlagged, esSenses, rejectLemmaClueRu, rejectNounClueEs, rejectNounClueRu, ruClueSenses, ruNounSenses } from '../../../lib/crossword/clues/nounClueFilter';
import { loadEsCommonness } from './commonness';
import { foldEsAccents, foldJaKana } from '../../../lib/crossword/answer';

type Bank = Record<string, { clue: string; score: number }>;

const arg = (k: string, d?: string) =>
  process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const LANG = arg('lang');
const LIMIT = parseInt(arg('limit', String(Number.MAX_SAFE_INTEGER))!, 10);
const MAX_LEN = parseInt(arg('max-len', '7')!, 10);
const MIN_SCORE = parseFloat(arg('min-score', '0.5')!);
const SOURCE = arg('source');
const FREQ_TOP = arg('freq-top') ? parseInt(arg('freq-top')!, 10) : null;
const NOUN_MAX_LEN = 4; // build-mini only lands 3-4 letter answers
const MIN_COMMON = 2; // nouns-only words must appear this often in the repo's Spanish copy
const DRY = process.argv.includes('--dry');
const NEW_WORD_SCORE = 50; // neutral difficulty tier (no corpus frequency for these). ponytail: refine if tiering matters

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Hebrew bank keys fold final letters (see build-he.ts); other langs key by lowercase.
const normHe = (w: string) =>
  w.replace(/ם/g, 'מ').replace(/ן/g, 'נ').replace(/ץ/g, 'צ').replace(/ף/g, 'פ').replace(/ך/g, 'כ');
const bankKey = (w: string, lang: string) =>
  lang === 'he' ? normHe(w) : lang === 'ja' ? foldJaKana(w) : w.toLowerCase();

function qualityOk(lang: string, answer: string, clue: string): boolean {
  if (lang === 'sv') return evaluateSvClue(answer, clue).score >= MIN_SCORE;
  if (lang === 'es') return !endsDangling(clue, 'es') && evaluateEsClue(answer, clue).score >= MIN_SCORE;
  if (lang === 'ru') return evaluateRuClue(answer, clue).score >= MIN_SCORE;
  return true; // en/he: no language auditor — definitionToClue gates already applied
}

async function main() {
  if (!LANG) throw new Error('pass --lang=<en|he|sv|es|ru|ja>');
  const bankPath = join(__dirname, `../../../lib/crossword/data/clueBank.${LANG}.json`);
  const bank = (existsSync(bankPath) ? JSON.parse(readFileSync(bankPath, 'utf8')) : {}) as Bank;
  const before = Object.keys(bank).length;

  if (SOURCE === 'words') {
    if (LANG !== 'ja') throw new Error('--source=words is ja only');
    await buildJa(bank, bankPath, before);
    return;
  }
  if (FREQ_TOP != null) {
    if (LANG !== 'es' && LANG !== 'ru') throw new Error('--freq-top is es|ru only');
    await buildFromFreq(LANG, FREQ_TOP, bank, bankPath, before);
    return;
  }

  const listPath = join(__dirname, `../../../backend/common_hunt_words_${LANG}.txt`);
  let candidates = [
    ...new Set(
      readFileSync(listPath, 'utf8')
        .split('\n')
        .map((w) => w.trim())
        .filter((w) => w.length >= 3 && w.length <= MAX_LEN),
    ),
  ];
  const nounSet = new Set<string>();
  if (SOURCE === 'nouns') {
    const dictLoaders = { es: loadSpanishDictionary, sv: loadSwedishDictionary, ru: loadRussianDictionary } as Record<string, typeof loadSpanishDictionary>;
    const load = dictLoaders[LANG];
    if (!load) throw new Error(`--source=nouns needs a dictionary loader for ${LANG}`);
    const dict = await load(createSafeReadFile());
    const isCommon = loadEsCommonness();
    const fold = LANG === 'es' ? foldEsAccents : (w: string) => w;
    const nouns = readFileSync(join(__dirname, `../../../backend/${LANG}_nouns.txt`), 'utf8')
      .split('\n')
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length >= 3 && w.length <= NOUN_MAX_LEN && /^\p{L}+$/u.test(w) && dict.has(fold(w)) && (LANG !== 'es' || isCommon(w, MIN_COMMON)));
    nouns.forEach((w) => nounSet.add(w));
    candidates.push(...nounSet);
  }
  candidates = [...new Set(candidates)].filter((w) => !(bankKey(w, LANG) in bank));

  console.log(`${DRY ? '[DRY] ' : ''}${LANG}: bank ${before} words, ${candidates.length} new candidates (len 3..${MAX_LEN})`);

  let added = 0, miss = 0, rejected = 0, processed = 0;
  for (const word of candidates) {
    if (processed >= LIMIT) break;
    processed++;
    let clue: string | null = null;
    try { clue = await wiktionaryClue(word, LANG); } catch { clue = null; }
    if (!clue) { miss++; await sleep(120); continue; }
    if (LANG === 'es' && nounSet.has(word) && rejectNounClueEs(clue)) { rejected++; await sleep(120); continue; }
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

async function buildJa(bank: Bank, bankPath: string, before: number) {
  const { words: dict } = await loadJapaneseDictionary(createSafeReadFile());
  const lines = readFileSync(join(__dirname, '../../../backend/japanese_words.txt'), 'utf8').split('\n');
  const candidates = selectJaCandidates(lines, dict).filter((w) => !(bankKey(w, 'ja') in bank));
  console.log(`${DRY ? '[DRY] ' : ''}ja: bank ${before} words, ${candidates.length} new candidates (3-4 hiragana, in dict)`);

  let added = 0, miss = 0, rejected = 0, processed = 0;
  for (const word of candidates) {
    if (processed >= LIMIT) break;
    processed++;
    let res: { clue: string | null; hadDef: boolean } = { clue: null, hadDef: false };
    try { res = await wiktionaryClueJa(word); } catch { /* network miss counts as no-def */ }
    await sleep(120);
    if (!res.hadDef) { miss++; continue; }
    if (!res.clue) { rejected++; continue; }
    const key = bankKey(word, 'ja');
    if (key in bank) continue;
    added++;
    if (DRY) console.log(`  + ${word}: ${res.clue}`);
    else bank[key] = { clue: res.clue, score: NEW_WORD_SCORE };
  }

  if (!DRY) writeFileSync(bankPath, `${JSON.stringify(bank, null, 2)}\n`);
  console.log(`DONE ${DRY ? '(dry)' : ''} ja: processed ${processed}, +${added} added (${((100 * added) / Math.max(processed, 1)).toFixed(1)}%), ${miss} no-def, ${rejected} rejected by filter. bank ${before} -> ${before + (DRY ? 0 : added)}`);
}

const readList = (f: string) => readFileSync(join(__dirname, `../../../backend/${f}`), 'utf8').split('\n');

/** First usable clue for a frequency candidate (trying its first two senses), or why there is none. */
function freqClue(lang: FreqLang, word: string, key: string, extract: string): { clue: string } | { reject: string } {
  if (lang === 'es' && esFirstSenseFlagged(extract)) return { reject: 'archaic/regional/vulgar usage note' };
  const senses = lang === 'es' ? esSenses(extract) : ruClueSenses(extract, word);
  if (!senses.length) return { reject: lang === 'es' ? 'no clean definition' : 'no accepted lemma sense' };
  let last: { reject: string } = { reject: 'no sense' };
  for (const sense of senses) {
    if (lang === 'ru' && rejectNounClueRu(sense)) { last = { reject: `filter: ${sense}` }; continue; }
    const def = lang === 'es' ? cleanMeaning(sense) : cleanMeaning(sense.replace(/^(?:[а-яё-]{1,12}\.,?\s+){1,4}/i, '')); // drop ru domain labels ("зоол. ")
    const res = clueFromDef(lang, word, key, def);
    if ('clue' in res && lang === 'ru' && !ruNounSenses(extract).length && rejectLemmaClueRu(res.clue)) { last = { reject: `lemma filter: ${res.clue}` }; continue; }
    if ('clue' in res) return res;
    last = res;
  }
  return last;
}

function clueFromDef(lang: FreqLang, word: string, key: string, def: string | null): { clue: string } | { reject: string } {
  const clue = def && definitionToClue(def, word);
  if (!def || !clue) return { reject: 'no clean definition' };
  if (!clueEndsAtClause(def, clue)) return { reject: `truncated: ${clue}` };
  if ((lang === 'es' ? rejectNounClueEs : rejectNounClueRu)(clue)) return { reject: `filter: ${clue}` };
  if (!qualityOk(lang, key, clue)) return { reject: `auditor: ${clue}` };
  return { clue };
}

async function buildFromFreq(lang: FreqLang, n: number, bank: Bank, bankPath: string, before: number) {
  const inTop = loadFreqRank(lang);
  const dict = await (lang === 'es' ? loadSpanishDictionary : loadRussianDictionary)(createSafeReadFile());
  const words = lang === 'es'
    ? [...readList('es_nouns.txt'), ...readList('common_hunt_words_es.txt')]
    : [...readList('common_hunt_words_ru.txt'), ...readList('russian_words.txt')];
  const maxLen = lang === 'ru' ? 6 : 4;
  const candidates = selectFreqCandidates(words, { lang, inTop, n, dict, bankKeys: new Set(Object.keys(bank)), deny: loadDeny(lang), maxLen });
  console.log(`${DRY ? '[DRY] ' : ''}${lang}: bank ${before} words, ${candidates.length} candidates in top ${n} (3-${maxLen} letters, in dict)`);

  let added = 0, miss = 0, rejected = 0, processed = 0;
  for (const { word, key } of candidates) {
    if (processed >= LIMIT) break;
    processed++;
    let extract: string | null = null;
    const cached = existsSync(extractCachePath(word, lang));
    for (let attempt = 1; attempt <= 4; attempt++) {
      try { extract = await fetchWiktExtract(word, lang); break; } catch (e) {
        console.warn(`  ! ${word}: ${(e as Error).message} (attempt ${attempt})`);
        await sleep(15000 * attempt); // Wiktionary 429s bursts; back off rather than lose the word
      }
    }
    if (!cached) await sleep(400);
    if (!extract) { miss++; continue; }
    const res = freqClue(lang, word, key, extract);
    if ('reject' in res) { rejected++; if (DRY) console.log(`  - ${key}: ${res.reject}`); continue; }
    if (key in bank) continue;
    added++;
    if (DRY) console.log(`  + ${key}: ${res.clue}`);
    else bank[key] = { clue: res.clue, score: NEW_WORD_SCORE };
  }

  if (!DRY) writeFileSync(bankPath, `${JSON.stringify(bank, null, 2)}\n`);
  console.log(`DONE ${DRY ? '(dry)' : ''} ${lang} freq-top=${n}: processed ${processed}, +${added} added, ${miss} no-page, ${rejected} rejected. bank ${before} -> ${before + (DRY ? 0 : added)}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
