/**
 * Adventure Progress API
 *
 * GET - Retrieve user's adventure progression
 * POST - Create initial progression for new user
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { captureApiError } from '@/utils/sentry';
import { transformProgression, transformCompletion } from '../transforms';

/**
 * GET /api/adventure/progress
 * Retrieve user's adventure progression
 */
export async function GET(request: NextRequest) {
  const rateLimitResult = checkApiRateLimit(request, 'adventure-progress', {
    maxRequests: 60,
    windowMs: 60_000,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  // Auth — own try-catch so thrown errors become 401 (not 500)
  let userId: string;
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    const user = await getAuthedUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    userId = user.id;
    supabase = await createClient();
  } catch (authErr) {
    const msg = authErr instanceof Error ? authErr.message : String(authErr);
    console.error('[ADVENTURE API] Auth threw:', msg);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {

    const [progressionResult, completionsResult] = await Promise.all([
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
    ]);

    const { data: progressionRow, error: progressionError } = progressionResult;
    const { data: completionsRows, error: completionsError } = completionsResult;

    // If no progression exists, return initial state with any existing completions
    if (progressionError && progressionError.code === 'PGRST116') {
      const completions = completionsError ? [] : (completionsRows || []).map(transformCompletion);
      const initialProgression = transformProgression(null, completions);
      initialProgression.userId = userId;
      return NextResponse.json(initialProgression);
    }

    if (progressionError) {
      console.error('[ADVENTURE API] Progression fetch error:', JSON.stringify(progressionError));
      return NextResponse.json({ error: 'Failed to fetch progression' }, { status: 500 });
    }

    if (completionsError) {
      console.error('[ADVENTURE API] Completions fetch error:', JSON.stringify(completionsError));
      return NextResponse.json({ error: 'Failed to fetch completions' }, { status: 500 });
    }

    const completions = (completionsRows || []).map(transformCompletion);
    const progression = transformProgression(progressionRow, completions);

    return NextResponse.json(progression);
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/adventure/progress', { method: 'GET' });
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[ADVENTURE API] GET error:', errorMessage);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/adventure/progress
 * Create initial progression for new user
 */
export async function POST() {
  try {
    // Get authenticated user using proper Supabase SSR auth
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Check if progression already exists
    const { data: existing } = await supabase
      .from('player_progression')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Progression already exists' },
        { status: 409 }
      );
    }

    // Create initial progression
    const { data: newProgression, error: insertError } = await supabase
      .from('player_progression')
      .insert({
        user_id: userId,
        player_level: 1,
        xp: 0,
        current_world: 1,
        current_level: 1,
        total_stars: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[ADVENTURE API] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create progression' }, { status: 500 });
    }

    const progression = transformProgression(newProgression, []);

    return NextResponse.json(
      { success: true, progression },
      { status: 201 }
    );
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/adventure/progress', { method: 'POST' });
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[ADVENTURE API] POST error:', errorMessage);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
