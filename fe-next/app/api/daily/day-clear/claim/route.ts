import { NextRequest } from 'next/server'
import { handleDayPrizeClaim, handleDayPrizeMode } from '@/lib/daily/claimDayPrize.server'

/** Day cleared: Word Wheel + Word Hunt done. Pays a rolled prize once per day. */
export async function POST(request: NextRequest) {
  return handleDayPrizeClaim(request, 'clear')
}

/** Whether this player's box is the education side's fixed prize (read-only). */
export async function GET(request: NextRequest) {
  return handleDayPrizeMode(request)
}
