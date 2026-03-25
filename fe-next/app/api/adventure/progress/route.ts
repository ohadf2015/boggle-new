/**
 * Adventure Progress API
 *
 * GET - Retrieve user's adventure progression
 * POST - Create initial progression for new user
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import type { PlayerProgression, LevelCompletion } from '@/types/adventure';
import { captureApiError } from '@/utils/sentry';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Transform database row to PlayerProgression type
 */
function transformProgression(
  dbRow: Record<string, unknown> | null,
  completions: LevelCompletion[]
): PlayerProgression {
  if (!dbRow) {
    return {
      userId: '',
      playerLevel: 1,
      xp: 0,
      currentWorld: 1,
      currentLevel: 1,
      totalStars: 0,
      completions: [],
      gold: 0,
      upgrades: {},
      skillPoints: 0,
      skillTree: {},
      runeFragments: 0,
      runes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    userId: dbRow.user_id as string,
    playerLevel: dbRow.player_level as number,
    xp: dbRow.xp as number,
    currentWorld: dbRow.current_world as number,
    currentLevel: dbRow.current_level as number,
    totalStars: dbRow.total_stars as number,
    completions,
    gold: (dbRow.gold as number) ?? 0,
    upgrades: (dbRow.upgrades as Record<string, number>) ?? {},
    skillPoints: (dbRow.skill_points as number) ?? 0,
    skillTree: (dbRow.skill_tree as Record<string, number>) ?? {},
    runeFragments: (dbRow.rune_fragments as number) ?? 0,
    runes: (dbRow.runes as Array<{ runeId: string; equipped: boolean }>) ?? [],
    endlessHighFloor: (dbRow.endless_high_floor as number) ?? 0,
    createdAt: dbRow.created_at as string,
    updatedAt: dbRow.updated_at as string,
  };
}

/**
 * Transform database row to LevelCompletion type
 */
function transformCompletion(dbRow: Record<string, unknown>): LevelCompletion {
  return {
    world: dbRow.world as number,
    level: dbRow.level as number,
    stars: dbRow.stars as 0 | 1 | 2 | 3,
    bestScore: dbRow.best_score as number,
    bestWords: dbRow.best_words as number,
    completedAt: dbRow.completed_at as string,
  };
}

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
  try {
    // Get authenticated user using proper Supabase SSR auth
    const authSupabase = await createClient();
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Use service role client for database operations (bypasses RLS)
    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);

    // Fetch progression and completions in parallel for ~50-100ms faster response
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

    // If no progression exists, return initial state
    if (progressionError && progressionError.code === 'PGRST116') {
      const initialProgression = transformProgression(null, []);
      initialProgression.userId = userId;
      return NextResponse.json(initialProgression);
    }

    if (progressionError) {
      console.error('[ADVENTURE API] Progression fetch error:', progressionError);
      return NextResponse.json({ error: 'Failed to fetch progression' }, { status: 500 });
    }

    if (completionsError) {
      console.error('[ADVENTURE API] Completions fetch error:', completionsError);
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
    const authSupabase = await createClient();
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Use service role client for database operations (bypasses RLS)
    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);

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
