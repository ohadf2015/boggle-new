import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { regenerateDailyPuzzle } from '@/utils/dailyChallenge/gridGeneration.server';
import { captureApiError } from '@/utils/sentry';
import type { Language } from '@/types';

/**
 * POST /api/admin/daily-word/regenerate-board
 * Regenerate the board for a daily challenge
 * This generates a new grid with the current target word embedded
 * Only accessible to admin users
 *
 * Supports both cookie-based session auth and Bearer token auth
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication (supports both Bearer token and cookie session)
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    // Parse request body
    const body = await request.json();
    const { puzzleDate, language } = body;

    if (!puzzleDate || !language) {
      return NextResponse.json(
        { error: 'puzzleDate and language are required' },
        { status: 400 }
      );
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(puzzleDate)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Validate language
    const validLanguages = ['en', 'he', 'sv', 'ja', 'es'];
    if (!validLanguages.includes(language)) {
      return NextResponse.json(
        { error: 'Invalid language code' },
        { status: 400 }
      );
    }

    // Regenerate the puzzle (this will create a new grid with the target word embedded)
    const puzzle = await regenerateDailyPuzzle(puzzleDate, language as Language);

    return NextResponse.json({
      success: true,
      puzzle: {
        puzzleDate: puzzle.puzzleDate,
        puzzleNumber: puzzle.puzzleNumber,
        language: puzzle.language,
        targetWord: puzzle.targetWord,
        gridDimensions: {
          rows: puzzle.grid.length,
          cols: puzzle.grid[0]?.length || 0
        }
      },
      message: `Board regenerated successfully for ${puzzleDate}/${language}`
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Regenerate board error:', error);
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/admin/daily-word/regenerate-board',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
