export type ChestTier = 'bronze' | 'silver' | 'gold'

export interface CycleProgress {
  cycleStart: string
  cycleNumber: number
  completedDates: string[]
  daysCompleted: number
  isClaimable: boolean
}

export interface DayScore {
  mode: 'word_hunt' | 'word_wheel' | 'puzzle'
  rawScore: number
  timeSeconds: number | null
}

export function getChestTier(weekScore: number): ChestTier {
  if (weekScore > 70) return 'gold'
  if (weekScore >= 40) return 'silver'
  return 'bronze'
}

export function computeWeekScore(scores: DayScore[]): number {
  if (scores.length === 0) return 0
  const normalized = scores.map(({ mode, rawScore, timeSeconds }) => {
    if (mode === 'word_hunt') return Math.min(100, rawScore)
    if (!timeSeconds || timeSeconds <= 0) return 0
    return Math.min(100, (rawScore / timeSeconds) * 60 / 6) // 600 spm = 100
  })
  return Math.round(normalized.reduce((a, b) => a + b, 0) / normalized.length)
}

export interface HuntScoreRow {
  puzzle_date: string
  efficiency_score: number | null
}

export interface WheelScoreRow {
  puzzle_date: string
  score: number | null
  time_seconds: number | null
}

// Compute the chest tier (and underlying week score) for a cycle, given the
// completed dates in that cycle plus the raw score rows. Only rows whose
// puzzle_date falls inside `completedDates` contribute. Shared by the claim
// route (final tier) and the status route (projected tier).
export function computeChestTierForCycle(
  completedDates: string[],
  huntRows: HuntScoreRow[],
  wheelRows: WheelScoreRow[],
): { weekScore: number; tier: ChestTier } {
  const cycleDateSet = new Set(completedDates)
  const scores: DayScore[] = [
    ...huntRows
      .filter(r => cycleDateSet.has(r.puzzle_date))
      .map(r => ({ mode: 'word_hunt' as const, rawScore: r.efficiency_score ?? 0, timeSeconds: null })),
    ...wheelRows
      .filter(r => cycleDateSet.has(r.puzzle_date))
      .map(r => ({ mode: 'word_wheel' as const, rawScore: r.score ?? 0, timeSeconds: r.time_seconds })),
  ]
  const weekScore = computeWeekScore(scores)
  return { weekScore, tier: getChestTier(weekScore) }
}

// allCompletedDates: all ISO dates the player ever finished a daily (any mode)
// today: ISO date string (YYYY-MM-DD)
export function computeCycleProgress(
  allCompletedDates: string[],
  today: string,
): CycleProgress {
  const uniqueDateSet = new Set(allCompletedDates)
  const streak: string[] = []
  const cursor = new Date(today + 'T00:00:00Z')

  while (true) {
    const iso = cursor.toISOString().slice(0, 10)
    if (!uniqueDateSet.has(iso)) break
    streak.unshift(iso)
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }

  if (streak.length === 0) {
    return { cycleStart: today, cycleNumber: 1, completedDates: [], daysCompleted: 0, isClaimable: false }
  }

  const streakLen = streak.length
  const daysInCurrentCycle = ((streakLen - 1) % 7) + 1
  const cycleNumber = Math.ceil(streakLen / 7)
  const completedDates = streak.slice(streak.length - daysInCurrentCycle)
  const cycleStart = completedDates[0]

  return { cycleStart, cycleNumber, completedDates, daysCompleted: daysInCurrentCycle, isClaimable: daysInCurrentCycle === 7 }
}
