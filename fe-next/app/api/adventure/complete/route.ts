/**
 * Adventure Level Completion API
 *
 * POST - Complete a level and update progression
 */

import { after, NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import { getLevelFromXp } from '@/shared/utils/adventureXpUtils';
import { getUpgradeEffect, getUpgradeTier, type UpgradeState } from '@/lib/adventure/upgradeConfig';
import { captureApiError } from '@/utils/sentry';
import { getWeekStart, getDifficultyFromType, getStatDelta, getWeekNumber, pickAvatarReward, type GameStats } from '@/shared/weeklyQuestTemplates';
// Dynamic import to avoid Turbopack bundling backend logger transitively
// dailyMissionsManager uses backend/utils/logger which has Node.js-only APIs
const lazyCompleteMission = async (playerId: string, type: 'adventure') => {
  const { completeMission } = await import('@/backend/modules/dailyMissionsManager');
  return completeMission(playerId, type);
};

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
    longWords?: number;
    lootDrops?: unknown[];
    retainedScore?: number;
    wordsFound?: string[];
    flashChallengeGold?: number;
  };
} {
  const { world, level, stars, score, words, longWords, lootDrops, retainedScore, flashChallengeGold } = body;

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

  // Validate level range (1-7, matches LEVELS_PER_WORLD)
  if (level < 1 || level > 7) {
    return { valid: false, error: 'Invalid level: must be between 1 and 7' };
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
      ...(typeof longWords === 'number' && longWords >= 0 && { longWords }),
      ...(Array.isArray(lootDrops) && { lootDrops }),
      ...(typeof retainedScore === 'number' && { retainedScore }),
      ...(typeof flashChallengeGold === 'number' && flashChallengeGold >= 0 && { flashChallengeGold: Math.min(flashChallengeGold, 100) }),
      ...(Array.isArray(body.wordsFound) && { wordsFound: body.wordsFound as string[] }),
    },
  };
}


/**
 * POST /api/adventure/complete
 * Complete a level and update progression
 */
