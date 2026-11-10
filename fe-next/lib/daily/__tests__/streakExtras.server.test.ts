import { describe, it, expect, vi } from 'vitest'

vi.mock('@/utils/logger', () => ({ __esModule: true, default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }))

import { settleStreakFreeze, loadMilestoneClaims, spendFreezeOn, loadOwnedFreezes } from '../streakExtras.server'
import { makeFakeDb } from './fakeStreakDb'

const TODAY = '2026-11-12'
const engagement = (n: number) => ({ player_engagement: [{ player_id: 'p1', streak_freezes_available: n }] })

describe('settleStreakFreeze', () => {
  it('Given yesterday missed and a freeze owned, writes the frozen day and spends one freeze', async () => {
    const { db, tables } = makeFakeDb({ tables: { ...engagement(2), daily_streak_freezes: [] } })
    const saved = await settleStreakFreeze(db as never, 'p1', ['2026-11-10'], 2, TODAY)
    expect(saved).toEqual({ date: '2026-11-11', freezesRemaining: 1 })
    expect(tables.daily_streak_freezes).toEqual([{ player_id: 'p1', frozen_date: '2026-11-11' }])
    expect(tables.player_engagement[0].streak_freezes_available).toBe(1)
  })

  it('Given the day was already frozen by another request, spends nothing (idempotent)', async () => {
    const { db, tables } = makeFakeDb({
      tables: engagement(1),
      insertErrors: { daily_streak_freezes: { code: '23505', message: 'duplicate' } },
    })
    expect(await settleStreakFreeze(db as never, 'p1', ['2026-11-10'], 1, TODAY)).toBeNull()
    expect(tables.player_engagement[0].streak_freezes_available).toBe(1)
  })

  it('Given no freeze owned, writes nothing', async () => {
    const { db, calls } = makeFakeDb({ tables: engagement(0) })
    expect(await settleStreakFreeze(db as never, 'p1', ['2026-11-10'], 0, TODAY)).toBeNull()
    expect(calls).toEqual([])
  })

  it('Given the freeze was spent elsewhere meanwhile, removes the frozen day again', async () => {
    const { db, tables } = makeFakeDb({ tables: { ...engagement(0), daily_streak_freezes: [] } })
    expect(await settleStreakFreeze(db as never, 'p1', ['2026-11-10'], 1, TODAY)).toBeNull()
    expect(tables.daily_streak_freezes).toEqual([])
  })

  it('Given the chest pool is empty but a gifted freeze is held, spends the gift instead', async () => {
    const { db, tables } = makeFakeDb({
      tables: { ...engagement(0), profiles: [{ id: 'p1', streak_freeze_count: 1 }], daily_streak_freezes: [] },
    })
    expect(await settleStreakFreeze(db as never, 'p1', ['2026-11-10'], 1, TODAY)).toEqual({ date: '2026-11-11', freezesRemaining: 0 })
    expect(tables.profiles[0].streak_freeze_count).toBe(0)
    expect(tables.daily_streak_freezes).toHaveLength(1)
  })

  it('Given a lost compare-and-swap, re-reads and still spends exactly one', async () => {
    const { db, tables } = makeFakeDb({ tables: { ...engagement(2), daily_streak_freezes: [] }, casLosses: 1 })
    expect(await settleStreakFreeze(db as never, 'p1', ['2026-11-10'], 2, TODAY)).toEqual({ date: '2026-11-11', freezesRemaining: 1 })
    expect(tables.player_engagement[0].streak_freezes_available).toBe(1)
  })
})

describe('spendFreezeOn', () => {
  it('Given a gifted freeze and the same missed day saved twice, spends exactly one freeze', async () => {
    const { db, tables } = makeFakeDb({
      tables: { ...engagement(0), profiles: [{ id: 'p1', streak_freeze_count: 2 }], daily_streak_freezes: [] },
      unique: { daily_streak_freezes: ['player_id', 'frozen_date'] },
    })
    expect(await spendFreezeOn(db as never, 'p1', '2026-11-11')).toBe(true)
    expect(await spendFreezeOn(db as never, 'p1', '2026-11-11')).toBe(false)
    expect(tables.profiles[0].streak_freeze_count).toBe(1)
    expect(tables.daily_streak_freezes).toHaveLength(1)
  })
})

describe('loadOwnedFreezes', () => {
  it('adds the earned and gifted pools', async () => {
    const { db } = makeFakeDb({ tables: { ...engagement(1), profiles: [{ id: 'p1', streak_freeze_count: 2 }] } })
    expect(await loadOwnedFreezes(db as never, 'p1')).toBe(3)
  })
})

describe('loadMilestoneClaims', () => {
  it('returns the claimed milestone days', async () => {
    const { db } = makeFakeDb({
      tables: { daily_streak_milestone_claims: [{ player_id: 'p1', milestone: 3 }, { player_id: 'p2', milestone: 7 }] },
    })
    expect(await loadMilestoneClaims(db as never, 'p1')).toEqual([3])
  })

  it('returns null, not "nothing claimed", when the read fails', async () => {
    const { db } = makeFakeDb({ selectErrors: { daily_streak_milestone_claims: { message: 'relation does not exist' } } })
    expect(await loadMilestoneClaims(db as never, 'p1')).toBeNull()
  })
})
