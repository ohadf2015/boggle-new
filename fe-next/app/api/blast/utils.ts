/**
 * Blast API Utils
 *
 * Validation and calculation functions for blast score persistence.
 * Extracted for testability — pure functions, no side effects.
 */

const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const VALID_LANGUAGES = ['en', 'he', 'sv', 'ja'] as const;

export interface BlastResultPayload {
  score: number;
  tilesCleared: number;
  totalTiles: number;
  clearPercentage: number;
  wordsFound: string[];
  bestWord: string;
  maxCombo: number;
  stars: number;
  difficulty: string;
  language: string;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  data?: BlastResultPayload;
}

/** Validate a blast result submission from the client */
export function validateBlastResult(body: Record<string, unknown>): ValidationResult {
  const { score, tilesCleared, totalTiles, clearPercentage, wordsFound, bestWord, maxCombo, stars, difficulty, language } = body;

  // Required numeric fields
  if (typeof score !== 'number' || typeof tilesCleared !== 'number' || typeof totalTiles !== 'number' ||
      typeof clearPercentage !== 'number' || typeof maxCombo !== 'number' || typeof stars !== 'number') {
    return { valid: false, error: 'Missing required fields: score, tilesCleared, totalTiles, clearPercentage, maxCombo, stars' };
  }

  if (score < 0) return { valid: false, error: 'Invalid score: must be non-negative' };
  if (tilesCleared < 0 || totalTiles < 0) return { valid: false, error: 'Invalid tile counts: must be non-negative' };
  if (tilesCleared > totalTiles) return { valid: false, error: 'Invalid tilesCleared: cannot exceed totalTiles' };

  if (stars < 1 || stars > 3) return { valid: false, error: 'Invalid stars: must be between 1 and 3' };

  if (typeof difficulty !== 'string' || !VALID_DIFFICULTIES.includes(difficulty as typeof VALID_DIFFICULTIES[number])) {
    return { valid: false, error: 'Invalid difficulty: must be easy, medium, or hard' };
  }

  if (typeof language !== 'string' || !VALID_LANGUAGES.includes(language as typeof VALID_LANGUAGES[number])) {
    return { valid: false, error: 'Invalid language: must be en, he, sv, or ja' };
  }

  if (!Array.isArray(wordsFound)) {
    return { valid: false, error: 'Invalid wordsFound: must be an array' };
  }

  return {
    valid: true,
    data: {
      score: score as number,
      tilesCleared: tilesCleared as number,
      totalTiles: totalTiles as number,
      clearPercentage: clearPercentage as number,
      wordsFound: wordsFound as string[],
      bestWord: (typeof bestWord === 'string' ? bestWord : '') as string,
      maxCombo: maxCombo as number,
      stars: stars as number,
      difficulty: difficulty as string,
      language: language as string,
    },
  };
}

export interface PersonalBests {
  bestScore: number;
  bestClearPercentage: number;
  bestMaxCombo: number;
  totalGames: number;
  totalWords: number;
}

interface GameMetrics {
  score: number;
  clearPercentage: number;
  maxCombo: number;
  wordsFound: number;
}

/** Calculate updated personal bests after a game. Pure function. */
export function calculatePersonalBests(
  existing: PersonalBests | null,
  current: GameMetrics,
): PersonalBests {
  if (!existing) {
    return {
      bestScore: current.score,
      bestClearPercentage: current.clearPercentage,
      bestMaxCombo: current.maxCombo,
      totalGames: 1,
      totalWords: current.wordsFound,
    };
  }

  return {
    bestScore: Math.max(existing.bestScore, current.score),
    bestClearPercentage: Math.max(existing.bestClearPercentage, current.clearPercentage),
    bestMaxCombo: Math.max(existing.bestMaxCombo, current.maxCombo),
    totalGames: existing.totalGames + 1,
    totalWords: existing.totalWords + current.wordsFound,
  };
}
