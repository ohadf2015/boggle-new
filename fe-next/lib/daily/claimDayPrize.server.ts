import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/auth/getAuthedUser'
import { createAdminClient } from '@/utils/supabase/admin'
import { getDailyChallengeDate } from '@/utils/dailyChallenge/dateUtils'
import { awardCoinsServer, type AwardCoinsReason } from '@/backend/services/economy/awardCoins'
import { rollDayPrize, type DayPrizeKind } from '@/lib/daily/dayPrize'
import logger from '@/utils/logger'

/** Attempt tables per daily mode, the same ones /api/daily/status reads. */
const HUNT = { table: 'daily_word_hunt_attempts', catchupFlag: true }
const WHEEL = { table: 'daily_word_wheel_attempts', catchupFlag: true }
const TOWER = { table: 'daily_word_tower_attempts', catchupFlag: false }
const CONNECTIONS = { table: 'connections_daily_scores', catchupFlag: false }

interface PrizeConfig {
  /** Modes that must have a non-catch-up attempt today. */
  tables: Array<{ table: string; catchupFlag: boolean }>
  /** One row per player per day; its primary key is the double-pay guard. */
  claimTable: string
  /** Coin ledger reason. */
  reason: AwardCoinsReason
}

export const DAY_PRIZE_CONFIG: Record<DayPrizeKind, PrizeConfig> = {
  clear: { tables: [WHEEL, HUNT], claimTable: 'daily_day_clear_claims', reason: 'daily_day_clear' },
  perfect: { tables: [HUNT, WHEEL, TOWER, CONNECTIONS], claimTable: 'daily_all_clear_claims', reason: 'daily_all_clear' },
}

/**
 * Shared POST handler for both daily prizes. Re-checks the attempt tables
 * server-side, rolls the prize from (player, date, kind), writes the claim row
 * (its primary key stops a double-tap paying twice) and pays coins + XP. A
 * repeat claim answers 200 with `claimed: false` and the same prize, so the
 * client can show what the box held without paying again.
 */
export async function handleDayPrizeClaim(request: NextRequest, kind: DayPrizeKind): Promise<NextResponse> {
  try {
    return await claim(request, kind)
  } catch (error) {
    logger.error(`Daily ${kind} prize claim error:`, error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function claim(request: NextRequest, kind: DayPrizeKind): Promise<NextResponse> {
  const user = await getAuthedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) {
    logger.error(`Daily ${kind} prize claim: admin client unavailable`)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  const config = DAY_PRIZE_CONFIG[kind]
  const today = getDailyChallengeDate()

  const played = await Promise.all(
    config.tables.map(async ({ table, catchupFlag }) => {
      let q = supabase.from(table).select('puzzle_date').eq('player_id', user.id).eq('puzzle_date', today)
      if (catchupFlag) q = q.eq('is_catchup', false)
      const { data, error } = await q.limit(1)
      if (error) throw new Error(`${table}: ${error.message}`)
      return (data?.length ?? 0) > 0
    }),
  )
  if (!played.every(Boolean)) {
    return NextResponse.json({ error: 'Day not cleared' }, { status: 400 })
  }

  const prize = rollDayPrize(user.id, today, kind)

  const { error: insertError } = await supabase
    .from(config.claimTable)
    .insert({ player_id: user.id, claim_date: today, coins: prize.coins, xp: prize.xp })
  if (insertError) {
    if ((insertError as { code?: string }).code === '23505') {
      return NextResponse.json({ ...prize, claimed: false })
    }
    logger.error(`Daily ${kind} prize claim: insert failed:`, insertError.message)
    return NextResponse.json({ error: 'Failed to save claim' }, { status: 500 })
  }

  const awarded = await awardCoinsServer(user.id, prize.coins, config.reason, { date: today, tier: prize.tier })
  if (!awarded.success) {
    // Reopen the day so a retry can pay; otherwise the row blocks it with no coins given.
    const { error: rollbackError } = await supabase
      .from(config.claimTable)
      .delete()
      .eq('player_id', user.id)
      .eq('claim_date', today)
    if (rollbackError) logger.error(`Daily ${kind} prize claim: rollback failed:`, rollbackError.message)
    return NextResponse.json({ error: 'Failed to award coins' }, { status: 502 })
  }

  const { error: xpError } = await supabase.rpc('increment_player_xp', {
    p_player_id: user.id,
    p_xp_amount: prize.xp,
  })
  if (xpError) logger.error(`Daily ${kind} prize claim: xp grant failed:`, xpError.message)

  return NextResponse.json({ ...prize, claimed: true })
}
