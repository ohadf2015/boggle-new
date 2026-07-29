/**
 * Pure adventure-completion processor.
 *
 * Extracted from route.ts so both the live HTTP handler and the offline
 * /api/scores/sync route can dispatch the same award pipeline. The route
 * stays a thin wrapper that handles HTTP concerns (rate-limit, auth,
 * body parse + Zod validation) and delegates the post-validation work
 * here.
 *
 * Behavior-preserving against route.ts as of 2026-05-11. If you change
 * this file, the existing route.test.ts MUST still pass.
 */

import { after } from 'next/server';
import { getLevelFromXp } from '@/shared/utils/adventureXpUtils';
import type { UpgradeState } from '@/lib/adventure/upgradeConfig';
import { generateLevelLoot } from '@/lib/adventure/lootGenerator';
import type { GameStats } from '@/shared/weeklyQuestTemplates';
import { loadDictionaryWords } from '@/app/api/word-solver/dictionaryLoader';
import { MIN_TIME_PLAYED_SECONDS, type ValidatedCompletionData } from './validation';
import {
  calcXpEarned,
  calcGoldEarned,
  countLongWords,
  DAILY_GOLD_CAP,
} from './rewards';
import { persistLootToInventory } from './lootInventory';
import { updateWeeklyQuestProgress, type QuestUpdateResult } from './weeklyQuest';

const lazyCompleteMission = async (playerId: string, type: 'adventure') => {
  const { completeMission } = await import('@/backend/modules/dailyMissionsManager');
  return completeMission(playerId, type);
};

// Same supabase shape the route uses (createClient() result). Kept loose
// to avoid coupling on a specific @supabase/supabase-js version generic.
export type SupabaseLike = any;

export interface ProcessAdventureContext {
  supabase: SupabaseLike;
  /** 'live' = real-time online completion. 'offline-sync' = queued via /api/scores/sync. */
  source: 'live' | 'offline-sync';
}

export interface AdventureCompletionBody {
  success: true;
  completion: {
    world: number;
    level: number;
    stars: number;
    bestScore: number;
    bestWords: number;
    completedAt: string;
  };
  xpEarned: number;
  goldEarned: number;
  isReplay: boolean;
  starsGained: number;
  progression: {
    playerLevel: number;
    xp: number;
    totalStars: number;
    gold: number;
    upgrades: UpgradeState;
    currentWorld: number;
    currentLevel: number;
  };
  leveledUp: boolean;
  previousLevel?: number;
  lootDrops: ReturnType<typeof generateLevelLoot>;
  questUpdate?: {
    questType: string;
    xpReward: number;
    description: string;
    completed: true;
  };
}

export type AdventureProcessResult =
  | { ok: true; body: AdventureCompletionBody }
  | { ok: false; status: number; error: string };

