/**
 * Adventure Level Completion API
 *
 * POST - Complete a level and update progression
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getLevelFromXp } from '@/shared/utils/adventureXpUtils';
import { getUpgradeEffect, type UpgradeState } from '@/lib/adventure/upgradeConfig';
import { captureApiError } from '@/utils/sentry';

// Lazy-init to avoid crash on missing env vars
function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

/**
 * XP awarded per star earned (new stars only)
 */
const XP_PER_STAR = 25;

/**
 * Base XP for completing a level
 */
const BASE_COMPLETION_XP = 50;

/**
 * Validate completion request body
 */
function validateRequestBody(body: Record<string, unknown>): {
  valid: boolean;
  error?: string;
  data?: {
    world: number;
    level: number;
    stars: number;
    score: number;
    words: number;
    lootDrops?: unknown[];
    retainedScore?: number;
  };
} {
  const { world, level, stars, score, words, lootDrops, retainedScore } = body;

  // Check required fields
  if (
    typeof world !== 'number' ||
    typeof level !== 'number' ||
    typeof stars !== 'number' ||
    typeof score !== 'number' ||
    typeof words !== 'number'
  ) {
    return { valid: false, error: 'Missing required fields: world, level, stars, score, words' };
  }

  // Validate world range (1-10)
  if (world < 1 || world > 10) {
    return { valid: false, error: 'Invalid world: must be between 1 and 10' };
  }

  // Validate level range (1-10)
  if (level < 1 || level > 10) {
    return { valid: false, error: 'Invalid level: must be between 1 and 10' };
  }

  // Validate stars range (0-3)
  if (stars < 0 || stars > 3) {
    return { valid: false, error: 'Invalid stars: must be between 0 and 3' };
  }

  // Validate score (non-negative)
  if (score < 0) {
    return { valid: false, error: 'Invalid score: must be non-negative' };
  }

  // Validate words (non-negative)
  if (words < 0) {
    return { valid: false, error: 'Invalid words: must be non-negative' };
  }

  return {
    valid: true,
    data: {
      world, level, stars, score, words,
      // TODO: persist lootDrops to inventory table once schema exists
      ...(Array.isArray(lootDrops) && { lootDrops }),
      ...(typeof retainedScore === 'number' && { retainedScore }),
    },
  };
}


/**
 * POST /api/adventure/complete
 * Complete a level and update progression
 */
