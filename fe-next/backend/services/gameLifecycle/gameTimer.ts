/**
 * Game Timer Service
 *
 * Manages game timer with timestamp-based timing to prevent drift.
 * Fixes the 7-10 second timer drift issue in multiplayer games.
 */

import type { Server } from 'socket.io';
import { getGame, updateGame } from '../../modules/gameStateManager';
import { resetGameAIValidationCount } from '../../modules/communityWordManager';
import { broadcastToRoom, getGameRoom } from '../../utils/socketHelpers';
import { clearGameTimer, setGameTimer } from '../../utils/timerManager';
import { drainLife, areAllPlayersEliminated } from '../../modules/wordHuntManager';
import { startBotsForGame } from './botGame';
import { endGame } from './gameEnd';

/**
 * Start the game timer
 *
 * Uses timestamp-based timing to prevent drift:
 * - Stores startTimestamp and calculates endTimestamp
 * - Each interval calculates remaining time from actual elapsed time
 * - Prevents the 7-10 second drift issue in multiplayer games
 */
export function startGameTimer(
  io: Server,
  gameCode: string,
  timerSeconds: number
): void {
  const game = getGame(gameCode);
  if (!game) return;

  // Reset AI validation count for this game (hybrid cost-saving)
  resetGameAIValidationCount(gameCode);

  const intervalMs = parseInt(process.env.TIME_UPDATE_INTERVAL_MS || '1000');

  // TIMESTAMP-BASED TIMING: Use actual elapsed time to prevent drift
  const startTimestamp = Date.now();
  const endTimestamp = startTimestamp + timerSeconds * 1000;

  // Store timing info in game state for late joiners
  // Note: Using any to allow dynamic properties that may not be in strict GameState type
   
  updateGame(gameCode, {
    timerSeconds: timerSeconds,
  } as any);

  // Clear any existing timer
  clearGameTimer(gameCode);

  // Track last broadcast second to avoid duplicate broadcasts
  let lastBroadcastSecond = timerSeconds;

  // Create interval for time updates
  const timerId = setInterval(() => {
    // Calculate remaining time based on actual elapsed time (prevents drift)
    const now = Date.now();
    const remainingMs = Math.max(0, endTimestamp - now);
    const remainingTime = Math.ceil(remainingMs / 1000);

    // Update remaining time in game state for late joiners
     
    updateGame(gameCode, { remainingTime } as any);

    // Broadcast every second for accurate client timer display
    // Previous "smart broadcasting" (every 10s) caused player timers to stutter
    const secondChanged = remainingTime !== lastBroadcastSecond;
    if (secondChanged) {
      broadcastToRoom(io, getGameRoom(gameCode), 'timeUpdate', {
        remainingTime,
        gameSessionId: game.gameSessionId,
      });
    }
    lastBroadcastSecond = remainingTime;

    // Word Hunt: drain life from all non-eliminated players each tick
    const currentGame = getGame(gameCode);
    if (currentGame?.gameMode === 'word-hunt' && (currentGame as any).wordHuntState) {
      const huntState = (currentGame as any).wordHuntState;
      const { updatedLives, newlyEliminated } = drainLife(huntState);

      // Update game state with drained lives
      huntState.playerLives = updatedLives;

      // Push newly eliminated before broadcasting so the full list is included
      for (const username of newlyEliminated) {
        huntState.eliminatedPlayers.push(username);
        broadcastToRoom(io, getGameRoom(gameCode), 'wordHuntEliminated', {
          username,
        });
      }

      // Broadcast updated lives to all players in room (include eliminatedPlayers for reconnecting clients)
      broadcastToRoom(io, getGameRoom(gameCode), 'wordHuntLifeUpdate', {
        playerLives: updatedLives,
        eliminatedPlayers: huntState.eliminatedPlayers,
      });

      // End game early if all players are eliminated
      if (areAllPlayersEliminated(huntState)) {
        clearGameTimer(gameCode);
        endGame(io, gameCode);
        return;
      }
    }

    if (remainingTime <= 0) {
      clearGameTimer(gameCode);
      endGame(io, gameCode);
    }
  }, intervalMs);

  setGameTimer(gameCode, timerId);

  // Start bots if any are in the game
  startBotsForGame(io, gameCode, game.letterGrid, game.language, timerSeconds);

  // NOTE: We do NOT broadcast 'startGame' here anymore.
  // The game start has already been broadcast from gameLifecycleHandler with all necessary data.
  // A second broadcast was causing issues with the second game in the same room getting stuck.
}
