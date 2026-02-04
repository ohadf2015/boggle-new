/**
 * API Route: /api/dictionary-words
 * Serves dictionary words for client-side caching
 * Returns words as a newline-delimited string (smaller than JSON array)
 *
 * Performance optimizations:
 * - Uses streaming response for large dictionaries
 * - Sets aggressive cache headers (24h browser cache, 7d CDN cache)
 * - Gzip compression handled by Next.js automatically
 */

import { NextRequest, NextResponse } from 'next/server';
import englishWords from 'an-array-of-english-words';
import spanishWords from 'an-array-of-spanish-words';
import * as fs from 'fs';
import * as path from 'path';

// Cache dictionaries at module level
const dictionaries: Record<string, string[] | null> = {
  en: null,
  es: null,
  he: null,
  sv: null,
  ja: null,
};

// Hebrew final letter normalization
const hebrewFinalLetters: Record<string, string> = {
  'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ'
};

function normalizeHebrewWord(word: string): string {
  return word.split('').map(c => hebrewFinalLetters[c] || c).join('');
}

function loadDictionary(language: string): string[] {
  if (dictionaries[language]) {
    return dictionaries[language]!;
  }

  let words: string[] = [];

  switch (language) {
    case 'en':
      words = englishWords.map((w: string) => w.toLowerCase());
      break;

    case 'es':
      words = spanishWords.map((w: string) => w.toLowerCase());
      break;

    case 'he': {
      const backendDir = path.join(process.cwd(), 'backend');
      const mainFile = path.join(backendDir, 'hebrew_words.txt');
      const approvedFile = path.join(backendDir, 'hebrew_words_approved.txt');
      const wordSet = new Set<string>();

      if (fs.existsSync(mainFile)) {
        fs.readFileSync(mainFile, 'utf-8')
          .split('\n')
          .map(w => normalizeHebrewWord(w.trim()))
          .filter(w => w.length > 0)
          .forEach(w => wordSet.add(w));
      }

      if (fs.existsSync(approvedFile)) {
        fs.readFileSync(approvedFile, 'utf-8')
          .split('\n')
          .map(w => normalizeHebrewWord(w.trim()))
          .filter(w => w.length > 0)
          .forEach(w => wordSet.add(w));
      }

      words = Array.from(wordSet);
      break;
    }

    case 'sv': {
      const swedishWordsPath = path.join(process.cwd(), 'node_modules/@arvidbt/swedish-words/out/index.js');
      const approvedFile = path.join(process.cwd(), 'backend', 'swedish_words_approved.txt');
      const wordSet = new Set<string>();
      const validSwedishWordPattern = /^[a-zåäöéàü]+$/i;

      if (fs.existsSync(swedishWordsPath)) {
        const content = fs.readFileSync(swedishWordsPath, 'utf-8');
        const arrayMatch = content.match(/var swedish_words = \[([\s\S]*?)\];/);

        if (arrayMatch) {
          arrayMatch[1].split(',').forEach(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
              try {
                const jsonCompatible = trimmed.replace(/\\x([0-9A-Fa-f]{2})/g, '\\u00$1');
                const word = JSON.parse(jsonCompatible);
                if (word && word.length > 1 && validSwedishWordPattern.test(word)) {
                  wordSet.add(word.toLowerCase());
                }
              } catch {
                // Skip invalid entries
              }
            }
          });
        }
      }

      if (fs.existsSync(approvedFile)) {
        fs.readFileSync(approvedFile, 'utf-8')
          .split('\n')
          .map(w => w.trim().toLowerCase())
          .filter(w => w.length > 0)
          .forEach(w => wordSet.add(w));
      }

      words = Array.from(wordSet);
      break;
    }

    case 'ja': {
      const backendDir = path.join(process.cwd(), 'backend');
      const kanjiFile = path.join(backendDir, 'kanji_compounds.txt');
      const approvedFile = path.join(backendDir, 'japanese_words_approved.txt');
      const wordSet = new Set<string>();

      if (fs.existsSync(kanjiFile)) {
        fs.readFileSync(kanjiFile, 'utf-8')
          .split('\n')
          .map(w => w.trim())
          .filter(w => w.length > 0)
          .forEach(w => wordSet.add(w));
      }

      if (fs.existsSync(approvedFile)) {
        fs.readFileSync(approvedFile, 'utf-8')
          .split('\n')
          .map(w => w.trim())
          .filter(w => w.length > 0)
          .forEach(w => wordSet.add(w));
      }

      words = Array.from(wordSet);
      break;
    }

    default:
      words = [];
  }

  // Cache the loaded dictionary
  dictionaries[language] = words;
  return words;
}

// Node.js runtime for dictionary caching efficiency
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const language = searchParams.get('lang') || 'en';

  // Validate language
  if (!['en', 'es', 'he', 'sv', 'ja'].includes(language)) {
    return NextResponse.json(
      { error: 'Invalid language' },
      { status: 400 }
    );
  }

  try {
    const words = loadDictionary(language);

    // Return as newline-delimited text (more compact than JSON)
    const response = new NextResponse(words.join('\n'), {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        // Aggressive caching - dictionary rarely changes
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
        // ETag for conditional requests
        'ETag': `"${language}-${words.length}"`,
      },
    });

    return response;
  } catch (error) {
    console.error('[dictionary-words] Error loading dictionary:', error);
    return NextResponse.json(
      { error: 'Failed to load dictionary' },
      { status: 500 }
    );
  }
}
