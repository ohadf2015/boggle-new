/**
 * Player Cleanup Utilities
 * Centralized logic for cleaning up player data when they leave a game
 */

// ==========================================
// Type Definitions
// ==========================================

interface GameWithPlayerData {
  playerScores?: Record<string, number>;
  playerWords?: Record<string, string[]>;
  playerAchievements?: Record<string, unknown>;
  playerWordDetails?: Record<string, unknown>;
  playerCombos?: Record<string, unknown>;
}

// ==========================================
// Functions
// ==========================================

/**
 * Clean up all player-specific data from a game
 */
export function cleanupPlayerData(game: GameWithPlayerData | null | undefined, username: string): void {
  if (!game) return;

  // Clean up all player-specific data structures
  if (game.playerScores) {
    delete game.playerScores[username];
  }

  if (game.playerWords) {
    delete game.playerWords[username];
  }

  if (game.playerAchievements) {
    delete game.playerAchievements[username];
  }

  if (game.playerWordDetails) {
    delete game.playerWordDetails[username];
  }

  if (game.playerCombos) {
    delete game.playerCombos[username];
  }

  // Note: playerAvatars has been deprecated and removed
  // Avatar data is now stored in game.users[username].avatar
}

export type { GameWithPlayerData };
