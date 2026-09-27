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
import { gzipSync, brotliCompressSync, constants } from 'zlib';
import { extractHiraganaWords } from '@/shared/constants/japaneseLetters';
import { acceptsEncoding } from '@/lib/http/acceptEncoding';
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
const gzippedPayloads: Record<
  string,
  { gzip: Buffer; brotli?: Buffer; raw: string; count: number } | null
> = {
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

/**
 * RFC 9110 If-None-Match: a comma-separated list of entity-tags, or `*`.
 * Browsers echo back exactly what they were given, but caches and proxies do
 * send lists, and some prepend the weak marker.
 */
function matchesIfNoneMatch(header: string | null, etag: string): boolean {
  if (!header) return false;
  if (header.trim() === '*') return true;
  return header
    .split(',')
    .map((t) => t.trim().replace(/^W\//, ''))
    .includes(etag);
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
      // Never memoise an empty list. This cache lives for the whole process, so
      // a single bad build — a missing backend/*.txt (getHebrewWordSet and
      // getSwedishWordSet skip absent files without a word), a failed dynamic
      // import — would serve an empty 200 to every client until the next deploy.
      // Clients treat a 200 as authoritative and cache it themselves, so the
      // blast radius is much larger than the request that built it. 503 instead:
      // callers already retry or fall back on a non-OK status.
      if (words.length === 0) {
        console.error(`[dictionary-words] ${language} loaded 0 words — refusing to cache an empty dictionary`);
        return NextResponse.json({ error: 'Dictionary unavailable' }, { status: 503 });
      }
      const raw = words.join('\n');
      gzippedPayloads[language] = { gzip: gzipSync(raw, { level: 6 }), raw, count: words.length };
    }
    const payload = gzippedPayloads[language]!;

    const accept = request.headers.get('accept-encoding');
    const encoding = acceptsEncoding(accept, 'br')
      ? 'br'
      : acceptsEncoding(accept, 'gzip')
        ? 'gzip'
        : 'identity';

    // The ETag has to name the ENCODING too. An ETag identifies a
    // representation, and gzip/brotli/identity are three different ones — with a
    // single shared tag, a shared cache can answer a gzip-cached client with a
    // 304 for bytes it never had.
    const etag = `"${language}-${payload.count}-${encoding}"`;

    const cacheHeaders: Record<string, string> = {
      'Content-Type': 'text/plain; charset=utf-8',
      // Aggressive caching - dictionary rarely changes
      'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
      'ETag': etag,
      'Vary': 'Accept-Encoding',
    };

    // The route emitted an ETag but never read If-None-Match, so a revalidation
    // (which `stale-while-revalidate` triggers in the background every day) got
    // the full body back — 1.21MB of Spanish, to say "unchanged".
    if (matchesIfNoneMatch(request.headers.get('if-none-match'), etag)) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          'Cache-Control': cacheHeaders['Cache-Control'],
          'ETag': etag,
          'Vary': 'Accept-Encoding',
        },
      });
    }

    // Measured on the real lists 2026-08-29 (es: 6.73MB raw / 1.39MB gzip-6):
    //   br q=5  1.214MB  -13%   153ms      <- here
    //   br q=9  1.186MB  -15%   818ms
    //   br q=11 0.936MB  -33%  12405ms
    // The buffer is cached for the process lifetime, but it is built on the
    // FIRST request, so quality is capped by what one player will sit through.
    // ponytail: q=5 because 12s of first-request stall buys 0.28MB; the way to
    // actually get q=11 is to precompress at build time, not to raise this.
    //
    // This branch is also load-bearing, not just an optimisation: preferBrotli()
    // in server/middleware.ts rewrites Accept-Encoding to `br`, so without it
    // the gzip check below would miss and every browser would get 6.73MB raw.
    if (acceptsEncoding(accept, 'br')) {
      payload.brotli ??= brotliCompressSync(payload.raw, {
        params: {
          [constants.BROTLI_PARAM_QUALITY]: 5,
          [constants.BROTLI_PARAM_SIZE_HINT]: Buffer.byteLength(payload.raw),
        },
      });
      return new NextResponse(new Uint8Array(payload.brotli), {
        status: 200,
        headers: { ...cacheHeaders, 'Content-Encoding': 'br' },
      });
    }

    if (acceptsEncoding(accept, 'gzip')) {
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
