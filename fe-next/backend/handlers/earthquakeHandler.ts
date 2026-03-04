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
import type { Game, LetterGrid, Language, DifficultyLevel, GridPosition } from '@/shared/types';

import {
  getGame,
  getGameBySocketId,
  updateGame,
} from '../modules/gameStateManager.js';

import { broadcastToRoom, getGameRoom } from '../utils/socketHelpers.js';
import { generateRandomTable } from '../utils/gameUtils.js';
import { DIFFICULTIES } from '../utils/consts.js';
import { makePositionsMap } from '../modules/wordValidator.js';
import logger from '../utils/logger.js';
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

// Track active earthquake timers per game
const gameEarthquakeTimers = new Map<string, ReturnType<typeof setTimeout>[]>();

/**
 * Clear all earthquake timers for a game
 * @param gameCode - Game code
 */
function clearEarthquakeTimers(gameCode: string): void {
  const timers = gameEarthquakeTimers.get(gameCode);
  if (timers) {
    timers.forEach(timer => clearTimeout(timer));
    gameEarthquakeTimers.delete(gameCode);
  }
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
    const { gameSessionId, triggerTime } = data || {};

    // Get game by socket ID
    const gameCode = getGameBySocketId(socket.id);
    if (!gameCode) {
      logger.warn('EARTHQUAKE', `Socket ${socket.id} not in a game`);
      return;
    }

    const game = getGame(gameCode);
    if (!game) {
      logger.warn('EARTHQUAKE', `Game ${gameCode} not found`);
      return;
    }

    // Verify socket is the host
    if (game.hostSocketId !== socket.id) {
      logger.warn('EARTHQUAKE', `Non-host ${socket.id} tried to trigger earthquake in game ${gameCode}`);
      return;
    }

    // Verify game is in progress
    if (game.gameState !== 'in-progress') {
      logger.warn('EARTHQUAKE', `Cannot trigger earthquake - game ${gameCode} not in progress (state: ${game.gameState})`);
      return;
    }

    // Atomically check and set earthquake flag to prevent race conditions
    // Two hosts might emit triggerEarthquake at the same time
    if (game.earthquakeTriggered) {
      logger.warn('EARTHQUAKE', `Earthquake already triggered for game ${gameCode}, ignoring duplicate`);
      return;
    }

    // Mark as triggered IMMEDIATELY before any async work
    // This prevents race conditions where two events check the flag simultaneously
    game.earthquakeTriggered = true;
    updateGame(gameCode, { earthquakeTriggered: true });

    logger.info('EARTHQUAKE', `Host triggered earthquake for game ${gameCode} (triggerTime: ${triggerTime}s remaining)`);

    // Execute earthquake sequence
    // Type assertion needed: GameState and Game have slightly different type definitions
    executeEarthquakeSequence(io, gameCode, game as unknown as Game);
  });
}

/**
 * Execute the full earthquake sequence
 * @param io - Socket.IO server instance
 * @param gameCode - Game code
 * @param game - Game object
 */
function executeEarthquakeSequence(io: Server, gameCode: string, game: Game): void {
  const room = getGameRoom(gameCode);
  const timers: ReturnType<typeof setTimeout>[] = [];

  logger.info('EARTHQUAKE', `Starting earthquake sequence for game ${gameCode}`);

  // Phase 1: WARNING (immediate broadcast)
  broadcastToRoom(io, room, 'earthquakeWarning', {
    gameSessionId: (game as Game & { gameSessionId?: string }).gameSessionId,
    timestamp: Date.now(),
  });

  logger.debug('EARTHQUAKE', `Game ${gameCode}: WARNING phase`);

  // Phase 2: SHAKE (after 2 seconds)
  const shakeTimer = setTimeout(() => {
    broadcastToRoom(io, room, 'earthquakeShake', {
      gameSessionId: (game as Game & { gameSessionId?: string }).gameSessionId,
    });

    logger.debug('EARTHQUAKE', `Game ${gameCode}: SHAKE phase`);
  }, EARTHQUAKE_CONFIG.warningDurationMs);

  timers.push(shakeTimer);

  // Phase 3: FIRE ROUND START (after 3 seconds = 2s warning + 1s shake)
  const fireStartTimer = setTimeout(() => {
    // Generate new grid based on game settings
    const difficulty = game.difficulty || 'MEDIUM';
    const difficultyConfig: DifficultyConfig = DIFFICULTIES[difficulty] || DIFFICULTIES.MEDIUM;
    const language = game.language || 'en';

    // Generate new grid with embedded words
    const newGrid: LetterGrid = generateRandomTable(
      difficultyConfig.rows,
      difficultyConfig.cols,
      language,
      [] // Empty array - let it generate random words to embed
    );

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
      gameSessionId: (game as Game & { gameSessionId?: string }).gameSessionId,
      grid: newGrid,
      duration: EARTHQUAKE_CONFIG.fireRoundDurationSeconds,
    });

    logger.info('EARTHQUAKE', `Game ${gameCode}: FIRE ROUND started (15s, 2x multiplier)`);
  }, EARTHQUAKE_CONFIG.warningDurationMs + EARTHQUAKE_CONFIG.shakeDurationMs);

  timers.push(fireStartTimer);

  // Phase 4: FIRE ROUND END (after 18 seconds = 3s + 15s fire round)
  const fireEndTimer = setTimeout(() => {
    // Mark fire round inactive in server game state
    updateGame(gameCode, { fireRoundActive: false });

    broadcastToRoom(io, room, 'fireRoundEnd', {
      gameSessionId: (game as Game & { gameSessionId?: string }).gameSessionId,
    });

    logger.info('EARTHQUAKE', `Game ${gameCode}: FIRE ROUND ended`);

    // Clean up timers
    clearEarthquakeTimers(gameCode);
  }, EARTHQUAKE_CONFIG.warningDurationMs + EARTHQUAKE_CONFIG.shakeDurationMs + (EARTHQUAKE_CONFIG.fireRoundDurationSeconds * 1000));

  timers.push(fireEndTimer);

  // Store timers for cleanup
  gameEarthquakeTimers.set(gameCode, timers);
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
