/**
 * Canonical, process-wide word sets — ONE copy of each big word list in the heap.
 *
 * Why this exists:
 *   Five separate server modules each built and PERMANENTLY retained their own
 *   copy of the base English / Hebrew / Swedish / Spanish word lists:
 *     - app/api/dictionary/check/route.ts
 *     - app/api/dictionary-words/route.ts
 *     - app/api/word-solver/dictionaryLoader.ts
 *     - app/api/validate-word/route.ts
 *     - lib/wordValidation/serverDicts.ts
 *   Under multi-locale crawler traffic (e.g. /he/words/*, /es/words/*, /he/daily
 *   hitting the SEO word pages) every copy filled at once and the process rode
 *   the 1536MB V8 heap cap into "FATAL ERROR: ... JavaScript heap out of memory"
 *   on Railway (2026-08-06). See .claude/rules/60-recurring-pitfalls.md Class 4.
 *
 * These loaders reproduce BYTE-IDENTICAL membership to what those modules built,
 * so routing them all through here collapses N copies of the string data into one.
 * A Set built elsewhere via `new Set(getEnglishWordSet())` reuses the same string
 * objects (only the small index structure is per-consumer), and `Array.from(...)`
 * likewise shares the strings.
 *
 * ONLY sources with identical membership across every consumer live here:
 *   - English      → an-array-of-english-words, lowercased (no approved merge)
 *   - Spanish BASE → an-array-of-spanish-words, lowercased (no approved merge)
 *   - Hebrew       → hebrew_words.txt + hebrew_words_approved.txt, normalizeHebrewWord(trim)
 *   - Swedish      → @arvidbt/swedish-words + swedish_words_approved.txt, lowercased
 *
 * Deliberately NOT here (membership diverges per consumer, must stay local):
 *   - Spanish with community-approved words (word-solver)
 *   - Spanish normalized via normalizeSpanishWord (serverDicts / offline replay)
 *   - Japanese (hiragana-only vs kanji_compounds vs raw-trim variants)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { normalizeHebrewWord } from '@/shared/utils/wordNormalization';

let englishSet: Set<string> | null = null;
let spanishBaseSet: Set<string> | null = null;
let hebrewSet: Set<string> | null = null;
let swedishSet: Set<string> | null = null;

const backendDir = (): string => path.join(process.cwd(), 'backend');

/** English base dictionary (an-array-of-english-words), lowercased. Cached once. */
export async function getEnglishWordSet(): Promise<Set<string>> {
  if (englishSet) return englishSet;
  const words = (await import('an-array-of-english-words', { with: { type: 'json' } }))
    .default as string[];
  englishSet = new Set(words.map((w) => w.toLowerCase()));
  return englishSet;
}

/**
 * Spanish BASE dictionary (an-array-of-spanish-words), lowercased. Cached once.
 * Consumers that need community-approved additions layer them on a copy; the
 * normalized (accent-stripped) variant is built separately in serverDicts.
 */
export async function getSpanishBaseWordSet(): Promise<Set<string>> {
  if (spanishBaseSet) return spanishBaseSet;
  const words = (await import('an-array-of-spanish-words', { with: { type: 'json' } }))
    .default as string[];
  spanishBaseSet = new Set(words.map((w) => w.toLowerCase()));
  return spanishBaseSet;
}

/** Hebrew dictionary (base + community-approved), normalized. Cached once. */
export function getHebrewWordSet(): Set<string> {
  if (hebrewSet) return hebrewSet;
  const set = new Set<string>();
  for (const file of ['hebrew_words.txt', 'hebrew_words_approved.txt']) {
    const p = path.join(backendDir(), file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf-8').split('\n')) {
      const w = normalizeHebrewWord(line.trim());
      if (w.length > 0) set.add(w);
    }
  }
  hebrewSet = set;
  return hebrewSet;
}

/** Swedish dictionary (@arvidbt/swedish-words + approved), lowercased. Cached once. */
export function getSwedishWordSet(): Set<string> {
  if (swedishSet) return swedishSet;
  const set = new Set<string>();
  const validSwedishWordPattern = /^[a-zåäöéàü]+$/i;

  const swedishWordsPath = path.join(
    process.cwd(),
    'node_modules/@arvidbt/swedish-words/out/index.js',
  );
  if (fs.existsSync(swedishWordsPath)) {
    const content = fs.readFileSync(swedishWordsPath, 'utf-8');
    const arrayMatch = content.match(/var swedish_words = \[([\s\S]*?)\];/);
    if (arrayMatch) {
      for (const line of arrayMatch[1].split(',')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
          try {
            const jsonCompatible = trimmed.replace(/\\x([0-9A-Fa-f]{2})/g, '\\u00$1');
            const word = JSON.parse(jsonCompatible);
            if (word && word.length > 1 && validSwedishWordPattern.test(word)) {
              set.add(word.toLowerCase());
            }
          } catch {
            // Skip invalid entries
          }
        }
      }
    }
  }

  const approvedFile = path.join(backendDir(), 'swedish_words_approved.txt');
  if (fs.existsSync(approvedFile)) {
    for (const line of fs.readFileSync(approvedFile, 'utf-8').split('\n')) {
      const w = line.trim().toLowerCase();
      if (w.length > 0) set.add(w);
    }
  }

  swedishSet = set;
  return swedishSet;
}

/** Test escape hatch — drop the cached sets so each test starts cold. */
export function __resetSharedWordSetsForTest(): void {
  englishSet = null;
  spanishBaseSet = null;
  hebrewSet = null;
  swedishSet = null;
}
