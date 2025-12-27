/**
 * API Route: /api/solve-grid
 * Finds all valid words on a Boggle grid for single-player bot simulation
 * Uses Node.js runtime for access to dictionary and solver
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit, rateLimitResponse } from '@/lib/apiRateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SolveGridRequest {
  grid: string[][];
  language: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface SolveGridResponse {
  success: boolean;
  words?: {
    easy: string[];
    medium: string[];
    hard: string[];
  };
  error?: string;
}

// Rate limit config: 30 requests per minute per IP
// Lower limit since this is computationally expensive
const RATE_LIMIT_CONFIG = {
  maxRequests: 30,
  windowMs: 60000,
  blockDurationMs: 300000, // 5 min block if abused
};

export async function POST(request: NextRequest): Promise<NextResponse<SolveGridResponse>> {
  // Check rate limit
  const rateLimit = checkApiRateLimit(request, 'solve-grid', RATE_LIMIT_CONFIG);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit) as NextResponse<SolveGridResponse>;
  }

  let body: SolveGridRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({
      success: false,
      error: 'Invalid request body',
    }, { status: 400 });
  }

  const { grid, language = 'en' } = body;

  // Validate grid
  if (!grid || !Array.isArray(grid) || grid.length === 0) {
    return NextResponse.json({
      success: false,
      error: 'Grid is required and must be a 2D array',
    }, { status: 400 });
  }

  // Validate grid structure (must be rectangular)
  const rowLength = grid[0]?.length || 0;
  if (!grid.every(row => Array.isArray(row) && row.length === rowLength)) {
    return NextResponse.json({
      success: false,
      error: 'Grid must be rectangular (all rows same length)',
    }, { status: 400 });
  }

  // Validate grid size (4x4 to 11x11 - matches DIFFICULTIES in consts.ts)
  if (grid.length < 4 || grid.length > 11 || rowLength < 4 || rowLength > 11) {
    return NextResponse.json({
      success: false,
      error: 'Grid must be between 4x4 and 11x11',
    }, { status: 400 });
  }

  try {
    // Dynamic import of backend module (CommonJS)
    const { findWordsForBots } = await import('@/backend/modules/boggleSolver');

    const words = findWordsForBots(grid, language, {
      minLength: 3,
      maxLength: 10,
    }) as { easy: string[]; medium: string[]; hard: string[] };

    return NextResponse.json({
      success: true,
      words,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[solve-grid] Error:', msg);

    return NextResponse.json({
      success: false,
      error: 'Failed to solve grid',
    }, { status: 500 });
  }
}
