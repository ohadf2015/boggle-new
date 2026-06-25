/**
 * Memory Hunt week-over-week insights — pure math over real session data.
 *
 * All numbers come from `drill_sessions` (words_found) and `brain_score_history`
 * (working_memory). This file does NO formatting and NO copy: it returns honest
 * numbers + an `hasBaseline` flag, and the UI renders human sentences via t().
 * That keeps "you remember 1 more word this week" truthful — never fabricated.
 */

export interface WeekWindow {
  /** Memory Hunt sessions completed in the window. */
  sessions: number;
  /** Average words found per session in the window. */
  avgWordsFound: number;
}

export interface MemoryInsightsInput {
  thisWeek: WeekWindow;
  lastWeek: WeekWindow;
  /** Weekly-average working-memory domain score (0 if none recorded). */
  memoryScore: { thisWeek: number; lastWeek: number };
}

export interface MemoryInsights {
  /** There is prior-week data to compare against. */
  hasBaseline: boolean;
  sessionsThisWeek: number;
  /** Avg words found delta. null when the player hasn't played this week. */
  words: { thisWeekAvg: number; lastWeekAvg: number; deltaAbs: number } | null;
  /** Working-memory score delta. null when no memory score recorded yet. */
  memory: { thisWeek: number; lastWeek: number; deltaPct: number | null } | null;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

export function computeMemoryInsights(input: MemoryInsightsInput): MemoryInsights {
  const { thisWeek, lastWeek, memoryScore } = input;
  const hasBaseline = lastWeek.sessions > 0;

  const words =
    thisWeek.sessions > 0
      ? {
          thisWeekAvg: round1(thisWeek.avgWordsFound),
          lastWeekAvg: round1(lastWeek.avgWordsFound),
          deltaAbs: round1(thisWeek.avgWordsFound - (hasBaseline ? lastWeek.avgWordsFound : 0)),
        }
      : null;

  const memory =
    memoryScore.thisWeek > 0
      ? {
          thisWeek: Math.round(memoryScore.thisWeek),
          lastWeek: Math.round(memoryScore.lastWeek),
          deltaPct:
            memoryScore.lastWeek > 0
              ? Math.round(((memoryScore.thisWeek - memoryScore.lastWeek) / memoryScore.lastWeek) * 100)
              : null,
        }
      : null;

  return {
    hasBaseline,
    sessionsThisWeek: thisWeek.sessions,
    words,
    memory,
  };
}
