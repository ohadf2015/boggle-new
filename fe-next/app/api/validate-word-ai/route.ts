/**
 * API Route: /api/validate-word-ai
 * AI validation for words not in dictionary (end of game only)
 * Uses Node.js runtime for Vertex AI SDK
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
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
