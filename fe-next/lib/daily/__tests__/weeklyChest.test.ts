import { describe, it, expect } from 'vitest'
import { computeCycleProgress, computeWeekScore, getChestTier } from '../weeklyChest'

describe('getChestTier', () => {
  it('returns bronze for score < 40', () => expect(getChestTier(39)).toBe('bronze'))
  it('returns silver for score 40', () => expect(getChestTier(40)).toBe('silver'))
  it('returns silver for score 70', () => expect(getChestTier(70)).toBe('silver'))
  it('returns gold for score > 70', () => expect(getChestTier(71)).toBe('gold'))
})

describe('computeCycleProgress', () => {
  const today = '2026-05-12'

  it('returns daysCompleted 1 for single completion today', () => {
    const r = computeCycleProgress(['2026-05-12'], today)
    expect(r.daysCompleted).toBe(1)
    expect(r.cycleNumber).toBe(1)
    expect(r.cycleStart).toBe('2026-05-12')
    expect(r.isClaimable).toBe(false)
  })

  it('returns daysCompleted 7 and isClaimable for 7 consecutive days', () => {
    const dates = ['2026-05-06','2026-05-07','2026-05-08','2026-05-09','2026-05-10','2026-05-11','2026-05-12']
    const r = computeCycleProgress(dates, today)
    expect(r.daysCompleted).toBe(7)
    expect(r.cycleNumber).toBe(1)
    expect(r.isClaimable).toBe(true)
  })

  it('starts cycle 2 on day 8', () => {
    const dates = Array.from({ length: 8 }, (_, i) => {
      const d = new Date('2026-05-05')
      d.setDate(d.getDate() + i)
      return d.toISOString().split('T')[0]
    })
    const r = computeCycleProgress(dates, '2026-05-12')
    expect(r.cycleNumber).toBe(2)
    expect(r.daysCompleted).toBe(1)
  })

  it('resets streak on gap', () => {
    const dates = ['2026-05-08','2026-05-09','2026-05-11','2026-05-12']
    const r = computeCycleProgress(dates, today)
    expect(r.daysCompleted).toBe(2)
    expect(r.cycleNumber).toBe(1)
  })

  it('returns empty progress with no dates', () => {
    const r = computeCycleProgress([], today)
    expect(r.daysCompleted).toBe(0)
    expect(r.isClaimable).toBe(false)
  })
})

describe('computeWeekScore', () => {
  it('averages efficiency scores for word_hunt', () => {
    expect(computeWeekScore([
      { mode: 'word_hunt', rawScore: 80, timeSeconds: null },
      { mode: 'word_hunt', rawScore: 60, timeSeconds: null },
    ])).toBe(70)
  })

  it('normalizes score/time for word_wheel (caps at 100)', () => {
    // score=600, time=60s → 600spm → normalized /6 = 100
    expect(computeWeekScore([{ mode: 'word_wheel', rawScore: 600, timeSeconds: 60 }])).toBe(100)
  })

  it('returns 0 for empty array', () => {
    expect(computeWeekScore([])).toBe(0)
  })

  it('treats zero time_seconds as 0 score for timed modes', () => {
    expect(computeWeekScore([{ mode: 'word_wheel', rawScore: 500, timeSeconds: 0 }])).toBe(0)
  })
})
