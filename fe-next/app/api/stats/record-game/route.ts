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
import { captureApiError } from '@/utils/sentry';

interface RecordGameRequest {
  score: number;
  wordCount: number;
  longestWord?: string;
  timePlayed?: number;
  achievementCount?: number;
  mode: string;
}

function validateBody(body: Record<string, unknown>): {
  valid: boolean;
  error?: string;
  data?: RecordGameRequest;
} {
  const { score, wordCount, longestWord, timePlayed, achievementCount, mode } = body;

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

    const { score, wordCount, longestWord, timePlayed, achievementCount } = validation.data;
    const userId = user.id;

    // Calculate XP (singleplayer = no win bonus, playerCount=1)
    const xpResult = calculateGameXp({
      score,
      isWinner: false,
      achievementCount: achievementCount ?? 0,
      playerCount: 1,
    });

    // Fetch current profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('total_games, total_score, total_words, total_time_played, total_xp, current_level, player_title, longest_word, longest_word_length, last_game_at, unique_days_played')
      .eq('id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    // Build stat updates
    const updates: Record<string, unknown> = {
      total_games: (profile?.total_games || 0) + 1,
      total_score: (profile?.total_score || 0) + score,
      total_words: (profile?.total_words || 0) + wordCount,
      casual_games: (profile?.total_games || 0) + 1, // singleplayer counts as casual
      last_game_at: new Date().toISOString(),
    };

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

    // Update profile stats
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (updateError) {
      console.error('[STATS RECORD-GAME] Profile update error:', updateError);
      return NextResponse.json({ error: 'Failed to update stats' }, { status: 500 });
    }

    // Increment XP via RPC (applies prestige multiplier)
    let newTotalXp = (profile?.total_xp || 0) + xpResult.totalXp;
    let newLevel = getLevelFromXp(newTotalXp);
    let actualXpGranted = xpResult.totalXp;

    if (xpResult.totalXp > 0) {
      const { data: xpData, error: xpError } = await supabase
        .rpc('increment_player_xp', {
          p_player_id: userId,
          p_xp_amount: xpResult.totalXp,
        });

      if (xpError) {
        console.error('[STATS RECORD-GAME] XP increment error:', xpError);
        // Stats saved, XP failed — still return partial success
      } else if (xpData && (xpData as unknown[]).length > 0) {
        const xpRow = (xpData as Record<string, unknown>[])[0];
        newTotalXp = Number(xpRow.new_total_xp);
        newLevel = xpRow.new_level as number;
        actualXpGranted = xpRow.xp_granted as number;
      }
    }

    // Check for level up and update title
    const oldLevel = profile?.current_level || getLevelFromXp(profile?.total_xp || 0);
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
      xpBreakdown: xpResult.breakdown,
      newTotalXp,
      newLevel,
      leveledUp: levelUpInfo.leveledUp,
    });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/stats/record-game', { method: 'POST' });
    console.error('[STATS RECORD-GAME] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
