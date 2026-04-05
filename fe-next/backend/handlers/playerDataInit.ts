/**
 * Player Data Initialization
 * Extracted from gameLifecycleHandler to break circular dependency
 * between gameLifecycleHandler ↔ gameStartHandler.
 */

import type { GameState } from '../modules/gameState/types.js';
import { getGame, getGameUsers } from '../modules/gameStateManager.js';
import { spamDetector } from '../modules/spamDetector.js';

/**
 * Ensure all per-player tracking structures exist for a single player.
 * Safe to call multiple times (idempotent). Use for late-join, reconnect,
 * and any code path that accesses player data outside of game start.
 */
export function ensurePlayerState(game: GameState, username: string): void {
  if (!game.playerScores) game.playerScores = {};
  if (!game.playerWords) game.playerWords = {};
  if (!game.playerWordDetails) game.playerWordDetails = {};
  if (!game.playerAchievements) game.playerAchievements = {};
  if (!game.playerWordsSet) game.playerWordsSet = {};
  if (!game.playerCombos) game.playerCombos = {};

  if (game.playerScores[username] === undefined) game.playerScores[username] = 0;
  if (!game.playerWords[username]) game.playerWords[username] = [];
  if (!game.playerWordDetails[username]) game.playerWordDetails[username] = [];
  if (!game.playerAchievements[username]) game.playerAchievements[username] = [];
  if (!game.playerWordsSet[username]) game.playerWordsSet[username] = new Set<string>();
  if (game.playerCombos[username] === undefined) game.playerCombos[username] = 0;
}

export function initializePlayerData(gameCode: string): void {
  const users = getGameUsers(gameCode);
  const playerUsernames = users.map(u => u.username);
  const gameForInit = getGame(gameCode);

  spamDetector.clearGame(gameCode);

  if (gameForInit) {
    if (!gameForInit.playerWordDetails) gameForInit.playerWordDetails = {};
    if (!gameForInit.playerAchievements) gameForInit.playerAchievements = {};
    if (!gameForInit.playerScores) gameForInit.playerScores = {};
    if (!gameForInit.playerWords) gameForInit.playerWords = {};

    // Also clear playerWordsSet to prevent stale O(1) lookup data
    if (!gameForInit.playerWordsSet) gameForInit.playerWordsSet = {};

    playerUsernames.forEach((username: string) => {
      gameForInit.playerWordDetails![username] = [];
      gameForInit.playerWords[username] = [];
      gameForInit.playerScores[username] = 0;
      gameForInit.playerAchievements[username] = [];
      gameForInit.playerWordsSet![username] = new Set<string>();
    });

    gameForInit.firstWordFound = false;
    gameForInit.startTime = Date.now();
  }
}
