/**
 * API Route: /api/dictionary-words
 * Serves dictionary words for client-side caching
 * Returns words as a newline-delimited string (smaller than JSON array)
 *
 * Performance optimizations:
 * - Uses streaming response for large dictionaries
 * - Sets aggressive cache headers (24h browser cache, 7d CDN cache)
 * - Gzip applied IN-ROUTE (cached per language): the Express compression
 *   middleware does not pick this response up, and Next standalone runs with
 *   compress:false, so without this the 2.8MB English list crosses the wire
 *   raw on every first visit.
 */

import { NextRequest, NextResponse } from 'next/server';
import { gzipSync } from 'zlib';
import { normalizeHebrewWord } from '@/shared/utils/wordNormalization';
import { extractHiraganaWords } from '@/shared/constants/japaneseLetters';
import * as fsp from 'fs/promises';
import * as path from 'path';

// Cache dictionaries at module level — populated lazily per language
const dictionaries: Record<string, string[] | null> = {
  en: null,
  es: null,
  he: null,
  sv: null,
  ja: null,
};

// Pre-gzipped payloads cached per language (dictionary content is static per deploy)
const gzippedPayloads: Record<string, { gzip: Buffer; raw: string } | null> = {
  en: null,
  es: null,
  he: null,
  sv: null,
  ja: null,
};

async function loadDictionary(language: string): Promise<string[]> {
  if (dictionaries[language]) {
    return dictionaries[language]!;
  }

  let words: string[] = [];

  switch (language) {
    case 'en': {
      const { default: englishWords } = await import('an-array-of-english-words', { with: { type: 'json' } });
      words = englishWords.map((w: string) => w.toLowerCase());
      break;
    }

    case 'es': {
      const { default: spanishWords } = await import('an-array-of-spanish-words', { with: { type: 'json' } });
      words = spanishWords.map((w: string) => w.toLowerCase());
      break;
    }

    case 'he': {
      const backendDir = path.join(process.cwd(), 'backend');
      const wordSet = new Set<string>();

      const [mainContent, approvedContent] = await Promise.all([
        fsp.readFile(path.join(backendDir, 'hebrew_words.txt'), 'utf-8').catch(() => ''),
        fsp.readFile(path.join(backendDir, 'hebrew_words_approved.txt'), 'utf-8').catch(() => ''),
      ]);

      for (const content of [mainContent, approvedContent]) {
        if (content) {
          for (const line of content.split('\n')) {
            const w = normalizeHebrewWord(line.trim());
            if (w.length > 0) wordSet.add(w);
          }
        }
      }

      words = Array.from(wordSet);
      break;
    }

    case 'sv': {
      const swedishWordsPath = path.join(process.cwd(), 'node_modules/@arvidbt/swedish-words/out/index.js');
      const approvedFile = path.join(process.cwd(), 'backend', 'swedish_words_approved.txt');
      const wordSet = new Set<string>();
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
                  wordSet.add(word.toLowerCase());
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
          if (w.length > 0) wordSet.add(w);
        }
      }

      words = Array.from(wordSet);
      break;
    }

    case 'ja': {
      const backendDir = path.join(process.cwd(), 'backend');
      const wordSet = new Set<string>();

      // HIRAGANA only — the client cache must match backend board generation +
      // validation. Serving kanji_compounds here made the client reject the
      // hiragana words the board can actually spell.
      const [hiraganaContent, approvedContent] = await Promise.all([
        fsp.readFile(path.join(backendDir, 'japanese_words.txt'), 'utf-8').catch(() => ''),
        fsp.readFile(path.join(backendDir, 'japanese_words_approved.txt'), 'utf-8').catch(() => ''),
      ]);

      for (const content of [hiraganaContent, approvedContent]) {
        for (const w of extractHiraganaWords(content)) wordSet.add(w);
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
    const words = await loadDictionary(language);

    // Build (and cache) the newline-delimited payload + its gzip form once
    if (!gzippedPayloads[language]) {
      const raw = words.join('\n');
      gzippedPayloads[language] = { gzip: gzipSync(raw, { level: 6 }), raw };
    }
    const payload = gzippedPayloads[language]!;

    const cacheHeaders: Record<string, string> = {
      'Content-Type': 'text/plain; charset=utf-8',
      // Aggressive caching - dictionary rarely changes
      'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
      // ETag for conditional requests
      'ETag': `"${language}-${words.length}"`,
      'Vary': 'Accept-Encoding',
    };

    const acceptsGzip = (request.headers.get('accept-encoding') || '').includes('gzip');
    if (acceptsGzip) {
      return new NextResponse(new Uint8Array(payload.gzip), {
        status: 200,
        headers: { ...cacheHeaders, 'Content-Encoding': 'gzip' },
      });
    }

    return new NextResponse(payload.raw, {
      status: 200,
      headers: cacheHeaders,
    });
  } catch (error) {
    console.error('[dictionary-words] Error loading dictionary:', error);
    return NextResponse.json(
      { error: 'Failed to load dictionary' },
      { status: 500 }
    );
  }
}
