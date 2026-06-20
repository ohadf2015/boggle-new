/**
 * API Route: /api/dictionary/check
 * Checks if a single word exists in the dictionary.
 * Used as fallback when client-side IndexedDB cache is unavailable
 * (e.g., Capacitor Android WebView).
 */

import { NextRequest, NextResponse } from 'next/server';
import { normalizeHebrewWord } from '@/shared/utils/wordNormalization';
import * as fsp from 'fs/promises';
import * as path from 'path';

// Reuse the same in-memory cache as dictionary-words route
const dictionaries: Record<string, Set<string> | null> = {
  en: null,
  es: null,
  he: null,
  sv: null,
  ja: null,
};

async function loadDictionarySet(language: string): Promise<Set<string>> {
  if (dictionaries[language]) {
    return dictionaries[language]!;
  }

  let words: string[] = [];

  switch (language) {
    case 'en': {
      const { default: englishWords } = await import('an-array-of-english-words', { with: { type: 'json' } });
      words = (englishWords as string[]).map((w: string) => w.toLowerCase());
      break;
    }

    case 'es': {
      const { default: spanishWords } = await import('an-array-of-spanish-words', { with: { type: 'json' } });
      words = (spanishWords as string[]).map((w: string) => w.toLowerCase());
      break;
    }

    case 'he': {
      const backendDir = path.join(process.cwd(), 'backend');
      const [mainContent, approvedContent] = await Promise.all([
        fsp.readFile(path.join(backendDir, 'hebrew_words.txt'), 'utf-8').catch(() => ''),
        fsp.readFile(path.join(backendDir, 'hebrew_words_approved.txt'), 'utf-8').catch(() => ''),
      ]);

      for (const content of [mainContent, approvedContent]) {
        if (content) {
          for (const line of content.split('\n')) {
            const w = normalizeHebrewWord(line.trim());
            if (w.length > 0) words.push(w);
          }
        }
      }
      break;
    }

    case 'sv': {
      const swedishWordsPath = path.join(process.cwd(), 'node_modules/@arvidbt/swedish-words/out/index.js');
      const approvedFile = path.join(process.cwd(), 'backend', 'swedish_words_approved.txt');
      const validSwedishWordPattern = /^[a-zåäöéàü]+$/i;

      const [content, approvedContent] = await Promise.all([
        fsp.readFile(swedishWordsPath, 'utf-8').catch(() => ''),
        fsp.readFile(approvedFile, 'utf-8').catch(() => ''),
      ]);

      if (content) {
        const arrayMatch = content.match(/var swedish_words = \[([\s\S]*?)\];/);
        if (arrayMatch) {
          for (const line of arrayMatch[1].split(',')) {
            const trimmed = line.trim();
            if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
              try {
                const jsonCompatible = trimmed.replace(/\\x([0-9A-Fa-f]{2})/g, '\\u00$1');
                const word = JSON.parse(jsonCompatible);
                if (word && word.length > 1 && validSwedishWordPattern.test(word)) {
                  words.push(word.toLowerCase());
                }
              } catch {
                // Skip invalid entries
              }
            }
          }
        }
      }

      if (approvedContent) {
        for (const line of approvedContent.split('\n')) {
          const w = line.trim().toLowerCase();
          if (w.length > 0) words.push(w);
        }
      }
      break;
    }

    case 'ja': {
      // Boards are hiragana-only, so the validation set is the base + approved
      // HIRAGANA wordlists — mirroring backend/dictionaryLoaders.ts. Kanji
      // compounds are seeding-only (never a playable word) and must NOT be loaded
      // here, or the base ~9.6k hiragana corpus would be silently rejected.
      const backendDir = path.join(process.cwd(), 'backend');
      const [baseContent, approvedContent] = await Promise.all([
        fsp.readFile(path.join(backendDir, 'japanese_words.txt'), 'utf-8').catch(() => ''),
        fsp.readFile(path.join(backendDir, 'japanese_words_approved.txt'), 'utf-8').catch(() => ''),
      ]);

      for (const content of [baseContent, approvedContent]) {
        if (content) {
          for (const line of content.split('\n')) {
            const w = line.trim();
            if (w.length > 0) words.push(w);
          }
        }
      }
      break;
    }

    default:
      break;
  }

  const wordSet = new Set(words);
  dictionaries[language] = wordSet;
  return wordSet;
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
