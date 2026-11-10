import { describe, it, expect, vi } from 'vitest'

vi.mock('@/utils/logger', () => ({ __esModule: true, default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }))

import { guestRunDates, carryOverGuestStreak, loadCarriedDates, CARRYOVER_MAX_DAYS } from '../streakCarryover.server'
import { makeFakeDb } from './fakeStreakDb'

const TODAY = '2026-11-12'
const NOW = new Date('2026-11-12T12:00:00Z')
const HOUR = 3_600_000

const day = (offset: number) => {
  const d = new Date(TODAY + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - offset)
  return d.toISOString().slice(0, 10)
}
const guestWheel = (offset: number, fp = 'fp1') => ({ player_id: null, guest_fingerprint: fp, puzzle_date: day(offset), word_count: 5, is_catchup: false })
const sixGuestDays = [1, 2, 3, 4, 5, 6].map((o) => guestWheel(o))
const profile = (ageHours: number) => ({ id: 'u1', created_at: new Date(NOW.getTime() - ageHours * HOUR).toISOString() })
const unique = { daily_streak_carryover: ['player_id', 'carried_date'] }

describe('guestRunDates', () => {
  it('Given consecutive days ending yesterday, returns the whole run', () => {
    expect(guestRunDates([day(3), day(1), day(2)], TODAY)).toEqual([day(3), day(2), day(1)])
  })

  it('Given a gap, keeps only the run touching today or yesterday', () => {
    expect(guestRunDates([day(0), day(1), day(3), day(4)], TODAY)).toEqual([day(1), day(0)])
  })

  it('Given a lapsed run (last play two days ago), carries nothing', () => {
    expect(guestRunDates([day(2), day(3)], TODAY)).toEqual([])
  })

  it('caps the run', () => {
    const many = Array.from({ length: CARRYOVER_MAX_DAYS + 20 }, (_, i) => day(i))
    expect(guestRunDates(many, TODAY)).toHaveLength(CARRYOVER_MAX_DAYS)
  })
})

describe('carryOverGuestStreak', () => {
  it('Given a new account and 6 guest days ending yesterday, carries all 6', async () => {
    const { db, tables } = makeFakeDb({ tables: { profiles: [profile(1)], daily_word_wheel_attempts: sixGuestDays }, unique })
    await carryOverGuestStreak(db as never, 'u1', ['fp1'], TODAY, NOW)
    expect(await loadCarriedDates(db as never, 'u1')).toHaveLength(6)
    expect(tables.daily_streak_carryover.every((r) => r.guest_id === 'fp1')).toBe(true)
  })

  it('Given the carry-over replayed, writes the same rows once', async () => {
    const { db, tables } = makeFakeDb({ tables: { profiles: [profile(1)], daily_word_wheel_attempts: sixGuestDays }, unique })
    await carryOverGuestStreak(db as never, 'u1', ['fp1'], TODAY, NOW)
    await carryOverGuestStreak(db as never, 'u1', ['fp1'], TODAY, NOW)
    expect(tables.daily_streak_carryover).toHaveLength(6)
  })

  it('Given an account older than the carry-over window, carries nothing', async () => {
    const { db, tables } = makeFakeDb({ tables: { profiles: [profile(24 * 10)], daily_word_wheel_attempts: sixGuestDays }, unique })
    await carryOverGuestStreak(db as never, 'u1', ['fp1'], TODAY, NOW)
    expect(tables.daily_streak_carryover ?? []).toEqual([])
  })

  it('Given the guest days were already carried to another account, carries nothing', async () => {
    const { db, tables } = makeFakeDb({
      tables: {
        profiles: [profile(1)],
        daily_word_wheel_attempts: sixGuestDays,
        daily_streak_carryover: [{ player_id: 'other', carried_date: day(1), guest_id: 'fp1' }],
      },
      unique,
    })
    await carryOverGuestStreak(db as never, 'u1', ['fp1'], TODAY, NOW)
    expect(tables.daily_streak_carryover.filter((r) => r.player_id === 'u1')).toEqual([])
  })

  it('ignores guest rows that do not count (zero words, catch-up, already owned by an account)', async () => {
    const { db, tables } = makeFakeDb({
      tables: {
        profiles: [profile(1)],
        daily_word_wheel_attempts: [
          guestWheel(1),
          { ...guestWheel(2), word_count: 0 },
          { ...guestWheel(3), is_catchup: true },
          { ...guestWheel(4), player_id: 'someone' },
        ],
      },
      unique,
    })
    await carryOverGuestStreak(db as never, 'u1', ['fp1'], TODAY, NOW)
    expect(tables.daily_streak_carryover.map((r) => r.carried_date)).toEqual([day(1)])
  })

  it('Given no guest ids, touches nothing', async () => {
    const { db, calls } = makeFakeDb({ tables: { profiles: [profile(1)] } })
    await carryOverGuestStreak(db as never, 'u1', [], TODAY, NOW)
    expect(calls).toEqual([])
  })
})

describe('loadCarriedDates', () => {
  it('Given the table is missing (migration not applied), returns none instead of failing', async () => {
    const { db } = makeFakeDb({ selectErrors: { daily_streak_carryover: { message: 'relation does not exist' } } })
    expect(await loadCarriedDates(db as never, 'u1')).toEqual([])
  })
})
