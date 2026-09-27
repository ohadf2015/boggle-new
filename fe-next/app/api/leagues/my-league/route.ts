import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { enrichLeagueStandings, type RawStandingRow } from '@/lib/league/enrichStandings';
import { cacheAside } from '@/backend/cache/redisCache';
import { cacheKeys } from '@/lib/cache/cacheKeys';

// Standings (a full member scan) are co-member-visible and identical for every
// member, so they cache per-league under one shared key. XP updates post-game;
// a few seconds of staleness on a weekly board is fine.
const STANDINGS_TTL_SECONDS = 30;

/**
 * GET /api/leagues/my-league?userId=<uuid>
 * Returns the player's current weekly league and standings.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get current week boundaries
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const weekStart = new Date(now);
    weekStart.setUTCDate(now.getUTCDate() - ((dayOfWeek + 6) % 7)); // Monday
    weekStart.setUTCHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toISOString();

    // Find player's current league membership
    const { data: membership } = await supabase
      .from('league_members')
      .select('league_id, weekly_xp, leagues!inner(id, tier, week_start, week_end)')
      .eq('user_id', userId)
      .gte('leagues.week_start', weekStartStr)
      .order('joined_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ leagueId: null, tier: null, weekEnd: null, standings: [] });
    }

    const leagueId = membership.league_id;
    const leagueRow = (membership as Record<string, unknown>).leagues as Record<string, unknown> | undefined;
    const tier = leagueRow ? leagueRow.tier : null;
    const weekEnd = leagueRow ? (leagueRow.week_end as string | null) : null;

    // Get standings for this league (ordered so position derives from rank),
    // cached per-league. Enriched into the ranked, camelCase shape the client
    // hook indexes by (position + zone) before caching, so a hit returns the
    // final shape. Throws on DB error so a failed fetch is never cached.
    const standings = await cacheAside(
      cacheKeys.leagueStandings(leagueId),
      async () => {
        const { data, error } = await supabase
          .from('league_members')
          .select('user_id, weekly_xp, profiles!inner(username, display_name, avatar_image)')
          .eq('league_id', leagueId)
          .order('weekly_xp', { ascending: false });
        if (error) throw error;
        return enrichLeagueStandings((data ?? []) as RawStandingRow[]);
      },
      STANDINGS_TTL_SECONDS
    );

    return NextResponse.json({ leagueId, tier, weekEnd, standings });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] /api/leagues/my-league error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
