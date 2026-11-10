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

  const { error: insertError } = await db.from('daily_streak_freezes').insert({ player_id: playerId, frozen_date: date })
  if (insertError) {
    if ((insertError as { code?: string }).code !== '23505') {
      logger.error('Streak freeze settle: insert failed:', insertError.message)
    }
    return null
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const { data: row, error } = await db
      .from('player_engagement')
      .select('streak_freezes_available')
      .eq('player_id', playerId)
      .maybeSingle()
    if (error) break
    const owned = Number((row as { streak_freezes_available?: number | null } | null)?.streak_freezes_available ?? 0)
    if (owned <= 0) break
    const { data: updated, error: updateError } = await db
      .from('player_engagement')
      .update({ streak_freezes_available: owned - 1 })
      .eq('player_id', playerId)
      .eq('streak_freezes_available', owned)
      .select('player_id')
    if (updateError) break
    if (updated && updated.length > 0) return { date, freezesRemaining: owned - 1 }
  }

  // No freeze could be spent, so the day must not stay frozen for free.
  const { error: undoError } = await db
    .from('daily_streak_freezes')
    .delete()
    .eq('player_id', playerId)
    .eq('frozen_date', date)
  if (undoError) logger.error('Streak freeze settle: undo failed:', undoError.message)
  return null
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
): Promise<{ block: StreakBlock; allDates: string[]; freezesAvailable: number }> {
  let allDates = activity.allDates
  const frozen = new Set(activity.frozenDates)
  let freezeSaved: FreezeSaved | null = null
  try {
    freezeSaved = await settleStreakFreeze(db, playerId, allDates, freezesAvailable, today)
  } catch (e) {
    logger.error('Streak freeze settle failed:', (e as Error).message)
  }
  if (freezeSaved) {
    allDates = [...allDates, freezeSaved.date]
    frozen.add(freezeSaved.date)
    freezesAvailable = freezeSaved.freezesRemaining
  } else {
    // Repeated while the save holds: it may have been spent on a page with no toast; the client shows it once.
    const yesterday = new Date(today + 'T00:00:00Z')
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    const date = yesterday.toISOString().slice(0, 10)
    if (frozen.has(date)) freezeSaved = { date, freezesRemaining: freezesAvailable }
  }

  const status = streakStatus(allDates, today)
  const claims = await loadMilestoneClaims(db, playerId).catch(() => null)
  const played = allDates.filter((d) => !frozen.has(d))
  return {
    allDates,
    freezesAvailable,
    block: {
      ...status,
      week: weekStrip(played, [...frozen], today),
      freezeSaved,
      milestone: claims
        ? { claimable: claimableMilestone(status.current, claims), next: nextMilestone(status.current, claims) }
        : null,
    },
  }
}
