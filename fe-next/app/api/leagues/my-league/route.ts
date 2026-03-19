import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

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
      .select('league_id, weekly_xp, leagues!inner(id, tier, week_start)')
      .eq('user_id', userId)
      .gte('leagues.week_start', weekStartStr)
      .order('joined_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ leagueId: null, tier: null, standings: [] });
    }

    const leagueId = membership.league_id;
    const tier = (membership as Record<string, unknown>).leagues
      ? ((membership as Record<string, unknown>).leagues as Record<string, unknown>).tier
      : null;

    // Get standings for this league
    const { data: standings } = await supabase
      .from('league_members')
      .select('user_id, weekly_xp, profiles!inner(username, avatar_image)')
      .eq('league_id', leagueId)
      .order('weekly_xp', { ascending: false });

    return NextResponse.json({
      leagueId,
      tier,
      standings: standings ?? [],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] /api/leagues/my-league error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