export async function POST(request: NextRequest) {
  // Rate limit: 20 requests per minute (players can complete levels quickly in early worlds)
  const rateLimitResult = checkApiRateLimit(request, 'adventure-complete', {
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (!rateLimitResult.success) {
    const retryAfter = rateLimitResult.retryAfter ?? 60;
    return NextResponse.json(
      { success: false, error: 'Too many requests' },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) },
      }
    );
  }

  try {
    // Get authenticated user using proper Supabase SSR auth
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

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

    const { world, level, stars, score, words, longWords, lootDrops: _lootDrops, retainedScore: _retainedScore } = validation.data;

    // TODO: persist lootDrops to a player_inventory table once the DB schema is created
    // TODO: persist retainedScore once retry scoring schema exists
    void _lootDrops;
    void _retainedScore;

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

    let { data: existingProgression, error: progressionError } = progressionResult;
    const { data: existingCompletion } = completionResult;

    // If no progression, create it
    if (progressionError && progressionError.code === 'PGRST116') {
      // Use upsert (not insert) to be idempotent — safe on concurrent requests and retries
      const { error: insertError } = await supabase.from('player_progression').upsert({
        user_id: userId,
        player_level: 1,
        xp: 0,
        current_world: 1,
        current_level: 1,
        total_stars: 0,
        gold: 0,
      }, { onConflict: 'user_id' });
      if (insertError) {
        console.error('[ADVENTURE COMPLETE API] Failed to create player_progression:', JSON.stringify(insertError));
        // Don't return 500 here — the level_completions upsert hasn't run yet,
        // so no inconsistent state exists yet. The update below will fail cleanly.
      }
      // Set defaults so downstream code works
      existingProgression = { xp: 0, total_stars: 0, current_world: 1, current_level: 1, player_level: 1, upgrades: {}, gold: 0 } as typeof existingProgression;
    } else if (progressionError) {
      console.error('[ADVENTURE COMPLETE API] Progression fetch error:', progressionError);
      return NextResponse.json({ error: 'Failed to fetch progression' }, { status: 500 });
    }

    // Security: Prevent level skip-ahead
    // Allow replaying already-completed levels, but reject levels not yet unlocked
    const playerWorld = existingProgression?.current_world ?? 1;
    const playerLevel = existingProgression?.current_level ?? 1;
    if (!existingCompletion) {
      // New level — must be within or before current progression
      if (world > playerWorld || (world === playerWorld && level > playerLevel)) {
        return NextResponse.json(
          { error: 'Level not unlocked — cannot skip ahead' },
          { status: 403 }
        );
      }
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

    if (!completion) {
      console.error('[ADVENTURE COMPLETE API] Completion upsert returned null data');
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
    const isReplay = !!existingCompletion;
    const playerUpgrades = (existingProgression?.upgrades as UpgradeState) ?? {};
    // Gold scales with world to prevent late-game gold drought
    // Salvage Claw (failureGold) grants a small consolation on 0-star attempts
    const failureGoldEffect = getUpgradeEffect(playerUpgrades, 'failureGold') || 0;
    const baseGold = stars === 0 && failureGoldEffect > 0
      ? Math.floor((10 + world * 3) * failureGoldEffect)
      : (10 + world * 3) * stars;
    const perfectClearGoldBonus = stars === 3 ? 50 : 0;
    // Cap longWords to a plausible maximum (max ~25 words in a level, not all can be long)
    const clampedLongWords = Math.min(longWords ?? 0, 20);
    const cargoBayEffect = getUpgradeEffect(playerUpgrades, 'cargoBay') || 0;
    const longWordBonus = clampedLongWords * cargoBayEffect;
    // Flash challenge gold (capped at 100 in validation, added before multipliers)
    const flashGold = validation.data.flashChallengeGold ?? 0;
    let goldEarned = baseGold + perfectClearGoldBonus + longWordBonus + flashGold;

    // Apply luckyPickaxe as ADDITIVE bonus (not multiplicative — prevents economy inflation)
    const luckyPickaxeBonus = getUpgradeEffect(playerUpgrades, 'luckyPickaxe') || 0;
    if (luckyPickaxeBonus > 0) {
      goldEarned = Math.round(goldEarned + baseGold * luckyPickaxeBonus);
    }

    // Replay penalty: 50% on BASE gold only — bonuses added on top unpenalized
    // Players improving their star count on a replay deserve full gold
    if (isReplay && starsGained === 0) {
      const penalizedBase = Math.floor(baseGold * 0.5);
      goldEarned = penalizedBase + perfectClearGoldBonus + longWordBonus + flashGold;
      if (luckyPickaxeBonus > 0) {
        goldEarned = Math.round(goldEarned + baseGold * luckyPickaxeBonus);
      }
    }

    // Lucky Pickaxe T4: double gold on first-ever completion of a level
    if (isFirstCompletion && getUpgradeTier(playerUpgrades, 'luckyPickaxe') >= 4) {
      goldEarned = goldEarned * 2;
    }

    // Cap gold per level to prevent edge-case abuse
    const MAX_GOLD_PER_LEVEL = 500;
    goldEarned = Math.min(goldEarned, MAX_GOLD_PER_LEVEL);
    const currentGold = (existingProgression?.gold as number) ?? 0;
    const newGold = currentGold + goldEarned;

    // Calculate next unlocked level
    let nextWorld = world;
    let nextLevel = level + 1;
    if (nextLevel > 7) {
      nextWorld = world + 1;
      nextLevel = 1;
    }
    if (nextWorld > 10) {
      nextWorld = 10;
      nextLevel = 7;
    }

    // Persist word album (words validated by game grid — safe to store)
    // Merge new words into existing album, capped at 5000
    const MAX_ALBUM_SIZE = 5000;
    let wordAlbumUpdate: string[] | undefined;
    if (words > 0 && Array.isArray(validation.data.wordsFound)) {
      const { data: albumRow } = await supabase
        .from('player_progression')
        .select('word_album')
        .eq('user_id', userId)
        .single();
      const existingAlbum = new Set<string>(
        ((albumRow?.word_album as string[]) ?? []).map((w: string) => w.toUpperCase())
      );
      for (const w of validation.data.wordsFound!) {
        if (existingAlbum.size >= MAX_ALBUM_SIZE) break;
        if (typeof w === 'string' && w.length >= 3 && w.length <= 15) {
          existingAlbum.add(w.toUpperCase());
        }
      }
      wordAlbumUpdate = Array.from(existingAlbum);
    }

    // Update progression in database
    const updatePayload: Record<string, unknown> = {
      player_level: newPlayerLevel,
      xp: newTotalXp,
      total_stars: newTotalStars,
      gold: newGold,
      // Only advance the high-water mark if the completed level is truly beyond
      // the current frontier. Comparing world-then-level avoids the bug where
      // replaying an earlier world's high level corrupts current_level.
      ...(() => {
        const curW = existingProgression?.current_world ?? 1;
        const curL = existingProgression?.current_level ?? 1;
        const isAdvance = nextWorld > curW || (nextWorld === curW && nextLevel > curL);
        return { current_world: isAdvance ? nextWorld : curW, current_level: isAdvance ? nextLevel : curL };
      })(),
      updated_at: new Date().toISOString(),
    };

    if (wordAlbumUpdate) {
      updatePayload.word_album = wordAlbumUpdate;
    }

    // Optimistic lock: only update if gold AND total_stars haven't changed since we read them.
    // Locking on gold prevents doubling gold rewards; locking on total_stars prevents
    // concurrent level completions from writing stale star counts (Bug H5).
    let { data: updatedRow, error: updateError } = await supabase
      .from('player_progression')
      .update(updatePayload)
      .eq('user_id', userId)
      .eq('gold', currentGold)
      .eq('total_stars', currentTotalStars)
      .select()
      .maybeSingle();

    // If gold column doesn't exist yet (migration pending), retry without gold lock
    if (updateError && (updateError.code === 'PGRST204' || updateError.message?.includes('gold'))) {
      console.warn('[ADVENTURE COMPLETE API] gold column not found, retrying without gold');
      delete updatePayload.gold;
      const { error: retryError } = await supabase
        .from('player_progression')
        .update(updatePayload)
        .eq('user_id', userId);
      if (retryError) {
        console.error('[ADVENTURE COMPLETE API] Progression update error:', retryError);
        return NextResponse.json({ error: 'Failed to update progression' }, { status: 500 });
      }
    } else if (updateError) {
      console.error('[ADVENTURE COMPLETE API] Progression update error:', updateError);
      return NextResponse.json({ error: 'Failed to update progression' }, { status: 500 });
    } else if (!updatedRow) {
      // Optimistic lock conflict: gold or total_stars changed by a concurrent request.
      // Re-read fresh state and recalculate before retrying with a new lock.
      const { data: freshProg } = await supabase
        .from('player_progression')
        .select('gold, total_stars, upgrades')
        .eq('user_id', userId)
        .single();
      if (freshProg) {
        // Recalculate gold with fresh upgrade state to avoid stale bonus
        const freshUpgrades = (freshProg.upgrades as UpgradeState) ?? {};
        const freshCargoBay = getUpgradeEffect(freshUpgrades, 'cargoBay') || 0;
        const freshLongWordBonus = clampedLongWords * freshCargoBay;
        let freshGoldEarned = baseGold + perfectClearGoldBonus + freshLongWordBonus;
        const freshPickaxe = getUpgradeEffect(freshUpgrades, 'luckyPickaxe') || 0;
        if (freshPickaxe > 0) {
          freshGoldEarned = Math.round(freshGoldEarned + baseGold * freshPickaxe);
        }
        // Lucky Pickaxe T4: double gold on first-ever completion
        if (isFirstCompletion && getUpgradeTier(freshUpgrades, 'luckyPickaxe') >= 4) {
          freshGoldEarned = freshGoldEarned * 2;
        }
        freshGoldEarned = Math.min(freshGoldEarned, MAX_GOLD_PER_LEVEL);
        const freshGold = (freshProg.gold as number);
        const freshTotalStars = (freshProg.total_stars as number);
        updatePayload.gold = freshGold + freshGoldEarned;
        updatePayload.total_stars = freshTotalStars + starsGained;
        const { data: retryRow, error: retryError } = await supabase
          .from('player_progression')
          .update(updatePayload)
          .eq('user_id', userId)
          .eq('gold', freshGold)
          .eq('total_stars', freshTotalStars)
          .select()
          .maybeSingle();
        if (retryError || !retryRow) {
          console.error('[ADVENTURE COMPLETE API] Optimistic lock retry failed:', retryError);
          return NextResponse.json(
            { error: 'Concurrent modification detected — please retry' },
            { status: 409 }
          );
        }
        updatedRow = retryRow;
      } else {
        return NextResponse.json(
          { error: 'Concurrent modification detected — please retry' },
          { status: 409 }
        );
      }
    }

    // Update last_game_at on the main profiles table (fire-and-forget)
    void supabase
      .from('profiles')
      .update({ last_game_at: new Date().toISOString() })
      .eq('id', userId);

    // Sync XP to main profiles table so adventure play contributes to overall level.
    // Without this, adventure XP stays siloed in player_progression and the main
    // profile level never advances for adventure-only players.
    if (xpEarned > 0) {
      // Fire-and-forget with one retry: sync adventure XP to main profile
      (async () => {
        let { error: xpSyncError } = await supabase.rpc('increment_player_xp', {
          p_player_id: userId,
          p_xp_amount: xpEarned,
        });
        if (xpSyncError) {
          console.warn('[ADVENTURE COMPLETE API] XP sync failed, retrying:', xpSyncError.message);
          await new Promise(r => setTimeout(r, 500));
          ({ error: xpSyncError } = await supabase.rpc('increment_player_xp', {
            p_player_id: userId,
            p_xp_amount: xpEarned,
          }));
          if (xpSyncError) {
            console.error('[ADVENTURE COMPLETE API] XP sync retry also failed:', xpSyncError);
          }
        }
      })().catch((err) => {
        console.error('[ADVENTURE COMPLETE API] XP sync error:', err);
      });
    }

    // Check for level up
    const previousLevel = existingProgression?.player_level ?? 1;
    const leveledUp = newPlayerLevel > previousLevel;

    // Mark daily mission as complete (runs after response is sent)
    after(async () => {
      try {
        await lazyCompleteMission(userId, 'adventure');
      } catch (err) {
        console.error('[ADVENTURE COMPLETE API] Daily mission update failed:', err);
      }
    });

    // Update weekly quest progress (runs after response is sent)
    const questStats: GameStats = {
      gamesPlayed: 1,
      wordsFound: words,
      longWordsFound: validation.data.longWords ?? 0,
      maxScore: score,
    };
    after(async () => {
      try {
        await updateWeeklyQuestProgress(supabase, userId, questStats);
      } catch (err) {
        console.error('[ADVENTURE COMPLETE API] Weekly quest update failed:', err);
      }
    });

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
      isReplay,
      starsGained,
      progression: {
        playerLevel: newPlayerLevel,
        xp: newTotalXp,
        totalStars: newTotalStars,
        gold: newGold,
        upgrades: existingProgression?.upgrades ?? {},
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

/**
 * Update weekly quest progress and grant avatar part on completion.
 * Standalone function using the passed Supabase client.
 */
 
async function updateWeeklyQuestProgress(
  supabase: any,
  userId: string,
  stats: GameStats,
): Promise<void> {
  const weekStart = getWeekStart();

  // Fetch active quest
  const { data: quest, error: fetchErr } = await supabase
    .from('weekly_quests')
    .select('id, quest_type, current_progress, requirements, completed, week_start')
    .eq('player_id', userId)
    .eq('week_start', weekStart)
    .single();

  if (fetchErr || !quest || quest.completed) return;

  const reqs = typeof quest.requirements === 'string'
    ? JSON.parse(quest.requirements)
    : quest.requirements;
  const prog = typeof quest.current_progress === 'string'
    ? JSON.parse(quest.current_progress)
    : quest.current_progress;

  const currentVal = prog?.current ?? 0;
  const target = reqs?.target ?? 0;
  const delta = getStatDelta(quest.quest_type, stats);
  if (delta <= 0) return;

  const newCurrent = Math.min(currentVal + delta, target);
  const completed = newCurrent >= target;

  const updatePayload: Record<string, unknown> = {
    current_progress: JSON.stringify({ current: newCurrent }),
    completed,
  };
  if (completed) {
    updatePayload.completed_at = new Date().toISOString();
  }

  await supabase
    .from('weekly_quests')
    .update(updatePayload)
    .eq('id', quest.id);

  // Grant avatar part on completion
  if (completed) {
    const difficulty = getDifficultyFromType(quest.quest_type);
    const weekNum = getWeekNumber(quest.week_start);
    const reward = pickAvatarReward(difficulty, weekNum);
    const partKey = `${reward.category}:${reward.partId}`;

    // Add to premium_avatar_parts if not already unlocked
    const { data: profile } = await supabase
      .from('profiles')
      .select('premium_avatar_parts')
      .eq('id', userId)
      .single();

    const existing: string[] = (profile?.premium_avatar_parts as string[]) ?? [];
    if (!existing.includes(partKey)) {
      await supabase
        .from('profiles')
        .update({ premium_avatar_parts: [...existing, partKey] })
        .eq('id', userId);
    }
  }
}
