/**
 * Improvement signals for a completed brain drill.
 *
 * Derived purely from the player's prior `drill_progress` snapshot (captured
 * BEFORE this run is folded in) plus the immediately-previous session score.
 * The results UI surfaces the single most flattering true signal so the player
 * feels progress over time.
 */

export interface DrillPriorSnapshot {
  /** Best total score before this run. */
  highScore: number;
  /** Number of completed runs before this one. */
  totalPlays: number;
  /** Sum of all prior run scores. */
  totalScore: number;
}

export interface DrillImprovement {
  /** This run beat the player's previous best (and they have played before). */
  isPersonalBest: boolean;
  /** The previous best score (0 if never played). */
  previousBest: number;
  /** The player's prior running average (0 if never played). */
  averageScore: number;
  /** This run's score. */
  currentScore: number;
  /** Completed runs before this one (0 = first attempt). */
  totalPlays: number;
  /** This run beat the immediately-previous session's score. */
  improvedVsLast: boolean;
}

export function computeDrillImprovement(
  prior: DrillPriorSnapshot | null,
  currentScore: number,
  lastSessionScore: number | null,
): DrillImprovement {
  const totalPlays = prior?.totalPlays ?? 0;
  const previousBest = prior?.highScore ?? 0;
  const averageScore =
    prior && totalPlays > 0 ? Math.round(prior.totalScore / totalPlays) : 0;

  return {
    isPersonalBest: totalPlays > 0 && currentScore > previousBest,
    previousBest,
    averageScore,
    currentScore,
    totalPlays,
    improvedVsLast: lastSessionScore != null && currentScore > lastSessionScore,
  };
}
