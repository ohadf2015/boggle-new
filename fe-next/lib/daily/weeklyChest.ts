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

// Gold demands BOTH a high weekly average AND a consistency floor — no single
// weak day — so one great run can't mint gold among mediocre ones. Calibrated
// 2026-05-23 against production, where the old `weekScore > 70` gate yielded
// 58% gold: Word Hunt fed raw `efficiency_score` (0-~1000) into `min(100, raw)`,
// so every solve saturated to 100. The /10 rescale (see normalizeDayScore) plus
// this floor makes gold a genuine top-tier reward again.
export const GOLD_WEEK_SCORE = 82
export const GOLD_MIN_DAY_SCORE = 55
export const SILVER_WEEK_SCORE = 50

export function getChestTier(weekScore: number, minDayScore: number): ChestTier {
  if (weekScore >= GOLD_WEEK_SCORE && minDayScore >= GOLD_MIN_DAY_SCORE) return 'gold'
  if (weekScore >= SILVER_WEEK_SCORE) return 'silver'
  return 'bronze'
}

// Normalize one mode-attempt to a 0-100 quality score.
// Word Hunt `efficiency_score` runs 0-~1000 in production (p50 ≈ 720), so /10
// maps it onto a real 0-100 spread instead of pinning every solve to the cap.
// Timed modes use points-per-minute: 600 spm (wheel) / 1200 spm (puzzle) = 100.
export function normalizeDayScore({ mode, rawScore, timeSeconds }: DayScore): number {
  if (mode === 'word_hunt') return Math.min(100, rawScore / 10)
  if (!timeSeconds || timeSeconds <= 0) return 0
  if (mode === 'word_wheel') return Math.min(100, (rawScore / timeSeconds) * 60 / 6) // 600 spm = 100
  // Puzzle uses exponential per-word scoring (see shared/utils/scoring) so
  // points-per-minute runs higher than the wheel: strong play is ~1200 SPM.
  if (mode === 'puzzle') return Math.min(100, (rawScore / timeSeconds) * 60 / 12) // 1200 spm = 100
  return 0
}

export function computeWeekScore(scores: DayScore[]): number {
  if (scores.length === 0) return 0
  const normalized = scores.map(normalizeDayScore)
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

// Compute the chest tier (week score + consistency floor) for a cycle, given the
// completed dates in that cycle plus the raw score rows. Only rows whose
// puzzle_date falls inside `completedDates` contribute. Shared by the claim
// route (final tier), the status route (projected tier), and the submit hook.
//
// All three modes contribute to quality: a player who only plays the puzzle
// every day can still climb to gold by playing well, and Hunt/Wheel quality
// still matters too. Tier isn't just about showing up — it's about how good
// the runs were, every day.
export function computeChestTierForCycle(
  completedDates: string[],
  huntRows: HuntScoreRow[],
  wheelRows: WheelScoreRow[],
  puzzleRows: PuzzleScoreRow[] = [],
): { weekScore: number; minDayScore: number; tier: ChestTier } {
  const cycleDateSet = new Set(completedDates)
  const dated: Array<{ date: string; score: DayScore }> = [
    ...huntRows
      .filter(r => cycleDateSet.has(r.puzzle_date))
      .map(r => ({ date: r.puzzle_date, score: { mode: 'word_hunt' as const, rawScore: r.efficiency_score ?? 0, timeSeconds: null } })),
    ...wheelRows
      .filter(r => cycleDateSet.has(r.puzzle_date))
      .map(r => ({ date: r.puzzle_date, score: { mode: 'word_wheel' as const, rawScore: r.score ?? 0, timeSeconds: r.time_seconds } })),
    ...puzzleRows
      .filter(r => cycleDateSet.has(r.puzzle_date))
      .map(r => ({ date: r.puzzle_date, score: { mode: 'puzzle' as const, rawScore: r.score ?? 0, timeSeconds: r.time_seconds } })),
  ]

  // Best attempt per day: playing a second mode on the same day can only help,
  // never dilute. Then weekScore = average across days, minDayScore = the worst
  // day — the consistency floor that gates gold.
  const bestByDate = new Map<string, number>()
  for (const { date, score } of dated) {
    const n = normalizeDayScore(score)
    const prev = bestByDate.get(date)
    if (prev === undefined || n > prev) bestByDate.set(date, n)
  }
  const dayScores = [...bestByDate.values()]
  if (dayScores.length === 0) return { weekScore: 0, minDayScore: 0, tier: getChestTier(0, 0) }

  const weekScore = Math.round(dayScores.reduce((a, b) => a + b, 0) / dayScores.length)
  const minDayScore = Math.round(Math.min(...dayScores))
  return { weekScore, minDayScore, tier: getChestTier(weekScore, minDayScore) }
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
