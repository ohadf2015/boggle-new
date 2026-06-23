import { describe, it, expect } from 'vitest'
import {
  computeCycleProgress,
  computeWeekScore,
  normalizeDayScore,
  getChestTier,
  computeChestTierForCycle,
  findCompletedCycles,
} from '../weeklyChest'

describe('getChestTier', () => {
  // Gold requires a high average AND no weak day (consistency floor) so a single
  // great run can't mint gold among mediocre ones.
  it('returns gold when weekScore >= 82 and minDayScore >= 55', () =>
    expect(getChestTier(82, 55)).toBe('gold'))
  it('returns gold for a strong consistent week', () =>
    expect(getChestTier(90, 70)).toBe('gold'))
  it('denies gold (silver) when the average is high but one day was weak', () =>
    expect(getChestTier(85, 40)).toBe('silver'))
  it('denies gold (silver) when minDay is fine but average falls short', () =>
    expect(getChestTier(81, 80)).toBe('silver'))
  it('returns silver at the silver floor', () =>
    expect(getChestTier(50, 0)).toBe('silver'))
  it('returns bronze below the silver floor', () =>
    expect(getChestTier(49, 49)).toBe('bronze'))
  it('returns bronze for a zero week', () =>
    expect(getChestTier(0, 0)).toBe('bronze'))
})

describe('normalizeDayScore', () => {
  it('maps word_hunt efficiency onto 0-100 by /10 (no false saturation)', () => {
    // efficiency_score runs 0-~1000 in production; /10 keeps real spread.
    expect(normalizeDayScore({ mode: 'word_hunt', rawScore: 720, timeSeconds: null })).toBe(72)
    expect(normalizeDayScore({ mode: 'word_hunt', rawScore: 500, timeSeconds: null })).toBe(50)
  })
  it('caps word_hunt at 100 for a near-perfect efficiency', () =>
    expect(normalizeDayScore({ mode: 'word_hunt', rawScore: 1000, timeSeconds: null })).toBe(100))
  it('normalizes word_wheel by points-per-minute (600 spm = 100)', () => {
    expect(normalizeDayScore({ mode: 'word_wheel', rawScore: 600, timeSeconds: 60 })).toBe(100)
    expect(normalizeDayScore({ mode: 'word_wheel', rawScore: 300, timeSeconds: 60 })).toBe(50)
  })
  it('normalizes puzzle by points-per-minute (1200 spm = 100)', () =>
    expect(normalizeDayScore({ mode: 'puzzle', rawScore: 1200, timeSeconds: 60 })).toBe(100))
  it('returns 0 for non-positive time on timed modes', () => {
    expect(normalizeDayScore({ mode: 'word_wheel', rawScore: 500, timeSeconds: 0 })).toBe(0)
    expect(normalizeDayScore({ mode: 'puzzle', rawScore: 1000, timeSeconds: null })).toBe(0)
  })
})

describe('computeWeekScore', () => {
  it('averages normalized word_hunt scores (new /10 scale)', () => {
    // 800→80, 600→60 ⇒ avg 70
    expect(computeWeekScore([
      { mode: 'word_hunt', rawScore: 800, timeSeconds: null },
      { mode: 'word_hunt', rawScore: 600, timeSeconds: null },
    ])).toBe(70)
  })
  it('normalizes score/time for word_wheel (caps at 100)', () =>
    expect(computeWeekScore([{ mode: 'word_wheel', rawScore: 600, timeSeconds: 60 }])).toBe(100))
  it('returns 0 for empty array', () => expect(computeWeekScore([])).toBe(0))
  it('treats zero time_seconds as 0 score for timed modes', () =>
    expect(computeWeekScore([{ mode: 'word_wheel', rawScore: 500, timeSeconds: 0 }])).toBe(0))
  it('normalizes puzzle score/time so 1200 spm caps at 100', () =>
    expect(computeWeekScore([{ mode: 'puzzle', rawScore: 1200, timeSeconds: 60 }])).toBe(100))
  it('rewards strong puzzle play without capping mediocre play', () =>
    expect(computeWeekScore([{ mode: 'puzzle', rawScore: 600, timeSeconds: 60 }])).toBe(50))
})

