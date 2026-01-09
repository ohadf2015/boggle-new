/**
 * Keyboard Trails Display Utilities
 *
 * Determines when to show keyboard word trails (highlighted path) on the game board.
 * Trails help new players understand how letters connect, but experienced players
 * don't need this visual assistance.
 */

/**
 * Determines whether keyboard trails should be shown based on player experience.
 *
 * Rules:
 * - Show trails for new players (0-1 games played) - they're still learning
 * - Hide trails for experienced players (2+ games) - they know how to play
 * - If games played is unknown (undefined/null), assume new player
 *
 * @param isTypingMode - Whether the player is currently typing a word
 * @param totalGamesPlayed - Number of games the player has completed
 * @returns true if keyboard trails should be displayed
 */
export function shouldShowKeyboardTrails(
  isTypingMode: boolean,
  totalGamesPlayed: number | undefined
): boolean {
  // Not typing = no trails
  if (!isTypingMode) {
    return false;
  }

  // Unknown games played (new/guest player) = show trails
  if (totalGamesPlayed === undefined || totalGamesPlayed === null) {
    return true;
  }

  // New players (0-1 games) = show trails
  // Experienced players (2+ games) = hide trails
  return totalGamesPlayed <= 1;
}
