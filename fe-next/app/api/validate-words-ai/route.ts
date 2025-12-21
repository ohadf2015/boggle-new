/**
 * API Route: /api/validate-words-ai
 * Batch AI validation for words not in dictionary (end of game)
 * Uses Node.js runtime for Vertex AI SDK
 *
 * This is the preferred endpoint for single player mode - validates all pending
 * words in a single batch request instead of individual calls.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit, rateLimitResponse } from '@/lib/apiRateLimit';

interface ValidationResult {
  word: string;
  isValid: boolean;
  reason?: string;
  source: 'database' | 'ai';
}

// Rate limit config: 60 requests per minute per IP (batch endpoint)
// Higher limit to accommodate multiple users on same network finishing games
const RATE_LIMIT_CONFIG = {
  maxRequests: 60,
  windowMs: 60000,
  blockDurationMs: 300000, // 5 min block if abused
};

export async function POST(request: NextRequest) {
  // Check rate limit
  const rateLimit = checkApiRateLimit(request, 'validate-words-ai', RATE_LIMIT_CONFIG);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  let body: { words: string[]; language: string; minWordLength?: number };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({
      success: false,
      error: 'Invalid request body',
      results: [],
    }, { status: 400 });
  }

  const { words, language = 'en', minWordLength = 2 } = body;

  if (!Array.isArray(words) || words.length === 0) {
    return NextResponse.json({
      success: false,
      error: 'Words array is required',
      results: [],
    }, { status: 400 });
  }

  // Limit batch size to prevent abuse
  const MAX_BATCH_SIZE = 50;
  if (words.length > MAX_BATCH_SIZE) {
    return NextResponse.json({
      success: false,
      error: `Batch size exceeds maximum of ${MAX_BATCH_SIZE} words`,
      results: [],
    }, { status: 400 });
  }

  // Normalize words (filter by minWordLength setting)
  const normalizedWords = words
    .filter(w => typeof w === 'string' && w.trim().length >= minWordLength)
    .map(w => w.toLowerCase().trim());

  if (normalizedWords.length === 0) {
    return NextResponse.json({
      success: true,
      results: [],
    });
  }

  try {
    const { gameAIService } = await import('@/lib/ai-service');
    const aiResults = await gameAIService.validateWords(normalizedWords, language, minWordLength);

    const results: ValidationResult[] = normalizedWords.map((word, index) => ({
      word,
      isValid: aiResults[index]?.isValid ?? false,
      reason: aiResults[index]?.reason,
      source: aiResults[index]?.source ?? 'ai',
    }));

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[validate-words-ai] Error:', msg);

    // Return all as invalid on error
    const results: ValidationResult[] = normalizedWords.map(word => ({
      word,
      isValid: false,
      reason: 'AI validation unavailable',
      source: 'ai' as const,
    }));

    return NextResponse.json({
      success: false,
      error: 'AI validation unavailable',
      results,
    });
  }
}
