import type { SupabaseClient } from '@supabase/supabase-js'
import type { HuntScoreRow, WheelScoreRow, PuzzleScoreRow } from './weeklyChest'

export interface ChestActivity {
  huntRows: HuntScoreRow[]
  wheelRows: WheelScoreRow[]
  puzzleRows: PuzzleScoreRow[]
  /** Every date that counts toward the chest streak (all modes + freezes). */
  allDates: string[]
}

type Res<T> = { data: T[] | null; error: { message: string } | null }

function unwrap<T>(res: Res<T>): T[] {
  if (res.error) throw new Error(res.error.message)
  return res.data ?? []
}

/**
 * Single source of truth for "which days count toward the weekly chest".
 * Used by BOTH /weekly-chest/status and /weekly-chest/claim so they can never
 * diverge. Only *completed* attempts count: a failed Word Hunt or a zero-word
 * puzzle/wheel/tower/connections run does not.
 *
 * Word Tower and Connections add dates but carry no tier score rows (their
 * scoring scales are not comparable), so they never inflate or dilute the tier.
 * Freeze rows bridge continuity the same way.
 *
 * Pass the service-role client and filter strictly by `userId` (done here).
 * Throws on any query error — never silently under-count.
 */
export async function loadChestActivity(db: SupabaseClient, userId: string): Promise<ChestActivity> {
  const [puzzleRes, huntRes, wheelRes, towerRes, connRes, freezeRes] = await Promise.all([
    db.from('daily_puzzle_attempts').select('puzzle_date,score,time_seconds')
      .eq('player_id', userId).gt('word_count', 0),
    db.from('daily_word_hunt_attempts').select('puzzle_date,efficiency_score')
      .eq('player_id', userId).eq('solved', true)
      .eq('is_catchup', false), // catch-up plays don't count toward the chest cycle
    db.from('daily_word_wheel_attempts').select('puzzle_date,score,time_seconds')
      .eq('player_id', userId).gt('word_count', 0),
    db.from('daily_word_tower_attempts').select('puzzle_date')
      .eq('player_id', userId).gt('best_height_m', 0),
    db.from('connections_daily_scores').select('puzzle_date')
      .eq('player_id', userId).gt('puzzles_solved', 0),
    db.from('daily_streak_freezes').select('frozen_date').eq('player_id', userId),
  ])

  const puzzleRows = unwrap(puzzleRes as Res<PuzzleScoreRow>)
  const huntRows = unwrap(huntRes as Res<HuntScoreRow>)
  const wheelRows = unwrap(wheelRes as Res<WheelScoreRow>)
  const towerRows = unwrap(towerRes as Res<{ puzzle_date: string }>)
  const connRows = unwrap(connRes as Res<{ puzzle_date: string }>)
  const freezeRows = unwrap(freezeRes as Res<{ frozen_date: string }>)

  const allDates = [
    ...puzzleRows.map(r => r.puzzle_date),
    ...huntRows.map(r => r.puzzle_date),
    ...wheelRows.map(r => r.puzzle_date),
    ...towerRows.map(r => r.puzzle_date),
    ...connRows.map(r => r.puzzle_date),
    ...freezeRows.map(r => r.frozen_date),
  ]
  return { huntRows, wheelRows, puzzleRows, allDates }
}
