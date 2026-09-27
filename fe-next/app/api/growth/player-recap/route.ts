/**
 * Player Recap API
 *
 * GET — Weekly or monthly recap for the authenticated user
 *       Query params: period=weekly|monthly
 *       Returns pre-computed recap if available, otherwise computes on the fly
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';

function getSupabaseAdmin() {
  return createAdminClient()!;
}

function getDateRange(period: string): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString();

  if (period === 'monthly') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: start.toISOString(), end };
  }

  // Default: weekly (last 7 days)
  const start = new Date(now);
  start.setDate(start.getDate() - 7);
  return { start: start.toISOString(), end };
}

interface RecapStats {
  period: string;
  startDate: string;
  endDate: string;
  totalGames: number;
  totalScore: number;
  averageScore: number;
  bestScore: number;
  totalWordsFound: number;
  longestWord: string;
  favoriteGameMode: string | null;
  winRate: number;
  gamesPerDay: number;
}

/**
 * GET /api/growth/player-recap?period=weekly|monthly
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') ?? 'weekly';

    if (period !== 'weekly' && period !== 'monthly') {
      return NextResponse.json(
        { error: 'period must be "weekly" or "monthly"' },
        { status: 400 }
      );
    }

    // Check for pre-computed recap
    const { data: cached } = await getSupabaseAdmin()
      .from('player_recaps')
      .select('*')
      .eq('player_id', user.id)
      .eq('period', period)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (cached) {
      return NextResponse.json({ recap: cached, source: 'cached' });
    }

    // Compute on the fly from game_results
    const { start, end } = getDateRange(period);

    const { data: results, error: resultsErr } = await getSupabaseAdmin()
      .from('game_results')
      .select('score, words_found, game_mode, is_win, created_at')
      .eq('player_id', user.id)
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: false })
      .limit(500);

    if (resultsErr) {
      console.error('[API] player-recap GET error:', resultsErr.message);
      return NextResponse.json({ error: 'Failed to fetch game results' }, { status: 500 });
    }

    const games = results ?? [];
    const totalGames = games.length;

    if (totalGames === 0) {
      const emptyRecap: RecapStats = {
        period,
        startDate: start,
        endDate: end,
        totalGames: 0,
        totalScore: 0,
        averageScore: 0,
        bestScore: 0,
        totalWordsFound: 0,
        longestWord: '',
        favoriteGameMode: null,
        winRate: 0,
        gamesPerDay: 0,
      };
      return NextResponse.json({ recap: emptyRecap, source: 'computed' });
    }

    const totalScore = games.reduce((sum, g) => sum + (g.score ?? 0), 0);
    const bestScore = Math.max(...games.map((g) => g.score ?? 0));
    const wins = games.filter((g) => g.is_win).length;

    // Flatten all words found
    const allWords: string[] = games.flatMap((g) =>
      Array.isArray(g.words_found) ? g.words_found : []
    );
    const longestWord = allWords.reduce(
      (longest, w) => (w.length > longest.length ? w : longest),
      ''
    );

    // Favorite game mode
    const modeCounts: Record<string, number> = {};
    for (const g of games) {
      if (g.game_mode) {
        modeCounts[g.game_mode] = (modeCounts[g.game_mode] ?? 0) + 1;
      }
    }
    const favoriteGameMode = Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const daysInPeriod = period === 'monthly'
      ? new Date().getDate()
      : 7;

    const recap: RecapStats = {
      period,
      startDate: start,
      endDate: end,
      totalGames,
      totalScore,
      averageScore: Math.round(totalScore / totalGames),
      bestScore,
      totalWordsFound: allWords.length,
      longestWord,
      favoriteGameMode,
      winRate: Math.round((wins / totalGames) * 100),
      gamesPerDay: Math.round((totalGames / daysInPeriod) * 10) / 10,
    };

    return NextResponse.json({ recap, source: 'computed' });
  } catch (error) {
    console.error('[API] player-recap GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
