import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/leagues/rivals?userId=<uuid>
 * Returns the 2 players directly above and below the current player
 * in their weekly league standings (Named Rivals feature).
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
      return NextResponse.json({ above: null, below: null, player: null });
    }

    const leagueId = membership.league_id;

    // Get all members with profiles for avatar/username
    const { data: members } = await supabase
      .from('league_members')
      .select('user_id, weekly_xp, display_name, joined_at, profiles!inner(username, avatar_image)')
      .eq('league_id', leagueId)
      .order('weekly_xp', { ascending: false });

    if (!members || members.length === 0) {
      return NextResponse.json({ above: null, below: null, player: null });
    }

    // Sort with tiebreak: higher XP first, then earlier join date
    const sorted = [...members].sort((a, b) => {
      if (b.weekly_xp !== a.weekly_xp) return b.weekly_xp - a.weekly_xp;
      return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
    });

    const playerIdx = sorted.findIndex((m) => m.user_id === userId);
    if (playerIdx === -1) {
      return NextResponse.json({ above: null, below: null, player: null });
    }

    const toRival = (m: (typeof sorted)[number], position: number) => {
      const profile = m.profiles as unknown as { username: string; avatar_image: string } | null;
      return {
        username: profile?.username || m.display_name || '',
        avatar: profile?.avatar_image || '',
        score: m.weekly_xp,
        position,
      };
    };

    const player = { position: playerIdx + 1, score: sorted[playerIdx].weekly_xp };
    const above = playerIdx > 0 ? toRival(sorted[playerIdx - 1], playerIdx) : null;
    const below = playerIdx < sorted.length - 1 ? toRival(sorted[playerIdx + 1], playerIdx + 2) : null;

    return NextResponse.json({ above, below, player });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] /api/leagues/rivals error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
