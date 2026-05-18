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
import { selectChestPrize } from '@/lib/daily/chestPrizePool'
import { awardCoinsServer } from '@/backend/services/economy/awardCoins'

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().split('T')[0]

  // Only *completed* attempts count toward the streak — keep this in sync with
  // /api/daily/weekly-chest/status.
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
      .eq('solved', true),
    supabase
      .from('daily_word_wheel_attempts')
      .select('puzzle_date,score,time_seconds')
      .eq('player_id', user.id)
      .gt('word_count', 0),
  ])

  const allDates = [
    ...(puzzleRes.data ?? []).map((r: { puzzle_date: string }) => r.puzzle_date),
    ...(huntRes.data ?? []).map((r: { puzzle_date: string }) => r.puzzle_date),
    ...(wheelRes.data ?? []).map((r: { puzzle_date: string }) => r.puzzle_date),
  ]

  // Pull every chest row for this player so we can resolve which cycle the
  // claim should apply to — current in-progress streak OR an older unclaimed
  // chest that the player never picked up before the next week began.
  const { data: allChests } = await supabase
    .from('daily_weekly_chests')
    .select('id, cycle_start, opened_at, tier, contents')
    .eq('player_id', user.id)

  const openedCycleStarts = new Set(
    (allChests ?? []).filter((c: any) => !!c.opened_at).map((c: any) => c.cycle_start as string)
  )

  const completedCycles = findCompletedCycles(allDates)
  const oldestUnclaimed = completedCycles.find(c => !openedCycleStarts.has(c.cycleStart))

  const liveProgress = computeCycleProgress(allDates, today)
  const progress = oldestUnclaimed
    ? {
        cycleStart: oldestUnclaimed.cycleStart,
        cycleNumber: oldestUnclaimed.cycleNumber,
        completedDates: oldestUnclaimed.completedDates,
        daysCompleted: 7,
        isClaimable: true,
      }
    : liveProgress

  if (!progress.isClaimable) {
    return NextResponse.json({ error: 'Chest not ready' }, { status: 400 })
  }

  const existing = (allChests ?? []).filter((c: any) => c.cycle_start === progress.cycleStart)

  if (existing[0]?.opened_at) {
    return NextResponse.json({ error: 'Already claimed' }, { status: 409 })
  }

  const { weekScore, tier } = computeChestTierForCycle(
    progress.completedDates,
    (huntRes.data ?? []) as HuntScoreRow[],
    (wheelRes.data ?? []) as WheelScoreRow[],
    (puzzleRes.data ?? []) as PuzzleScoreRow[],
  )

  // Deterministic seed → retry-safe (same user + cycle = same prize).
  const prize = selectChestPrize(tier, `${user.id}::${progress.cycleStart}`)

  const contents = {
    coins: prize.coins,
    freezes: prize.freezes,
    badge_id: prize.badgeId,
    variant_id: prize.variantId,
    label_key: prize.labelKey,
    week_score: weekScore,
  }
  const nowIso = new Date().toISOString()

  let dbError: unknown
  if (existing?.[0]) {
    const { error } = await supabase
      .from('daily_weekly_chests')
      .update({ tier, contents, opened_at: nowIso })
      .eq('id', existing[0].id)
    dbError = error
  } else {
    const { error } = await supabase.from('daily_weekly_chests').insert({
      player_id: user.id,
      cycle_start: progress.cycleStart,
      cycle_number: progress.cycleNumber,
      tier,
      contents,
      opened_at: nowIso,
    })
    dbError = error
  }
  if (dbError) return NextResponse.json({ error: 'Failed to save chest' }, { status: 500 })

  await awardCoinsServer(user.id, prize.coins, 'daily_weekly_chest', {
    tier,
    cycle_number: String(progress.cycleNumber),
    variant_id: prize.variantId,
  })

  // Grant streak freezes when the prize variant includes them. Soft-fail: if
  // the engagement row doesn't exist yet, skip silently rather than block the
  // chest claim — the player still gets coins + badge.
  if (prize.freezes > 0) {
    const { data: engagement } = await supabase
      .from('player_engagement')
      .select('streak_freezes_available')
      .eq('player_id', user.id)
      .maybeSingle()

    if (engagement) {
      await supabase
        .from('player_engagement')
        .update({
          streak_freezes_available:
            (engagement.streak_freezes_available || 0) + prize.freezes,
        })
        .eq('player_id', user.id)
    }
  }

  return NextResponse.json({
    tier,
    coins: prize.coins,
    freezes: prize.freezes,
    badgeId: prize.badgeId,
    variantId: prize.variantId,
    labelKey: prize.labelKey,
    cycleNumber: progress.cycleNumber,
  })
}
