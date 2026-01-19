/**
 * Ready State Manager Module
 * Handles tracking players who are ready for the next game
 * Extracted from gameStateManager.ts for better modularity
 */

import type { GameUser } from '@/shared/types/game';

// Base game interface for readyStateManager
export interface ReadyStateGameBase {
  users: Record<string, GameUser>;
  playersReadyForNextGame: Record<string, boolean>;
  lastActivity?: number;
}

export interface ReadyCountResult {
  readyCount: number;
  totalPlayers: number;
  readyUsernames: string[];
}

/**
 * Mark a player as ready for the next game
 * Note: Host should not be in the ready list - they click "Start Game" instead
 */
export function markPlayerReadyForNextGame(
  game: ReadyStateGameBase | null,
  username: string
): ReadyCountResult | null {
  if (!game) return null;

  // Host should not be in the ready list - they click "Start Game" instead
  const user = game.users[username];
  if (user?.isHost) {
    return null;
  }

  game.playersReadyForNextGame[username] = true;

  if (game.lastActivity !== undefined) {
    game.lastActivity = Date.now();
  }

  return getPlayersReadyCount(game);
}

/**
 * Get the count of players ready for next game
 */
export function getPlayersReadyCount(game: ReadyStateGameBase | null): ReadyCountResult | null {
  if (!game) return null;

  const readyUsernames = Object.keys(game.playersReadyForNextGame);
  const readyCount = readyUsernames.length;
  // Count non-bot, non-host users who are currently connected (host clicks Start, not Ready)
  const totalPlayers = Object.values(game.users).filter(
    u => !u.isBot && !u.disconnected && !u.isHost
  ).length;

  return { readyCount, totalPlayers, readyUsernames };
}

/**
 * Check if a player is ready for next game
 */
export function isPlayerReadyForNextGame(
  game: ReadyStateGameBase | null,
  username: string
): boolean {
  if (!game) return false;
  return !!game.playersReadyForNextGame[username];
}

/**
 * Clear all ready statuses (called when game starts or resets)
 */
export function clearPlayersReadyForNextGame(game: ReadyStateGameBase | null): void {
  if (!game) return;
  game.playersReadyForNextGame = {};
}

/**
 * Remove a specific player from ready list (e.g., when they leave)
 */
export function removePlayerFromReadyList(
  game: ReadyStateGameBase | null,
  username: string
): void {
  if (!game) return;
  delete game.playersReadyForNextGame[username];
}

// CommonJS exports for backward compatibility
module.exports = {
  markPlayerReadyForNextGame,
  getPlayersReadyCount,
  isPlayerReadyForNextGame,
  clearPlayersReadyForNextGame,
  removePlayerFromReadyList,
};
