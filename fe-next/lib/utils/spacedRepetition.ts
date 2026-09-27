/**
 * Spaced Repetition (SM-2 Algorithm)
 *
 * Implements the SuperMemo 2 algorithm for scheduling vocabulary review.
 * Reference: https://www.supermemo.com/en/blog/application-of-a-computer-to-improve-the-results-obtained-in-working-with-the-supermemo-method
 */

export interface WordReviewData {
  word: string;
  easeFactor: number;       // Start at 2.5, min 1.3
  interval: number;         // Days until next review, starts at 1
  repetitions: number;      // Consecutive correct recalls
  nextReviewDate: string;   // ISO date string (YYYY-MM-DD)
  lastReviewDate: string;   // ISO date string (YYYY-MM-DD)
}

export interface ReviewResult {
  quality: 0 | 1 | 2 | 3 | 4 | 5; // 0-2 = incorrect, 3-5 = correct
}

const MIN_EASE_FACTOR = 1.3;
const INITIAL_EASE_FACTOR = 2.5;

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Create initial review data for a new word.
 * nextReviewDate is set to today so the word is immediately available.
 */
export function createWordReviewData(word: string): WordReviewData {
  const today = toDateString(new Date());
  return {
    word,
    easeFactor: INITIAL_EASE_FACTOR,
    interval: 1,
    repetitions: 0,
    nextReviewDate: today,
    lastReviewDate: today,
  };
}

/**
 * Calculate next review schedule using SM-2 algorithm.
 *
 * SM-2 rules:
 * - quality < 3 (incorrect): reset repetitions to 0, set interval to 1 day
 * - quality >= 3 (correct):
 *   - If repetitions == 0: interval = 1
 *   - If repetitions == 1: interval = 6
 *   - Else: interval = round(previous_interval * ease_factor)
 * - easeFactor update: EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
 *   - EF cannot go below 1.3
 * - Increment repetitions if quality >= 3, reset to 0 if < 3
 */
export function calculateNextReview(
  current: WordReviewData,
  result: ReviewResult
): WordReviewData {
  const { quality } = result;

  // Update ease factor (applied regardless of correct/incorrect)
  const efDelta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  const newEaseFactor = Math.max(MIN_EASE_FACTOR, current.easeFactor + efDelta);

  const today = toDateString(new Date());
  let newInterval: number;
  let newRepetitions: number;

  if (quality < 3) {
    // Incorrect: reset
    newRepetitions = 0;
    newInterval = 1;
  } else {
    // Correct
    newRepetitions = current.repetitions + 1;
    if (current.repetitions === 0) {
      newInterval = 1;
    } else if (current.repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(current.interval * current.easeFactor);
    }
  }

  const nextReviewDate = toDateString(addDays(new Date(), newInterval));

  return {
    ...current,
    easeFactor: newEaseFactor,
    interval: newInterval,
    repetitions: newRepetitions,
    nextReviewDate,
    lastReviewDate: today,
  };
}

/**
 * Check if a word is due for review today or earlier.
 */
export function isWordDueForReview(reviewData: WordReviewData, asOf?: Date): boolean {
  const checkDate = asOf ? toDateString(asOf) : toDateString(new Date());
  return reviewData.nextReviewDate <= checkDate;
}

/**
 * Sort words by review priority.
 * Overdue words come first, then future words.
 * Within each group, sort by easeFactor ascending (harder = lower EF first).
 */
export function sortByReviewPriority(words: WordReviewData[]): WordReviewData[] {
  const today = toDateString(new Date());
  return [...words].sort((a, b) => {
    const aDue = a.nextReviewDate <= today;
    const bDue = b.nextReviewDate <= today;

    if (aDue && !bDue) return -1;
    if (!aDue && bDue) return 1;

    // Both in the same group: sort by easeFactor ascending (harder first)
    return a.easeFactor - b.easeFactor;
  });
}
