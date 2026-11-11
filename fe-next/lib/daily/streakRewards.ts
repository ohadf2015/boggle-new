/**
 * Daily streak rewards: flame tiers, milestone coins, freeze pricing and the
 * week strip. Pure and shared by the server routes and the UI.
 */

import { computeCurrentStreak, weekStartOf } from './weeklyChest'

export interface StreakMilestone {
  days: number
  coins: number
}

// A day clear pays 15-30 coins and the weekly chest 100-800, so these stay a bonus, not a second economy.
export const STREAK_MILESTONES: readonly StreakMilestone[] = [
  { days: 3, coins: 25 },
  { days: 7, coins: 60 },
  { days: 14, coins: 120 },
  { days: 30, coins: 250 },
  { days: 60, coins: 500 },
  { days: 100, coins: 1000 },
]

export const FREEZE_PRICE = 150
export const MAX_HELD_FREEZES = 2

export type StreakTier = 'none' | 'ember' | 'flame' | 'blue' | 'violet' | 'legendary'

export function streakTier(days: number): StreakTier {
  if (days >= 30) return 'legendary'
  if (days >= 14) return 'violet'
  if (days >= 7) return 'blue'
  if (days >= 3) return 'flame'
  if (days >= 1) return 'ember'
  return 'none'
}

const maxClaimed = (claimed: readonly number[]) => claimed.reduce((max, d) => Math.max(max, d), 0)

/**
 * The milestone this streak can claim right now. Only the highest one reached
 * pays, and nothing at or below a milestone already paid, so an old long streak
 * gets one reward instead of a backlog and a reset streak cannot farm the ladder.
 */
export function claimableMilestone(current: number, claimed: readonly number[]): StreakMilestone | null {
  const reached = STREAK_MILESTONES.filter((m) => m.days <= current)
  const top = reached[reached.length - 1]
  if (!top || top.days <= maxClaimed(claimed)) return null
  return { days: top.days, coins: top.coins }
}

export interface NextMilestone extends StreakMilestone {
  remaining: number
  /** Where the progress bar starts: the last milestone reached or paid. */
  from: number
}

export function nextMilestone(current: number, claimed: readonly number[]): NextMilestone | null {
  const floor = Math.max(current, maxClaimed(claimed))
  const next = STREAK_MILESTONES.find((m) => m.days > floor)
  if (!next) return null
  const from = [...STREAK_MILESTONES].reverse().find((m) => m.days <= floor)?.days ?? 0
  return { days: next.days, coins: next.coins, remaining: next.days - current, from }
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Yesterday, when one owned freeze can bridge it: missed, with the day before it kept. */
export function freezeDateToSettle(dates: Iterable<string>, today: string, freezesAvailable: number): string | null {
  if (freezesAvailable <= 0) return null
  const done = new Set(dates)
  const yesterday = shiftDate(today, -1)
  return !done.has(yesterday) && done.has(shiftDate(today, -2)) ? yesterday : null
}

export interface StreakStatus {
  current: number
  playedToday: boolean
  atRisk: boolean
}

export function streakStatus(dates: readonly string[], today: string): StreakStatus {
  const current = computeCurrentStreak([...dates], today)
  const playedToday = dates.includes(today)
  return { current, playedToday, atRisk: !playedToday && current > 0 }
}

export type WeekDayState = 'played' | 'frozen' | 'missed' | 'today' | 'future'

export interface WeekDay {
  date: string
  /** 0 = Sunday … 6 = Saturday, for the localized day initial. */
  weekday: number
  state: WeekDayState
  isToday: boolean
}

/** Monday..Sunday of today's week, the same week the weekly chest counts. */
export function weekStrip(played: readonly string[], frozen: readonly string[], today: string): WeekDay[] {
  const start = weekStartOf(today)
  const playedSet = new Set(played)
  const frozenSet = new Set(frozen)
  return Array.from({ length: 7 }, (_, i) => {
    const date = shiftDate(start, i)
    const isToday = date === today
    let state: WeekDayState
    if (playedSet.has(date)) state = 'played'
    else if (frozenSet.has(date)) state = 'frozen'
    else if (isToday) state = 'today'
    else if (date > today) state = 'future'
    else state = 'missed'
    return { date, weekday: new Date(date + 'T00:00:00Z').getUTCDay(), state, isToday }
  })
}

/** A guest keeps only a count and a last day on this device; the run is those days back to back. */
export function guestStreakDates(
  local: { currentStreak?: number | null; lastPlayedDate?: string | null },
  today: string,
): string[] {
  const last = local.lastPlayedDate
  const count = Math.max(0, Math.trunc(Number(local.currentStreak) || 0))
  if (!last || count === 0 || last > today) return []
  return Array.from({ length: count }, (_, i) => shiftDate(last, i - count + 1))
}
