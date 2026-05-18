import { describe, it, expect } from 'vitest'
import {
  computeCycleProgress,
  computeWeekScore,
  getChestTier,
  computeChestTierForCycle,
  findCompletedCycles,
} from '../weeklyChest'

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

  it('normalizes puzzle score/time so 1200 spm caps at 100', () => {
    // 1200 points in 60s = 1200 spm = 100
    expect(computeWeekScore([{ mode: 'puzzle', rawScore: 1200, timeSeconds: 60 }])).toBe(100)
  })

  it('rewards strong puzzle play without capping mediocre play', () => {
    // 600 spm = 50 — a respectable but not gold-tier puzzle run.
    expect(computeWeekScore([{ mode: 'puzzle', rawScore: 600, timeSeconds: 60 }])).toBe(50)
  })

  it('treats zero time_seconds as 0 for puzzle too', () => {
    expect(computeWeekScore([{ mode: 'puzzle', rawScore: 1000, timeSeconds: 0 }])).toBe(0)
  })

  it('averages across all three modes', () => {
    // hunt 100 + wheel 100 + puzzle 100 = avg 100 → gold
    expect(computeWeekScore([
      { mode: 'word_hunt', rawScore: 100, timeSeconds: null },
      { mode: 'word_wheel', rawScore: 600, timeSeconds: 60 },
      { mode: 'puzzle', rawScore: 1200, timeSeconds: 60 },
    ])).toBe(100)
  })
})

describe('computeChestTierForCycle', () => {
  it('returns bronze + score 0 when no rows fall in the cycle', () => {
    const r = computeChestTierForCycle([], [], [])
    expect(r).toEqual({ weekScore: 0, tier: 'bronze' })
  })

  it('only counts rows whose puzzle_date is in the cycle', () => {
    const r = computeChestTierForCycle(
      ['2026-05-10', '2026-05-11'],
      [
        { puzzle_date: '2026-05-10', efficiency_score: 80 },
        { puzzle_date: '2026-05-11', efficiency_score: 60 },
        { puzzle_date: '2026-05-01', efficiency_score: 100 }, // outside cycle — ignored
      ],
      [],
    )
    expect(r.weekScore).toBe(70)
    expect(r.tier).toBe('silver')
  })

  it('combines word_hunt and word_wheel rows', () => {
    const r = computeChestTierForCycle(
      ['2026-05-10', '2026-05-11'],
      [{ puzzle_date: '2026-05-10', efficiency_score: 100 }],
      [{ puzzle_date: '2026-05-11', score: 600, time_seconds: 60 }],
    )
    expect(r.weekScore).toBe(100)
    expect(r.tier).toBe('gold')
  })

  it('tolerates null score fields', () => {
    const r = computeChestTierForCycle(
      ['2026-05-10'],
      [{ puzzle_date: '2026-05-10', efficiency_score: null }],
      [],
    )
    expect(r.weekScore).toBe(0)
    expect(r.tier).toBe('bronze')
  })

  it('counts puzzle quality so a puzzle-only week can still reach gold', () => {
    // Player only played the daily puzzle for 7 days, but very well.
    const dates = ['2026-05-06','2026-05-07','2026-05-08','2026-05-09','2026-05-10','2026-05-11','2026-05-12']
    const puzzleRows = dates.map(d => ({ puzzle_date: d, score: 1500, time_seconds: 60 }))
    const r = computeChestTierForCycle(dates, [], [], puzzleRows)
    expect(r.tier).toBe('gold')
    expect(r.weekScore).toBe(100)
  })

  it('gives bronze for puzzle-only weeks of mediocre play', () => {
    const dates = ['2026-05-06','2026-05-07','2026-05-08','2026-05-09','2026-05-10','2026-05-11','2026-05-12']
    const puzzleRows = dates.map(d => ({ puzzle_date: d, score: 300, time_seconds: 60 }))
    // 300 spm / 12 = 25 → bronze
    const r = computeChestTierForCycle(dates, [], [], puzzleRows)
    expect(r.tier).toBe('bronze')
  })

  it('only counts puzzle rows whose puzzle_date is in the cycle', () => {
    const r = computeChestTierForCycle(
      ['2026-05-10'],
      [],
      [],
      [
        { puzzle_date: '2026-05-10', score: 1200, time_seconds: 60 }, // in cycle → 100
        { puzzle_date: '2026-05-01', score: 100, time_seconds: 60 },  // outside cycle → ignored
      ],
    )
    expect(r.weekScore).toBe(100)
  })
})

describe('findCompletedCycles', () => {
  it('returns empty array when fewer than 7 consecutive days', () => {
    expect(findCompletedCycles([])).toEqual([])
    expect(findCompletedCycles(['2026-05-10','2026-05-11','2026-05-12'])).toEqual([])
  })

  it('returns one cycle for exactly 7 consecutive days', () => {
    const dates = [
      '2026-05-06','2026-05-07','2026-05-08',
      '2026-05-09','2026-05-10','2026-05-11','2026-05-12',
    ]
    const cycles = findCompletedCycles(dates)
    expect(cycles).toHaveLength(1)
    expect(cycles[0].cycleStart).toBe('2026-05-06')
    expect(cycles[0].cycleNumber).toBe(1)
    expect(cycles[0].completedDates).toEqual(dates)
  })

  it('returns one cycle when 10 consecutive days completed (next cycle still in progress)', () => {
    const dates = Array.from({ length: 10 }, (_, i) => {
      const d = new Date('2026-05-01T00:00:00Z')
      d.setUTCDate(d.getUTCDate() + i)
      return d.toISOString().slice(0, 10)
    })
    const cycles = findCompletedCycles(dates)
    expect(cycles).toHaveLength(1)
    expect(cycles[0].cycleStart).toBe('2026-05-01')
  })

  it('returns two cycles for 14 consecutive days', () => {
    const dates = Array.from({ length: 14 }, (_, i) => {
      const d = new Date('2026-05-01T00:00:00Z')
      d.setUTCDate(d.getUTCDate() + i)
      return d.toISOString().slice(0, 10)
    })
    const cycles = findCompletedCycles(dates)
    expect(cycles).toHaveLength(2)
    expect(cycles[0].cycleStart).toBe('2026-05-01')
    expect(cycles[1].cycleStart).toBe('2026-05-08')
    expect(cycles[0].cycleNumber).toBe(1)
    expect(cycles[1].cycleNumber).toBe(2)
  })

  it('handles gap: completed-cycle on past run + new run in progress', () => {
    // Completed run May 1-7, gap, partial run May 12-14
    const dates = [
      '2026-05-01','2026-05-02','2026-05-03','2026-05-04',
      '2026-05-05','2026-05-06','2026-05-07',
      '2026-05-12','2026-05-13','2026-05-14',
    ]
    const cycles = findCompletedCycles(dates)
    expect(cycles).toHaveLength(1)
    expect(cycles[0].cycleStart).toBe('2026-05-01')
  })

  it('dedupes duplicate date strings', () => {
    const dates = [
      '2026-05-06','2026-05-06','2026-05-07','2026-05-08',
      '2026-05-09','2026-05-10','2026-05-11','2026-05-12',
    ]
    const cycles = findCompletedCycles(dates)
    expect(cycles).toHaveLength(1)
  })
})
