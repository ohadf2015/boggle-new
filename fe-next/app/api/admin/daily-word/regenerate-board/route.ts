import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { regenerateDailyPuzzle } from '@/utils/dailyChallenge';
import type { Language } from '@/types';

/**
 * Get Supabase admin client for API key authentication
 */
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Check admin authorization via Bearer token (Authorization header)
 */
async function checkBearerTokenAuth(request: NextRequest): Promise<{ isAdmin: boolean; userId?: string }> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { isAdmin: false };
  }

  const token = authHeader.substring(7);
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { isAdmin: false };
  }

  // Verify token
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return { isAdmin: false };
  }

  // Check if user is admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.is_admin) {
    return { isAdmin: false };
  }

  return { isAdmin: true, userId: user.id };
}

/**
 * POST /api/admin/daily-word/regenerate-board
 * Regenerate the board for a daily challenge
 * This generates a new grid with the current target word embedded
 * Only accessible to admin users
 *
 * Supports two authentication methods:
 * 1. Cookie-based session auth (default for dashboard)
 * 2. Authorization header with Bearer token (for API calls)
 */
export async function POST(request: NextRequest) {
  try {
    let isAuthorized = false;

    // First try Authorization header (Bearer token)
    const bearerAuth = await checkBearerTokenAuth(request);
    if (bearerAuth.isAdmin) {
      isAuthorized = true;
    }

    // Fall back to cookie-based auth
    if (!isAuthorized) {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (!authError && user) {
        // Check if user is admin
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();

        if (!profileError && profile?.is_admin) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
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
    console.error('Regenerate board error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
