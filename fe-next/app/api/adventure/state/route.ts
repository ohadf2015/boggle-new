/**
 * Adventure State API (Combined Endpoint)
 *
 * GET - Retrieve user's complete adventure state in one request
 *       (progression + attempts combined for performance)
 *
 * This endpoint eliminates the need for two separate API calls,
 * reducing initial load time by ~50-100ms.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { captureApiError } from '@/utils/sentry';
import { transformProgression, transformCompletion, transformAttempt } from '../transforms';

/**
 * GET /api/adventure/state
 * Retrieve complete adventure state (progression + attempts) in one request
 */
export async function GET(request: NextRequest) {
  const rateLimitResult = checkApiRateLimit(request, 'adventure-state', {
    maxRequests: 60,
    windowMs: 60_000,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter ?? 60) } }
    );
  }
  // ── Step 1: Authenticate ──────────────────────────────────────────
  // Uses the cookie-based auth client which also serves as the data client.
  // RLS policies on player_progression/level_completions/level_attempts
  // scope queries to auth.uid() automatically — no service role key needed.
  let userId: string;
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
    const user = await getAuthedUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    userId = user.id;
  } catch (authErr) {
    const msg = authErr instanceof Error ? authErr.message : String(authErr);
    console.error('[ADVENTURE STATE API] Auth threw:', msg);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Step 2: Fetch data ────────────────────────────────────────────
  try {
    const [progressionResult, completionsResult, attemptsResult] = await Promise.all([
      supabase
        .from('player_progression')
        .select('*')
        .eq('user_id', userId)
        .single(),
      supabase
        .from('level_completions')
        .select('*')
        .eq('user_id', userId)
        .order('world', { ascending: true })
        .order('level', { ascending: true }),
      supabase
        .from('level_attempts')
        .select('*')
        .eq('user_id', userId)
        .order('world', { ascending: true })
        .order('level', { ascending: true }),
    ]);

    const { data: progressionRow, error: progressionError } = progressionResult;
    const { data: completionsRows, error: completionsError } = completionsResult;
    const { data: attemptsRows, error: attemptsError } = attemptsResult;

    // If no progression exists, still return any existing completions.
    // This handles the case where level_completions rows exist but player_progression
    // was never created (e.g., the INSERT in /api/adventure/complete failed transiently
    // after the level_completions upsert already succeeded).
    if (progressionError && progressionError.code === 'PGRST116') {
      if (completionsError) {
        console.error('[ADVENTURE STATE API] Completions fetch error (no progression):', JSON.stringify(completionsError));
        return NextResponse.json({ error: 'Failed to fetch completions' }, { status: 500 });
      }
      const completions = (completionsRows || []).map(transformCompletion);
      const initialProgression = transformProgression(null, completions);
      initialProgression.userId = userId;
      return NextResponse.json({
        progression: initialProgression,
        attempts: [],
      });
    }

    if (progressionError) {
      console.error('[ADVENTURE STATE API] Progression fetch error:', JSON.stringify(progressionError));
      return NextResponse.json({ error: 'Failed to fetch progression' }, { status: 500 });
    }

    if (completionsError) {
      console.error('[ADVENTURE STATE API] Completions fetch error:', JSON.stringify(completionsError));
      return NextResponse.json({ error: 'Failed to fetch completions' }, { status: 500 });
    }

    // Attempts are optional - don't fail if table doesn't exist yet
    const attempts = attemptsError ? [] : (attemptsRows || []).map(transformAttempt);

    const completions = (completionsRows || []).map(transformCompletion);
    const progression = transformProgression(progressionRow, completions);

    return NextResponse.json({
      progression,
      attempts,
    });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/adventure/state', { method: 'GET' });
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : 'Unknown';
    console.error(`[ADVENTURE STATE API] GET error (${errorName}):`, errorMessage);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
