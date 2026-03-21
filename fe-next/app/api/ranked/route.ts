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

    // Fetch leaderboard top 50
    const { data: leaderboard, error: leaderboardError } = await serviceClient
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
      .limit(50);

    if (leaderboardError) {
      captureApiError(leaderboardError, 'ranked-leaderboard');
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }

    // Enrich leaderboard with profile info and rank tiers
    const userIds = (leaderboard || []).map(r => r.user_id);
    const { data: profiles } = userIds.length > 0
      ? await serviceClient
          .from('profiles')
          .select('id, username, display_name, avatar_image, avatar_emoji, avatar_color')
          .in('id', userIds)
      : { data: [] };

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

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

    // Fetch current user's rating if authenticated
    let myRating = null;
    if (user) {
      const { data: userRating } = await serviceClient
        .from('player_ratings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (userRating) {
        const tier = getRankTier(userRating.rating);
        // Find user's rank position
        const { count: higherCount } = await serviceClient
          .from('player_ratings')
          .select('id', { count: 'exact', head: true })
          .gt('rating', userRating.rating);

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
          rankPosition: (higherCount || 0) + 1,
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
