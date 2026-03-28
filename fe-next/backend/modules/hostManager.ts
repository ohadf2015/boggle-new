/**
 * Host Manager Module
 * Handles host transfer and host eligibility logic
 * Extracted from gameStateManager.ts for better modularity
 */

import type { GameUser } from '@/shared/types/game';

import logger from '../utils/logger';

// Base game interface for hostManager
export interface HostGameBase {
  gameCode?: string;
  hostUsername: string | null;
  hostSocketId: string | null;
  users: Record<string, GameUser>;
  reconnectionTimeout: ReturnType<typeof setTimeout> | null;
  lastActivity?: number;
}

export interface TransferHostResult {
  success: boolean;
  previousHost?: string;
  newHost?: string;
  error?: string;
}

/**
 * Find the next eligible player to become host
 * Prioritizes connected, non-bot players
 */
export function getNextEligibleHost(
  game: HostGameBase | null,
  excludeUsername?: string
): string | null {
  if (!game) return null;

  // Find connected, non-bot players (excluding the specified user)
  const eligiblePlayers = Object.entries(game.users)
    .filter(([username, user]) => {
      if (excludeUsername && username === excludeUsername) return false;
      if (user.isBot) return false;
      if (user.disconnected) return false;
      return true;
    })
    .map(([username]) => username);

  // Return the first eligible player (they joined earliest)
  return eligiblePlayers.length > 0 ? eligiblePlayers[0] : null;
}

/**
 * Transfer host role to another player
 */
export function transferHost(
  game: HostGameBase | null,
  newHostUsername: string
): TransferHostResult {
  if (!game) {
    return { success: false, error: 'Game not found' };
  }

  const newHostUser = game.users[newHostUsername];
  if (!newHostUser) {
    return { success: false, error: 'New host user not found in game' };
  }

  if (newHostUser.isBot) {
    return { success: false, error: 'Cannot transfer host to a bot' };
  }

  if (newHostUser.disconnected) {
    return { success: false, error: 'Cannot transfer host to a disconnected player' };
  }

  const previousHost = game.hostUsername ?? undefined;

  // Update previous host's isHost flag
  if (previousHost && game.users[previousHost]) {
    game.users[previousHost].isHost = false;
  }

  // Update new host
  game.hostUsername = newHostUsername;
  game.hostSocketId = newHostUser.socketId;
  newHostUser.isHost = true;

  // Clear any host reconnection timeout since we transferred host instead
  if ((game as any).hostReconnectionTimeout) {
    clearTimeout((game as any).hostReconnectionTimeout);
    (game as any).hostReconnectionTimeout = null;
  }

  const gameCode = game.gameCode || 'unknown';
  logger.info('HOST', `Host transferred in game ${gameCode}: ${previousHost ?? 'unknown'} -> ${newHostUsername}`);

  if (game.lastActivity !== undefined) {
    game.lastActivity = Date.now();
  }

  return { success: true, previousHost, newHost: newHostUsername };
}

/**
 * Check if a user can become host
 */
export function canBecomeHost(game: HostGameBase | null, username: string): boolean {
  if (!game) return false;

  const user = game.users[username];
  if (!user) return false;
  if (user.isBot) return false;
  if (user.disconnected) return false;

  return true;
}

/**
 * Get the current host username
 */
export function getCurrentHost(game: HostGameBase | null): string | null {
  return game?.hostUsername ?? null;
}

/**
 * Check if the current host is valid (exists and is not disconnected)
 */
export function isHostValid(game: HostGameBase | null): boolean {
  if (!game || !game.hostUsername) return false;

  const hostUser = game.users[game.hostUsername];
  if (!hostUser) return false;
  if (hostUser.disconnected) return false;

  return true;
}

// CommonJS exports for backward compatibility
module.exports = {
  getNextEligibleHost,
  transferHost,
  canBecomeHost,
  getCurrentHost,
  isHostValid,
};
