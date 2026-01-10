/**
 * Keyboard Trails Display Utilities
 *
 * Determines when to show keyboard word trails (highlighted path) on the game board.
 * Trails help players who are stuck find words by highlighting the path of letters
 * they are typing. The trail is shown after a period of inactivity.
 *
 * New players see trails sooner (as tutorial help to understand the game).
 * Experienced players see trails later (only when truly stuck).
 */

/**
 * Inactivity threshold for NEW players (0-1 games played).
 * Shows trails quickly to help them understand how to play.
 */
export const NEW_PLAYER_THRESHOLD_MS = 10_000; // 10 seconds

/**
 * Inactivity threshold for EXPERIENCED players (2+ games played).
 * Shows trails only when they've been stuck for a while.
 */
export const EXPERIENCED_PLAYER_THRESHOLD_MS = 30_000; // 30 seconds

/** Threshold for what counts as a "new" player */
export const NEW_PLAYER_GAMES_THRESHOLD = 1;

/**
 * Determines whether keyboard trails should be shown based on player inactivity and experience.
 *
 * Rules:
 * - Never show trails if not in typing mode
 * - Show trails if player has never found a word (immediate help)
 * - New players (0-1 games): Show trails after 10 seconds of inactivity (tutorial help)
 * - Experienced players (2+ games): Show trails after 30 seconds of inactivity
 *
 * @param isTypingMode - Whether the player is currently typing a word
 * @param lastWordFoundTime - Timestamp (ms) when the player last found a valid word
 * @param totalGamesPlayed - Number of games the player has completed (for experience level)
 * @param currentTime - Current timestamp for comparison (defaults to Date.now())
 * @returns true if keyboard trails should be displayed
 */
export function shouldShowKeyboardTrails(
  isTypingMode: boolean,
  lastWordFoundTime: number | undefined,
  totalGamesPlayed: number | undefined,
  currentTime: number = Date.now()
): boolean {
  // Not typing = no trails
  if (!isTypingMode) {
    return false;
  }

  // Determine if player is new (0-1 games) or experienced (2+ games)
  // Treat undefined/null as new player (guest or first visit)
  const isNewPlayer = totalGamesPlayed === undefined ||
    totalGamesPlayed === null ||
    totalGamesPlayed <= NEW_PLAYER_GAMES_THRESHOLD;

  // Select appropriate threshold based on player experience
  const inactivityThreshold = isNewPlayer
    ? NEW_PLAYER_THRESHOLD_MS
    : EXPERIENCED_PLAYER_THRESHOLD_MS;

  // Never found a word (0, null, undefined) = show trails immediately
  // This helps players who haven't figured out the game yet
  if (!lastWordFoundTime || lastWordFoundTime === 0) {
    return true;
  }

  // Calculate time since last word was found
  const timeSinceLastWord = currentTime - lastWordFoundTime;

  // If the timestamp is in the future (clock skew), don't show trails
  if (timeSinceLastWord < 0) {
    return false;
  }

  // Show trails if player has been inactive for at least the threshold
  return timeSinceLastWord >= inactivityThreshold;
}
