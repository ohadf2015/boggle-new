import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getMissedCatchUpDates } from '@/utils/dailyChallenge/catchUp'
import { getPuzzleNumber } from '@/utils/dailyChallenge/dateUtils'
import logger from '@/utils/logger'

/**
 * GET /api/daily/missed?mode=word-hunt|word-wheel
 * Daily challenges (Word Hunt or Word Wheel) in the catch-up window (last 3 days) that the
 * authenticated player has NOT yet completed. Powers the post-results
 * "catch up your missed dailies" suggestion.
 *
 * Returns: { today, missed: [{ date, puzzleNumber }] } — newest first.
 * Guests (no session) get an empty list; the client handles them locally.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const today = new Date().toISOString().split('T')[0]
    const mode = request.nextUrl.searchParams.get('mode') || 'word-hunt'

    if (!user) {
      return NextResponse.json({ today, missed: [] })
    }

    // Pick table based on mode
    const table = mode === 'word-wheel' ? 'daily_word_wheel_attempts' : 'daily_word_hunt_attempts'

    // Word Hunt uses 'solved', Word Wheel just checks existence (any score counts as played)
    let query = supabase.from(table).select('puzzle_date').eq('player_id', user.id)
    if (mode === 'word-hunt') {
      query = query.eq('solved', true)
    }

    const { data: solvedRows } = await query

    const completed = (solvedRows ?? []).map((r: { puzzle_date: string }) => r.puzzle_date)
    const missed = getMissedCatchUpDates(today, completed).map(date => ({
      date,
      puzzleNumber: getPuzzleNumber(date),
    }))

    return NextResponse.json({ today, missed })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('Daily missed lookup error:', message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
