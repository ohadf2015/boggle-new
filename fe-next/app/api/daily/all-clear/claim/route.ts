import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/auth/getAuthedUser'
import { createAdminClient } from '@/utils/supabase/admin'
import { getDailyChallengeDate } from '@/utils/dailyChallenge/dateUtils'
import { awardCoinsServer } from '@/backend/services/economy/awardCoins'
import { ALL_CLEAR_COINS, ALL_CLEAR_XP } from '@/lib/daily/allClearReward'
import logger from '@/utils/logger'

// Same four tables as /api/daily/status, so "cleared" means the same thing here.
const MODE_TABLES: Array<{ table: string; catchupFlag: boolean }> = [
  { table: 'daily_word_hunt_attempts', catchupFlag: true },
  { table: 'daily_word_wheel_attempts', catchupFlag: true },
  { table: 'daily_word_tower_attempts', catchupFlag: false },
  { table: 'connections_daily_scores', catchupFlag: false },
]

export async function POST(request: NextRequest) {
  try {
    return await claim(request)
  } catch (error) {
    logger.error('Daily all-clear claim error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function claim(request: NextRequest) {
  const user = await getAuthedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) {
    logger.error('Daily all-clear claim: admin client unavailable')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  const today = getDailyChallengeDate()

  const played = await Promise.all(
    MODE_TABLES.map(async ({ table, catchupFlag }) => {
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

  const reward = { claimed: true, coins: ALL_CLEAR_COINS, xp: ALL_CLEAR_XP }

  // PRIMARY KEY (player_id, claim_date) is the race guard: 23505 means a
  // previous claim (or a concurrent double-tap) already paid today.
  const { error: insertError } = await supabase
    .from('daily_all_clear_claims')
    .insert({ player_id: user.id, claim_date: today, coins: ALL_CLEAR_COINS, xp: ALL_CLEAR_XP })
  if (insertError) {
    if ((insertError as { code?: string }).code === '23505') {
      return NextResponse.json({ ...reward, claimed: false })
    }
    logger.error('Daily all-clear claim: insert failed:', insertError.message)
    return NextResponse.json({ error: 'Failed to save claim' }, { status: 500 })
  }

  const awarded = await awardCoinsServer(user.id, ALL_CLEAR_COINS, 'daily_all_clear', { date: today })
  if (!awarded.success) {
    // Reopen the day so a retry can pay; otherwise the row blocks it with no coins given.
    const { error: rollbackError } = await supabase
      .from('daily_all_clear_claims')
      .delete()
      .eq('player_id', user.id)
      .eq('claim_date', today)
    if (rollbackError) {
      logger.error('Daily all-clear claim: rollback failed:', rollbackError.message)
    }
    return NextResponse.json({ error: 'Failed to award coins' }, { status: 502 })
  }

  const { error: xpError } = await supabase.rpc('increment_player_xp', {
    p_player_id: user.id,
    p_xp_amount: ALL_CLEAR_XP,
  })
  if (xpError) logger.error('Daily all-clear claim: xp grant failed:', xpError.message)

  return NextResponse.json(reward)
}
