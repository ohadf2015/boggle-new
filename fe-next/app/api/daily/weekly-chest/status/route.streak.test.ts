/**
 * @jest-environment node
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'

vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: vi.fn() }))
vi.mock('@/lib/email', () => ({ getSupabaseAdmin: vi.fn() }))
vi.mock('@/utils/logger', () => ({ __esModule: true, default: { error: vi.fn(), log: vi.fn(), warn: vi.fn(), info: vi.fn() } }))

import { NextRequest } from 'next/server'
import { getAuthedUser } from '@/lib/auth/getAuthedUser'
import { getSupabaseAdmin } from '@/lib/email'
import { GET } from './route'
import { makeFakeDb } from '@/lib/daily/__tests__/fakeStreakDb'
import { STREAK_MILESTONES } from '@/lib/daily/streakRewards'

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-12T12:00:00Z'))
})
afterAll(() => vi.useRealTimers())

const wheel = (puzzle_date: string) => ({ player_id: 'u1', puzzle_date, word_count: 5, is_catchup: false, score: 10, time_seconds: 60 })

function setup(tables: Record<string, Record<string, unknown>[]>, opts: Parameters<typeof makeFakeDb>[0] = {}) {
  vi.mocked(getAuthedUser).mockResolvedValue({ id: 'u1' } as never)
  const fake = makeFakeDb({ ...opts, tables })
  vi.mocked(getSupabaseAdmin).mockReturnValue(fake.db as never)
  return fake
}

const get = async () => (await GET(new NextRequest('http://localhost/api/daily/weekly-chest/status'))).json()

describe('GET /api/daily/weekly-chest/status: streak block', () => {
  beforeEach(() => vi.clearAllMocks())

  it('Given yesterday played and today not, reports the streak at risk with this week laid out', async () => {
    setup({ daily_word_wheel_attempts: [wheel('2026-11-10'), wheel('2026-11-11')], daily_streak_milestone_claims: [] })
    const body = await get()
    expect(body.currentStreak).toBe(2)
    expect(body.streak).toMatchObject({ current: 2, playedToday: false, atRisk: true, freezeSaved: null })
    expect(body.streak.week.map((d: { state: string }) => d.state)).toEqual([
      'missed', 'played', 'played', 'today', 'future', 'future', 'future',
    ])
  })

  it('Given one missed day and a freeze owned, spends it on load and the streak survives', async () => {
    const fake = setup({
      daily_word_wheel_attempts: [wheel('2026-11-09'), wheel('2026-11-10')],
      player_engagement: [{ player_id: 'u1', streak_freezes_available: 2 }],
      daily_streak_freezes: [],
      daily_streak_milestone_claims: [],
    })
    const body = await get()
    expect(body.streak.freezeSaved).toEqual({ date: '2026-11-11', freezesRemaining: 1 })
    expect(body.currentStreak).toBe(3)
    expect(body.freezesAvailable).toBe(1)
    expect(body.streak.week[2].state).toBe('frozen')
    expect(fake.tables.daily_streak_freezes).toHaveLength(1)
  })

  it('Given yesterday was already frozen by an earlier request, still reports the save so the toast can show where the player lands', async () => {
    setup({
      daily_word_wheel_attempts: [wheel('2026-11-09'), wheel('2026-11-10')],
      player_engagement: [{ player_id: 'u1', streak_freezes_available: 1 }],
      daily_streak_freezes: [{ player_id: 'u1', frozen_date: '2026-11-11' }],
      daily_streak_milestone_claims: [],
    })
    const body = await get()
    expect(body.streak.freezeSaved).toEqual({ date: '2026-11-11', freezesRemaining: 1 })
    expect(body.freezesAvailable).toBe(1)
  })

  it('Given a 3-day streak and nothing claimed, offers the 3-day reward and points at 7 days', async () => {
    setup({
      daily_word_wheel_attempts: [wheel('2026-11-10'), wheel('2026-11-11'), wheel('2026-11-12')],
      daily_streak_milestone_claims: [],
    })
    const body = await get()
    expect(body.streak.milestone.claimable).toEqual({ days: 3, coins: STREAK_MILESTONES[0].coins })
    expect(body.streak.milestone.next).toMatchObject({ days: 7, remaining: 4 })
  })

  it('Given the claims table cannot be read (migration missing), hides milestones instead of offering them', async () => {
    setup(
      { daily_word_wheel_attempts: [wheel('2026-11-10'), wheel('2026-11-11'), wheel('2026-11-12')] },
      { selectErrors: { daily_streak_milestone_claims: { message: 'relation does not exist' } } },
    )
    const body = await get()
    expect(body.streak.milestone).toBeNull()
    expect(body.currentStreak).toBe(3)
  })
})
