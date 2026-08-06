/**
 * API Route: /api/dictionary/check
 * Checks if a single word exists in the dictionary.
 * Used as fallback when client-side IndexedDB cache is unavailable
 * (e.g., Capacitor Android WebView).
 */

import { NextRequest, NextResponse } from 'next/server';
import * as fsp from 'fs/promises';
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

async function loadDictionarySet(language: string): Promise<Set<string>> {
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

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { word, language } = body;

    if (!word || typeof word !== 'string') {
      return NextResponse.json({ isValid: false, error: 'Missing word' }, { status: 400 });
    }

    const lang = language || 'en';
    if (!['en', 'es', 'he', 'sv', 'ja'].includes(lang)) {
      return NextResponse.json({ isValid: false, error: 'Invalid language' }, { status: 400 });
    }

    const normalizedWord = word.toLowerCase().trim();
    if (normalizedWord.length === 0 || normalizedWord.length > 50) {
      return NextResponse.json({ isValid: false });
    }

    const dictionary = await loadDictionarySet(lang);
    const isValid = dictionary.has(normalizedWord);

    return NextResponse.json(
      { isValid, source: 'dictionary' },
      {
        headers: {
          'Cache-Control': 'public, max-age=86400, s-maxage=604800',
        },
      }
    );
  } catch (error) {
    console.error('[dictionary/check] Error:', error);
    return NextResponse.json({ isValid: false, error: 'Server error' }, { status: 500 });
  }
}
