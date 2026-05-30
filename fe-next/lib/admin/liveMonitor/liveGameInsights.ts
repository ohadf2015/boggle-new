/**
 * Pure logic helpers for enriching the admin live games monitor.
 * No React, no side effects — safe for testing and reuse.
 */

import type { DetailedGamePlayer, DetailedGame } from '@/backend/modules/gameQueryManager';

/** Threshold (ms) for detecting stalled games. 90 seconds. */
export const STALLED_MS = 90 * 1000;

/**
 * Breakdown of players by presence state.
 */
export interface PresenceBreakdown {
  active: number;
  idle: number;
  afk: number;
  disconnected: number;
  total: number;
}

/**
 * Count players by presence state.
 * @param players Array of DetailedGamePlayer
 * @returns Breakdown object with counts for each presence state
 */
export function presenceBreakdown(players: Pick<DetailedGamePlayer, 'presence'>[]): PresenceBreakdown {
  const result: PresenceBreakdown = {
    active: 0,
    idle: 0,
    afk: 0,
    disconnected: 0,
    total: players.length,
  };

  for (const player of players) {
    result[player.presence]++;
  }

  return result;
}

/**
 * Check if a game is stalled (stuck in waiting/validating state for too long).
 * @param game Game object with gameState and createdAt
 * @param now Current time in milliseconds
 * @returns True if game is not in-progress/finished AND has been stuck > STALLED_MS
 */
export function isStalled(
  game: Pick<DetailedGame, 'gameState' | 'createdAt'>,
  now: number
): boolean {
  // Active games are never stalled
  if (game.gameState === 'in-progress' || game.gameState === 'finished') {
    return false;
  }

  // Check if waiting/validating for too long
  const age = now - game.createdAt;
  return age > STALLED_MS;
}

/**
 * Find the host's username from a players array.
 * @param players Array of DetailedGamePlayer
 * @returns Host username or null if not found
 */
export function hostName(
  players: Pick<DetailedGamePlayer, 'username' | 'isHost'>[]
): string | null {
  for (const player of players) {
    if (player.isHost) {
      return player.username;
    }
  }
  return null;
}
