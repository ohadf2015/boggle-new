/**
 * Daily activity for the admin Overview: games (signed-in and guest), unique players and
 * new signups per UTC day. Every source is read page by page (PostgREST caps a plain read
 * at 1000 rows) and the three reads run together.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAllRows } from './fetchAllRows';

const DAY_MS = 86_400_000;

type GameRow = { created_at: string; player_id: string };
type GuestRow = { started_at: string; guest_session_id: string };
type SignupRow = { created_at: string; id: string };

export interface DailyActivityRow {
  date: string;
  games: number;
  guestGames: number;
  totalGames: number;
  uniquePlayers: number;
  uniqueGuests: number;
  totalUniquePlayers: number;
  signups: number;
}

interface BuildInput {
  days: number;
  nowMs: number;
  testIds: Set<string>;
  games: GameRow[];
  guestGames: GuestRow[];
  signups: SignupRow[];
}

const dayOf = (iso: string) => iso.slice(0, 10);

export function buildDailyActivity({ days, nowMs, testIds, games, guestGames, signups }: BuildInput): DailyActivityRow[] {
  const byDay = new Map<string, { games: number; guestGames: number; players: Set<string>; guests: Set<string>; signups: number }>();
  for (let i = days - 1; i >= 0; i--) {
    byDay.set(dayOf(new Date(nowMs - i * DAY_MS).toISOString()), { games: 0, guestGames: 0, players: new Set(), guests: new Set(), signups: 0 });
  }
  for (const g of games) {
    const d = byDay.get(dayOf(g.created_at));
    if (!d || testIds.has(g.player_id)) continue;
    d.games += 1;
    d.players.add(g.player_id);
  }
  for (const g of guestGames) {
    const d = byDay.get(dayOf(g.started_at));
    if (!d) continue;
    d.guestGames += 1;
    d.guests.add(g.guest_session_id);
  }
  for (const s of signups) {
    const d = byDay.get(dayOf(s.created_at));
    if (d && !testIds.has(s.id)) d.signups += 1;
  }
  return [...byDay.entries()].map(([date, d]) => ({
    date,
    games: d.games,
    guestGames: d.guestGames,
    totalGames: d.games + d.guestGames,
    uniquePlayers: d.players.size,
    uniqueGuests: d.guests.size,
    totalUniquePlayers: d.players.size + d.guests.size,
    signups: d.signups,
  }));
}

export async function fetchDailyActivity(supabase: SupabaseClient, days: number, nowMs = Date.now()): Promise<DailyActivityRow[]> {
  const since = new Date(nowMs - (days - 1) * DAY_MS);
  since.setUTCHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();

  const [tests, games, guests, signups] = await Promise.all([
    fetchAllRows<{ id: string }>((from, to) => supabase.from('profiles').select('id').eq('is_test_account', true).order('id').range(from, to)),
    fetchAllRows<GameRow>((from, to) => supabase.from('game_results').select('created_at, player_id').gte('created_at', sinceIso).order('id').range(from, to)),
    fetchAllRows<GuestRow>((from, to) =>
      supabase
        .from('game_sessions')
        .select('started_at, guest_session_id')
        .is('user_id', null)
        .not('guest_session_id', 'is', null)
        .eq('completed', true)
        .gte('started_at', sinceIso)
        .order('id')
        .range(from, to),
    ),
    fetchAllRows<SignupRow>((from, to) => supabase.from('profiles').select('id, created_at').gte('created_at', sinceIso).order('id').range(from, to)),
  ]);
  // Guest sessions are optional (the table may be missing in some environments); the rest must load.
  const failed = [tests, games, signups].find((r) => r.error);
  if (failed) throw new Error(failed.error ?? 'daily activity read failed');

  return buildDailyActivity({
    days,
    nowMs,
    testIds: new Set(tests.data.map((r) => r.id)),
    games: games.data,
    guestGames: guests.error ? [] : guests.data,
    signups: signups.data,
  });
}
