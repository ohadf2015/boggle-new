/**
 * Session Error Analysis
 *
 * Classifies vocabulary errors and aggregates session-level patterns
 * to surface actionable insights for learners.
 */

export type ErrorType = 'typo' | 'conceptual' | 'timeout' | 'repeated';

export interface WordAttemptRecord {
  word: string;
  userAnswer: string;
  correct: boolean;
  timeSpentMs: number;
  attemptNumber: number; // nth attempt at this word in the session
}

export interface ErrorPattern {
  word: string;
  errorType: ErrorType;
  frequency: number;      // How many times this error occurred
  description: string;    // Human-readable hint key (translated by UI layer)
}

export interface ErrorAnalysisResult {
  strongWords: string[];       // Correct on first try, < 1000ms
  weakWords: string[];         // Multiple errors or repeated mistakes
  patterns: ErrorPattern[];    // Error patterns detected
  overallAccuracy: number;     // 0.0 to 1.0
  recommendedFocus: string[];  // Top 5 words to focus on
}

const TYPO_MAX_DISTANCE = 2;
const TIMEOUT_MS = 10000;
const REPEATED_ATTEMPT_THRESHOLD = 3;
const STRONG_WORD_MAX_MS = 1000;
const MAX_RECOMMENDED_FOCUS = 5;

/**
 * Levenshtein distance between two strings (for typo detection).
 * Uses standard dynamic programming approach.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // dp[i][j] = edit distance between a[0..i-1] and b[0..j-1]
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => {
      if (i === 0) return j;
      if (j === 0) return i;
      return 0;
    })
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],    // delete from a
          dp[i][j - 1],    // insert into a
          dp[i - 1][j - 1] // substitute
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Classify error type for a single attempt.
 * Returns null if the attempt was correct.
 *
 * Priority order: repeated > timeout > typo > conceptual
 */
export function classifyError(attempt: WordAttemptRecord): ErrorType | null {
  if (attempt.correct) return null;

  if (attempt.attemptNumber >= REPEATED_ATTEMPT_THRESHOLD) {
    return 'repeated';
  }

  if (attempt.timeSpentMs > TIMEOUT_MS) {
    return 'timeout';
  }

  const dist = levenshteinDistance(
    attempt.word.toLowerCase(),
    attempt.userAnswer.toLowerCase()
  );
  if (dist <= TYPO_MAX_DISTANCE) {
    return 'typo';
  }

  return 'conceptual';
}

const ERROR_DESCRIPTIONS: Record<ErrorType, string> = {
  typo: 'error.typo_hint',
  conceptual: 'error.conceptual_hint',
  timeout: 'error.timeout_hint',
  repeated: 'error.repeated_hint',
};

/**
 * Analyze a session's word attempts and return error patterns.
 */
export function analyzeSessionErrors(
  attempts: WordAttemptRecord[]
): ErrorAnalysisResult {
  if (attempts.length === 0) {
    return {
      strongWords: [],
      weakWords: [],
      patterns: [],
      overallAccuracy: 0,
      recommendedFocus: [],
    };
  }

  const totalCorrect = attempts.filter(a => a.correct).length;
  const overallAccuracy = totalCorrect / attempts.length;

  // Track per-word error counts and whether ever gotten correct on attempt 1
  const wordErrors = new Map<string, { count: number; errorType: ErrorType }>();
  const wordFirstTryCorrect = new Map<string, boolean>();
  const wordFirstTryFast = new Map<string, boolean>();

  for (const attempt of attempts) {
    if (attempt.correct && attempt.attemptNumber === 1) {
      wordFirstTryCorrect.set(attempt.word, true);
      wordFirstTryFast.set(attempt.word, attempt.timeSpentMs < STRONG_WORD_MAX_MS);
    }

    const errorType = classifyError(attempt);
    if (errorType !== null) {
      const existing = wordErrors.get(attempt.word);
      if (existing) {
        existing.count += 1;
        // Keep most severe error type
        existing.errorType = errorType;
      } else {
        wordErrors.set(attempt.word, { count: 1, errorType });
      }
    }
  }

  // Strong words: correct on first attempt AND fast
  const strongWords = Array.from(wordFirstTryCorrect.entries())
    .filter(([word, correct]) => correct && wordFirstTryFast.get(word) === true)
    .map(([word]) => word);

  // Weak words: had errors (and may have eventually gotten correct)
  const weakWords = Array.from(wordErrors.keys());

  // Build error patterns
  const patterns: ErrorPattern[] = Array.from(wordErrors.entries()).map(
    ([word, { count, errorType }]) => ({
      word,
      errorType,
      frequency: count,
      description: ERROR_DESCRIPTIONS[errorType],
    })
  );

  // Recommended focus: top words by error frequency, max 5
  const recommendedFocus = [...patterns]
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, MAX_RECOMMENDED_FOCUS)
    .map(p => p.word);

  return {
    strongWords,
    weakWords,
    patterns,
    overallAccuracy,
    recommendedFocus,
  };
}