describe('computeChestTierForCycle', () => {
  const week = ['2026-05-06','2026-05-07','2026-05-08','2026-05-09','2026-05-10','2026-05-11','2026-05-12']

  it('returns bronze + zero scores when no rows fall in the cycle', () => {
    expect(computeChestTierForCycle([], [], [])).toEqual({ weekScore: 0, minDayScore: 0, tier: 'bronze' })
  })

  it('only counts rows whose puzzle_date is in the cycle', () => {
    const r = computeChestTierForCycle(
      ['2026-05-10', '2026-05-11'],
      [
        { puzzle_date: '2026-05-10', efficiency_score: 900 }, // →90
        { puzzle_date: '2026-05-11', efficiency_score: 600 }, // →60
        { puzzle_date: '2026-05-01', efficiency_score: 990 }, // outside cycle — ignored
      ],
      [],
    )
    expect(r.weekScore).toBe(75)   // (90+60)/2
    expect(r.minDayScore).toBe(60)
    expect(r.tier).toBe('silver')  // weekScore 75 < 82 ⇒ not gold
  })

  it('takes the best mode per day when a date has multiple attempts', () => {
    // Same date: weak hunt (eff 300 → 30) + strong wheel (600/60 → 100).
    // Best-of-day = 100, so the day is not penalized for the weak attempt.
    const r = computeChestTierForCycle(
      ['2026-05-10'],
      [{ puzzle_date: '2026-05-10', efficiency_score: 300 }],
      [{ puzzle_date: '2026-05-10', score: 600, time_seconds: 60 }],
    )
    expect(r.weekScore).toBe(100)
    expect(r.minDayScore).toBe(100)
    expect(r.tier).toBe('gold')
  })

  it('awards gold for a strong, consistent 7-day word_hunt week', () => {
    const huntRows = week.map(d => ({ puzzle_date: d, efficiency_score: 900 })) // each →90
    const r = computeChestTierForCycle(week, huntRows, [])
    expect(r.weekScore).toBe(90)
    expect(r.minDayScore).toBe(90)
    expect(r.tier).toBe('gold')
  })

  it('denies gold when one day in an otherwise strong week is weak (consistency floor)', () => {
    // 6 strong days (eff 900 → 90) + 1 weak day (eff 400 → 40).
    const huntRows = week.map((d, i) => ({ puzzle_date: d, efficiency_score: i === 0 ? 400 : 900 }))
    const r = computeChestTierForCycle(week, huntRows, [])
    expect(r.weekScore).toBeGreaterThanOrEqual(82) // average still high
    expect(r.minDayScore).toBe(40)                 // but a weak day exists
    expect(r.tier).toBe('silver')                  // floor blocks gold
  })

  it('does not let a single great day mint gold among mediocre ones', () => {
    // 1 perfect day + 6 mediocre (eff 400 → 40).
    const huntRows = week.map((d, i) => ({ puzzle_date: d, efficiency_score: i === 0 ? 1000 : 400 }))
    const r = computeChestTierForCycle(week, huntRows, [])
    expect(r.tier).not.toBe('gold')
  })

  it('counts puzzle quality so a strong puzzle-only week can reach gold', () => {
    const puzzleRows = week.map(d => ({ puzzle_date: d, score: 1500, time_seconds: 60 })) // →100
    const r = computeChestTierForCycle(week, [], [], puzzleRows)
    expect(r.tier).toBe('gold')
  })

  it('gives bronze for a mediocre puzzle-only week', () => {
    const puzzleRows = week.map(d => ({ puzzle_date: d, score: 300, time_seconds: 60 })) // 300spm/12 = 25
    const r = computeChestTierForCycle(week, [], [], puzzleRows)
    expect(r.tier).toBe('bronze')
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
})

describe('computeCycleProgress', () => {
  const today = '2026-05-12'

  it('returns daysCompleted 1 for single completion today', () => {
    const r = computeCycleProgress(['2026-05-12'], today)
    expect(r.daysCompleted).toBe(1)
    expect(r.cycleNumber).toBe(1)
    expect(r.cycleStart).toBe('2026-05-12')
    expect(r.isClaimable).toBe(false)
    expect(r.currentStreak).toBe(1)
  })

  it('returns daysCompleted 7 and isClaimable for 7 consecutive days', () => {
    const dates = ['2026-05-06','2026-05-07','2026-05-08','2026-05-09','2026-05-10','2026-05-11','2026-05-12']
    const r = computeCycleProgress(dates, today)
    expect(r.daysCompleted).toBe(7)
    expect(r.cycleNumber).toBe(1)
    expect(r.isClaimable).toBe(true)
    expect(r.currentStreak).toBe(7)
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

  // The fire-icon streak is the FULL consecutive-day run (it can exceed 7), not
  // the within-cycle day count — so day 8 reads "8-day streak" while the chest
  // shows day 1 of cycle 2. Both derive from the same walk, so they never disagree.
  it('reports the full consecutive-day streak across cycle boundaries', () => {
    const dates = Array.from({ length: 8 }, (_, i) => {
      const d = new Date('2026-05-05')
      d.setDate(d.getDate() + i)
      return d.toISOString().split('T')[0]
    })
    const r = computeCycleProgress(dates, '2026-05-12')
    expect(r.currentStreak).toBe(8)
  })

  it('resets streak on gap', () => {
    const dates = ['2026-05-08','2026-05-09','2026-05-11','2026-05-12']
    const r = computeCycleProgress(dates, today)
    expect(r.daysCompleted).toBe(2)
    expect(r.cycleNumber).toBe(1)
    expect(r.currentStreak).toBe(2)
  })

  it('does not count the streak when today is not completed', () => {
    // Played yesterday + the day before, but not today → the live streak from
    // `today` is 0 (the run ended yesterday). Matches the chest walk-back.
    const r = computeCycleProgress(['2026-05-10', '2026-05-11'], today)
    expect(r.currentStreak).toBe(0)
    expect(r.daysCompleted).toBe(0)
  })

  it('returns empty progress with no dates', () => {
    const r = computeCycleProgress([], today)
    expect(r.daysCompleted).toBe(0)
    expect(r.isClaimable).toBe(false)
    expect(r.currentStreak).toBe(0)
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
