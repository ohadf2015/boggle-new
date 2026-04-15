/**
 * Adventure Level Completion API — POST handler.
 *
 * Orchestrates: auth → validate → fetch progression + existing completion →
 * upsert level_completions → compute XP + gold → daily gold cap →
 * word album validation → progression update (with optimistic lock retry) →
 * fire-and-forget (XP sync, last_game_at, daily mission, loot inventory) →
 * inline weekly quest update → build response.
 *
 * Pure math + per-concern helpers live in sibling files to keep this under 500 lines:
 *   - ./validation.ts    request body parsing
 *   - ./rewards.ts       XP + gold math
 *   - ./lootInventory.ts loot drop persistence
 *   - ./weeklyQuest.ts   weekly quest progress
 */

import { after, NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import { getLevelFromXp } from '@/shared/utils/adventureXpUtils';
import type { UpgradeState } from '@/lib/adventure/upgradeConfig';
import { generateLevelLoot } from '@/lib/adventure/lootGenerator';
import { captureApiError } from '@/utils/sentry';
import type { GameStats } from '@/shared/weeklyQuestTemplates';
import { loadDictionaryWords } from '@/app/api/word-solver/dictionaryLoader';
import { validateRequestBody, MIN_TIME_PLAYED_SECONDS } from './validation';
import {
  calcXpEarned,
  calcGoldEarned,
  countLongWords,
  DAILY_GOLD_CAP,
} from './rewards';
import { persistLootToInventory } from './lootInventory';
import { updateWeeklyQuestProgress, type QuestUpdateResult } from './weeklyQuest';

// Dynamic import keeps Turbopack from pulling backend logger (Node-only APIs)
// into the edge/Next runtime bundle.
const lazyCompleteMission = async (playerId: string, type: 'adventure') => {
  const { completeMission } = await import('@/backend/modules/dailyMissionsManager');
  return completeMission(playerId, type);
};

export async function POST(request: NextRequest) {
  // 20 requests/min — early worlds are fast so players need headroom.
  const rateLimitResult = checkApiRateLimit(request, 'adventure-complete', {
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (!rateLimitResult.success) {
    const retryAfter = rateLimitResult.retryAfter ?? 60;
    return NextResponse.json(
      { success: false, error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = user.id;

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

    const { world, level, stars, score, words, retainedScore: _retainedScore } = validation.data;

    // Minimum time-in-level prevents W1L1 speed-replay gold farming.
    const timePlayed = validation.data.timePlayed;
    if (typeof timePlayed === 'number' && timePlayed < MIN_TIME_PLAYED_SECONDS) {
      return NextResponse.json(
        { error: `Invalid timePlayed: must be at least ${MIN_TIME_PLAYED_SECONDS} seconds` },
        { status: 400 }
      );
    }

    // TODO: persist retainedScore once retry scoring schema exists
    void _retainedScore;

    // Fetch progression + existing completion in parallel
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

    if (progressionError && progressionError.code === 'PGRST116') {
      // Idempotent create — safe on concurrent requests and retries
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
      }
      existingProgression = { xp: 0, total_stars: 0, current_world: 1, current_level: 1, player_level: 1, upgrades: {}, gold: 0 } as typeof existingProgression;
    } else if (progressionError) {
      console.error('[ADVENTURE COMPLETE API] Progression fetch error:', progressionError);
      return NextResponse.json({ error: 'Failed to fetch progression' }, { status: 500 });
    }

    // Security: reject skip-ahead for levels never previously completed
    const playerWorld = existingProgression?.current_world ?? 1;
    const playerLevel = existingProgression?.current_level ?? 1;
    if (!existingCompletion) {
      if (world > playerWorld || (world === playerWorld && level > playerLevel)) {
        return NextResponse.json({ error: 'Level not unlocked — cannot skip ahead' }, { status: 403 });
      }
    }

    const previousStars = existingCompletion?.stars ?? 0;
    const previousBestScore = existingCompletion?.best_score ?? 0;
    const previousBestWords = existingCompletion?.best_words ?? 0;

    const newStars = Math.max(stars, previousStars);
    const newBestScore = Math.max(score, previousBestScore);
    const newBestWords = Math.max(words, previousBestWords);
    const starsGained = Math.max(0, newStars - previousStars);

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

    if (completionError || !completion) {
      console.error('[ADVENTURE COMPLETE API] Completion upsert error:', completionError);
      return NextResponse.json({ error: 'Failed to save completion' }, { status: 500 });
    }

    const isFirstCompletion = !existingCompletion;
    const isReplay = !!existingCompletion;
    const xpEarned = calcXpEarned({ isFirstCompletion, stars, starsGained });

    const currentXp = existingProgression?.xp ?? 0;
    const currentTotalStars = existingProgression?.total_stars ?? 0;
    const newTotalXp = currentXp + xpEarned;
    const newTotalStars = currentTotalStars + starsGained;
    const newPlayerLevel = getLevelFromXp(newTotalXp);

    const playerUpgrades = (existingProgression?.upgrades as UpgradeState) ?? {};
    const clampedLongWords = countLongWords(validation.data.wordsFound);
    const flashChallengeCompleted = validation.data.flashChallengeCompleted === true;

    let goldEarned = calcGoldEarned({
      stars, world, isReplay, isFirstCompletion, starsGained,
      upgrades: playerUpgrades, clampedLongWords, flashChallengeCompleted,
    });

    // Daily gold cap — prevents W1L1 replay farming
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: dailyGoldRow } = await supabase
      .from('level_completions')
      .select('gold_earned')
      .eq('user_id', userId)
      .gte('completed_at', todayStart.toISOString());
    const dailyGoldEarned = Array.isArray(dailyGoldRow)
      ? dailyGoldRow.reduce((sum: number, row: { gold_earned?: number }) => sum + (row.gold_earned ?? 0), 0)
      : 0;
    if (dailyGoldEarned >= DAILY_GOLD_CAP) {
      goldEarned = 0;
    }

    const currentGold = (existingProgression?.gold as number) ?? 0;
    const newGold = currentGold + goldEarned;

    // Next unlocked level (story mode only — endless doesn't advance story)
    let nextWorld = existingProgression?.current_world ?? 1;
    let nextLevel = existingProgression?.current_level ?? 1;
    if (world !== 0) {
      nextWorld = world;
      nextLevel = level + 1;
      if (nextLevel > 7) {
        nextWorld = world + 1;
        nextLevel = 1;
      }
      if (nextWorld > 10) {
        nextWorld = 10;
        nextLevel = 7;
      }
    }

    // Word album — validate each word against dictionary to prevent client inflation
    const MAX_ALBUM_SIZE = 5000;
    let wordAlbumUpdate: string[] | undefined;
    if (words > 0 && Array.isArray(validation.data.wordsFound) && validation.data.wordsFound.length > 0) {
      const dictWords = await loadDictionaryWords('en');
      const dictSet = new Set(dictWords.map((w: string) => w.toLowerCase()));

      const { data: albumRow } = await supabase
        .from('player_progression')
        .select('word_album')
        .eq('user_id', userId)
        .single();
      const existingAlbum = new Set<string>(
        ((albumRow?.word_album as string[]) ?? []).map((w: string) => w.toUpperCase())
      );
      for (const w of validation.data.wordsFound) {
        if (existingAlbum.size >= MAX_ALBUM_SIZE) break;
        if (typeof w === 'string' && w.length >= 3 && w.length <= 15 && dictSet.has(w.toLowerCase())) {
          existingAlbum.add(w.toUpperCase());
        }
      }
      wordAlbumUpdate = Array.from(existingAlbum);
    }

    const updatePayload: Record<string, unknown> = {
      player_level: newPlayerLevel,
      xp: newTotalXp,
      total_stars: newTotalStars,
      gold: newGold,
      // Only advance the high-water mark when the completed level is truly
      // beyond the current frontier — replaying an earlier world must not
      // corrupt current_level.
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

    // Optimistic lock on gold + total_stars: prevents concurrent completions
    // from double-rewarding or clobbering star counts (Bug H5).
    let { data: updatedRow, error: updateError } = await supabase
      .from('player_progression')
      .update(updatePayload)
      .eq('user_id', userId)
      .eq('gold', currentGold)
      .eq('total_stars', currentTotalStars)
      .select()
      .maybeSingle();

    // Legacy fallback: schema without gold column yet
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
      // Lock conflict — re-read, recompute gold with fresh upgrades, retry
      const { data: freshProg } = await supabase
        .from('player_progression')
        .select('gold, total_stars, upgrades')
        .eq('user_id', userId)
        .single();
      if (freshProg) {
        const freshUpgrades = (freshProg.upgrades as UpgradeState) ?? {};
        const freshGoldEarned = calcGoldEarned({
          stars, world, isReplay, isFirstCompletion, starsGained,
          upgrades: freshUpgrades, clampedLongWords, flashChallengeCompleted,
        });
        const freshGold = freshProg.gold as number;
        const freshTotalStars = freshProg.total_stars as number;
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

    // Fire-and-forget: last_game_at bump on profiles
    void supabase
      .from('profiles')
      .update({ last_game_at: new Date().toISOString() })
      .eq('id', userId);

    // Fire-and-forget: sync XP to main profiles table so adventure play
    // contributes to overall level. Without this, adventure XP stays siloed.
    if (xpEarned > 0) {
      (async () => {
        let { error: xpSyncError } = await supabase.rpc('increment_player_xp', {
          p_player_id: userId,
          p_xp_amount: xpEarned,
        });
        if (xpSyncError) {
          console.warn('[ADVENTURE COMPLETE API] XP sync failed, retrying:', xpSyncError.message);
          await new Promise((r) => setTimeout(r, 500));
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

    const previousLevel = existingProgression?.player_level ?? 1;
    const leveledUp = newPlayerLevel > previousLevel;

    after(async () => {
      try {
        await lazyCompleteMission(userId, 'adventure');
      } catch (err) {
        console.error('[ADVENTURE COMPLETE API] Daily mission update failed:', err);
      }
    });

    const lootDrops = generateLevelLoot({
      world, level,
      stars: stars as 0 | 1 | 2 | 3,
      score, isFirstCompletion,
      isBossLevel: level === 7,
    });
    after(async () => {
      await persistLootToInventory(supabase, userId, world, level, lootDrops);
    });

    // Weekly quest runs inline so completion surfaces in the response
    const questStats: GameStats = {
      gamesPlayed: 1,
      wordsFound: words,
      longWordsFound: clampedLongWords,
      maxScore: score,
    };
    let questUpdate: QuestUpdateResult | null = null;
    try {
      questUpdate = await updateWeeklyQuestProgress(supabase, userId, questStats);
    } catch (err) {
      console.error('[ADVENTURE COMPLETE API] Weekly quest update failed:', err);
    }

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
      lootDrops,
      ...(questUpdate?.completed ? { questUpdate: { questType: questUpdate.questType, xpReward: questUpdate.xpReward, description: questUpdate.description, completed: true } } : {}),
    });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/adventure/complete', { method: 'POST' });
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[ADVENTURE COMPLETE API] Error:', errorMessage);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
