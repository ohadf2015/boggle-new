/**
 * Ranked ELO Rating API
 *
 * GET  /api/ranked — Get current user's rating + leaderboard top 50
 * POST /api/ranked/match — Submit match result (called by backend after game)
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getRankTier, DEFAULT_RATING, DEFAULT_RD } from '@/shared/utils/eloRating';
import { captureApiError } from '@/utils/sentry';

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

/**
 * GET /api/ranked — Get current user's rating + leaderboard top 50
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = checkApiRateLimit(request, 'ranked-get', {
      maxRequests: 30,
      windowMs: 60_000,
    });
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const config = getSupabaseConfig();
    if (!config) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const serviceClient = createServiceClient(config.url, config.key);

    // Get authenticated user (optional - leaderboard is public)
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    // Phase 1: Fetch leaderboard and user rating in parallel
    const [leaderboardResult, userRatingResult] = await Promise.all([
      serviceClient
        .from('player_ratings')
        .select(`
          user_id,
          rating,
          rating_deviation,
          games_played,
          wins,
          losses,
          peak_rating
        `)
        .order('rating', { ascending: false })
        .limit(50),
      user
        ? serviceClient.from('player_ratings').select('*').eq('user_id', user.id).single()
        : Promise.resolve({ data: null, error: null }),
    ]);

    const { data: leaderboard, error: leaderboardError } = leaderboardResult;

    if (leaderboardError) {
      captureApiError(leaderboardError, 'ranked-leaderboard');
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }

    // Phase 2: Fetch profiles and rank count in parallel (both depend on phase 1)
    const userIds = (leaderboard || []).map(r => r.user_id);
    const userRating = userRatingResult.data;

    const [profilesResult, rankResult] = await Promise.all([
      userIds.length > 0
        ? serviceClient
            .from('profiles')
            .select('id, username, display_name, avatar_image, avatar_emoji, avatar_color')
            .in('id', userIds)
        : Promise.resolve({ data: [] as Array<{ id: string; username: string; display_name: string; avatar_image: string; avatar_emoji: string; avatar_color: string }> }),
      userRating
        ? serviceClient
            .from('player_ratings')
            .select('id', { count: 'exact', head: true })
            .gt('rating', userRating.rating)
        : Promise.resolve({ count: null }),
    ]);

    const profileMap = new Map((profilesResult.data || []).map(p => [p.id, p]));

    const enrichedLeaderboard = (leaderboard || []).map((entry, index) => {
      const profile = profileMap.get(entry.user_id);
      const tier = getRankTier(entry.rating);
      return {
        rank: index + 1,
        userId: entry.user_id,
        username: profile?.username || 'Unknown',
        displayName: profile?.display_name || profile?.username || 'Unknown',
        avatarImage: profile?.avatar_image || null,
        avatarEmoji: profile?.avatar_emoji || null,
        avatarColor: profile?.avatar_color || null,
        rating: entry.rating,
        peakRating: entry.peak_rating,
        gamesPlayed: entry.games_played,
        wins: entry.wins,
        losses: entry.losses,
        winRate: entry.games_played > 0
          ? Math.round((entry.wins / entry.games_played) * 100)
          : 0,
        tier: tier.name,
        tierColor: tier.color,
      };
    });

    // Build current user's rating response
    let myRating = null;
    if (user) {
      if (userRating) {
        const tier = getRankTier(userRating.rating);
        myRating = {
          rating: userRating.rating,
          ratingDeviation: userRating.rating_deviation,
          gamesPlayed: userRating.games_played,
          wins: userRating.wins,
          losses: userRating.losses,
          peakRating: userRating.peak_rating,
          tier: tier.name,
          tierColor: tier.color,
          tierMinRating: tier.minRating,
          rankPosition: (rankResult.count || 0) + 1,
        };
      } else {
        // User has no rating yet
        const tier = getRankTier(DEFAULT_RATING);
        myRating = {
          rating: DEFAULT_RATING,
          ratingDeviation: DEFAULT_RD,
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          peakRating: DEFAULT_RATING,
          tier: tier.name,
          tierColor: tier.color,
          tierMinRating: tier.minRating,
          rankPosition: null,
        };
      }
    }

    return NextResponse.json({
      myRating,
      leaderboard: enrichedLeaderboard,
    });
  } catch (err) {
    captureApiError(err as Error, 'ranked-get');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
