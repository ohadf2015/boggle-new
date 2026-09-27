/**
 * Adaptive Difficulty — Zone of Proximal Development (ZPD)
 *
 * Implements Vygotsky's ZPD model: present words that are challenging but
 * achievable. Sequences vocabulary based on student performance signals.
 *
 * Reference: Vygotsky (1978) - Mind in Society
 */

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface WordDifficulty {
  word: string;
  difficultyScore: number;      // 0-1 composite difficulty
  level: DifficultyLevel;       // easy | medium | hard bucket
  masteryProbability: number;   // Estimated probability of mastery
}

export interface ZPDAssessment {
  currentMasteryLevel: number;    // 0-1 fraction of words mastered
  recommendedDifficulty: DifficultyLevel;
  nextWords: string[];            // Prioritized word list (may be empty initially)
  shouldEaseOff: boolean;         // Student is struggling (accuracy < 40%)
  shouldChallenge: boolean;       // Student is breezing through (accuracy > 85%)
}

// Thresholds for difficulty level buckets
const EASY_THRESHOLD = 0.35;
const HARD_THRESHOLD = 0.65;

// ZPD performance thresholds
const EASE_OFF_ACCURACY = 0.4;
const CHALLENGE_ACCURACY = 0.85;
const CHALLENGE_MASTERY_MIN = 0.6;  // Must also have reasonable mastery progress

// Word length normalisation cap (longer = harder, diminishing returns beyond 15)
const MAX_NORMALISED_LENGTH = 15;

/**
 * Score a word's difficulty using length, error rate, and average attempts.
 *
 * Composite score weights:
 * - normalised word length: 30%
 * - historical error rate: 50%
 * - normalised avg attempts: 20%
 */
export function scoreWordDifficulty(
  word: string,
  errorRate: number,
  avgAttempts: number,
  wordLength?: number
): WordDifficulty {
  const length = wordLength ?? word.length;

  // Normalise each factor to 0-1 range
  const normLength = Math.min(length / MAX_NORMALISED_LENGTH, 1);
  const normError = Math.max(0, Math.min(errorRate, 1));
  // avgAttempts typically 1-5, normalise against 5
  const normAttempts = Math.max(0, Math.min((avgAttempts - 1) / 4, 1));

  const difficultyScore = 0.3 * normLength + 0.5 * normError + 0.2 * normAttempts;

  let level: DifficultyLevel;
  if (difficultyScore < EASY_THRESHOLD) {
    level = 'easy';
  } else if (difficultyScore < HARD_THRESHOLD) {
    level = 'medium';
  } else {
    level = 'hard';
  }

  // Mastery probability inversely related to difficulty
  const masteryProbability = Math.max(0, 1 - difficultyScore);

  return {
    word,
    difficultyScore,
    level,
    masteryProbability,
  };
}

/**
 * Assess the student's ZPD based on recent session performance.
 *
 * @param recentAccuracy  Average accuracy across last ~10 attempts (0-1)
 * @param masteredCount   Number of words already mastered
 * @param totalWords      Total words in the lesson/word-set
 */
export function assessZPD(
  recentAccuracy: number,
  masteredCount: number,
  totalWords: number,
): ZPDAssessment {
  const currentMasteryLevel = totalWords > 0 ? masteredCount / totalWords : 0;

  const shouldEaseOff = recentAccuracy < EASE_OFF_ACCURACY;
  const shouldChallenge =
    recentAccuracy > CHALLENGE_ACCURACY && currentMasteryLevel >= CHALLENGE_MASTERY_MIN;

  let recommendedDifficulty: DifficultyLevel;
  if (shouldEaseOff) {
    recommendedDifficulty = 'easy';
  } else if (shouldChallenge) {
    recommendedDifficulty = 'hard';
  } else {
    recommendedDifficulty = 'medium';
  }

  return {
    currentMasteryLevel,
    recommendedDifficulty,
    nextWords: [],
    shouldEaseOff,
    shouldChallenge,
  };
}

/**
 * Sequence words for optimal learning based on ZPD assessment.
 *
 * - Excludes already-mastered words
 * - When shouldEaseOff: sorts easy-first
 * - When shouldChallenge: sorts hard-first
 * - Otherwise: groups by recommendedDifficulty first, then interleaves
 */
export function sequenceWords(
  words: Array<{ word: string; errorRate?: number; avgAttempts?: number }>,
  zpd: ZPDAssessment,
  alreadyMastered: string[]
): string[] {
  const masteredSet = new Set(alreadyMastered);

  // Score all non-mastered words
  const scored = words
    .filter(w => !masteredSet.has(w.word))
    .map(w =>
      scoreWordDifficulty(
        w.word,
        w.errorRate ?? 0.3,
        w.avgAttempts ?? 2.0
      )
    );

  if (scored.length === 0) return [];

  // Sort order depends on ZPD flags
  if (zpd.shouldEaseOff) {
    // Easiest first (lowest difficulty score)
    scored.sort((a, b) => a.difficultyScore - b.difficultyScore);
  } else if (zpd.shouldChallenge) {
    // Hardest first (highest difficulty score)
    scored.sort((a, b) => b.difficultyScore - a.difficultyScore);
  } else {
    // Target the recommended difficulty bucket first, then others
    const order: DifficultyLevel[] = ['easy', 'medium', 'hard'];
    const targetIdx = order.indexOf(zpd.recommendedDifficulty);
    // Sort: recommended level first, then ascending from target
    scored.sort((a, b) => {
      const aDist = Math.abs(order.indexOf(a.level) - targetIdx);
      const bDist = Math.abs(order.indexOf(b.level) - targetIdx);
      if (aDist !== bDist) return aDist - bDist;
      return a.difficultyScore - b.difficultyScore;
    });
  }

  return scored.map(s => s.word);
}
