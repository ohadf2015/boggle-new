import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getMissedCatchUpDates } from '@/utils/dailyChallenge/catchUp'
import { getPuzzleNumber } from '@/utils/dailyChallenge/dateUtils'
import logger from '@/utils/logger'

/**
 * GET /api/daily/missed
 * Daily Word Hunt challenges in the catch-up window (last 3 days) that the
 * authenticated player has NOT yet completed. Powers the post-results
 * "catch up your missed dailies" suggestion.
 *
 * Returns: { today, missed: [{ date, puzzleNumber }] } — newest first.
 * Guests (no session) get an empty list; the client handles them locally.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const today = new Date().toISOString().split('T')[0]

    if (!user) {
      return NextResponse.json({ today, missed: [] })
    }

    // A day in the window counts as "done" if there's any solved Word Hunt
    // attempt for it — including a prior catch-up — so we don't re-suggest it.
    const { data: solvedRows } = await supabase
      .from('daily_word_hunt_attempts')
      .select('puzzle_date')
      .eq('player_id', user.id)
      .eq('solved', true)

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