export async function POST(request: NextRequest) {
  // Rate limit: 10 requests per minute
  const rateLimitResult = checkApiRateLimit(request, 'adventure-complete', {
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Too many requests' },
      { status: 429 }
    );
  }

  const config = getSupabaseConfig();
  if (!config) {
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
  }

  try {
    // Get authenticated user using proper Supabase SSR auth
    const authSupabase = await createClient();
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Parse and validate request body
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = validateRequestBody(body);
    if (!validation.valid || !validation.data) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { world, level, stars, score, words, lootDrops: _lootDrops, retainedScore: _retainedScore } = validation.data;

    // TODO: persist lootDrops to a player_inventory table once the DB schema is created
    // TODO: persist retainedScore once retry scoring schema exists
    void _lootDrops;
    void _retainedScore;

    // Use service role client for database operations (bypasses RLS)
    const supabase = createServiceClient(config.url, config.key);

    // Fetch progression and existing completion in parallel
    const [progressionResult, completionResult] = await Promise.all([
      supabase
        .from('player_progression')
        .select('xp, total_stars, gold, current_world, current_level, player_level, upgrades')
        .eq('user_id', userId)
        .single(),
      supabase
        .from('level_completions')
        .select('stars, best_score, best_words')
        .eq('user_id', userId)
        .eq('world', world)
        .eq('level', level)
        .single(),
    ]);

    const { data: existingProgression, error: progressionError } = progressionResult;
    const { data: existingCompletion } = completionResult;

    // If no progression, create it
    if (progressionError && progressionError.code === 'PGRST116') {
      await supabase.from('player_progression').insert({
        user_id: userId,
        player_level: 1,
        xp: 0,
        current_world: 1,
        current_level: 1,
        total_stars: 0,
      });
    } else if (progressionError) {
      console.error('[ADVENTURE COMPLETE API] Progression fetch error:', progressionError);
      return NextResponse.json({ error: 'Failed to fetch progression' }, { status: 500 });
    }

    const previousStars = existingCompletion?.stars ?? 0;
    const previousBestScore = existingCompletion?.best_score ?? 0;
    const previousBestWords = existingCompletion?.best_words ?? 0;

    // Calculate new values (keep best scores)
    const newStars = Math.max(stars, previousStars);
    const newBestScore = Math.max(score, previousBestScore);
    const newBestWords = Math.max(words, previousBestWords);
    const starsGained = Math.max(0, newStars - previousStars);

    // Upsert level completion
    const { data: completion, error: completionError } = await supabase
      .from('level_completions')
      .upsert(
        {
          user_id: userId,
          world,
          level,
          stars: newStars,
          best_score: newBestScore,
          best_words: newBestWords,
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,world,level' }
      )
      .select()
      .single();

    if (completionError) {
      console.error('[ADVENTURE COMPLETE API] Completion upsert error:', completionError);
      return NextResponse.json({ error: 'Failed to save completion' }, { status: 500 });
    }

    // Calculate XP earned
    const isFirstCompletion = !existingCompletion;
    let xpEarned = 0;

    if (isFirstCompletion) {
      // First time completing this level
      xpEarned = BASE_COMPLETION_XP + (stars * XP_PER_STAR);
    } else if (starsGained > 0) {
      // Improved stars on existing completion
      xpEarned = starsGained * XP_PER_STAR;
    }

    // Update progression
    const currentXp = existingProgression?.xp ?? 0;
    const currentTotalStars = existingProgression?.total_stars ?? 0;
    const newTotalXp = currentXp + xpEarned;
    const newTotalStars = currentTotalStars + starsGained;
    const newPlayerLevel = getLevelFromXp(newTotalXp);

    // Calculate gold earned server-side (never trust client value)
    let goldEarned = 0;
    if (isFirstCompletion) {
      const baseGold = 10 * stars;
      const perfectClearGoldBonus = stars === 3 ? 50 : 0;
      goldEarned = baseGold + perfectClearGoldBonus;

      // Apply luckyPickaxe upgrade bonus from DB if player has it
      const playerUpgrades = (existingProgression?.upgrades as UpgradeState) ?? {};
      const luckyPickaxeBonus = getUpgradeEffect(playerUpgrades, 'luckyPickaxe');
      if (luckyPickaxeBonus > 0) {
        goldEarned = Math.round(goldEarned * (1 + luckyPickaxeBonus));
      }

      // Cap gold per level to prevent edge-case abuse
      const MAX_GOLD_PER_LEVEL = 500;
      goldEarned = Math.min(goldEarned, MAX_GOLD_PER_LEVEL);
    }
    const currentGold = (existingProgression?.gold as number) ?? 0;
    const newGold = currentGold + goldEarned;

    // Calculate next unlocked level
    let nextWorld = world;
    let nextLevel = level + 1;
    if (nextLevel > 10) {
      nextWorld = world + 1;
      nextLevel = 1;
    }
    if (nextWorld > 10) {
      nextWorld = 10;
      nextLevel = 10;
    }

    // Update progression in database
    const updatePayload: Record<string, unknown> = {
      player_level: newPlayerLevel,
      xp: newTotalXp,
      total_stars: newTotalStars,
      gold: newGold,
      current_world: Math.max(existingProgression?.current_world ?? 1, nextWorld),
      current_level: Math.max(existingProgression?.current_level ?? 1, nextLevel),
      updated_at: new Date().toISOString(),
    };

    let { error: updateError } = await supabase
      .from('player_progression')
      .update(updatePayload)
      .eq('user_id', userId);

    // If gold column doesn't exist yet (migration pending), retry without it
    if (updateError && (updateError.code === 'PGRST204' || updateError.message?.includes('gold'))) {
      console.warn('[ADVENTURE COMPLETE API] gold column not found, retrying without gold');
      delete updatePayload.gold;
      ({ error: updateError } = await supabase
        .from('player_progression')
        .update(updatePayload)
        .eq('user_id', userId));
    }

    if (updateError) {
      console.error('[ADVENTURE COMPLETE API] Progression update error:', updateError);
      return NextResponse.json({ error: 'Failed to update progression' }, { status: 500 });
    }

    // Check for level up
    const previousLevel = existingProgression?.player_level ?? 1;
    const leveledUp = newPlayerLevel > previousLevel;

    return NextResponse.json({
      success: true,
      completion: {
        world: completion.world,
        level: completion.level,
        stars: completion.stars,
        bestScore: completion.best_score,
        bestWords: completion.best_words,
        completedAt: completion.completed_at,
      },
      xpEarned,
      goldEarned,
      starsGained,
      progression: {
        playerLevel: newPlayerLevel,
        xp: newTotalXp,
        totalStars: newTotalStars,
        currentWorld: Math.max(existingProgression?.current_world ?? 1, nextWorld),
        currentLevel: Math.max(existingProgression?.current_level ?? 1, nextLevel),
      },
      leveledUp,
      previousLevel: leveledUp ? previousLevel : undefined,
    });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/adventure/complete', { method: 'POST' });
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[ADVENTURE COMPLETE API] Error:', errorMessage);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
