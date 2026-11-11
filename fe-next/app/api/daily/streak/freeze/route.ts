import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/auth/getAuthedUser'
import { getSupabaseAdmin } from '@/lib/email'
import { checkApiRateLimit } from '@/lib/apiRateLimit'
import { buyStreakFreeze } from '@/lib/daily/streakClaims.server'
import logger from '@/utils/logger'

/** POST /api/daily/streak/freeze: buys one streak freeze for coins. */
export async function POST(request: NextRequest) {
  try {
    if (!checkApiRateLimit(request, 'streak-freeze-buy', { maxRequests: 10, windowMs: 60_000 }).success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const user = await getAuthedUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const supabase = getSupabaseAdmin()
    if (!supabase) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

    const { status, body } = await buyStreakFreeze(supabase, user.id)
    return NextResponse.json(body, { status })
  } catch (error) {
    logger.error('Streak freeze purchase error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
