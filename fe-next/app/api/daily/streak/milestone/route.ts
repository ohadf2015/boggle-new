import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/auth/getAuthedUser'
import { getSupabaseAdmin } from '@/lib/email'
import { checkApiRateLimit } from '@/lib/apiRateLimit'
import { claimStreakMilestone } from '@/lib/daily/streakClaims.server'
import logger from '@/utils/logger'

/** POST /api/daily/streak/milestone: pays the highest streak milestone the server can verify. */
export async function POST(request: NextRequest) {
  try {
    if (!checkApiRateLimit(request, 'streak-milestone', { maxRequests: 10, windowMs: 60_000 }).success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const user = await getAuthedUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const supabase = getSupabaseAdmin()
    if (!supabase) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

    const today = new Date().toISOString().split('T')[0]
    const { status, body } = await claimStreakMilestone(supabase, user.id, today)
    return NextResponse.json(body, { status })
  } catch (error) {
    logger.error('Streak milestone claim error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
