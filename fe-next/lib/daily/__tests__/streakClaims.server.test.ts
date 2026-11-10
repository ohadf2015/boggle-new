import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'

vi.mock('@/utils/logger', () => ({ __esModule: true, default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }))
vi.mock('@/backend/services/economy/awardCoins', () => ({ awardCoinsServer: vi.fn() }))

import { awardCoinsServer } from '@/backend/services/economy/awardCoins'
import { claimStreakMilestone, buyStreakFreeze } from '../streakClaims.server'
import { makeFakeDb } from './fakeStreakDb'
import { FREEZE_PRICE, MAX_HELD_FREEZES, STREAK_MILESTONES } from '../streakRewards'

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-12T12:00:00Z'))
})
afterAll(() => vi.useRealTimers())

const wheel = (puzzle_date: string) => ({ player_id: 'u1', puzzle_date, word_count: 4, is_catchup: false })
const sevenDays = ['06', '07', '08', '09', '10', '11', '12'].map((d) => wheel(`2026-11-${d}`))

describe('claimStreakMilestone', () => {
  beforeEach(() => vi.mocked(awardCoinsServer).mockReset())

  it('Given a verified 7-day streak, records the claim and pays the 7-day coins', async () => {
    vi.mocked(awardCoinsServer).mockResolvedValue({ success: true, newBalance: 500 })
    const { db, tables } = makeFakeDb({ tables: { daily_word_wheel_attempts: sevenDays, daily_streak_milestone_claims: [{ player_id: 'u1', milestone: 3, coins: 25 }] } })
    const res = await claimStreakMilestone(db as never, 'u1', '2026-11-12')
    const seven = STREAK_MILESTONES.find((m) => m.days === 7)!
    expect(res).toEqual({ status: 200, body: { claimed: true, days: 7, coins: seven.coins, newBalance: 500 } })
    expect(awardCoinsServer).toHaveBeenCalledWith('u1', seven.coins, 'daily_streak_milestone', { milestone: 7 })
    expect(tables.daily_streak_milestone_claims).toContainEqual({ player_id: 'u1', milestone: 7, coins: seven.coins })
  })

  it('Given the streak does not reach a new milestone, pays nothing', async () => {
    const { db } = makeFakeDb({ tables: { daily_word_wheel_attempts: [wheel('2026-11-12')], daily_streak_milestone_claims: [] } })
    expect((await claimStreakMilestone(db as never, 'u1', '2026-11-12')).status).toBe(400)
    expect(awardCoinsServer).not.toHaveBeenCalled()
  })

  it('Given a concurrent claim already wrote the row, answers without paying twice', async () => {
    const { db } = makeFakeDb({
      tables: { daily_word_wheel_attempts: sevenDays, daily_streak_milestone_claims: [] },
      insertErrors: { daily_streak_milestone_claims: { code: '23505', message: 'dup' } },
    })
    const res = await claimStreakMilestone(db as never, 'u1', '2026-11-12')
    expect(res).toEqual({ status: 200, body: { claimed: false, days: 7, coins: 60 } })
    expect(awardCoinsServer).not.toHaveBeenCalled()
  })

  it('Given the coin grant fails, removes the claim so a retry can pay', async () => {
    vi.mocked(awardCoinsServer).mockResolvedValue({ success: false, error: 'boom' })
    const { db, tables } = makeFakeDb({ tables: { daily_word_wheel_attempts: sevenDays, daily_streak_milestone_claims: [] } })
    expect((await claimStreakMilestone(db as never, 'u1', '2026-11-12')).status).toBe(502)
    expect(tables.daily_streak_milestone_claims).toEqual([])
  })

  it('Given the claims table is unreadable, refuses instead of paying blind', async () => {
    const { db } = makeFakeDb({
      tables: { daily_word_wheel_attempts: sevenDays },
      selectErrors: { daily_streak_milestone_claims: { message: 'missing' } },
    })
    expect((await claimStreakMilestone(db as never, 'u1', '2026-11-12')).status).toBe(503)
  })
})

describe('buyStreakFreeze', () => {
  it('passes the server price and cap to the atomic purchase and returns the new counts', async () => {
    const { db, rpc } = makeFakeDb()
    rpc.mockResolvedValue({ data: [{ success: true, freezes: 1, new_balance: 350, error_message: null }], error: null })
    expect(await buyStreakFreeze(db as never, 'u1')).toEqual({ status: 200, body: { freezes: 1, newBalance: 350 } })
    expect(rpc).toHaveBeenCalledWith('buy_streak_freeze', { p_user_id: 'u1', p_price: FREEZE_PRICE, p_max: MAX_HELD_FREEZES })
  })

  it.each([
    ['max_held', 409],
    ['insufficient_coins', 402],
  ])('maps %s to %i', async (reason, status) => {
    const { db, rpc } = makeFakeDb()
    rpc.mockResolvedValue({ data: [{ success: false, freezes: 2, new_balance: 10, error_message: reason }], error: null })
    expect(await buyStreakFreeze(db as never, 'u1')).toEqual({ status, body: { error: reason, freezes: 2, newBalance: 10 } })
  })

  it('answers 503 when the purchase function is not deployed yet', async () => {
    const { db, rpc } = makeFakeDb()
    rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'Could not find the function' } })
    expect((await buyStreakFreeze(db as never, 'u1')).status).toBe(503)
  })
})
