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
    if (mode === 'word_wheel') return Math.min(100, (rawScore / timeSeconds) * 60 / 6) // 600 spm = 100
    // Puzzle uses exponential per-word scoring (see shared/utils/scoring) so
    // points-per-minute runs higher than the wheel: strong play is ~1200 SPM.
    if (mode === 'puzzle') return Math.min(100, (rawScore / timeSeconds) * 60 / 12) // 1200 spm = 100
    return 0
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

export interface PuzzleScoreRow {
  puzzle_date: string
  score: number | null
  time_seconds: number | null
}

// Compute the chest tier (and underlying week score) for a cycle, given the
// completed dates in that cycle plus the raw score rows. Only rows whose
// puzzle_date falls inside `completedDates` contribute. Shared by the claim
// route (final tier) and the status route (projected tier).
//
// All three modes contribute to quality: a player who only plays the puzzle
// every day can still climb to gold by playing well, and Hunt/Wheel quality
// still matters too. Tier isn't just about showing up — it's about how good
// the runs were.
export function computeChestTierForCycle(
  completedDates: string[],
  huntRows: HuntScoreRow[],
  wheelRows: WheelScoreRow[],
  puzzleRows: PuzzleScoreRow[] = [],
): { weekScore: number; tier: ChestTier } {
  const cycleDateSet = new Set(completedDates)
  const scores: DayScore[] = [
    ...huntRows
      .filter(r => cycleDateSet.has(r.puzzle_date))
      .map(r => ({ mode: 'word_hunt' as const, rawScore: r.efficiency_score ?? 0, timeSeconds: null })),
    ...wheelRows
      .filter(r => cycleDateSet.has(r.puzzle_date))
      .map(r => ({ mode: 'word_wheel' as const, rawScore: r.score ?? 0, timeSeconds: r.time_seconds })),
    ...puzzleRows
      .filter(r => cycleDateSet.has(r.puzzle_date))
      .map(r => ({ mode: 'puzzle' as const, rawScore: r.score ?? 0, timeSeconds: r.time_seconds })),
  ]
  const weekScore = computeWeekScore(scores)
  return { weekScore, tier: getChestTier(weekScore) }
}

export interface CompletedCycle {
  cycleStart: string
  cycleNumber: number
  completedDates: string[]
}

// Scan all completed dates and return every fully-finished 7-day chunk.
// A chunk = 7 consecutive ISO dates with no gap. Multiple chunks may exist if
// the player completed several streaks (consecutive or separated by gaps).
// `cycleNumber` reflects the order of completed cycles across the player's
// history (1 = first, 2 = second, …). Returned in chronological order so
// callers can pick the oldest unclaimed chest.
export function findCompletedCycles(allCompletedDates: string[]): CompletedCycle[] {
  const unique = Array.from(new Set(allCompletedDates))
    .filter(d => typeof d === 'string' && d.length === 10)
    .sort()
  const cycles: CompletedCycle[] = []
  let runStart = 0
  let cycleNumber = 0
  for (let i = 0; i < unique.length; i++) {
    if (i > 0) {
      const prev = new Date(unique[i - 1] + 'T00:00:00Z').getTime()
      const cur = new Date(unique[i] + 'T00:00:00Z').getTime()
      if (cur - prev !== 86_400_000) runStart = i
    }
    const runLen = i - runStart + 1
    if (runLen > 0 && runLen % 7 === 0) {
      const startIdx = i - 6
      cycleNumber++
      cycles.push({
        cycleStart: unique[startIdx],
        cycleNumber,
        completedDates: unique.slice(startIdx, i + 1),
      })
    }
  }
  return cycles
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
