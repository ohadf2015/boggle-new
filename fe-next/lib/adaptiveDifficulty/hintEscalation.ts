/**
 * Hint Escalation System
 *
 * Progressive hint system for adaptive difficulty.
 * Helps players struggling with specific levels through escalating hints.
 */

/**
 * Hint levels that escalate based on same-level failures
 */
export type HintLevel = 'none' | 'length' | 'lengthAndStart' | 'fullReveal';

/**
 * Tile position on the board
 */
export interface TilePosition {
  row: number;
  col: number;
}

/**
 * Data for displaying a hint to the player
 */
export interface HintData {
  level: HintLevel;
  message?: string; // i18n key for hint message
  wordLength?: number;
  startLetter?: string;
  highlightTiles?: TilePosition[];
  targetWord?: string;
}

/**
 * Determines hint level based on attempt count
 *
 * @param attemptCount Number of attempts on the same level
 * @returns Hint level to display
 */
export function getHintLevel(attemptCount: number): HintLevel {
  if (attemptCount < 3) {
    return 'none';
  }
  if (attemptCount === 3) {
    return 'length';
  }
  if (attemptCount === 4) {
    return 'lengthAndStart';
  }
  return 'fullReveal';
}

/**
 * Generates hint data based on attempt count and target word
 *
 * @param params Configuration for hint generation
 * @returns Hint data to display to player
 */
export function generateHint(params: {
  attemptCount: number;
  targetWord: string;
  wordPath: TilePosition[];
}): HintData {
  const { attemptCount, targetWord, wordPath } = params;
  const level = getHintLevel(attemptCount);

  switch (level) {
    case 'none':
      return { level: 'none' };

    case 'length':
      return {
        level: 'length',
        message: 'difficulty.hint.length',
        wordLength: targetWord.length,
      };

    case 'lengthAndStart':
      return {
        level: 'lengthAndStart',
        message: 'difficulty.hint.lengthAndStart',
        wordLength: targetWord.length,
        startLetter: targetWord[0].toUpperCase(),
        highlightTiles: [wordPath[0]],
      };

    case 'fullReveal':
      return {
        level: 'fullReveal',
        message: 'difficulty.hint.fullReveal',
        wordLength: targetWord.length,
        targetWord: targetWord.toUpperCase(),
        highlightTiles: wordPath,
      };
  }
}
