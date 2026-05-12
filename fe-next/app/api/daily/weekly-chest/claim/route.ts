import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import {
  computeCycleProgress,
  computeWeekScore,
  getChestTier,
  type DayScore,
} from '@/lib/daily/weeklyChest'
import { awardCoinsServer } from '@/backend/services/economy/awardCoins'

const CHEST_REWARDS = {
  bronze: { coins: 150, badge_id: 'badge_weekly_bronze' },
  silver: { coins: 300, badge_id: 'badge_weekly_silver' },
  gold: { coins: 600, badge_id: 'badge_weekly_gold' },
} as const

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().split('T')[0]

  // Fetch all daily attempt records for the player
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

  // Collect all unique dates where the player completed any daily
  const allDates = [
    ...(puzzleRes.data ?? []).map((r: { puzzle_date: string }) => r.puzzle_date),
    ...(huntRes.data ?? []).map((r: { puzzle_date: string }) => r.puzzle_date),
    ...(wheelRes.data ?? []).map((r: { puzzle_date: string }) => r.puzzle_date),
  ]

  // Compute the current cycle progress
  const progress = computeCycleProgress(allDates, today)

  // Check if chest is claimable (7 consecutive days completed)
  if (!progress.isClaimable) {
    return NextResponse.json({ error: 'Chest not ready' }, { status: 400 })
  }

  // Check if already claimed in current cycle
  const { data: existing } = await supabase
    .from('daily_weekly_chests')
    .select('id, opened_at, tier, contents')
    .eq('player_id', user.id)
    .eq('cycle_start', progress.cycleStart)

  if (existing?.[0]?.opened_at) {
    return NextResponse.json({ error: 'Already claimed' }, { status: 409 })
  }

  // Compute week score from scores in the current cycle
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
  const reward = CHEST_REWARDS[tier]
  const contents = { ...reward, week_score: weekScore }
  const nowIso = new Date().toISOString()

  // Insert or update the chest record
  if (existing?.[0]) {
    // Update existing row (rare case where chest was created but not opened)
    await supabase
      .from('daily_weekly_chests')
      .update({ tier, contents, opened_at: nowIso })
      .eq('id', existing[0].id)
  } else {
    // Insert new chest record
    await supabase.from('daily_weekly_chests').insert({
      player_id: user.id,
      cycle_start: progress.cycleStart,
      cycle_number: progress.cycleNumber,
      tier,
      contents,
      opened_at: nowIso,
    })
  }

  // Award coins
  await awardCoinsServer(user.id, reward.coins, 'daily_weekly_chest', {
    tier,
    cycle_number: String(progress.cycleNumber),
  })

  return NextResponse.json({
    tier,
    coins: reward.coins,
    badgeId: reward.badge_id,
    cycleNumber: progress.cycleNumber,
  })
}
