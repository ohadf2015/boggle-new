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

/** Human vs bot composition of a room. */
export interface PlayerComposition {
  humans: number;
  bots: number;
  total: number;
}

/**
 * Split a room's players into human and bot counts. A missing `isBot` is
 * treated as human (guests/authed users never set the flag).
 */
export function playerComposition(
  players: Pick<DetailedGamePlayer, 'isBot'>[]
): PlayerComposition {
  let bots = 0;
  for (const p of players) {
    if (p.isBot) bots++;
  }
  return { humans: players.length - bots, bots, total: players.length };
}

/** Human-readable status key for a room. Maps to an i18n label in the UI. */
export type RoomStatusKey = 'playing' | 'scoring' | 'waiting' | 'empty' | 'finished';

/**
 * Derive a clear status key from raw game state + player composition.
 * "empty" = waiting room with no human players (orphaned / bots-only) — the
 * case that most needs surfacing in the admin monitor.
 */
export function roomStatusKey(
  game: Pick<DetailedGame, 'gameState'> & { players: Pick<DetailedGamePlayer, 'isBot'>[] },
  _now: number
): RoomStatusKey {
  switch (game.gameState) {
    case 'in-progress':
      return 'playing';
    case 'validating':
      return 'scoring';
    case 'finished':
      return 'finished';
    case 'waiting':
    default: {
      const { humans } = playerComposition(game.players);
      return humans > 0 ? 'waiting' : 'empty';
    }
  }
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
