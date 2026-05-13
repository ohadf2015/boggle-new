import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import {
  computeCycleProgress,
  computeWeekScore,
  getChestTier,
  type DayScore,
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

  const [puzzleRes, huntRes, wheelRes] = await Promise.all([
    supabase
      .from('daily_puzzle_attempts')
      .select('puzzle_date')
      .eq('player_id', user.id),
    supabase
      .from('daily_word_hunt_attempts')
      .select('puzzle_date,efficiency_score')
      .eq('player_id', user.id),
    supabase
      .from('daily_word_wheel_attempts')
      .select('puzzle_date,score,time_seconds')
      .eq('player_id', user.id),
  ])

  const allDates = [
    ...(puzzleRes.data ?? []).map((r: { puzzle_date: string }) => r.puzzle_date),
    ...(huntRes.data ?? []).map((r: { puzzle_date: string }) => r.puzzle_date),
    ...(wheelRes.data ?? []).map((r: { puzzle_date: string }) => r.puzzle_date),
  ]

  const progress = computeCycleProgress(allDates, today)

  if (!progress.isClaimable) {
    return NextResponse.json({ error: 'Chest not ready' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('daily_weekly_chests')
    .select('id, opened_at, tier, contents')
    .eq('player_id', user.id)
    .eq('cycle_start', progress.cycleStart)

  if (existing?.[0]?.opened_at) {
    return NextResponse.json({ error: 'Already claimed' }, { status: 409 })
  }

  const cycleDateSet = new Set(progress.completedDates)
  const scores: DayScore[] = [
    ...(huntRes.data ?? [])
      .filter((r: { puzzle_date: string }) => cycleDateSet.has(r.puzzle_date))
      .map(
        (r: { efficiency_score: number }) =>
          ({
            mode: 'word_hunt' as const,
            rawScore: r.efficiency_score ?? 0,
            timeSeconds: null,
          }) satisfies DayScore
      ),
    ...(wheelRes.data ?? [])
      .filter((r: { puzzle_date: string }) => cycleDateSet.has(r.puzzle_date))
      .map(
        (r: { score: number; time_seconds: number }) =>
          ({
            mode: 'word_wheel' as const,
            rawScore: r.score ?? 0,
            timeSeconds: r.time_seconds,
          }) satisfies DayScore
      ),
  ]

  const weekScore = computeWeekScore(scores)
  const tier = getChestTier(weekScore)

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
