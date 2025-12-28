/**
 * API Route: /api/validate-word
 * Validates words for single-player mode
 * Supports English and Spanish dictionaries
 * For full validation (including community validation), use /api/dictionary/check
 */

import { NextRequest } from 'next/server';
import englishWords from 'an-array-of-english-words';
import spanishWords from 'an-array-of-spanish-words';
import { checkApiRateLimit, rateLimitResponse } from '@/lib/apiRateLimit';

// Pre-build dictionaries at module load (cached by Next.js)
const englishDictionary = new Set(englishWords.map((w: string) => w.toLowerCase()));
const spanishDictionary = new Set(spanishWords.map((w: string) => w.toLowerCase()));

// Spanish accent normalization - accented vowels to base vowels for dictionary lookup
const spanishAccentMap: Record<string, string> = {
  'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ü': 'u'
};

function normalizeSpanishWord(word: string): string {
  return word
    .toLowerCase()
    .split('')
    .map(c => spanishAccentMap[c] || c)
    .join('');
}

function normalizeWord(word: string, language: string): string {
  switch (language) {
    case 'es':
      return normalizeSpanishWord(word);
    case 'en':
    default:
      return word.toLowerCase();
  }
}

// Rate limit config: 300 requests per minute per IP
// Higher limit to accommodate multiple users on same network (family, office, cafe)
const RATE_LIMIT_CONFIG = {
  maxRequests: 300,
  windowMs: 60000,
  blockDurationMs: 300000, // 5 min block if abused
};

// Using Node.js runtime for dictionary caching efficiency
// Edge runtime would reload 11MB+ dictionary on every cold start
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // Check rate limit
  const rateLimit = checkApiRateLimit(request, 'validate-word', RATE_LIMIT_CONFIG);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const body = await request.json();
    const { word, language = 'en' } = body;

    // Basic validation
    if (!word || typeof word !== 'string') {
      return Response.json({
        isValid: false,
        reason: 'Invalid word format',
        source: 'format',
      }, { status: 400 });
    }

    const normalizedWord = normalizeWord(word.trim(), language);

    if (normalizedWord.length < 2) {
      return Response.json({
        isValid: false,
        reason: 'Word must be at least 2 letters',
        source: 'format',
      });
    }

    // Check dictionary based on language
    let isInDictionary = false;
    if (language === 'en' && englishDictionary.has(normalizedWord)) {
      isInDictionary = true;
    } else if (language === 'es' && spanishDictionary.has(normalizedWord)) {
      isInDictionary = true;
    }

    if (isInDictionary) {
      return Response.json({
        isValid: true,
        source: 'dictionary',
      });
    }

    // Word not in dictionary - return pending
    // Note: For community validation, use /api/dictionary/check instead
    return Response.json({
      isValid: false,
      reason: 'Word not in dictionary',
      source: 'pending',
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[validate-word] Error:', msg);
    return Response.json({
      isValid: false,
      reason: 'Validation error',
      source: 'format',
    }, { status: 500 });
  }
}
