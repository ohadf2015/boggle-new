/**
 * Earthquake Handler
 * Coordinates earthquake/fire round events for multiplayer games.
 *
 * Features:
 * - Host-initiated earthquake trigger (65-100% of game elapsed, with dynamic buffer before end)
 * - Synchronized earthquake sequence across all players:
 *   1. Warning phase (2 seconds)
 *   2. Shake phase (1 second)
 *   3. Fire round (15 seconds with 2x multiplier)
 * - Complete grid regeneration with new embedded words
 * - Single earthquake per game (tracked in game state)
 */

import type { Server, Socket } from 'socket.io';
import type { LetterGrid, Language, DifficultyLevel, GridPosition } from '@/shared/types';
import type { GameState } from '../modules/gameState/types.js';

import {
  getGame,
  getGameBySocketId,
  updateGame,
} from '../modules/gameStateManager.js';

import { broadcastToRoom, getGameRoom } from '../utils/socketHelpers.js';
import { generateRandomTable } from '../utils/gameUtils.js';
import { generateRichBoard } from '../utils/boardSelection.js';
import { DIFFICULTIES } from '../utils/consts.js';
import { makePositionsMap } from '../modules/wordValidator.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import logger from '../utils/logger.js';
import timerManager from '../utils/timerManager';
import { gameCleanupEmitter } from '../events/gameCleanup';

// Subscribe to cleanup events (breaks circular dependency with shared.ts)
gameCleanupEmitter.onGameEnd(({ gameCode }) => {
  clearEarthquakeTimers(gameCode);
});

gameCleanupEmitter.onGameReset(({ gameCode }) => {
  clearEarthquakeTimers(gameCode);
});

// Types for payloads
interface TriggerEarthquakePayload {
  gameSessionId?: string;
  triggerTime?: number;
}

interface DifficultyConfig {
  nameKey: string;
  rows: number;
  cols: number;
}

// Earthquake configuration (matches frontend DEFAULT_EARTHQUAKE_CONFIG)
const EARTHQUAKE_CONFIG = {
  warningDurationMs: 2000,  // 2 seconds
  shakeDurationMs: 1000,    // 1 second
  fireRoundDurationSeconds: 15, // 15 seconds
};

/**
 * Clear all earthquake timers for a game via centralized timerManager
 * @param gameCode - Game code
 */
function clearEarthquakeTimers(gameCode: string): void {
  timerManager.clearTimersWithPrefix(`earthquake:${gameCode}`);
}

/**
 * Register earthquake socket event handlers
 * @param io - Socket.IO server instance
 * @param socket - Socket.IO socket instance
 */
function registerEarthquakeHandlers(io: Server, socket: Socket): void {

  /**
   * Trigger earthquake sequence (host only)
   * Payload: { gameSessionId, triggerTime }
   */
  socket.on('triggerEarthquake', (data: TriggerEarthquakePayload) => {
    // Heavy weight: each trigger spawns a new grid + broadcasts to all players.
    // Earthquakes naturally fire ~1/round so weight 5 is permissive but caps spam.
    if (!checkRateLimit(socket.id, 5)) return;
    const { gameSessionId, triggerTime } = data || {};

    // Get game by socket ID
    const gameCode = getGameBySocketId(socket.id);
    if (!gameCode) {
      logger.debug('EARTHQUAKE', `Socket ${socket.id} not in a game`);
      return;
    }

    const game = getGame(gameCode);
    if (!game) {
      logger.debug('EARTHQUAKE', `Game ${gameCode} not found`);
      return;
    }

    // Verify socket is the host
    if (game.hostSocketId !== socket.id) {
      logger.debug('EARTHQUAKE', `Non-host ${socket.id} tried to trigger earthquake in game ${gameCode}`);
      return;
    }

    // Verify game is in progress
    if (game.gameState !== 'in-progress') {
      logger.debug('EARTHQUAKE', `Cannot trigger earthquake - game ${gameCode} not in progress (state: ${game.gameState})`);
      return;
    }

    // Earthquake only applies to classic mode
    if (game.gameMode && game.gameMode !== 'classic') {
      logger.debug('EARTHQUAKE', `Cannot trigger earthquake in ${game.gameMode} mode for game ${gameCode}`);
      return;
    }

    // Block earthquake if a round event (blizzard/lightning/meteor) is active
    if (game.activeRoundEvent) {
      logger.debug('EARTHQUAKE', `Cannot trigger earthquake - round event '${game.activeRoundEvent}' active in game ${gameCode}`);
      return;
    }

    // Atomically check and set earthquake flag to prevent race conditions
    // Two hosts might emit triggerEarthquake at the same time
    if (game.earthquakeTriggered) {
      logger.debug('EARTHQUAKE', `Earthquake already triggered for game ${gameCode}, ignoring duplicate`);
      return;
    }

    // Mark as triggered IMMEDIATELY before any async work
    // This prevents race conditions where two events check the flag simultaneously
    game.earthquakeTriggered = true;
    updateGame(gameCode, { earthquakeTriggered: true });

    logger.info('EARTHQUAKE', `Host triggered earthquake for game ${gameCode} (triggerTime: ${triggerTime}s remaining)`);

    // Execute earthquake sequence
    executeEarthquakeSequence(io, gameCode, game);
  });
}

