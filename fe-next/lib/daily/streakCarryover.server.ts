import type { SupabaseClient } from '@supabase/supabase-js'
import logger from '@/utils/logger'

export const CARRYOVER_MAX_DAYS = 100
export const CARRYOVER_WINDOW_HOURS = 48
const MAX_GUEST_IDS = 4
const MAX_GUEST_ID_LENGTH = 128

const DAY_MS = 86_400_000
const shift = (iso: string, days: number) =>
  new Date(Date.parse(iso + 'T00:00:00Z') + days * DAY_MS).toISOString().slice(0, 10)

/** The consecutive run of days ending today or yesterday (oldest first), capped; empty when it lapsed. */
export function guestRunDates(dates: Iterable<string>, today: string, cap = CARRYOVER_MAX_DAYS): string[] {
  const played = new Set(dates)
  let cursor = played.has(today) ? today : shift(today, -1)
  const run: string[] = []
  while (played.has(cursor) && run.length < cap) {
    run.unshift(cursor)
    cursor = shift(cursor, -1)
  }
  return run
}

// Same "counts as played" filters as loadChestActivity, on rows no account owns yet.
const GUEST_SOURCES = [
  { table: 'daily_puzzle_attempts', where: (q: any) => q.gt('word_count', 0) },
  { table: 'daily_word_hunt_attempts', where: (q: any) => q.eq('solved', true).eq('is_catchup', false) },
  { table: 'daily_word_wheel_attempts', where: (q: any) => q.gt('word_count', 0).eq('is_catchup', false) },
  { table: 'daily_word_tower_attempts', where: (q: any) => q.gt('best_height_m', 0) },
  { table: 'connections_daily_scores', where: (q: any) => q.gt('puzzles_solved', 0) },
] as const

export function parseGuestIds(raw: readonly (string | null | undefined)[]): string[] {
  const ids = raw
    .flatMap((v) => (v ?? '').split(','))
    .map((v) => v.trim())
    .filter((v) => v.length > 0 && v.length <= MAX_GUEST_ID_LENGTH)
  return [...new Set(ids)].slice(0, MAX_GUEST_IDS)
}

/**
 * Copies the days this device played as a guest onto a just-created account,
 * so signing up never drops the streak. Days come only from guest rows on the
 * server, never from a client count; only accounts inside the signup window
 * qualify, a guest id already carried to another account is skipped, and the
 * (player_id, carried_date) key makes a replay write nothing new.
 */
export async function carryOverGuestStreak(
  db: SupabaseClient,
  playerId: string,
  guestIds: readonly string[],
  today: string,
  now: Date = new Date(),
): Promise<void> {
  if (guestIds.length === 0) return

  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('created_at')
    .eq('id', playerId)
    .maybeSingle()
  const createdAt = Date.parse((profile as { created_at?: string } | null)?.created_at ?? '')
  if (profileError || !Number.isFinite(createdAt)) return
  if (now.getTime() - createdAt > CARRYOVER_WINDOW_HOURS * 3_600_000) return

  const { data: carried, error: carriedError } = await db
    .from('daily_streak_carryover')
    .select('player_id,guest_id')
    .in('guest_id', guestIds as string[])
  if (carriedError) {
    logger.warn(`Streak carry-over: ownership read failed: ${carriedError.message}`)
    return
  }
  const rows = (carried ?? []) as { player_id: string; guest_id: string }[]
  // Already carried for this account: the guest rows cannot have grown since sign-in.
  if (rows.some((r) => r.player_id === playerId)) return
  const takenIds = new Set(rows.map((r) => r.guest_id))
  const ids = guestIds.filter((id) => !takenIds.has(id))
  if (ids.length === 0) return

  const sourceOf = new Map<string, string>()
  const results = await Promise.all(
    GUEST_SOURCES.map(({ table, where }) =>
      where(
        db
          .from(table)
          .select('puzzle_date,guest_fingerprint')
          .in('guest_fingerprint', ids)
          .is('player_id', null)
          .gte('puzzle_date', shift(today, -CARRYOVER_MAX_DAYS)),
      ),
    ),
  )
  for (const res of results as Array<{ data: { puzzle_date: string; guest_fingerprint: string }[] | null; error: unknown }>) {
    if (res.error) return
    for (const row of res.data ?? []) if (!sourceOf.has(row.puzzle_date)) sourceOf.set(row.puzzle_date, row.guest_fingerprint)
  }

  const run = guestRunDates(sourceOf.keys(), today)
  if (run.length === 0) return

  const { error } = await db.from('daily_streak_carryover').upsert(
    run.map((date) => ({ player_id: playerId, carried_date: date, guest_id: sourceOf.get(date)! })),
    { onConflict: 'player_id,carried_date', ignoreDuplicates: true },
  )
  if (error) logger.warn(`Streak carry-over: write failed: ${error.message}`)
}

/** Guest days carried onto this account; none when the read fails, so a missing table never hides the streak. */
export async function loadCarriedDates(db: SupabaseClient, playerId: string): Promise<string[]> {
  const { data, error } = await db.from('daily_streak_carryover').select('carried_date').eq('player_id', playerId)
  if (error) {
    logger.warn(`Streak carry-over: read failed: ${error.message}`)
    return []
  }
  return (data ?? []).map((r: { carried_date: string }) => r.carried_date)
}
