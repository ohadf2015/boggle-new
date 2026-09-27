/**
 * Blast API Utils
 *
 * Validation and calculation functions for blast score persistence.
 * Extracted for testability — pure functions, no side effects.
 */

const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const VALID_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;

// Upper bounds based on game mechanics:
// Max grid is 6×6 = 36 tiles. Score of 50,000 is extremely generous
// (perfect 12-wave clear with all combos would yield ~10-15k).
const MAX_TOTAL_TILES = 36;
const MAX_SCORE = 50_000;
const MAX_COMBO = 50; // generous; realistic max ~15-20 per wave

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

  if (score < 0 || score > MAX_SCORE) return { valid: false, error: `Invalid score: must be between 0 and ${MAX_SCORE}` };
  if (tilesCleared < 0 || totalTiles < 0) return { valid: false, error: 'Invalid tile counts: must be non-negative' };
  if (totalTiles > MAX_TOTAL_TILES) return { valid: false, error: `Invalid totalTiles: maximum grid is ${MAX_TOTAL_TILES}` };
  if (maxCombo > MAX_COMBO) return { valid: false, error: `Invalid maxCombo: maximum is ${MAX_COMBO}` };

  // Cross-validate clearPercentage against tilesCleared/totalTiles.
  // tilesCleared CAN exceed totalTiles in gravity/cascade mode (tiles refill), so only validate when ratio ≤ 100%.
  if (totalTiles > 0 && tilesCleared <= totalTiles) {
    const expectedPct = Math.round(tilesCleared / totalTiles * 100);
    if (Math.abs(clearPercentage - expectedPct) > 2) {
      return { valid: false, error: 'Invalid clearPercentage: inconsistent with tilesCleared/totalTiles' };
    }
  }

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
      score,
      tilesCleared,
      totalTiles,
      clearPercentage,
      wordsFound: wordsFound as string[],
      bestWord: typeof bestWord === 'string' ? bestWord : '',
      maxCombo,
      stars,
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
