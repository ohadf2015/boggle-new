import type { SupabaseClient } from '@supabase/supabase-js'
import logger from '@/utils/logger'
import { awardCoinsServer } from '@/backend/services/economy/awardCoins'
import { loadChestActivity } from './weeklyChestData'
import { computeCurrentStreak } from './weeklyChest'
import { loadMilestoneClaims } from './streakExtras.server'
import { loadCarriedDates } from './streakCarryover.server'
import { claimableMilestone, FREEZE_PRICE, MAX_HELD_FREEZES } from './streakRewards'

export interface ClaimResult {
  status: number
  body: Record<string, unknown>
}

/**
 * Pays the streak milestone the server can prove from attempt rows. The claim
 * row's primary key stops a double tap paying twice; a failed coin grant
 * removes the row so a retry can pay.
 */
export async function claimStreakMilestone(db: SupabaseClient, playerId: string, today: string): Promise<ClaimResult> {
  const [{ allDates }, carried, claims] = await Promise.all([
    loadChestActivity(db, playerId),
    loadCarriedDates(db, playerId),
    loadMilestoneClaims(db, playerId),
  ])
  if (!claims) return { status: 503, body: { error: 'Milestones unavailable' } }

  const milestone = claimableMilestone(computeCurrentStreak([...new Set([...allDates, ...carried])], today), claims)
  if (!milestone) return { status: 400, body: { error: 'Nothing to claim' } }

  const { error: insertError } = await db
    .from('daily_streak_milestone_claims')
    .insert({ player_id: playerId, milestone: milestone.days, coins: milestone.coins })
  if (insertError) {
    if ((insertError as { code?: string }).code === '23505') {
      return { status: 200, body: { claimed: false, days: milestone.days, coins: milestone.coins } }
    }
    logger.error('Streak milestone claim: insert failed:', insertError.message)
    return { status: 500, body: { error: 'Failed to save claim' } }
  }

  const awarded = await awardCoinsServer(playerId, milestone.coins, 'daily_streak_milestone', { milestone: milestone.days })
  if (!awarded.success) {
    const { error: rollbackError } = await db
      .from('daily_streak_milestone_claims')
      .delete()
      .eq('player_id', playerId)
      .eq('milestone', milestone.days)
    if (rollbackError) logger.error('Streak milestone claim: rollback failed:', rollbackError.message)
    return { status: 502, body: { error: 'Failed to award coins' } }
  }

  return {
    status: 200,
    body: { claimed: true, days: milestone.days, coins: milestone.coins, newBalance: awarded.newBalance },
  }
}

type BuyRow = { success: boolean; freezes: number; new_balance: number; error_message: string | null }

const BUY_ERRORS: Record<string, number> = { max_held: 409, insufficient_coins: 402 }

/** Price and cap come from the server constants, never the request. */
export async function buyStreakFreeze(db: SupabaseClient, playerId: string): Promise<ClaimResult> {
  const { data, error } = await db.rpc('buy_streak_freeze', {
    p_user_id: playerId,
    p_price: FREEZE_PRICE,
    p_max: MAX_HELD_FREEZES,
  })
  if (error) {
    logger.error('Streak freeze purchase failed:', error.message)
    return { status: 503, body: { error: 'Freeze shop unavailable' } }
  }
  const row = (data as BuyRow[] | null)?.[0]
  if (!row) return { status: 500, body: { error: 'Purchase failed' } }
  if (!row.success) {
    const reason = row.error_message ?? 'purchase_failed'
    return { status: BUY_ERRORS[reason] ?? 400, body: { error: reason, freezes: row.freezes, newBalance: row.new_balance } }
  }
  return { status: 200, body: { freezes: row.freezes, newBalance: row.new_balance } }
}
