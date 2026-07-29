/**
 * Spectator Manager Module
 * Handles spectator CRUD operations and spectator-to-player upgrades
 * Extracted from gameStateManager.ts for better modularity
 */

import type { Avatar, GameUser, Spectator } from '@/shared/types/game';

// Base game interface for spectatorManager
export interface SpectatorGameBase {
  users: Record<string, GameUser>;
  spectators: Record<string, Spectator>;
  lastActivity?: number;
}

export interface SpectatorOptions {
  avatar?: Avatar | null;
  authUserId?: string | null;
  guestTokenHash?: string | null;
  guestSessionId?: string | null;
}

export interface SpectatorInfo extends Spectator {
  username: string;
}

/**
 * Add a spectator to a game
 */
export function addSpectatorToGame(
  game: SpectatorGameBase | null,
  username: string,
  socketId: string,
  options: SpectatorOptions = {}
): boolean {
  if (!game) return false;

  game.spectators[username] = {
    socketId,
    avatar: options.avatar || null,
    authUserId: options.authUserId || null,
    guestTokenHash: options.guestTokenHash || null,
    joinedAt: Date.now()
  };

  if (game.lastActivity !== undefined) {
    game.lastActivity = Date.now();
  }

  return true;
}

/**
 * Remove a spectator from a game
 */
export function removeSpectatorFromGame(
  game: SpectatorGameBase | null,
  username: string
): boolean {
  if (!game || !game.spectators[username]) return false;

  delete game.spectators[username];

  if (game.lastActivity !== undefined) {
    game.lastActivity = Date.now();
  }

  return true;
}

/**
 * Get all spectators in a game
 */
export function getGameSpectators(game: SpectatorGameBase | null): SpectatorInfo[] {
  if (!game) return [];

  return Object.keys(game.spectators).map(username => ({
    username,
    ...game.spectators[username]
  }));
}

/**
 * Upgrade a spectator to active player
 */
export function upgradeSpectatorToPlayer(
  game: SpectatorGameBase | null,
  username: string,
  maxPlayers: number
): boolean {
  if (!game || !game.spectators[username]) {
    return false;
  }

  // Check if room has space
  if (Object.keys(game.users).length >= maxPlayers) {
    return false;
  }

  // Move spectator to users
  const spectatorData = game.spectators[username];
  game.users[username] = {
    socketId: spectatorData.socketId,
    avatar: spectatorData.avatar,
    isHost: false,
    authUserId: spectatorData.authUserId,
    guestTokenHash: spectatorData.guestTokenHash,
    username,
    lastActivity: Date.now(),
    lastHeartbeat: Date.now(),
    presence: 'active',
  } as GameUser;

  // Remove from spectators
  delete game.spectators[username];

  if (game.lastActivity !== undefined) {
    game.lastActivity = Date.now();
  }

  return true;
}

/**
 * Check if a user is a spectator
 */
export function isSpectator(game: SpectatorGameBase | null, username: string): boolean {
  if (!game) return false;
  return !!game.spectators[username];
}

/**
 * Get spectator count
 */
export function getSpectatorCount(game: SpectatorGameBase | null): number {
  if (!game) return 0;
  return Object.keys(game.spectators).length;
}

// CommonJS exports for backward compatibility
module.exports = {
  addSpectatorToGame,
  removeSpectatorFromGame,
  getGameSpectators,
  upgradeSpectatorToPlayer,
  isSpectator,
  getSpectatorCount,
};
