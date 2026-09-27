/**
 * Session Fatigue Detection
 *
 * Detects student fatigue based on session duration, answer accuracy trends,
 * and total workload. Provides break recommendations to maintain optimal learning.
 */

export interface SessionFatigueInput {
  sessionStartTime: Date;
  recentAccuracies: number[];   // Last N answer accuracies (0 or 1)
  totalAnswers: number;
  breaksTaken: number;
}

export interface FatigueResult {
  fatigueLevel: 'none' | 'mild' | 'moderate' | 'high';
  shouldSuggestBreak: boolean;
  reasons: string[];             // Translation key strings (no hardcoded UI text)
  recommendedBreakMinutes: number;
}

const MILD_SESSION_MINUTES = 25;
const MODERATE_SESSION_MINUTES = 40;
const HIGH_ANSWER_COUNT = 80;
const ACCURACY_MODERATE_THRESHOLD = 0.5;
const ACCURACY_HIGH_THRESHOLD = 0.3;
const ACCURACY_WINDOW = 10;

type FatigueLevel = 'none' | 'mild' | 'moderate' | 'high';

const LEVEL_ORDER: FatigueLevel[] = ['none', 'mild', 'moderate', 'high'];

function escalateLevel(level: FatigueLevel): FatigueLevel {
  const idx = LEVEL_ORDER.indexOf(level);
  return LEVEL_ORDER[Math.min(idx + 1, LEVEL_ORDER.length - 1)];
}

const BREAK_MINUTES: Record<FatigueLevel, number> = {
  none: 0,
  mild: 5,
  moderate: 10,
  high: 15,
};

/**
 * Calculate rolling accuracy for last N attempts.
 * If array has fewer than windowSize items, uses all items.
 */
export function rollingAccuracy(accuracies: number[], windowSize: number): number {
  if (accuracies.length === 0) return 0;
  const window = accuracies.slice(-windowSize);
  return window.reduce((sum, v) => sum + v, 0) / window.length;
}

/**
 * Detect session fatigue.
 *
 * Rules:
 * - Session > 25 min → mild fatigue at minimum
 * - Session > 40 min → moderate fatigue at minimum
 * - Accuracy in last 10 answers < 50% → moderate fatigue signal
 * - Accuracy in last 10 answers < 30% → high fatigue signal
 * - Total answers > 80 → mild fatigue signal
 * - Both time AND accuracy signals → escalate by one level
 * - shouldSuggestBreak when level >= moderate
 */
export function detectFatigue(input: SessionFatigueInput): FatigueResult {
  const now = new Date();
  const sessionMinutes = (now.getTime() - input.sessionStartTime.getTime()) / (1000 * 60);
  const accuracy = rollingAccuracy(input.recentAccuracies, ACCURACY_WINDOW);
  const reasons: string[] = [];

  let timeLevel: FatigueLevel = 'none';
  let accuracyLevel: FatigueLevel = 'none';

  // Time-based signals
  if (sessionMinutes > MODERATE_SESSION_MINUTES) {
    timeLevel = 'moderate';
    reasons.push('fatigue.session_too_long');
  } else if (sessionMinutes > MILD_SESSION_MINUTES) {
    timeLevel = 'mild';
    reasons.push('fatigue.session_long');
  }

  // Answer count signal (mild)
  if (input.totalAnswers > HIGH_ANSWER_COUNT) {
    if (LEVEL_ORDER.indexOf(timeLevel) < LEVEL_ORDER.indexOf('mild')) {
      timeLevel = 'mild';
    }
    reasons.push('fatigue.many_answers');
  }

  // Accuracy-based signals
  if (input.recentAccuracies.length >= 1) {
    if (accuracy < ACCURACY_HIGH_THRESHOLD) {
      accuracyLevel = 'high';
      reasons.push('fatigue.low_accuracy_critical');
    } else if (accuracy < ACCURACY_MODERATE_THRESHOLD) {
      accuracyLevel = 'moderate';
      reasons.push('fatigue.low_accuracy');
    }
  }

  // Combine levels: take the higher of time/accuracy
  let finalLevel: FatigueLevel =
    LEVEL_ORDER.indexOf(timeLevel) >= LEVEL_ORDER.indexOf(accuracyLevel)
      ? timeLevel
      : accuracyLevel;

  // Escalate if BOTH time AND accuracy signals are present
  const hasTimeSignal = timeLevel !== 'none';
  const hasAccuracySignal = accuracyLevel !== 'none';
  if (hasTimeSignal && hasAccuracySignal && finalLevel !== 'high') {
    finalLevel = escalateLevel(finalLevel);
    reasons.push('fatigue.combined_signals');
  }

  const shouldSuggestBreak =
    finalLevel === 'moderate' || finalLevel === 'high';

  // Deduplicate reasons
  const uniqueReasons = [...new Set(reasons)];

  return {
    fatigueLevel: finalLevel,
    shouldSuggestBreak,
    reasons: finalLevel === 'none' ? [] : uniqueReasons,
    recommendedBreakMinutes: BREAK_MINUTES[finalLevel],
  };
}
