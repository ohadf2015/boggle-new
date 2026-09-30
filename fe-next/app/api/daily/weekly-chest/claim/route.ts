import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/auth/getAuthedUser'
import { getSupabaseAdmin } from '@/lib/email'
import {
  computeCycleProgress,
  computeChestTierForCycle,
  findCompletedCycles,
} from '@/lib/daily/weeklyChest'
import { loadChestActivity } from '@/lib/daily/weeklyChestData'
import { selectChestPrize } from '@/lib/daily/chestPrizePool'
import { awardCoinsServer } from '@/backend/services/economy/awardCoins'
import logger from '@/utils/logger'

export async function POST(request: NextRequest) {
  try {
    return await claim(request)
  } catch (error) {
    logger.error('Weekly chest claim error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function claim(request: NextRequest) {
  const user = await getAuthedUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Service client so bearer-only sessions (native app) work; every query is
  // filtered strictly by user.id.
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    logger.error('Weekly chest claim: admin client unavailable')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  const today = new Date().toISOString().split('T')[0]

  // Shared with /weekly-chest/status so both always agree on which days count.
  const { huntRows, wheelRows, puzzleRows, allDates } = await loadChestActivity(supabase, user.id)

  // Pull every chest row for this player so we can resolve which cycle the
  // claim should apply to — current in-progress streak OR an older unclaimed
  // chest that the player never picked up before the next week began.
  const { data: allChests, error: chestsErr } = await supabase
    .from('daily_weekly_chests')
    .select('id, cycle_start, opened_at, tier, contents')
    .eq('player_id', user.id)
  if (chestsErr) throw new Error(chestsErr.message)

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
    huntRows,
    wheelRows,
    puzzleRows,
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

  // Race guard: two concurrent claims (double-click, retry) must never both pay
  // out. Update is conditional on opened_at IS NULL and must match a row; insert
  // relies on UNIQUE (player_id, cycle_start) — 23505 means someone else won.
  if (existing?.[0]) {
    const { data: updated, error } = await supabase
      .from('daily_weekly_chests')
      .update({ tier, contents, opened_at: nowIso })
      .eq('id', existing[0].id)
      .is('opened_at', null)
      .select('id')
    if (error) return NextResponse.json({ error: 'Failed to save chest' }, { status: 500 })
    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: 'Already claimed' }, { status: 409 })
    }
  } else {
    const { error } = await supabase.from('daily_weekly_chests').insert({
      player_id: user.id,
      cycle_start: progress.cycleStart,
      cycle_number: progress.cycleNumber,
      tier,
      contents,
      opened_at: nowIso,
    })
    if (error) {
      if ((error as { code?: string }).code === '23505') {
        return NextResponse.json({ error: 'Already claimed' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to save chest' }, { status: 500 })
    }
  }

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
