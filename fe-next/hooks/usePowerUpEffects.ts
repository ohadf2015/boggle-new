/**
 * Power-Up Effect Application Functions
 *
 * Pure functions for applying power-up effects to game state.
 * Each power-up has distinct behavior:
 * - Freeze Time: Extends timer by 10 seconds (capped at original max)
 * - Hint: Reveals valid unfound word with tile positions
 * - Score Multiplier: Applies 2x to word scores for 30 seconds
 *
 * All effects are blocked during cascade animations.
 */

import type { TileState } from '../types/adventure';

/**
 * Result of hint power-up containing word and tile positions
 */
export interface HintResult {
  /** The word found */
  word: string;
  /** Array of tile positions forming the word */
  tiles: Array<{ row: number; col: number }>;
}

/**
 * Freeze Time Effect (POWER-01)
 *
 * Extends the countdown timer by 10 seconds, capped at original max time.
 *
 * @param timeRemaining - Current seconds remaining
 * @param totalTime - Original max time for the level
 * @returns New time remaining after freeze effect
 */
export function applyFreezeTime(
  timeRemaining: number,
  totalTime: number
): number {
  return Math.min(timeRemaining + 10, totalTime);
}

/**
 * Score Multiplier Effect (POWER-03)
 *
 * Activates 2x score multiplier for 30 seconds.
 *
 * @returns Multiplier value and expiration timestamp
 */
export function applyScoreMultiplier(): {
  multiplier: number;
  expiresAt: number;
} {
  return {
    multiplier: 2,
    expiresAt: Date.now() + 30000, // 30 seconds
  };
}

/**
 * Hint Effect (POWER-02)
 *
 * Finds a valid unfound word on the board and returns it with tile positions.
 * Prioritizes longer words (5+ letters preferred).
 *
 * @param tiles - Current board state
 * @param wordsFound - Already-found words to exclude
 * @param dictionary - Set of valid words
 * @returns Hint result with word and positions, or null if no words available
 */
export function applyHint(
  tiles: TileState[][],
  wordsFound: string[],
  dictionary: Set<string>
): HintResult | null {
  if (!tiles || tiles.length === 0) {
    return null;
  }

  // Find all valid words on the board
  const validWords = findAllWordsOnBoard(tiles, dictionary);

  // Filter out already-found words
  const foundSet = new Set(wordsFound.map(w => w.toUpperCase()));
  const unfoundWords = validWords.filter(
    result => !foundSet.has(result.word)
  );

  if (unfoundWords.length === 0) {
    return null;
  }

  // Sort by word length descending (prioritize longer words)
  unfoundWords.sort((a, b) => b.word.length - a.word.length);

  // Return the longest word
  return unfoundWords[0];
}

/**
 * Find all valid words on the board using DFS
 *
 * @param tiles - Current board state
 * @param dictionary - Set of valid words
 * @returns Array of hint results for all valid words found
 */
function findAllWordsOnBoard(
  tiles: TileState[][],
  dictionary: Set<string>
): HintResult[] {
  const results: HintResult[] = [];
  const rows = tiles.length;
  const cols = tiles[0]?.length || 0;

  // All 8 adjacent directions
  const directions: [number, number][] = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ];

  /**
   * DFS to find words starting from a position
   */
  function dfs(
    row: number,
    col: number,
    word: string,
    path: Array<{ row: number; col: number }>,
    visited: Set<string>
  ): void {
    // Check if current word is valid and long enough (minimum 3 letters)
    if (word.length >= 3 && dictionary.has(word.toUpperCase())) {
      // Only add if not already in results
      const wordKey = word.toUpperCase();
      if (!results.find(r => r.word === wordKey)) {
        results.push({
          word: wordKey,
          tiles: [...path],
        });
      }
    }

    // Stop if word is too long (prevent infinite exploration)
    if (word.length >= 10) {
      return;
    }

    // Explore adjacent cells
    for (const [dx, dy] of directions) {
      const newRow = row + dx;
      const newCol = col + dy;
      const cellKey = `${newRow},${newCol}`;

      // Check bounds
      if (newRow < 0 || newRow >= rows || newCol < 0 || newCol >= cols) {
        continue;
      }

      // Check if already visited
      if (visited.has(cellKey)) {
        continue;
      }

      // Get next letter
      const nextLetter = tiles[newRow][newCol].letter;

      // Mark visited and explore
      visited.add(cellKey);
      path.push({ row: newRow, col: newCol });

      dfs(
        newRow,
        newCol,
        word + nextLetter,
        path,
        visited
      );

      // Backtrack
      visited.delete(cellKey);
      path.pop();
    }
  }

  // Start DFS from each cell
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const letter = tiles[i][j].letter;
      const visited = new Set<string>([`${i},${j}`]);
      const path = [{ row: i, col: j }];

      dfs(i, j, letter, path, visited);
    }
  }

  return results;
}

/**
 * Game state interface for power-up effects
 */
interface PowerUpGameState {
  tiles: TileState[][];
  wordsFound: string[];
  cascadeActive: boolean;
  timeRemaining: number;
  totalTime: number;
}

/**
 * Power-Up Effects Hook
 *
 * Wraps pure effect functions and provides cascade blocking.
 * Returns activation functions that check cascade state before applying.
 *
 * @param gameState - Current game state
 * @param dictionary - Set of valid words for hint
 * @returns Activation functions for each power-up
 */
export function usePowerUpEffects(
  gameState: PowerUpGameState,
  dictionary: Set<string>
) {
  /**
   * Activate Freeze Time power-up
   * Returns new time remaining or false if blocked by cascade
   */
  const activateFreezeTime = () => {
    if (gameState.cascadeActive) {
      return false;
    }

    return {
      timeRemaining: applyFreezeTime(
        gameState.timeRemaining,
        gameState.totalTime
      ),
    };
  };

  /**
   * Activate Hint power-up
   * Returns hint result or false if blocked by cascade
   */
  const activateHint = () => {
    if (gameState.cascadeActive) {
      return false;
    }

    const hint = applyHint(
      gameState.tiles,
      gameState.wordsFound,
      dictionary
    );

    return hint || false;
  };

  /**
   * Activate Score Multiplier power-up
   * Returns multiplier config or false if blocked by cascade
   */
  const activateScoreMultiplier = () => {
    if (gameState.cascadeActive) {
      return false;
    }

    return applyScoreMultiplier();
  };

  return {
    activateFreezeTime,
    activateHint,
    activateScoreMultiplier,
  };
}
