import type { SupabaseClient } from '@supabase/supabase-js';
import { publicNameOrNull } from '@/lib/names/publicName';

export interface LeagueMemberRow {
  user_id: string;
  weekly_xp: number;
  display_name: string | null;
  joined_at: string;
  profiles: { username: string | null; avatar_image: string | null } | null;
}

export interface LeagueNeighbor {
  userId: string;
  username: string;
  avatar: string;
  score: number;
  position: number;
}

export interface LeagueNeighbors {
  above: LeagueNeighbor | null;
  below: LeagueNeighbor | null;
  player: { position: number; score: number } | null;
}

const NONE: LeagueNeighbors = { above: null, below: null, player: null };

/** Monday 00:00 UTC of the current week. */
export function leagueWeekStartIso(now = new Date()): string {
  const start = new Date(now);
  start.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7));
  start.setUTCHours(0, 0, 0, 0);
  return start.toISOString();
}

/** The nearest public-named members above and below the player, at their true league positions. */
export function pickLeagueNeighbors(members: LeagueMemberRow[], userId: string): LeagueNeighbors {
  const sorted = [...members].sort((a, b) =>
    b.weekly_xp - a.weekly_xp || new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime());
  const idx = sorted.findIndex((m) => m.user_id === userId);
  if (idx === -1) return NONE;

  const neighbor = (from: number, step: 1 | -1): LeagueNeighbor | null => {
    for (let i = from; i >= 0 && i < sorted.length; i += step) {
      const m = sorted[i];
      const name = publicNameOrNull(m.profiles?.username) ?? publicNameOrNull(m.display_name);
      if (name) return { userId: m.user_id, username: name, avatar: m.profiles?.avatar_image || '', score: m.weekly_xp, position: i + 1 };
    }
    return null;
  };

  return {
    player: { position: idx + 1, score: sorted[idx].weekly_xp },
    above: neighbor(idx - 1, -1),
    below: neighbor(idx + 1, 1),
  };
}

/** The player's current-week league neighbours. Two bounded reads on league_members. */
export async function loadLeagueNeighbors(supabase: SupabaseClient, userId: string): Promise<LeagueNeighbors> {
  const { data: membership } = await supabase
    .from('league_members')
    .select('league_id, leagues!inner(id, week_start)')
    .eq('user_id', userId)
    .gte('leagues.week_start', leagueWeekStartIso())
    .order('joined_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!membership) return NONE;

  const { data: members } = await supabase
    .from('league_members')
    .select('user_id, weekly_xp, display_name, joined_at, profiles!inner(username, avatar_image)')
    .eq('league_id', (membership as { league_id: string }).league_id)
    .order('weekly_xp', { ascending: false })
    .limit(100);
  return pickLeagueNeighbors((members ?? []) as unknown as LeagueMemberRow[], userId);
}
