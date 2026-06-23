/**
 * Ranked ELO Rating API
 *
 * GET  /api/ranked — Get current user's rating + leaderboard top 50
 * POST /api/ranked/match — Submit match result (called by backend after game)
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js';
import { getRankTier, DEFAULT_RATING, DEFAULT_RD } from '@/shared/utils/eloRating';
import { captureApiError } from '@/utils/sentry';
import { cacheAside } from '@/backend/cache/redisCache';
import { cacheKeys } from '@/lib/cache/cacheKeys';

// The top-50 board + its profiles is identical for every viewer, so it caches
// under one shared key (30s). Leaderboards tolerate a few seconds of staleness.
const LEADERBOARD_TTL_SECONDS = 30;

// Plain SupabaseClient (defaults to the `any` schema) — matches the loose typing
// the original inline createServiceClient(...) call inferred for these queries.
type ServiceClient = SupabaseClient;

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

/**
 * Fetch + enrich the public top-50 leaderboard. Deliberately takes NO user
 * argument: this result is cached under a single shared key, so it must never
 * contain per-user data (that would leak one user's view to everyone).
 * Throws on DB error so cacheAside never caches a failed fetch.
 */
async function fetchEnrichedLeaderboard(serviceClient: ServiceClient) {
  const { data: leaderboard, error } = await serviceClient
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

  if (error) throw error;

  const userIds = (leaderboard || []).map((r) => r.user_id);
  const profilesResult =
    userIds.length > 0
      ? await serviceClient
          .from('profiles')
          .select('id, username, display_name, avatar_image, avatar_emoji, avatar_color')
          .in('id', userIds)
      : { data: [] as Array<{ id: string; username: string; display_name: string; avatar_image: string; avatar_emoji: string; avatar_color: string }> };

  const profileMap = new Map((profilesResult.data || []).map((p) => [p.id, p]));

  return (leaderboard || []).map((entry, index) => {
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
    const user = await getAuthedUser(request);

    // Shared cacheable board + the requesting user's own rating (always live,
    // never cached) run in parallel.
    const [enrichedLeaderboard, userRating] = await Promise.all([
      cacheAside(
        cacheKeys.rankedTop50(),
        () => fetchEnrichedLeaderboard(serviceClient),
        LEADERBOARD_TTL_SECONDS
      ),
      user
        ? serviceClient
            .from('player_ratings')
            .select('*')
            .eq('user_id', user.id)
            .single()
            .then((r) => r.data)
        : Promise.resolve(null),
    ]);

    // Build current user's rating response (depends on userRating → rank count)
    let myRating = null;
    if (user) {
      if (userRating) {
        const rankResult = await serviceClient
          .from('player_ratings')
          .select('id', { count: 'exact', head: true })
          .gt('rating', userRating.rating);
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
