import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/email'
import { getAuthedUser } from '@/lib/auth/getAuthedUser'
import {
  computeCycleProgress,
  computeCurrentStreak,
  computeChestTierForCycle,
  findCompletedCycles,
} from '@/lib/daily/weeklyChest'
import { loadChestActivity } from '@/lib/daily/weeklyChestData'
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
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthedUser(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Service client: bearer-only sessions (native app) carry no cookie, so a
    // cookie client would return RLS-empty rows. Every query below is filtered
    // strictly by user.id.
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      logger.error('Weekly chest status: admin client unavailable')
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    const today = new Date().toISOString().split('T')[0]

    // One shared loader (also used by /claim) so status and claim can never
    // diverge on which days count.
    const { huntRows, wheelRows, puzzleRows, allDates } = await loadChestActivity(supabase, user.id)

    // Pull every chest row this player owns so we can detect prior unclaimed
    // cycles — chests that became claimable but never got picked up before a
    // new week started.
    const { data: chestRows, error: chestErr } = await supabase
      .from('daily_weekly_chests')
      .select('cycle_start, tier, contents, opened_at')
      .eq('player_id', user.id)
    if (chestErr) throw new Error(chestErr.message)

    const openedCycleStarts = new Set(
      (chestRows ?? [])
        .filter((c: any) => !!c.opened_at)
        .map((c: any) => c.cycle_start as string)
    )

    // The live streak (full run, grace-aware) is independent of which cycle we
    // surface below — it's the same number every homepage "fire" icon shows, so
    // compute it once from the combined dates and return it on every branch.
    const currentStreak = computeCurrentStreak(allDates, today)

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
      huntRows,
      wheelRows,
      puzzleRows,
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
      currentStreak,
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
