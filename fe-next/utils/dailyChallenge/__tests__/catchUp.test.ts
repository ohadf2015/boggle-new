import { describe, it, expect } from 'vitest'
import {
  CATCH_UP_WINDOW_DAYS,
  getCatchUpDates,
  isSubmittableDate,
  isCatchUpDate,
  getMissedCatchUpDates,
  shouldGateCatchUpBehindAd,
} from '../catchUp'

describe('getCatchUpDates', () => {
  it('returns the 3 calendar days before today, newest first', () => {
    expect(getCatchUpDates('2026-05-12')).toEqual(['2026-05-11', '2026-05-10', '2026-05-09'])
  })

  it('crosses month boundaries correctly', () => {
    expect(getCatchUpDates('2026-06-01')).toEqual(['2026-05-31', '2026-05-30', '2026-05-29'])
  })

  it('honors a custom window size', () => {
    expect(getCatchUpDates('2026-05-12', 1)).toEqual(['2026-05-11'])
  })

  it('defaults to a 3-day window', () => {
    expect(getCatchUpDates('2026-05-12')).toHaveLength(CATCH_UP_WINDOW_DAYS)
  })
})

describe('isSubmittableDate', () => {
  const today = '2026-05-12'
  it('accepts today', () => expect(isSubmittableDate(today, '2026-05-12')).toBe(true))
  it('accepts yesterday', () => expect(isSubmittableDate(today, '2026-05-11')).toBe(true))
  it('accepts the oldest catch-up day (today-3)', () => expect(isSubmittableDate(today, '2026-05-09')).toBe(true))
  it('rejects beyond the window (today-4)', () => expect(isSubmittableDate(today, '2026-05-08')).toBe(false))
  it('rejects future dates', () => expect(isSubmittableDate(today, '2026-05-13')).toBe(false))
})

describe('isCatchUpDate', () => {
  const today = '2026-05-12'
  it('is false for today (never a catch-up)', () => expect(isCatchUpDate(today, '2026-05-12')).toBe(false))
  it('is true for yesterday', () => expect(isCatchUpDate(today, '2026-05-11')).toBe(true))
  it('is true for the oldest catch-up day', () => expect(isCatchUpDate(today, '2026-05-09')).toBe(true))
  it('is false beyond the window', () => expect(isCatchUpDate(today, '2026-05-08')).toBe(false))
})

describe('getMissedCatchUpDates', () => {
  const today = '2026-05-12'
  it('returns catch-up dates the player has not completed, newest first', () => {
    expect(getMissedCatchUpDates(today, ['2026-05-11'])).toEqual(['2026-05-10', '2026-05-09'])
  })
  it('returns all three when nothing completed in the window', () => {
    expect(getMissedCatchUpDates(today, [])).toEqual(['2026-05-11', '2026-05-10', '2026-05-09'])
  })
  it('returns empty when all catch-up days are completed', () => {
    expect(getMissedCatchUpDates(today, ['2026-05-11', '2026-05-10', '2026-05-09'])).toEqual([])
  })
  it('ignores completed dates outside the window (e.g. today itself)', () => {
    expect(getMissedCatchUpDates(today, ['2026-05-12', '2026-04-01'])).toEqual(['2026-05-11', '2026-05-10', '2026-05-09'])
  })
})

describe('shouldGateCatchUpBehindAd', () => {
  // Baseline: a native catch-up play with an ad ready → must watch the ad.
  const ready = {
    isCatchup: true,
    alreadyUnlocked: false,
    isNative: true,
    isAdAvailable: true,
    isPlaceholderCooldown: false,
  }

  it('gates a fresh native catch-up play with an available ad', () => {
    expect(shouldGateCatchUpBehindAd(ready)).toBe(true)
  })

  it('does not gate today\'s daily (not catch-up)', () => {
    expect(shouldGateCatchUpBehindAd({ ...ready, isCatchup: false })).toBe(false)
  })

  it('does not re-gate once already unlocked for this date', () => {
    expect(shouldGateCatchUpBehindAd({ ...ready, alreadyUnlocked: true })).toBe(false)
  })

  it('does not gate on web (degrades to free)', () => {
    expect(shouldGateCatchUpBehindAd({ ...ready, isNative: false })).toBe(false)
  })

  it('does not gate when no ad is available', () => {
    expect(shouldGateCatchUpBehindAd({ ...ready, isAdAvailable: false })).toBe(false)
  })

  it('does not gate during placeholder cooldown', () => {
    expect(shouldGateCatchUpBehindAd({ ...ready, isPlaceholderCooldown: true })).toBe(false)
  })
})
