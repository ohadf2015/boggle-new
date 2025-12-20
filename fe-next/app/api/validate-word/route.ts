/**
 * API Route: /api/validate-word
 * Validates words for single-player mode
 */

import { NextRequest } from 'next/server';
import englishWords from 'an-array-of-english-words';
import { checkApiRateLimit, rateLimitResponse } from '@/lib/apiRateLimit';

// Pre-build dictionary at module load (cached by Next.js)
const englishDictionary = new Set(englishWords.map((w: string) => w.toLowerCase()));

// Rate limit config: 300 requests per minute per IP
// Higher limit to accommodate multiple users on same network (family, office, cafe)
const RATE_LIMIT_CONFIG = {
  maxRequests: 300,
  windowMs: 60000,
  blockDurationMs: 300000, // 5 min block if abused
};

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  // Check rate limit
  const rateLimit = checkApiRateLimit(request, 'validate-word', RATE_LIMIT_CONFIG);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const body = await request.json();
    const { word, language = 'en', useAI = false } = body;

    // Basic validation
    if (!word || typeof word !== 'string') {
      return Response.json({
        isValid: false,
        reason: 'Invalid word format',
        source: 'format',
      }, { status: 400 });
    }

    const normalizedWord = word.toLowerCase().trim();

    if (normalizedWord.length < 2) {
      return Response.json({
        isValid: false,
        reason: 'Word must be at least 2 letters',
        source: 'format',
      });
    }

    // Check dictionary
    if (language === 'en' && englishDictionary.has(normalizedWord)) {
      return Response.json({
        isValid: true,
        source: 'dictionary',
      });
    }

    // Word not in dictionary - return pending (AI validation not available in Edge)
    return Response.json({
      isValid: false,
      reason: 'Word not in dictionary',
      source: useAI ? 'dictionary' : 'pending',
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
