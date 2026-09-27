/** Per-language dictionary membership sets for server routes (dictionary check, adventure scoring). */
import * as fsp from 'fs/promises';
import { isRussianWord } from './russianWordLookup';
import * as path from 'path';
import {
  getEnglishWordSet,
  getSpanishBaseWordSet,
  getHebrewWordSet,
  getSwedishWordSet,
} from '@/lib/server/sharedWordSets';

// Japanese is the only language whose membership on THIS path (hiragana base +
// approved, raw-trimmed) diverges from the shared canonical sets, so it keeps a
// local cache. en/es/he/sv are served from the process-wide shared sets so each
// list exists once in the heap (see lib/server/sharedWordSets.ts — OOM 2026-08-06).
let japaneseSet: Set<string> | null = null;

async function loadJapaneseSet(): Promise<Set<string>> {
  if (japaneseSet) return japaneseSet;

  // Boards are hiragana-only, so the validation set is the base + approved
  // HIRAGANA wordlists — mirroring backend/dictionaryLoaders.ts. Kanji
  // compounds are seeding-only (never a playable word) and must NOT be loaded
  // here, or the base ~9.6k hiragana corpus would be silently rejected.
  const backendDir = path.join(process.cwd(), 'backend');
  const [baseContent, approvedContent] = await Promise.all([
    fsp.readFile(path.join(backendDir, 'japanese_words.txt'), 'utf-8').catch(() => ''),
    fsp.readFile(path.join(backendDir, 'japanese_words_approved.txt'), 'utf-8').catch(() => ''),
  ]);

  const words: string[] = [];
  for (const content of [baseContent, approvedContent]) {
    if (content) {
      for (const line of content.split('\n')) {
        const w = line.trim();
        if (w.length > 0) words.push(w);
      }
    }
  }

  japaneseSet = new Set(words);
  return japaneseSet;
}

export async function loadDictionarySet(language: string): Promise<Set<string>> {
  switch (language) {
    case 'en':
      return getEnglishWordSet();
    case 'es':
      return getSpanishBaseWordSet();
    case 'he':
      return getHebrewWordSet();
    case 'sv':
      return getSwedishWordSet();
    case 'ja':
      return loadJapaneseSet();
    default:
      return new Set<string>();
  }
}

/**
 * Membership check for any supported language. Russian is too large for a Set
 * (1.4M words), so it binary-searches the word file instead.
 */
export async function loadWordChecker(language: string): Promise<((word: string) => boolean) | null> {
  if (language === 'ru') return isRussianWord;
  const set = await loadDictionarySet(language);
  return set.size ? (word) => set.has(word) : null;
}
