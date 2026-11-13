import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getAuthedUser } from '@/lib/auth/getAuthedUser'
import { getCatchUpDates, getMissedCatchUpDates } from '@/utils/dailyChallenge/catchUp'
import { getPuzzleNumber } from '@/utils/dailyChallenge/dateUtils'
import logger from '@/utils/logger'

const GAME_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es', 'ru']

/**
 * GET /api/daily/missed?mode=word-hunt|word-wheel&language=en
 * Daily challenges (Word Hunt or Word Wheel) in the catch-up window (last 3 days) that the
 * authenticated player has not played yet. Powers the post-results
 * "catch up your missed dailies" suggestion.
 *
 * Returns: { today, missed: [{ date, puzzleNumber }] } — newest first.
 * Guests (no session) get an empty list; the client handles them locally.
 */
export async function GET(request: NextRequest) {
  try {
    // Local JWT verify (sub-ms) when fetchWithAuth sends a Bearer; cookie
    // fallback otherwise. Guests (null user) still get the empty list below.
    const user = await getAuthedUser(request)

    const today = new Date().toISOString().split('T')[0]
    // Optional-chain nextUrl: production always passes a NextRequest, but unit
    // tests may call with a plain Request (no `.nextUrl`) — default to word-hunt.
    const mode = request?.nextUrl?.searchParams.get('mode') || 'word-hunt'
    const languageParam = request?.nextUrl?.searchParams.get('language')
    const language = languageParam && GAME_LANGUAGES.includes(languageParam) ? languageParam : null

    if (!user) {
      return NextResponse.json({ today, missed: [] })
    }

    const supabase = await createClient()

    // Pick table based on mode
    const table = mode === 'word-wheel' ? 'daily_word_wheel_attempts' : 'daily_word_hunt_attempts'

    // Any attempt counts as played: a failed Word Hunt is locked by check-played just like a solved one.
    let query = supabase
      .from(table)
      .select('puzzle_date')
      .eq('player_id', user.id)
      .in('puzzle_date', getCatchUpDates(today))
    if (language) query = query.eq('language', language)

    const { data: playedRows, error } = await query
    if (error) {
      logger.error('Daily missed lookup error:', error.message)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    const completed = (playedRows ?? []).map((r: { puzzle_date: string }) => r.puzzle_date)
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
