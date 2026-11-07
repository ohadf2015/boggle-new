import { NextRequest } from 'next/server'
import { handleDayPrizeClaim } from '@/lib/daily/claimDayPrize.server'

/** Perfect day: all four daily quests done. Pays a rolled prize once per day. */
export async function POST(request: NextRequest) {
  return handleDayPrizeClaim(request, 'perfect')
}
