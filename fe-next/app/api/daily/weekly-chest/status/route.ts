import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { computeCycleProgress } from '@/lib/daily/weeklyChest'
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

    // Fetch all completed attempts across the three daily modes
    const [puzzleRes, huntRes, wheelRes] = await Promise.all([
      supabase
        .from('daily_puzzle_attempts')
        .select('puzzle_date')
        .eq('player_id', user.id),
      supabase
        .from('daily_word_hunt_attempts')
        .select('puzzle_date')
        .eq('player_id', user.id),
      supabase
        .from('daily_word_wheel_attempts')
        .select('puzzle_date')
        .eq('player_id', user.id),
    ])

    // Combine all attempt dates
    const allDates = [
      ...(puzzleRes.data ?? []).map((r: any) => r.puzzle_date),
      ...(huntRes.data ?? []).map((r: any) => r.puzzle_date),
      ...(wheelRes.data ?? []).map((r: any) => r.puzzle_date),
    ]

    // Compute cycle progress
    const progress = computeCycleProgress(allDates, today)

    // Check for existing chest in this cycle
    const { data: existingChests } = await supabase
      .from('daily_weekly_chests')
      .select('tier, contents, opened_at')
      .eq('player_id', user.id)
      .eq('cycle_start', progress.cycleStart)

    const existingChest = existingChests?.[0]
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
