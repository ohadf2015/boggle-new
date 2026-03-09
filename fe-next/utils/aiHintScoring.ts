/**
 * AI Hint Scoring & Rewards
 * Life rewards, token rewards, efficiency scoring, and shop utilities
 */

/**
 * Score breakdown for UI display
 */
export interface ScoreBreakdown {
  /** Speed score: life remaining x 4, capped at 400 */
  speed: number;
  /** Accuracy score: 400 - (guesses - 1) x 40, min 0 */
  accuracy: number;
  /** Exploration bonus: words x 10, capped at 200 */
  exploration: number;
  /** Total efficiency score (0-1000) */
  total: number;
  /** Maximum possible score */
  maxScore: 1000;
  /** Raw values for display */
  raw: {
    lifeRemaining: number;
    guessesUsed: number;
    wordsFound: number;
  };
}

/**
 * Calculate life points reward based on word length
 *
 * Reward structure:
 * - 2 letters: 3 life (minimal for Japanese kanji)
 * - 3 letters: 5 life
 * - 4 letters: 10 life
 * - 5 letters: 15 life
 * - 6 letters: 20 life
 * - 7+ letters: 25 life
 */
export function calculateLifeReward(wordLength: number): number {
  if (wordLength < 2) return 0;
  if (wordLength === 2) return 3;
  if (wordLength === 3) return 5;
  if (wordLength === 4) return 10;
  if (wordLength === 5) return 15;
  if (wordLength === 6) return 20;
  return 25;
}

/**
 * Calculate clue tokens reward based on word length
 *
 * Only 4+ letter words give tokens (3-letter words give life instead).
 *
 * Token structure:
 * - 2-3 letters: 0 tokens (life only)
 * - 4 letters: 1 token
 * - 5 letters: 2 tokens
 * - 6 letters: 3 tokens
 * - 7+ letters: 4 tokens
 */
export function calculateTokenReward(wordLength: number): number {
  if (wordLength < 4) return 0;
  if (wordLength === 4) return 1;
  if (wordLength === 5) return 2;
  if (wordLength === 6) return 3;
  return 4;
}

/**
 * Calculate efficiency score breakdown for leaderboard
 *
 * Balanced formula (Season 2):
 * - Speed (40%): min(life, 100) x 4 = max 400 pts
 * - Accuracy (40%): max(0, 400 - (guesses - 1) x 40) = max 400 pts
 * - Exploration (20%): min(words, 20) x 10 = max 200 pts
 *
 * Total max: 1000 points (perfect game: 100+ life, 1 guess, 20+ words)
 */
export function getScoreBreakdown(
  lifeRemaining: number,
  guessesUsed: number,
  wordsFound: number,
  solved: boolean
): ScoreBreakdown {
  if (!solved) {
    return {
      speed: 0,
      accuracy: 0,
      exploration: 0,
      total: 0,
      maxScore: 1000,
      raw: { lifeRemaining: 0, guessesUsed: 0, wordsFound: 0 },
    };
  }

  const life = Math.max(0, lifeRemaining);
  const guesses = Math.max(1, guessesUsed);
  const words = Math.max(0, wordsFound);

  const speed = Math.min(life, 100) * 4;
  const accuracy = Math.max(0, 400 - (guesses - 1) * 40);
  const exploration = Math.min(words, 20) * 10;
  const total = speed + accuracy + exploration;

  return {
    speed: Math.round(speed),
    accuracy: Math.round(accuracy),
    exploration: Math.round(exploration),
    total: Math.round(total),
    maxScore: 1000,
    raw: {
      lifeRemaining: Math.round(life),
      guessesUsed: guesses,
      wordsFound: words,
    },
  };
}

/**
 * Calculate efficiency score for leaderboard
 *
 * @param _unusedTokens - DEPRECATED: No longer used in scoring (kept for API compatibility)
 */
export function calculateEfficiencyScore(
  lifeRemaining: number,
  _unusedTokens: number,
  guessesUsed: number,
  wordsFound: number,
  solved: boolean
): number {
  return getScoreBreakdown(lifeRemaining, guessesUsed, wordsFound, solved).total;
}

/**
 * Get letters that can be eliminated (not in target word)
 */
export function getLettersToEliminate(
  targetWord: string,
  alreadyEliminated: Set<string>,
  count: number = 3
): string[] {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const targetLetters = new Set(targetWord.toUpperCase().split(''));

  const wrongLetters = alphabet
    .split('')
    .filter(l => !targetLetters.has(l) && !alreadyEliminated.has(l));

  const shuffled = wrongLetters.sort(() => Math.random() - 0.5);

  return shuffled.slice(0, count);
}

/**
 * Get a random unrevealed letter position to reveal
 *
 * @returns Position to reveal, or -1 if all revealed or only 1 left
 */
export function getLetterToReveal(
  targetWord: string,
  alreadyRevealed: Set<number>
): number {
  const wordLength = targetWord.length;
  const unrevealed = [...Array(wordLength).keys()].filter(
    i => !alreadyRevealed.has(i)
  );

  if (unrevealed.length <= 1) {
    return -1;
  }

  return unrevealed[Math.floor(Math.random() * unrevealed.length)];
}