export async function processAdventureCompletion(
  data: ValidatedCompletionData,
  userId: string,
  ctx: ProcessAdventureContext,
): Promise<AdventureProcessResult> {
  const { supabase } = ctx;

  // Minimum time-in-level prevents W1L1 speed-replay gold farming. Applies
  // to both live and offline-sync — offline submissions still record real
  // play durations on the client.
  if (data.timePlayed < MIN_TIME_PLAYED_SECONDS) {
    return {
      ok: false,
      status: 400,
      error: `Invalid timePlayed: must be at least ${MIN_TIME_PLAYED_SECONDS} seconds`,
    };
  }

  const { world, level, stars, score, words, retainedScore: _retainedScore } = data;
  void _retainedScore;

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
    return { ok: false, status: 500, error: 'Failed to fetch progression' };
  }

  const playerWorld = existingProgression?.current_world ?? 1;
  const playerLevel = existingProgression?.current_level ?? 1;
  if (!existingCompletion) {
    if (world > playerWorld || (world === playerWorld && level > playerLevel)) {
      return { ok: false, status: 403, error: 'Level not unlocked — cannot skip ahead' };
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
    return { ok: false, status: 500, error: 'Failed to save completion' };
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

  const dictWords = await loadDictionaryWords('en');
  const dictSet = new Set(dictWords.map((w: string) => w.toLowerCase()));
  const validatedWordsFound = Array.isArray(data.wordsFound)
    ? data.wordsFound.filter(
        (w: unknown) => typeof w === 'string' && dictSet.has((w as string).toLowerCase())
      )
    : [];

  const clampedLongWords = countLongWords(validatedWordsFound);
  const flashChallengeCompleted = data.flashChallengeCompleted === true && validatedWordsFound.length > 0;

  let goldEarned = calcGoldEarned({
    stars, world, isReplay, isFirstCompletion, starsGained,
    upgrades: playerUpgrades, clampedLongWords, flashChallengeCompleted,
  });

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

  await supabase
    .from('level_completions')
    .update({ gold_earned: goldEarned })
    .eq('user_id', userId)
    .eq('world', world)
    .eq('level', level);

  const currentGold = (existingProgression?.gold as number) ?? 0;
  const newGold = currentGold + goldEarned;

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

  const MAX_ALBUM_SIZE = 5000;
  let wordAlbumUpdate: string[] | undefined;
  if (words > 0 && Array.isArray(data.wordsFound) && data.wordsFound.length > 0) {
    const { data: albumRow } = await supabase
      .from('player_progression')
      .select('word_album')
      .eq('user_id', userId)
      .single();
    const existingAlbum = new Set<string>(
      ((albumRow?.word_album as string[]) ?? []).map((w: string) => w.toUpperCase())
    );
    for (const w of data.wordsFound) {
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

  let { data: updatedRow, error: updateError } = await supabase
    .from('player_progression')
    .update(updatePayload)
    .eq('user_id', userId)
    .eq('gold', currentGold)
    .eq('total_stars', currentTotalStars)
    .select()
    .maybeSingle();

  if (updateError && (updateError.code === 'PGRST204' || updateError.message?.includes('gold'))) {
    console.warn('[ADVENTURE COMPLETE API] gold column not found, retrying without gold');
    delete updatePayload.gold;
    const { error: retryError } = await supabase
      .from('player_progression')
      .update(updatePayload)
      .eq('user_id', userId);
    if (retryError) {
      console.error('[ADVENTURE COMPLETE API] Progression update error:', retryError);
      return { ok: false, status: 500, error: 'Failed to update progression' };
    }
  } else if (updateError) {
    console.error('[ADVENTURE COMPLETE API] Progression update error:', updateError);
    return { ok: false, status: 500, error: 'Failed to update progression' };
  } else if (!updatedRow) {
    const { data: freshProg } = await supabase
      .from('player_progression')
      .select('gold, total_stars, upgrades')
      .eq('user_id', userId)
      .single();
    if (freshProg) {
      const freshUpgrades = (freshProg.upgrades as UpgradeState) ?? {};
      let freshGoldEarned = calcGoldEarned({
        stars, world, isReplay, isFirstCompletion, starsGained,
        upgrades: freshUpgrades, clampedLongWords, flashChallengeCompleted,
      });
      if (dailyGoldEarned >= DAILY_GOLD_CAP) {
        freshGoldEarned = 0;
      }
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
        return { ok: false, status: 409, error: 'Concurrent modification detected — please retry' };
      }
      updatedRow = retryRow;
    } else {
      return { ok: false, status: 409, error: 'Concurrent modification detected — please retry' };
    }
  }

  void supabase
    .from('profiles')
    .update({ last_game_at: new Date().toISOString() })
    .eq('id', userId);

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

  const body: AdventureCompletionBody = {
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
      upgrades: (existingProgression?.upgrades as UpgradeState) ?? {},
      currentWorld: Math.max(existingProgression?.current_world ?? 1, nextWorld),
      currentLevel: Math.max(existingProgression?.current_level ?? 1, nextLevel),
    },
    leveledUp,
    ...(leveledUp ? { previousLevel } : {}),
    lootDrops,
    ...(questUpdate?.completed
      ? {
          questUpdate: {
            questType: questUpdate.questType,
            xpReward: questUpdate.xpReward,
            description: questUpdate.description,
            completed: true,
          },
        }
      : {}),
  };

  return { ok: true, body };
}
