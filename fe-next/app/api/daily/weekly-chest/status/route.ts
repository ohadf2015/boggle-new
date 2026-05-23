import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import {
  computeCycleProgress,
  computeChestTierForCycle,
  findCompletedCycles,
  type HuntScoreRow,
  type WheelScoreRow,
  type PuzzleScoreRow,
} from '@/lib/daily/weeklyChest'
import logger from '@/utils/logger'

/**
 * GET /api/daily/weekly-chest/status
 * Fetch the current weekly chest status for authenticated user
 *
 * Returns:
 * - cycleStart: string (YYYY-MM-DD) — first day of current 7-day cycle
 * - cycleNumber: number — which cycle they're on (1, 2, 3, ...)
 * - completedDates: string[] — all dates completed in this cycle
 * - daysCompleted: number — count of consecutive days (0-7)
 * - isClaimable: boolean — true if 7 days are complete and not yet claimed
 * - pendingChest: { tier, coins, badgeId } | null — chest waiting to be claimed
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date().toISOString().split('T')[0]

    // Fetch only *completed* attempts across the three daily modes. A day counts
    // toward the streak only if the player actually finished the challenge —
    // a failed Word Hunt or an abandoned (zero-word) puzzle/wheel does not.
    const [puzzleRes, huntRes, wheelRes] = await Promise.all([
      supabase
        .from('daily_puzzle_attempts')
        .select('puzzle_date,score,time_seconds')
        .eq('player_id', user.id)
        .gt('word_count', 0),
      supabase
        .from('daily_word_hunt_attempts')
        .select('puzzle_date,efficiency_score')
        .eq('player_id', user.id)
        .eq('solved', true)
        .eq('is_catchup', false), // catch-up plays don't count toward the chest cycle
      supabase
        .from('daily_word_wheel_attempts')
        .select('puzzle_date,score,time_seconds')
        .eq('player_id', user.id)
        .gt('word_count', 0),
    ])

    // Frozen days: a freeze the player spent to protect the chest cycle. They
    // bridge continuity but carry no score row, so they never inflate the tier.
    const { data: freezeRows } = await supabase
      .from('daily_streak_freezes')
      .select('frozen_date')
      .eq('player_id', user.id)

    // Combine all attempt dates + frozen (bridged) dates.
    const allDates = [
      ...(puzzleRes.data ?? []).map((r: any) => r.puzzle_date),
      ...(huntRes.data ?? []).map((r: any) => r.puzzle_date),
      ...(wheelRes.data ?? []).map((r: any) => r.puzzle_date),
      ...(freezeRows ?? []).map((r: any) => r.frozen_date),
    ]

    // Pull every chest row this player owns so we can detect prior unclaimed
    // cycles — chests that became claimable but never got picked up before a
    // new week started.
    const { data: chestRows } = await supabase
      .from('daily_weekly_chests')
      .select('cycle_start, tier, contents, opened_at')
      .eq('player_id', user.id)

    const openedCycleStarts = new Set(
      (chestRows ?? [])
        .filter((c: any) => !!c.opened_at)
        .map((c: any) => c.cycle_start as string)
    )

    // Find any fully-completed 7-day chunks across the player's history that
    // haven't been claimed yet. Oldest unclaimed wins so backlog clears in order.
    const completedCycles = findCompletedCycles(allDates)
    const unclaimed = completedCycles.find(c => !openedCycleStarts.has(c.cycleStart))

    // Backdated path: prior cycle still owed — surface it as the active cycle so
    // the player can still claim what they earned even after a new week began.
    // In-progress path: show current streak from `today` backward.
    const progress = unclaimed
      ? {
          cycleStart: unclaimed.cycleStart,
          cycleNumber: unclaimed.cycleNumber,
          completedDates: unclaimed.completedDates,
          daysCompleted: 7,
          isClaimable: true,
        }
      : computeCycleProgress(allDates, today)

    // Projected tier — what tier the chest would be if claimed right now, based
    // on the player's performance so far this cycle. Puzzle/Hunt/Wheel all
    // contribute equally so daily-puzzle-only players can still earn gold.
    const { weekScore, tier: projectedTier } = computeChestTierForCycle(
      progress.completedDates,
      (huntRes.data ?? []) as HuntScoreRow[],
      (wheelRes.data ?? []) as WheelScoreRow[],
      (puzzleRes.data ?? []) as PuzzleScoreRow[],
    )

    const existingChest = (chestRows ?? []).find(
      (c: any) => c.cycle_start === progress.cycleStart
    )
    const alreadyClaimed = !!existingChest?.opened_at
    const isClaimable = progress.isClaimable && !alreadyClaimed

    const pendingChest = isClaimable && existingChest
      ? {
          tier: existingChest.tier,
          coins: existingChest.contents?.coins,
          badgeId: existingChest.contents?.badge_id,
        }
      : null

    return NextResponse.json({
      cycleStart: progress.cycleStart,
      cycleNumber: progress.cycleNumber,
      completedDates: progress.completedDates,
      daysCompleted: progress.daysCompleted,
      isClaimable,
      pendingChest,
      weekScore,
      projectedTier,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('Weekly chest status error:', errorMessage)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
