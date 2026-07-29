/**
 * Mastery Confidence Decay
 *
 * Models how word mastery confidence degrades over time using exponential decay.
 * Higher correct streaks slow the decay rate (spaced repetition reinforcement).
 *
 * Formula: confidence = e^(-decay_rate * effective_days)
 * Where: effective_days = days_since_practice * (1 - min(streak * 0.05, 0.4))
 */

export interface MasteryDecayInput {
  word: string;
  masteredAt: string;       // ISO date — when word was first mastered
  lastPracticedAt: string;  // ISO date — last time practiced
  correctStreak: number;    // Current streak of correct answers
}

export interface MasteryDecayResult {
  word: string;
  confidenceScore: number;  // 0.0 to 1.0
  isDecayed: boolean;       // confidence < 0.5
  needsRefresh: boolean;    // confidence < 0.7 and not practiced in 7+ days
  daysSinceLastPractice: number;
}

const DECAY_RATE = 0.1;
const MAX_STREAK_BONUS = 0.4;
const STREAK_BONUS_PER_LEVEL = 0.05;
const DECAY_THRESHOLD = 0.5;
const REFRESH_CONFIDENCE_THRESHOLD = 0.7;
const REFRESH_DAY_THRESHOLD = 7;

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * Calculate mastery confidence decay.
 *
 * Uses exponential decay: confidence = e^(-decay_rate * effective_days)
 * Base decay rate: 0.1 (half-life ≈ 6.93 days)
 * Correct streak bonus: multiply days by (1 - min(streak * 0.05, 0.4))
 * (higher streak = slower decay)
 */
export function calculateMasteryDecay(
  input: MasteryDecayInput,
  asOf?: Date
): MasteryDecayResult {
  const referenceDate = asOf ?? new Date();
  const lastPracticed = new Date(input.lastPracticedAt);

  const daysSinceLastPractice = Math.max(0, daysBetween(lastPracticed, referenceDate));

  // Streak bonus reduces effective days (slower decay for high streaks)
  const streakBonus = Math.min(input.correctStreak * STREAK_BONUS_PER_LEVEL, MAX_STREAK_BONUS);
  const effectiveDays = daysSinceLastPractice * (1 - streakBonus);

  const confidenceScore = Math.exp(-DECAY_RATE * effectiveDays);

  const isDecayed = confidenceScore < DECAY_THRESHOLD;
  const needsRefresh =
    confidenceScore < REFRESH_CONFIDENCE_THRESHOLD &&
    daysSinceLastPractice >= REFRESH_DAY_THRESHOLD;

  return {
    word: input.word,
    confidenceScore,
    isDecayed,
    needsRefresh,
    daysSinceLastPractice,
  };
}

/**
 * Filter words that need refresher practice.
 * Returns words where needsRefresh = true, sorted by confidence ascending.
 */
export function getWordsNeedingRefresh(
  words: MasteryDecayInput[],
  asOf?: Date
): MasteryDecayResult[] {
  return words
    .map(w => calculateMasteryDecay(w, asOf))
    .filter(r => r.needsRefresh)
    .sort((a, b) => a.confidenceScore - b.confidenceScore);
}
