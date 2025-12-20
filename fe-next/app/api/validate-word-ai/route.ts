/**
 * API Route: /api/validate-word-ai
 * AI validation for words not in dictionary (end of game only)
 * Uses Node.js runtime for Vertex AI SDK
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit, rateLimitResponse } from '@/lib/apiRateLimit';

// Rate limit config: 100 requests per minute per IP (AI endpoint)
// Higher limit to accommodate multiple users on same network
const RATE_LIMIT_CONFIG = {
  maxRequests: 100,
  windowMs: 60000,
  blockDurationMs: 300000, // 5 min block if abused
};

export async function POST(request: NextRequest) {
  // Check rate limit
  const rateLimit = checkApiRateLimit(request, 'validate-word-ai', RATE_LIMIT_CONFIG);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  let body: { word: string; language: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({
      isValid: false,
      reason: 'Invalid request body',
    }, { status: 400 });
  }

  const { word, language = 'en' } = body;

  if (!word || typeof word !== 'string') {
    return NextResponse.json({
      isValid: false,
      reason: 'Invalid word format',
    }, { status: 400 });
  }

  const normalizedWord = word.toLowerCase().trim();

  try {
    const { gameAIService } = await import('@/lib/ai-service');
    const result = await gameAIService.validateAndSaveWord(normalizedWord, language);
    return NextResponse.json({
      isValid: result.isValid,
      reason: result.reason,
      source: result.source,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[validate-word-ai] Error:', msg);
    return NextResponse.json({
      isValid: false,
      reason: 'AI validation unavailable',
    });
  }
}
