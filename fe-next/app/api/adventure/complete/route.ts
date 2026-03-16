/**
 * Adventure Level Completion API
 *
 * POST - Complete a level and update progression
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getLevelFromXp } from '@/shared/utils/adventureXpUtils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
    goldEarned?: number;
  };
} {
  const { world, level, stars, score, words, goldEarned } = body;

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

  // Validate optional goldEarned (non-negative integer if provided)
  if (goldEarned !== undefined && (typeof goldEarned !== 'number' || goldEarned < 0)) {
    return { valid: false, error: 'Invalid goldEarned: must be a non-negative number' };
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
    data: { world, level, stars, score, words, ...(typeof goldEarned === 'number' && { goldEarned }) },
  };
}


/**
 * POST /api/adventure/complete
 * Complete a level and update progression
 */
export async function POST(request: Request) {
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

    const { world, level, stars, score, words, goldEarned: clientGoldEarned } = validation.data;

    // Use service role client for database operations (bypasses RLS)
    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);

    // Ensure progression exists
    const { data: existingProgression, error: progressionError } = await supabase
      .from('player_progression')
      .select('*')
      .eq('user_id', userId)
      .single();

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

    // Get existing completion for this level (if any)
    const { data: existingCompletion } = await supabase
      .from('level_completions')
      .select('*')
      .eq('user_id', userId)
      .eq('world', world)
      .eq('level', level)
      .single();

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

    // Calculate gold earned — use client-provided value (includes upgrade bonuses) or fall back to base formula
    let goldEarned: number;
    if (clientGoldEarned !== undefined) {
      goldEarned = isFirstCompletion ? clientGoldEarned : 0;
    } else {
      const baseGold = 10 * stars;
      const perfectClearGoldBonus = stars === 3 ? 50 : 0;
      goldEarned = isFirstCompletion ? baseGold + perfectClearGoldBonus : 0;
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
    const { error: updateError } = await supabase
      .from('player_progression')
      .update({
        player_level: newPlayerLevel,
        xp: newTotalXp,
        total_stars: newTotalStars,
        gold: newGold,
        current_world: Math.max(existingProgression?.current_world ?? 1, nextWorld),
        current_level: Math.max(existingProgression?.current_level ?? 1, nextLevel),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[ADVENTURE COMPLETE API] Error:', errorMessage);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
