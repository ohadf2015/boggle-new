import type { SupabaseClient } from '@supabase/supabase-js'
import logger from '@/utils/logger'
import {
  claimableMilestone,
  freezeDateToSettle,
  nextMilestone,
  streakStatus,
  weekStrip,
  type NextMilestone,
  type StreakMilestone,
  type StreakStatus,
  type WeekDay,
} from './streakRewards'

const MAX_ATTEMPTS = 4

interface FreezePool {
  table: string
  idColumn: string
  column: string
}

// Earned/bought freezes go first; gifted ones (profiles) are the fallback.
const FREEZE_POOLS: readonly FreezePool[] = [
  { table: 'player_engagement', idColumn: 'player_id', column: 'streak_freezes_available' },
  { table: 'profiles', idColumn: 'id', column: 'streak_freeze_count' },
]

async function readPool(db: SupabaseClient, pool: FreezePool, playerId: string): Promise<number | null> {
  const { data, error } = await db.from(pool.table).select(pool.column).eq(pool.idColumn, playerId).maybeSingle()
  if (error) return null
  const n = Number((data as Record<string, unknown> | null)?.[pool.column] ?? 0)
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0
}

async function spendFromPool(db: SupabaseClient, pool: FreezePool, playerId: string): Promise<boolean> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const owned = await readPool(db, pool, playerId)
    if (!owned) return false
    const { data: updated, error } = await db
      .from(pool.table)
      .update({ [pool.column]: owned - 1 })
      .eq(pool.idColumn, playerId)
      .eq(pool.column, owned)
      .select(pool.idColumn)
    if (error) return false
    if (updated && updated.length > 0) return true
  }
  return false
}

/** Every freeze the player holds, across the earned and gifted pools; a failed read counts as none. */
export async function loadOwnedFreezes(db: SupabaseClient, playerId: string): Promise<number> {
  const counts = await Promise.all(FREEZE_POOLS.map((p) => readPool(db, p, playerId).catch(() => null)))
  return counts.reduce<number>((sum, n) => sum + (n ?? 0), 0)
}

export interface FreezeSaved {
  date: string
  freezesRemaining: number
}

/**
 * Spends one owned freeze on yesterday when it was missed and the day before
 * was kept, on any daily mode's next visit rather than only a Word Hunt submit.
 * UNIQUE(player_id, frozen_date) makes a repeat a no-op; returns what was saved
 * on THIS call only, so the toast fires once.
 */
export async function settleStreakFreeze(
  db: SupabaseClient,
  playerId: string,
  dates: readonly string[],
  freezesAvailable: number,
  today: string,
): Promise<FreezeSaved | null> {
  const date = freezeDateToSettle(dates, today, freezesAvailable)
  if (!date) return null
  return (await spendFreezeOn(db, playerId, date)) ? { date, freezesRemaining: Math.max(0, freezesAvailable - 1) } : null
}

/**
 * The one place a freeze is spent: marks `date` frozen and takes one freeze,
 * earned pool first, then gifted. UNIQUE(player_id, frozen_date) makes a repeat
 * spend nothing; true only when this call spent one.
 */
export async function spendFreezeOn(db: SupabaseClient, playerId: string, date: string): Promise<boolean> {
  const { error: insertError } = await db.from('daily_streak_freezes').insert({ player_id: playerId, frozen_date: date })
  if (insertError) {
    if ((insertError as { code?: string }).code !== '23505') {
      logger.error('Streak freeze settle: insert failed:', insertError.message)
    }
    return false
  }

  for (const pool of FREEZE_POOLS) {
    if (await spendFromPool(db, pool, playerId)) return true
  }

  // No freeze could be spent, so the day must not stay frozen for free.
  const { error: undoError } = await db
    .from('daily_streak_freezes')
    .delete()
    .eq('player_id', playerId)
    .eq('frozen_date', date)
  if (undoError) logger.error('Streak freeze settle: undo failed:', undoError.message)
  return false
}

/** Carried guest days never unlock a reward on their own: they count as already paid up to their length. */
export function withCarriedFloor(claims: readonly number[], carriedDates: readonly string[]): number[] {
  return carriedDates.length > 0 ? [...claims, new Set(carriedDates).size] : [...claims]
}

/** Milestone days already paid; null when the read failed (never treat that as "none claimed"). */
export async function loadMilestoneClaims(db: SupabaseClient, playerId: string): Promise<number[] | null> {
  const { data, error } = await db.from('daily_streak_milestone_claims').select('milestone').eq('player_id', playerId)
  if (error) {
    logger.warn(`Streak milestones: claims read failed: ${error.message}`)
    return null
  }
  return (data ?? []).map((r: { milestone: number }) => Number(r.milestone)).filter(Number.isFinite)
}

export interface StreakBlock extends StreakStatus {
  week: WeekDay[]
  freezeSaved: FreezeSaved | null
  /** Null when the claims could not be read: the UI hides rewards rather than guess. */
  milestone: { claimable: StreakMilestone | null; next: NextMilestone | null } | null
}

/** The streak block the weekly-chest status returns, after spending a freeze on a missed yesterday. */
export async function buildStreakBlock(
  db: SupabaseClient,
  playerId: string,
  activity: { allDates: string[]; frozenDates: string[] },
  freezesAvailable: number,
  today: string,
  carriedDates: readonly string[] = [],
): Promise<{ block: StreakBlock; allDates: string[]; freezesAvailable: number }> {
  let allDates = activity.allDates
  // Guest days carried over at signup hold the streak, never the weekly chest cycles.
  let streakDates = [...allDates, ...carriedDates]
  const frozen = new Set(activity.frozenDates)
  let freezeSaved: FreezeSaved | null = null
  try {
    freezeSaved = await settleStreakFreeze(db, playerId, streakDates, freezesAvailable, today)
  } catch (e) {
    logger.error('Streak freeze settle failed:', (e as Error).message)
  }
  if (freezeSaved) {
    allDates = [...allDates, freezeSaved.date]
    streakDates = [...streakDates, freezeSaved.date]
    frozen.add(freezeSaved.date)
    freezesAvailable = freezeSaved.freezesRemaining
  } else {
    // Repeated while the save holds: it may have been spent on a page with no toast; the client shows it once.
    const yesterday = new Date(today + 'T00:00:00Z')
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    const date = yesterday.toISOString().slice(0, 10)
    if (frozen.has(date)) freezeSaved = { date, freezesRemaining: freezesAvailable }
  }

  const status = streakStatus([...new Set(streakDates)], today)
  const claims = await loadMilestoneClaims(db, playerId).catch(() => null)
  const played = streakDates.filter((d) => !frozen.has(d))
  const paid = claims ? withCarriedFloor(claims, carriedDates) : null
  return {
    allDates,
    freezesAvailable,
    block: {
      ...status,
      week: weekStrip(played, [...frozen], today),
      freezeSaved,
      milestone: paid
        ? { claimable: claimableMilestone(status.current, paid), next: nextMilestone(status.current, paid) }
        : null,
    },
  }
}
