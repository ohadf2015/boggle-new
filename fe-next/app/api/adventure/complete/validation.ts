/**
 * Request body validation for POST /api/adventure/complete.
 * Split from route.ts so the handler stays under 500 lines.
 */

const MAX_SCORE = 50000;
const MAX_WORDS = 500;
export const MIN_TIME_PLAYED_SECONDS = 10;

export interface ValidatedCompletionData {
  world: number;
  level: number;
  stars: number;
  score: number;
  words: number;
  retainedScore?: number;
  wordsFound?: string[];
  flashChallengeCompleted?: boolean;
  timePlayed: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  data?: ValidatedCompletionData;
}

/**
 * Validate completion request body.
 * Rejects missing/out-of-range numeric fields and caps score to prevent
 * leaderboard pollution. `flashChallengeGold` is never accepted from the
 * client — only the `flashChallengeCompleted` boolean flag.
 */
export function validateRequestBody(body: Record<string, unknown>): ValidationResult {
  const { world, level, stars, score, words, retainedScore } = body;

  if (
    typeof world !== 'number' ||
    typeof level !== 'number' ||
    typeof stars !== 'number' ||
    typeof score !== 'number' ||
    typeof words !== 'number'
  ) {
    return { valid: false, error: 'Missing required fields: world, level, stars, score, words' };
  }

  // world=0 is endless mode sentinel, 1-10 is story mode
  if (world < 0 || world > 10) {
    return { valid: false, error: 'Invalid world: must be between 0 and 10' };
  }

  if (world === 0) {
    if (level < 1) {
      return { valid: false, error: 'Invalid endless floor: must be >= 1' };
    }
  } else if (level < 1 || level > 7) {
    return { valid: false, error: 'Invalid level: must be between 1 and 7' };
  }

  if (stars < 0 || stars > 3) {
    return { valid: false, error: 'Invalid stars: must be between 0 and 3' };
  }

  if (score < 0) {
    return { valid: false, error: 'Invalid score: must be non-negative' };
  }
  if (score > MAX_SCORE) {
    return { valid: false, error: `Invalid score: exceeds maximum of ${MAX_SCORE}` };
  }

  if (words < 0 || words > MAX_WORDS) {
    return { valid: false, error: 'Invalid words: must be between 0 and 500' };
  }

  const data: ValidatedCompletionData = {
    world, level, stars, score, words,
    timePlayed: typeof body.timePlayed === 'number' ? body.timePlayed : 0,
  };
  if (typeof retainedScore === 'number') data.retainedScore = retainedScore;
  if (Array.isArray(body.wordsFound)) data.wordsFound = body.wordsFound as string[];
  if (body.flashChallengeCompleted === true) data.flashChallengeCompleted = true;

  return { valid: true, data };
}
