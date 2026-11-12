/**
 * Singleplayer Game Stats Recording API
 *
 * POST - Record a singleplayer game result and award XP to the player's profile.
 * Previously, singleplayer stats only went to localStorage — this route
 * ensures XP and stats reach Supabase so players actually level up.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import { calculateGameXp, getLevelFromXp, checkLevelUp, getTitleForLevel } from '@/backend/modules/xpManager';
import { grantPlayerXp, scaleBreakdown } from '@/backend/modules/xpGrant';
import { checkLifetimeAchievements, type UserStats } from '@/backend/modules/achievementManager';
import { isDailyMode, awardsLeaderboardPoints, leaderboardPointsForGame } from '@/backend/modules/leaderboardScoring';
import { captureApiError } from '@/utils/sentry';
import { getSupabaseAdmin } from '@/lib/email';
import { recordPersonalBest } from '@/backend/modules/achievements/grantAchievements';

interface RecordGameRequest {
  score: number;
  wordCount: number;
  longestWord?: string;
  timePlayed?: number;
  achievementCount?: number;
  mode: string;
  maxCombo?: number;
  isDailyChallenge?: boolean;
  longWordsFound?: number;
}

function validateBody(body: Record<string, unknown>): {
  valid: boolean;
  error?: string;
  data?: RecordGameRequest;
} {
  const { score, wordCount, longestWord, timePlayed, achievementCount, mode, maxCombo, isDailyChallenge, longWordsFound } = body;

  if (typeof score !== 'number' || typeof wordCount !== 'number') {
    return { valid: false, error: 'Missing required fields: score, wordCount' };
  }

  if (score < 0 || wordCount < 0) {
    return { valid: false, error: 'score and wordCount must be non-negative' };
  }

  // Cap score to prevent abuse (max plausible singleplayer score)
  const MAX_SCORE = 10000;
  const cappedScore = Math.min(score, MAX_SCORE);

  return {
    valid: true,
    data: {
      score: cappedScore,
      wordCount: Math.min(wordCount, 200),
      longestWord: typeof longestWord === 'string' ? longestWord.slice(0, 20) : undefined,
      timePlayed: typeof timePlayed === 'number' ? Math.min(Math.max(timePlayed, 0), 600) : undefined,
      achievementCount: typeof achievementCount === 'number' ? Math.min(Math.max(achievementCount, 0), 20) : 0,
      mode: typeof mode === 'string' ? mode : 'solo-bots',
      maxCombo: typeof maxCombo === 'number' ? Math.min(Math.max(maxCombo, 0), 100) : 0,
      isDailyChallenge: isDailyChallenge === true,
      longWordsFound: typeof longWordsFound === 'number' ? Math.min(Math.max(longWordsFound, 0), 200) : 0,
    },
  };
}

export async function POST(request: NextRequest) {
  const rateLimitResult = checkApiRateLimit(request, 'stats-record-game', {
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter ?? 60) } }
    );
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = validateBody(body);
    if (!validation.valid || !validation.data) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { score, wordCount, longestWord, timePlayed, achievementCount, mode, maxCombo, isDailyChallenge, longWordsFound } = validation.data;
    const userId = user.id;
    let questUpdate: { completed: boolean; questType: string; xpReward: number; description: string } | null = null;

    // Daily challenge competitive stats are owned by the validated, idempotent
    // /api/daily-challenge/word-hunt/submit route — recording total_score /
    // total_games / unique_days here too would DOUBLE-COUNT them. So for daily we
    // skip the stat increments and only award XP / quests / achievements (which
    // submit does not). Feature-gated modes award nothing.
    const isDaily = isDailyMode(mode) || isDailyChallenge === true;
    const eligibleForAward = awardsLeaderboardPoints(mode);

    // Calculate XP (singleplayer = no win bonus, playerCount=1)
    const xpResult = eligibleForAward
      ? calculateGameXp({
          score,
          isWinner: false,
          achievementCount: achievementCount ?? 0,
          playerCount: 1,
        })
      : { totalXp: 0, breakdown: {} as ReturnType<typeof calculateGameXp>['breakdown'] };

    // Fetch current profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('total_games, total_score, total_words, total_time_played, total_xp, current_level, player_title, longest_word, longest_word_length, last_game_at, unique_days_played, achievement_counts')
      .eq('id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    // Build stat updates. The competitive leaderboard contribution is
    // down-weighted per mode (casual single-player counts far less than the
    // Daily Challenge) so the leaderboard is driven mostly by daily play.
    // Daily games skip stat increments entirely (owned by the submit route).
    const updates: Record<string, unknown> = {
      last_game_at: new Date().toISOString(),
    };

    if (!isDaily) {
      updates.total_games = (profile?.total_games || 0) + 1;
      updates.total_score = (profile?.total_score || 0) + leaderboardPointsForGame(mode, score);
      updates.total_words = (profile?.total_words || 0) + wordCount;
      updates.casual_games = (profile?.total_games || 0) + 1; // singleplayer counts as casual

      if (timePlayed) {
        updates.total_time_played = (profile?.total_time_played || 0) + timePlayed;
      }

      // Track longest word
      if (longestWord && longestWord.length > (profile?.longest_word_length || 0)) {
        updates.longest_word = longestWord;
        updates.longest_word_length = longestWord.length;
      }

      // Track unique days played
      const today = new Date().toISOString().split('T')[0];
      const lastGameDate = profile?.last_game_at
        ? new Date(profile.last_game_at).toISOString().split('T')[0]
        : null;
      if (lastGameDate !== today) {
        updates.unique_days_played = (profile?.unique_days_played || 0) + 1;
      }
    }

    // Update profile stats
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (updateError) {
      console.error('[STATS RECORD-GAME] Profile update error:', updateError);
      return NextResponse.json({ error: 'Failed to update stats' }, { status: 500 });
    }

    // increment_player_xp applies prestige, diminishing returns and the daily cap.
    const gameGrant = await grantPlayerXp(supabase, userId, xpResult.totalXp);
    const profileLevel = profile?.current_level || getLevelFromXp(profile?.total_xp || 0);
    let oldLevel = gameGrant?.oldLevel ?? profileLevel;
    let newTotalXp = gameGrant?.newTotalXp ?? (profile?.total_xp || 0);
    let newLevel = gameGrant?.newLevel ?? oldLevel;
    const actualXpGranted = gameGrant?.xpEarned ?? 0;

    // Check lifetime achievements based on UPDATED stats. SP never had a
    // grant path before, so VETERAN/CENTURION/WORD_COLLECTOR/etc. were
    // silent for solo players. gamesWon-gated ones (FIRST_GAME_WIN /
    // CHAMPION / LEGEND) won't fire here since SP is non-competitive.
    let newLifetimeAchievements: { key: string; icon: string }[] = [];
    try {
      const profileAchievementCounts = (profile?.achievement_counts || {}) as Record<string, number>;
      // For daily games these `updates.*` fields are intentionally absent (the
      // submit route owns daily stats), so fall back to the current profile.
      const userStats: UserStats = {
        gamesPlayed: (updates.total_games as number | undefined) ?? profile?.total_games ?? 0,
        totalWordsFound: (updates.total_words as number | undefined) ?? profile?.total_words ?? 0,
        totalScore: (updates.total_score as number | undefined) ?? profile?.total_score ?? 0,
        uniqueDaysPlayed: (updates.unique_days_played as number | undefined) ?? profile?.unique_days_played ?? 0,
        currentLevel: newLevel,
      };
      newLifetimeAchievements = checkLifetimeAchievements(
        userStats,
        Object.keys(profileAchievementCounts),
      );

      if (newLifetimeAchievements.length > 0) {
        const updatedCounts = { ...profileAchievementCounts };
        for (const achievement of newLifetimeAchievements) {
          updatedCounts[achievement.key] = (updatedCounts[achievement.key] || 0) + 1;
        }
        await supabase
          .from('profiles')
          .update({ achievement_counts: updatedCounts })
          .eq('id', userId);
      }
    } catch (err) {
      console.error('[STATS RECORD-GAME] Lifetime achievement check failed:', err);
    }

    // After the lifetime block: it rewrites achievement_counts from the snapshot read at the start.
    if (updates.longest_word && (profile?.longest_word_length || 0) > 0) {
      await recordPersonalBest(getSupabaseAdmin(), userId);
    }

    // Update weekly quest progress for singleplayer games
    try {
      const { updateQuestProgress } = await import('@/backend/modules/weeklyQuestManager');
      const questResult = await updateQuestProgress(userId, {
        gamesPlayed: 1,
        wordsFound: wordCount,
        wordsInSession: wordCount,
        longWordsFound: longWordsFound ?? 0,
        maxCombo: maxCombo ?? 0,
        maxScore: score,
        dailyChallengesCompleted: isDailyChallenge ? 1 : 0,
      });
      const questGrant = questResult?.xpGrant;
      if (questGrant) {
        if (!gameGrant) oldLevel = questGrant.oldLevel;
        newTotalXp = questGrant.newTotalXp;
        newLevel = Math.max(newLevel, questGrant.newLevel);
      }
      if (questResult?.completed) {
        questUpdate = {
          completed: true,
          questType: questResult.questType,
          xpReward: questResult.xpReward,
          description: questResult.description,
        };
      }
    } catch {
      // Non-critical — don't fail the response
    }

    const levelUpInfo = checkLevelUp(oldLevel, newLevel);
    if (levelUpInfo.leveledUp) {
      const newTitle = getTitleForLevel(newLevel);
      if (newTitle && newTitle !== profile?.player_title) {
        await supabase
          .from('profiles')
          .update({ player_title: newTitle })
          .eq('id', userId);
      }
    }

    return NextResponse.json({
      success: true,
      xpEarned: actualXpGranted,
      xpBreakdown: scaleBreakdown(xpResult.breakdown, actualXpGranted),
      newTotalXp,
      oldLevel,
      newLevel,
      leveledUp: levelUpInfo.leveledUp,
      ...(newLifetimeAchievements.length > 0 ? { lifetimeAchievements: newLifetimeAchievements } : {}),
      ...(questUpdate ? { questUpdate } : {}),
    });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/stats/record-game', { method: 'POST' });
    console.error('[STATS RECORD-GAME] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
