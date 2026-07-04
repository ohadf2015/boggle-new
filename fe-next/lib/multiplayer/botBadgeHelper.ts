/**
 * Bot badge helper for rendering a visual indicator next to bot player names.
 * This is a shared utility so bots are consistently labeled across all UI surfaces:
 * - Player rosters (pre-game lobbies)
 * - In-game HUD (during gameplay)
 * - Results screens (post-game)
 */

/**
 * Check if a player is a bot. Used at render sites to conditionally apply the badge.
 */
export function isBot(player: { isBot?: boolean } | { isBot?: boolean; username?: string } | null | undefined): boolean {
  return !!player && !!player.isBot;
}

/**
 * Bot badge emoji. Centralized so all render sites are consistent.
 */
export const BOT_BADGE = '🤖';
