/**
 * Daily activity for the admin Overview: games (signed-in and guest), unique players and
 * new signups per UTC day. Every source is read page by page (PostgREST caps a plain read
 * at 1000 rows) and the reads run together.
 *
 * Signups use the same definition as the Overview hero and admin_signup_growth: a new
 * profiles row is a signup only when the auth user is not anonymous and the profile is
 * not a test account. Classroom guest joins mint a real profiles row, so counting every
 * new profile (the previous behaviour) inflated the daily chart and the "Signups today"
 * pulse against the hero.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAllRows } from './fetchAllRows';
import { addLocalDays, localDateOf, zonedMidnightUtc } from './viewerTimeZone';

const ANON_USERS_PER_PAGE = 1000;
const ANON_USERS_MAX_PAGES = 10;

interface AuthUserIdRow {
  id: string;
  created_at: string;
  is_anonymous?: boolean;
}

/** Auth admin listing, same shape countGoogleSignupsSince already uses. */
export interface AnonymousUserLister {
  auth: {
    admin: {
      listUsers(params: { page: number; perPage: number }): PromiseLike<{
        data: { users: AuthUserIdRow[] } | null;
        error: { message: string } | null;
      }>;
    };
  };
}

/**
 * Auth lists newest accounts first, so paging stops at the first account older than the
 * window. Anonymous classroom sessions are not signups.
 */
export async function fetchAnonymousUserIdsSince(
  client: AnonymousUserLister,
  sinceIso: string,
  perPage = ANON_USERS_PER_PAGE,
): Promise<Set<string>> {
  const sinceMs = Date.parse(sinceIso);
  const ids = new Set<string>();
  for (let page = 1; page <= ANON_USERS_MAX_PAGES; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const users = data?.users ?? [];
    for (const user of users) {
      if (Date.parse(user.created_at) >= sinceMs && user.is_anonymous === true) ids.add(user.id);
    }
    const oldest = users[users.length - 1];
    if (users.length < perPage || !oldest || Date.parse(oldest.created_at) < sinceMs) return ids;
  }
  throw new Error('Anonymous user window exceeds the page cap');
}


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
  /** Auth users flagged is_anonymous; excluded from signups only, not from games. */
  anonymousIds?: Set<string>;
  /** IANA timezone for calendar days; UTC when omitted. */
  timeZone?: string;
  games: GameRow[];
  guestGames: GuestRow[];
  signups: SignupRow[];
}

export function buildDailyActivity({ days, nowMs, testIds, anonymousIds, timeZone = 'UTC', games, guestGames, signups }: BuildInput): DailyActivityRow[] {
  const dayOf = (iso: string) => localDateOf(Date.parse(iso), timeZone);
  const byDay = new Map<string, { games: number; guestGames: number; players: Set<string>; guests: Set<string>; signups: number }>();
  const today = localDateOf(nowMs, timeZone);
  for (let i = days - 1; i >= 0; i--) {
    byDay.set(addLocalDays(today, -i), { games: 0, guestGames: 0, players: new Set(), guests: new Set(), signups: 0 });
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
    if (d && !testIds.has(s.id) && !anonymousIds?.has(s.id)) d.signups += 1;
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

export async function fetchDailyActivity(supabase: SupabaseClient, days: number, nowMs = Date.now(), timeZone = 'UTC'): Promise<DailyActivityRow[]> {
  const today = localDateOf(nowMs, timeZone);
  const sinceIso = new Date(zonedMidnightUtc(addLocalDays(today, -(days - 1)), timeZone)).toISOString();

  const [tests, games, guests, signups, anonymousIds] = await Promise.all([
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
    fetchAnonymousUserIdsSince(supabase, sinceIso),
  ]);
  // Guest sessions are optional (the table may be missing in some environments); the rest must load.
  const failed = [tests, games, signups].find((r) => r.error);
  if (failed) throw new Error(failed.error ?? 'daily activity read failed');

  return buildDailyActivity({
    days,
    nowMs,
    testIds: new Set(tests.data.map((r) => r.id)),
    anonymousIds,
    timeZone,
    games: games.data,
    guestGames: guests.error ? [] : guests.data,
    signups: signups.data,
  });
}
