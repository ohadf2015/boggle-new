/**
 * Measure each language's VALIDATION dictionary and write the counts to
 * `lib/seo/dictionaryStats.generated.json`.
 *
 * Why this script exists
 * ---------------------
 * The education landing pages advertise dictionary sizes, because "how many words
 * does it actually know" is the one scale claim competitors make and we can beat.
 * The first version of that copy was written from `wc -l` on the source files, and
 * it was wrong: `backend/dictionaryLoaders.ts` normalises every word and dedups it
 * into a Set, and merges the community-approved list on top. Russian's 1,415,065
 * lines collapse to 1,347,105 real entries, so the published "over 1,400,000" was
 * false. English was understated by 145,000 in the other direction.
 *
 * So the numbers are no longer typed by hand anywhere. This script rebuilds each
 * Set exactly the way the loader does, writes the result with a timestamp and a
 * method note, and `lib/seo/dictionaryStats.ts` is the only thing the copy reads.
 * `app/[locale]/education/__tests__/dictionaryFigures.test.ts` fails if any figure
 * on a page is not derived from this file.
 *
 * Run: `npx tsx scripts/measure-dictionaries.ts`
 * Re-run whenever a dictionary source or a loader changes. A Set only ever grows as
 * community words are approved, so a published floor stays true between runs.
 */
import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';
import {
  normalizeHebrewWord,
  normalizeSpanishWord,
  normalizeRussianWord,
} from '../shared/utils/wordNormalization';

const ROOT = path.resolve(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');
const OUT = path.join(ROOT, 'lib', 'seo', 'dictionaryStats.generated.json');
const req = createRequire(path.join(ROOT, 'package.json'));

const read = (file: string): string => (fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : '');

/** Mirrors `mergeApprovedWords` in backend/dictionaryLoaders.ts. */
function mergeApproved(dict: Set<string>, content: string, norm: (w: string) => string): void {
  if (!content) return;
  for (const w of content.split('\n').map(norm).filter((x) => x.length > 0)) dict.add(w);
}

function englishSet(): Set<string> {
  const words = req('an-array-of-english-words') as string[];
  const dict = new Set(words.map((w) => w.toLowerCase()));
  mergeApproved(dict, read(path.join(BACKEND, 'english_words_approved.txt')), (w) => w.trim().toLowerCase());
  return dict;
}

function hebrewSet(): Set<string> {
  const raw = read(path.join(BACKEND, 'hebrew_words.txt'));
  const dict = new Set(
    raw.split('\n').map((w) => w.trim()).filter((w) => w.length > 0).map(normalizeHebrewWord),
  );
  mergeApproved(dict, read(path.join(BACKEND, 'hebrew_words_approved.txt')), (w) => normalizeHebrewWord(w.trim()));
  return dict;
}

function spanishSet(): Set<string> {
  const words = req('an-array-of-spanish-words') as string[];
  const dict = new Set(words.map((w) => normalizeSpanishWord(w)));
  mergeApproved(dict, read(path.join(BACKEND, 'spanish_words_approved.txt')), (w) => normalizeSpanishWord(w.trim()));
  return dict;
}

function russianSet(): Set<string> {
  const raw = read(path.join(BACKEND, 'russian_words.txt'));
  const dict = new Set(
    raw.split('\n').map((w) => w.trim()).filter((w) => w.length > 0).map(normalizeRussianWord),
  );
  mergeApproved(dict, read(path.join(BACKEND, 'russian_words_approved.txt')), (w) => normalizeRussianWord(w.trim()));
  return dict;
}

function swedishSet(): Set<string> {
  const src = read(path.join(ROOT, 'node_modules/@arvidbt/swedish-words/out/index.js'));
  const match = src.match(/var swedish_words = \[([\s\S]*?)\];/);
  const dict = new Set<string>();
  if (match) {
    const valid = /^[a-zåäöéàü]+$/i;
    for (const raw of match[1].split(',')) {
      const t = raw.trim();
      if (!t.startsWith('"') || !t.endsWith('"')) continue;
      const decoded = t.replace(/\\x([0-9A-Fa-f]{2})/g, (_m, hex: string) =>
        String.fromCharCode(parseInt(hex, 16)),
      );
      let word: string | null = null;
      try {
        word = JSON.parse(decoded) as string;
      } catch {
        word = null;
      }
      if (word && word.length > 1 && valid.test(word)) dict.add(word.toLowerCase());
    }
  }
  mergeApproved(dict, read(path.join(BACKEND, 'swedish_words_approved.txt')), (w) => w.trim().toLowerCase());
  return dict;
}

/** Boards are hiragana, so the validation set is hiragana. Kanji compounds seed boards only. */
const HIRAGANA_WORD_RE = /^[぀-ゟー]+$/;
function japaneseSet(): Set<string> {
  const dict = new Set<string>();
  for (const file of ['japanese_words.txt', 'japanese_words_approved.txt']) {
    for (const raw of read(path.join(BACKEND, file)).split('\n')) {
      const w = raw.trim();
      if (w.length > 0 && HIRAGANA_WORD_RE.test(w)) dict.add(w);
    }
  }
  return dict;
}

const counts = {
  en: englishSet().size,
  he: hebrewSet().size,
  es: spanishSet().size,
  sv: swedishSet().size,
  ja: japaneseSet().size,
  ru: russianSet().size,
};

const payload = {
  $comment:
    'GENERATED by scripts/measure-dictionaries.ts. Do not edit by hand. These are validation-Set sizes after normalisation and dedup, not source-file line counts.',
  generatedAt: new Date().toISOString().slice(0, 10),
  method:
    'Rebuilt each Set exactly as backend/dictionaryLoaders.ts does: normalise, dedup, merge the *_approved.txt list. Japanese counts pure-hiragana words only, because boards are kana and kanji compounds are used for board seeding, never for judging a submitted word.',
  counts,
};

fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
for (const [lang, n] of Object.entries(counts)) {
  process.stdout.write(`${lang}\t${n.toLocaleString('en-US')}\n`);
}
process.stdout.write(`\nwrote ${path.relative(ROOT, OUT)}\n`);
