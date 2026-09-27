/**
 * Adaptive Difficulty Service
 *
 * Calculates player skill level based on recent performance
 * and selects appropriate bot difficulty
 */

import type { BotDifficulty } from '@/shared/schemas/socketSchemas';

export type PlayerLevel = 'beginner' | 'intermediate' | 'advanced';

export interface GameResult {
  placement: number; // 1 = win, 2+ = loss
  score: number;
  wordCount: number;
}

/**
 * Calculates player skill level based on recent game results
 *
 * @param recentGames - Last 10 games played (fewer is OK)
 * @returns Player level: beginner (0-30% win), intermediate (30-70%), advanced (70%+)
 */
export async function calculatePlayerLevel(
  recentGames: GameResult[]
): Promise<PlayerLevel> {
  // Default to beginner for new players
  if (recentGames.length === 0) {
    return 'beginner';
  }

  // Calculate win rate (placement 1 = win)
  const wins = recentGames.filter((game) => game.placement === 1).length;
  const winRate = wins / recentGames.length;

  // Determine level based on win rate
  if (winRate > 0.7) {
    return 'advanced';
  } else if (winRate > 0.3) {
    return 'intermediate';
  } else {
    return 'beginner';
  }
}

/**
 * Maps player level to bot difficulty
 *
 * @param playerLevel - The player's skill level
 * @returns Appropriate bot difficulty for balanced gameplay
 */
export function selectBotDifficulty(playerLevel: PlayerLevel): BotDifficulty {
  switch (playerLevel) {
    case 'beginner':
      return 'easy';
    case 'intermediate':
      return 'medium';
    case 'advanced':
      return 'hard';
  }
}
