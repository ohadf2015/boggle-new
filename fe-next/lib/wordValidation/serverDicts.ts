// Server-side canonical dictionary loaders. Lazy-cached per process.
// Extracted from app/api/validate-word/route.ts so multiple routes
// (validate-word + scores/sync) can share the same dictionary memory.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { normalizeHebrewWord, normalizeSpanishWord } from '@/shared/utils/wordNormalization';
import { extractHiraganaWords } from '@/shared/constants/japaneseLetters';
import {
  getEnglishWordSet,
  getHebrewWordSet,
  getSwedishWordSet,
  __resetSharedWordSetsForTest,
} from '@/lib/server/sharedWordSets';

// en/he/sv have byte-identical membership everywhere, so they come from the
// process-wide shared sets (one copy in the heap). Only the Spanish-NORMALIZED
// set (accent-stripped, distinct string data) and Japanese hiragana set stay
// local here (see lib/server/sharedWordSets.ts — OOM 2026-08-06).
let spanishDict: Set<string> | null = null;
let japaneseDict: Set<string> | null = null;

async function loadSpanish(): Promise<Set<string>> {
  if (spanishDict) return spanishDict;
  const words = (await import('an-array-of-spanish-words', { with: { type: 'json' } }))
    .default as string[];
  // Normalize at load to match validate-time normalization (accent-strip,
  // ñ-preserve). Keeps this path symmetric with backend/dictionary.ts so the
  // same word can't be valid live but rejected on offline-queue replay.
  spanishDict = new Set(words.map((w) => normalizeSpanishWord(w)));
  return spanishDict;
}

function loadJapanese(): Set<string> {
  if (japaneseDict) return japaneseDict;
  japaneseDict = new Set<string>();
  const backendDir = path.join(process.cwd(), 'backend');
  // HIRAGANA only — must match backend Dictionary.japaneseWords / board grids.
  // Loading kanji_compounds here would reject the hiragana words players score.
  for (const file of ['japanese_words.txt', 'japanese_words_approved.txt']) {
    const p = path.join(backendDir, file);
    if (!fs.existsSync(p)) continue;
    for (const w of extractHiraganaWords(fs.readFileSync(p, 'utf-8'))) japaneseDict.add(w);
  }
  return japaneseDict;
}

export async function validateWordOnServer(word: string, language: string): Promise<boolean> {
  const trimmed = word.trim();
  if (!trimmed) return false;

  switch (language) {
    case 'en':
      return (await getEnglishWordSet()).has(trimmed.toLowerCase());
    case 'es':
      return (await loadSpanish()).has(normalizeSpanishWord(trimmed));
    case 'he':
      return getHebrewWordSet().has(normalizeHebrewWord(trimmed));
    case 'sv':
      return getSwedishWordSet().has(trimmed.toLowerCase());
    case 'ja':
      return loadJapanese().has(trimmed);
    default:
      return false;
  }
}

// Test escape hatch — reset cached dicts between tests.
export function __resetServerDictsForTest(): void {
  spanishDict = null;
  japaneseDict = null;
  __resetSharedWordSetsForTest();
}
