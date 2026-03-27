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
import type { PlayerProgression, LevelCompletion, LevelAttempt } from '@/types/adventure';
import { captureApiError } from '@/utils/sentry';

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
      gold: 0,
      upgrades: {},
      skillPoints: 0,
      skillTree: {},
      runeFragments: 0,
      runes: [],
      endlessHighFloor: 0,
      completions: [],
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
    gold: (dbRow.gold as number) ?? 0,
    upgrades: (dbRow.upgrades as Record<string, number>) ?? {},
    skillPoints: (dbRow.skill_points as number) ?? 0,
    skillTree: (dbRow.skill_tree as Record<string, number>) ?? {},
    runeFragments: (dbRow.rune_fragments as number) ?? 0,
    runes: (dbRow.runes as Array<{ runeId: string; equipped: boolean }>) ?? [],
    chapterQuestProgress: (dbRow.chapter_quest_progress as Record<string, number>) ?? {},
    wordAlbum: (dbRow.word_album as string[]) ?? [],
    wordAlbumClaimedMilestones: (dbRow.word_album_claimed_milestones as number[]) ?? [],
    endlessHighFloor: (dbRow.endless_high_floor as number) ?? 0,
    completions,
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
 * Transform database row to LevelAttempt type
 */
function transformAttempt(dbRow: Record<string, unknown>): LevelAttempt {
  return {
    world: dbRow.world as number,
    level: dbRow.level as number,
    bestWords: dbRow.best_words as number,
    bestScore: dbRow.best_score as number,
    bestTimeRemaining: dbRow.best_time_remaining as number,
    objectiveProgress: dbRow.objective_progress as Record<string, number>,
    attemptCount: dbRow.attempt_count as number,
    consecutiveFailures: dbRow.consecutive_failures as number,
    firstAttemptAt: dbRow.first_attempt_at as string,
    lastAttemptAt: dbRow.last_attempt_at as string,
  };
}

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
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
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
