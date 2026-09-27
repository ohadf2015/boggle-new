/**
 * Daily Challenge Mastery Rating System
 * Derives a skill rating from Word Hunt attempt history
 *
 * Philosophy:
 * - Rating moves with every play (reflects actual performance)
 * - Honest: no inflation, retry penalty already in stored score
 * - Survives missed days without zeroing (7-play rolling window)
 * - Works for both registered and guest players
 * - Derived purely from attempt data, no new persistence needed
 *
 * Design (Chess.com Daily Puzzle inspired):
 * - Efficiency score per play: 100 (perfect) down to 0 (didn't find word)
 * - Rolling rating: smoothed average of last 7 plays
 * - Delta: change from previous rolling average
 */

export interface AttemptRecord {
  solved: boolean;
  attempts_used: number; // 1-10 for solved; 10 for failed
}

export interface RatingResult {
  current: number; // Current rolling rating (0-100 scale approximately)
  delta: number; // Change from previous rating
  history: number[]; // Efficiency score per play (oldest first)
  streakSolved: number; // Consecutive solves (capped at recent plays)
}

/**
 * Compute efficiency score for a single play (0-100 scale)
 * Reflects how well the player solved this puzzle
 *
 * - 100: solved in 1 attempt (perfect)
 * - 90: solved in 2 attempts
 * - 80: solved in 3 attempts
 * - ... linear 10-point decrease
 * - 10: solved in 10 attempts (barely)
 * - 0: didn't solve (failed)
 */
export function computeEfficiencyScore(solved: boolean, attemptsUsed: number): number {
  if (!solved) {
    return 0;
  }
  // Linear scale: 100 - 10*(attempts-1), clamped to minimum 10
  return Math.max(10, 100 - 10 * (attemptsUsed - 1));
}

/**
 * Compute rolling mastery rating from attempt history
 *
 * Returns:
 * - current: rolling average of last 7 plays
 * - delta: change from previous rolling average
 * - history: all efficiency scores in chronological order
 * - streakSolved: consecutive solves (recent)
 */
export function computeRollingRating(attempts: AttemptRecord[]): RatingResult {
  // Build efficiency history
  const history = attempts.map(a => computeEfficiencyScore(a.solved, a.attempts_used));

  if (history.length === 0) {
    return {
      current: 1000, // Base rating (arbitrary, used as identity)
      delta: 0,
      history: [],
      streakSolved: 0,
    };
  }

  // Rolling window: last 7 plays
  const WINDOW_SIZE = 7;
  const window = history.slice(-WINDOW_SIZE);
  const current = window.reduce((sum, score) => sum + score, 0) / window.length;

  // Compute delta from previous rolling average
  let delta = 0;
  if (history.length > 1) {
    const prevWindow = history.slice(-(WINDOW_SIZE + 1), -1);
    const prevRating = prevWindow.length > 0
      ? prevWindow.reduce((sum, score) => sum + score, 0) / prevWindow.length
      : 1000; // Fallback if first play
    delta = current - prevRating;
  }

  // Streak: consecutive solves in recent plays (capped at window size)
  let streakSolved = 0;
  for (let i = history.length - 1; i >= Math.max(0, history.length - WINDOW_SIZE); i--) {
    if (history[i] > 0) {
      streakSolved++;
    } else {
      break;
    }
  }

  return {
    current,
    delta,
    history,
    streakSolved,
  };
}
