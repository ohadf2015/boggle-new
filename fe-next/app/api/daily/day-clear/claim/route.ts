import { NextRequest } from 'next/server'
import { handleDayPrizeClaim } from '@/lib/daily/claimDayPrize.server'

/** Day cleared: Word Wheel + Word Hunt done. Pays a rolled prize once per day. */
export async function POST(request: NextRequest) {
  return handleDayPrizeClaim(request, 'clear')
}
