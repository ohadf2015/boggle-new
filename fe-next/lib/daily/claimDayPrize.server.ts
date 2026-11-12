import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/auth/getAuthedUser'
import { createAdminClient } from '@/utils/supabase/admin'
import { getDailyChallengeDate } from '@/utils/dailyChallenge/dateUtils'
import { awardCoinsServer, type AwardCoinsReason } from '@/backend/services/economy/awardCoins'
import { eduDayPrize, rollDayPrize, type DayPrizeClaimResponse, type DayPrizeKind } from '@/lib/daily/dayPrize'
import logger from '@/utils/logger'
import { grantChestPart, readChestPart } from '@/lib/avatar/grantChestPart.server'
import type { ChestDropSource } from '@/lib/avatar/chestDrops'

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

const PART_SOURCE: Record<DayPrizeKind, ChestDropSource> = { clear: 'day_clear', perfect: 'day_perfect' }

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>

/**
 * Play inside the education system: a teacher account, or a student in any
 * classroom. Those players get the fixed prize (no roll). Admins always get
 * the normal box, even when they joined classrooms to test them. A failed
 * lookup throws, so the claim answers 500 rather than guessing.
 */
async function isEducationAccount(supabase: AdminClient, userId: string): Promise<boolean> {
  const [profile, membership] = await Promise.all([
    supabase.from('profiles').select('user_role').eq('id', userId).limit(1),
    supabase.from('classroom_memberships').select('classroom_id').eq('student_id', userId).limit(1),
  ])
  if (profile.error) throw new Error(`profiles: ${profile.error.message}`)
  if (membership.error) throw new Error(`classroom_memberships: ${membership.error.message}`)
  const role = (profile.data?.[0] as { user_role?: string } | undefined)?.user_role
  if (role === 'admin') return false
  return role === 'teacher' || (membership.data?.length ?? 0) > 0
}

/**
 * Today's chest if it was already opened (as either box), rebuilt from its
 * claim row: coins and XP as paid, the tier from the same seeded roll, and the
 * item from the drop ledger. Lets every device show "opened" after a reload.
 */
async function openedToday(supabase: AdminClient, userId: string, today: string, fixed: boolean): Promise<DayPrizeClaimResponse | null> {
  for (const kind of ['perfect', 'clear'] as const) {
    const { data, error } = await supabase
      .from(DAY_PRIZE_CONFIG[kind].claimTable)
      .select('coins, xp')
      .eq('player_id', userId)
      .eq('claim_date', today)
      .limit(1)
    if (error) throw new Error(`${DAY_PRIZE_CONFIG[kind].claimTable}: ${error.message}`)
    const row = data?.[0] as { coins: number; xp: number } | undefined
    if (!row) continue
    const roll = fixed ? eduDayPrize(kind) : rollDayPrize(userId, today, kind)
    const part = fixed ? null : await readChestPart(supabase, userId, PART_SOURCE[kind], today)
    return {
      kind,
      tier: roll.coins === row.coins ? roll.tier : 'common',
      coins: row.coins,
      xp: row.xp,
      fixed,
      claimed: false,
      ...(part ? { part } : {}),
    }
  }
  return null
}

/**
 * GET on either claim route: whether this player's box is the fixed one (so
 * the closed box can drop the shake and odds), and today's chest if it is
 * already open.
 */
export async function handleDayPrizeMode(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getAuthedUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const supabase = createAdminClient()
    if (!supabase) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    const fixed = await isEducationAccount(supabase, user.id)
    const opened = await openedToday(supabase, user.id, getDailyChallengeDate(), fixed)
    return NextResponse.json({ fixed, opened }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    logger.error('Daily prize mode error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Shared POST handler for both daily prizes. Re-checks the attempt tables
 * server-side, rolls the prize from (player, date, kind) — or, for the
 * education side, pays the fixed amount — writes the claim row
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

  // One chest a day: the day-clear box, or the bigger perfect-day box when all
  // four were done before opening. Once either is open, the other stays shut.
  const other = DAY_PRIZE_CONFIG[kind === 'clear' ? 'perfect' : 'clear']
  const { data: otherRows, error: otherError } = await supabase
    .from(other.claimTable)
    .select('claim_date')
    .eq('player_id', user.id)
    .eq('claim_date', today)
    .limit(1)
  if (otherError) throw new Error(`${other.claimTable}: ${otherError.message}`)
  if ((otherRows?.length ?? 0) > 0) {
    return NextResponse.json({ error: "Today's chest is already open" }, { status: 409 })
  }

  const prize = (await isEducationAccount(supabase, user.id)) ? eduDayPrize(kind) : rollDayPrize(user.id, today, kind)
  // Every random box also holds one avatar part (lib/avatar/chestDrops). The
  // education side keeps its fixed prize: no roll, so no part either.
  const withPart = async () => {
    if (prize.fixed) return {}
    const granted = await grantChestPart({ supabase, playerId: user.id, source: PART_SOURCE[kind], sourceKey: today })
    return granted ? { part: granted.drop } : {}
  }

  const { error: insertError } = await supabase
    .from(config.claimTable)
    .insert({ player_id: user.id, claim_date: today, coins: prize.coins, xp: prize.xp })
  if (insertError) {
    if ((insertError as { code?: string }).code === '23505') {
      return NextResponse.json({ ...prize, claimed: false, ...(await withPart()) })
    }
    logger.error(`Daily ${kind} prize claim: insert failed:`, insertError.message)
    return NextResponse.json({ error: 'Failed to save claim' }, { status: 500 })
  }

  const awarded = await awardCoinsServer(user.id, prize.coins, config.reason, { date: today, tier: prize.fixed ? 'fixed' : prize.tier })
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

  return NextResponse.json({ ...prize, claimed: true, ...(await withPart()) })
}
