import { describe, it, expect } from 'vitest'
import {
  STREAK_MILESTONES,
  FREEZE_PRICE,
  MAX_HELD_FREEZES,
  streakTier,
  claimableMilestone,
  nextMilestone,
  freezeDateToSettle,
  weekStrip,
  streakStatus,
  guestStreakDates,
} from '../streakRewards'
import { MAX_SERVER_COIN_AWARD } from '@/backend/services/economy/awardCoins'

const TODAY = '2026-11-12' // Thursday

describe('STREAK_MILESTONES', () => {
  it('rewards 3, 7, 14, 30, 60 and 100 days with growing coins the server can pay', () => {
    expect(STREAK_MILESTONES.map((m) => m.days)).toEqual([3, 7, 14, 30, 60, 100])
    for (let i = 1; i < STREAK_MILESTONES.length; i++) {
      expect(STREAK_MILESTONES[i].coins).toBeGreaterThan(STREAK_MILESTONES[i - 1].coins)
    }
    for (const m of STREAK_MILESTONES) expect(m.coins).toBeLessThanOrEqual(MAX_SERVER_COIN_AWARD)
  })

  it('prices a freeze in coins and caps how many can be held', () => {
    expect(FREEZE_PRICE).toBeGreaterThan(0)
    expect(MAX_HELD_FREEZES).toBe(2)
  })
})

describe('streakTier', () => {
  it.each([
    [0, 'none'],
    [1, 'ember'],
    [2, 'ember'],
    [3, 'flame'],
    [6, 'flame'],
    [7, 'blue'],
    [13, 'blue'],
    [14, 'violet'],
    [29, 'violet'],
    [30, 'legendary'],
    [365, 'legendary'],
  ])('%i days → %s', (days, tier) => {
    expect(streakTier(days)).toBe(tier)
  })
})

describe('claimableMilestone', () => {
  it('Given a 3-day streak and nothing claimed, offers the 3-day reward', () => {
    expect(claimableMilestone(3, [])).toEqual({ days: 3, coins: STREAK_MILESTONES[0].coins })
  })

  it('Given the reward was already claimed, offers nothing', () => {
    expect(claimableMilestone(5, [3])).toBeNull()
  })

  it('Given an old 40-day streak with nothing claimed, offers only the highest reached milestone', () => {
    expect(claimableMilestone(40, [])?.days).toBe(30)
  })

  it('Given a higher milestone was claimed before a reset, lower ones never pay again', () => {
    expect(claimableMilestone(8, [30])).toBeNull()
  })

  it('Given a streak below the first milestone, offers nothing', () => {
    expect(claimableMilestone(2, [])).toBeNull()
  })
})

describe('nextMilestone', () => {
  it('Given 3 days, the next goal is 7 days, 4 to go', () => {
    expect(nextMilestone(3, [3])).toEqual({ days: 7, coins: STREAK_MILESTONES[1].coins, remaining: 4, from: 3 })
  })

  it('Given 0 days, the next goal is the first milestone', () => {
    expect(nextMilestone(0, [])).toMatchObject({ days: 3, remaining: 3, from: 0 })
  })

  it('Given a higher milestone already paid, skips to the next unpaid one', () => {
    expect(nextMilestone(2, [30])).toMatchObject({ days: 60, remaining: 58, from: 30 })
  })

  it('Given every milestone passed, returns null', () => {
    expect(nextMilestone(120, [100])).toBeNull()
  })
})

describe('freezeDateToSettle', () => {
  it('Given yesterday missed, the day before played and a freeze held, freezes yesterday', () => {
    expect(freezeDateToSettle(['2026-11-10'], TODAY, 1)).toBe('2026-11-11')
  })

  it('Given today already played after the gap, still freezes yesterday', () => {
    expect(freezeDateToSettle(['2026-11-10', TODAY], TODAY, 2)).toBe('2026-11-11')
  })

  it('Given no freeze held, does nothing', () => {
    expect(freezeDateToSettle(['2026-11-10'], TODAY, 0)).toBeNull()
  })

  it('Given yesterday played, does nothing', () => {
    expect(freezeDateToSettle(['2026-11-10', '2026-11-11'], TODAY, 1)).toBeNull()
  })

  it('Given two days missed, one freeze cannot save it', () => {
    expect(freezeDateToSettle(['2026-11-09'], TODAY, 2)).toBeNull()
  })
})

describe('streakStatus', () => {
  it('Given yesterday played and today not, the streak is alive and at risk', () => {
    expect(streakStatus(['2026-11-10', '2026-11-11'], TODAY)).toEqual({ current: 2, playedToday: false, atRisk: true })
  })

  it('Given today played, the streak is safe', () => {
    expect(streakStatus(['2026-11-11', TODAY], TODAY)).toEqual({ current: 2, playedToday: true, atRisk: false })
  })

  it('Given nothing recent, no streak and nothing at risk', () => {
    expect(streakStatus(['2026-11-01'], TODAY)).toEqual({ current: 0, playedToday: false, atRisk: false })
  })
})

describe('weekStrip', () => {
  it('Given a Thursday, lays out Monday..Sunday with played, frozen, missed, today and future days', () => {
    const strip = weekStrip(['2026-11-09', '2026-11-11'], ['2026-11-10'], TODAY)
    expect(strip.map((d) => d.date)).toEqual([
      '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15',
    ])
    expect(strip.map((d) => d.state)).toEqual(['played', 'frozen', 'played', 'today', 'future', 'future', 'future'])
    expect(strip.map((d) => d.weekday)).toEqual([1, 2, 3, 4, 5, 6, 0])
  })

  it('Given today played, today shows as played and is still marked today', () => {
    const strip = weekStrip([TODAY], [], TODAY)
    expect(strip[3]).toMatchObject({ state: 'played', isToday: true })
    expect(strip[0].state).toBe('missed')
  })
})

describe('guestStreakDates', () => {
  it('Given a local streak ending yesterday, rebuilds the run of played dates', () => {
    expect(guestStreakDates({ currentStreak: 3, lastPlayedDate: '2026-11-11' }, TODAY)).toEqual([
      '2026-11-09', '2026-11-10', '2026-11-11',
    ])
  })

  it('Given a stale local streak, rebuilds the old run, which reads 0 today', () => {
    const dates = guestStreakDates({ currentStreak: 9, lastPlayedDate: '2026-11-01' }, TODAY)
    expect(streakStatus(dates, TODAY).current).toBe(0)
  })

  it('Given an empty record (old shape, no date), returns nothing', () => {
    expect(guestStreakDates({ currentStreak: 0, lastPlayedDate: null }, TODAY)).toEqual([])
  })
})
