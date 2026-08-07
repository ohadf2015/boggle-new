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
import { extractHiraganaWords } from '@/shared/constants/japaneseLetters';
import * as fsp from 'fs/promises';
import * as path from 'path';
import {
  getEnglishWordSet,
  getSpanishBaseWordSet,
  getHebrewWordSet,
  getSwedishWordSet,
} from '@/lib/server/sharedWordSets';

// Pre-gzipped payloads cached per language (dictionary content is static per
// deploy). Once built, ALL requests are served from here — the intermediate word
// array is NOT retained, so the full list only lives in the shared sets, not a
// second time as a per-route array (see lib/server/sharedWordSets.ts, OOM 2026-08-06).
const gzippedPayloads: Record<string, { gzip: Buffer; raw: string; count: number } | null> = {
  en: null,
  es: null,
  he: null,
  sv: null,
  ja: null,
};

async function loadWords(language: string): Promise<string[]> {
  switch (language) {
    case 'en':
      return Array.from(await getEnglishWordSet());
    case 'es':
      // ponytail: base only, unlike he/sv which merge their *_approved.txt.
      // spanish_words_approved.txt is empty today so nothing is lost, but the
      // promotion pipeline writes into it — the first promoted Spanish word will
      // validate server-side and be rejected client-side. Merge it here then.
      return Array.from(await getSpanishBaseWordSet());
    case 'he':
      return Array.from(getHebrewWordSet());
    case 'sv':
      return Array.from(getSwedishWordSet());

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

      return Array.from(wordSet);
    }

    default:
      return [];
  }
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
    // Build (and cache) the newline-delimited payload + its gzip form once. After
    // this the intermediate word array is dropped — only the payload is retained.
    if (!gzippedPayloads[language]) {
      const words = await loadWords(language);
      const raw = words.join('\n');
      gzippedPayloads[language] = { gzip: gzipSync(raw, { level: 6 }), raw, count: words.length };
    }
    const payload = gzippedPayloads[language]!;

    const cacheHeaders: Record<string, string> = {
      'Content-Type': 'text/plain; charset=utf-8',
      // Aggressive caching - dictionary rarely changes
      'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
      // ETag for conditional requests
      'ETag': `"${language}-${payload.count}"`,
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