/**
 * Execute the full earthquake sequence
 * @param io - Socket.IO server instance
 * @param gameCode - Game code
 * @param game - Game object
 */
function executeEarthquakeSequence(io: Server, gameCode: string, game: GameState): void {
  const room = getGameRoom(gameCode);

  logger.info('EARTHQUAKE', `Starting earthquake sequence for game ${gameCode}`);

  // Phase 1: WARNING (immediate broadcast)
  broadcastToRoom(io, room, 'earthquakeWarning', {
    gameSessionId: game.gameSessionId,
    timestamp: Date.now(),
  });

  logger.debug('EARTHQUAKE', `Game ${gameCode}: WARNING phase`);

  // Phase 2: SHAKE (after 2 seconds)
  timerManager.setTimeout(`earthquake:${gameCode}:shake`, () => {
    const currentGame = getGame(gameCode);
    if (!currentGame || currentGame.gameState !== 'in-progress') {
      clearEarthquakeTimers(gameCode);
      return;
    }

    broadcastToRoom(io, room, 'earthquakeShake', {
      gameSessionId: currentGame.gameSessionId,
    });

    logger.debug('EARTHQUAKE', `Game ${gameCode}: SHAKE phase`);
  }, EARTHQUAKE_CONFIG.warningDurationMs);

  // Phase 3: FIRE ROUND START (after 3 seconds = 2s warning + 1s shake)
  timerManager.setTimeout(`earthquake:${gameCode}:fireStart`, () => {
    const currentGame = getGame(gameCode);
    if (!currentGame || currentGame.gameState !== 'in-progress') {
      clearEarthquakeTimers(gameCode);
      return;
    }

    try {
      // Generate new grid based on fresh game settings
      const difficulty = currentGame.difficulty || 'MEDIUM';
      const difficultyConfig: DifficultyConfig = DIFFICULTIES[difficulty] || DIFFICULTIES.MEDIUM;
      const language = currentGame.language || 'en';

      // Generate new grid via best-of-N solver scoring for richer boards
      const newGrid: LetterGrid = generateRichBoard(
        () => generateRandomTable(
          difficultyConfig.rows,
          difficultyConfig.cols,
          language
        ),
        language,
        difficultyConfig.rows,
        difficultyConfig.cols
      ) as LetterGrid;

      // Generate new letter positions map for word validation
      const newPositions = makePositionsMap(newGrid, language);

      // Update game state with new grid AND positions map
      // CRITICAL: letterPositions MUST be updated along with letterGrid
      // otherwise word validation will fail (words won't be found on new grid)
      updateGame(gameCode, { letterGrid: newGrid, letterPositions: newPositions });

      // Mark fire round active in server game state (source of truth for scoring)
      updateGame(gameCode, { fireRoundActive: true });

      // Broadcast fire round start with new grid
      broadcastToRoom(io, room, 'fireRoundStart', {
        gameSessionId: currentGame.gameSessionId,
        grid: newGrid,
        duration: EARTHQUAKE_CONFIG.fireRoundDurationSeconds,
      });

      logger.info('EARTHQUAKE', `Game ${gameCode}: FIRE ROUND started (15s, 2x multiplier)`);
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('EARTHQUAKE', `Fire round start failed for ${gameCode}: ${err.message}`);
    }
  }, EARTHQUAKE_CONFIG.warningDurationMs + EARTHQUAKE_CONFIG.shakeDurationMs);

  // Phase 4: FIRE ROUND END (after 18 seconds = 3s + 15s fire round)
  timerManager.setTimeout(`earthquake:${gameCode}:fireEnd`, () => {
    const currentGame = getGame(gameCode);
    if (!currentGame || currentGame.gameState !== 'in-progress') {
      clearEarthquakeTimers(gameCode);
      return;
    }

    // Mark fire round inactive in server game state
    updateGame(gameCode, { fireRoundActive: false });

    broadcastToRoom(io, room, 'fireRoundEnd', {
      gameSessionId: currentGame.gameSessionId,
    });

    logger.info('EARTHQUAKE', `Game ${gameCode}: FIRE ROUND ended`);

    // Clean up timers
    clearEarthquakeTimers(gameCode);
  }, EARTHQUAKE_CONFIG.warningDurationMs + EARTHQUAKE_CONFIG.shakeDurationMs + (EARTHQUAKE_CONFIG.fireRoundDurationSeconds * 1000));
}

/**
 * Clean up earthquake state for a game (call on game end/reset)
 * @param gameCode - Game code
 */
function clearGameEarthquakeState(gameCode: string): void {
  clearEarthquakeTimers(gameCode);
  logger.debug('EARTHQUAKE', `Cleared earthquake state for game ${gameCode}`);
}

export {
  registerEarthquakeHandlers,
  clearGameEarthquakeState,
  EARTHQUAKE_CONFIG,
};
