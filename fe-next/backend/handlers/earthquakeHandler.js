/**
 * Earthquake Handler
 * Coordinates earthquake/fire round events for multiplayer games.
 *
 * Features:
 * - Host-initiated earthquake trigger (80-100% of game elapsed)
 * - Synchronized earthquake sequence across all players:
 *   1. Warning phase (2 seconds)
 *   2. Shake phase (1 second)
 *   3. Fire round (15 seconds with 2x multiplier)
 * - Complete grid regeneration with new embedded words
 * - Single earthquake per game (tracked in game state)
 */

const {
  getGame,
  getGameBySocketId,
  updateGame,
} = require('../modules/gameStateManager');

const { broadcastToRoom, getGameRoom } = require('../utils/socketHelpers');
const { generateRandomTable } = require('../utils/gameUtils');
const { DIFFICULTIES } = require('../utils/consts');
const logger = require('../utils/logger');

// Earthquake configuration (matches frontend DEFAULT_EARTHQUAKE_CONFIG)
const EARTHQUAKE_CONFIG = {
  warningDurationMs: 2000,  // 2 seconds
  shakeDurationMs: 1000,    // 1 second
  fireRoundDurationSeconds: 15, // 15 seconds
};

// Track active earthquake timers per game
const gameEarthquakeTimers = new Map();

/**
 * Clear all earthquake timers for a game
 * @param {string} gameCode - Game code
 */
function clearEarthquakeTimers(gameCode) {
  const timers = gameEarthquakeTimers.get(gameCode);
  if (timers) {
    timers.forEach(timer => clearTimeout(timer));
    gameEarthquakeTimers.delete(gameCode);
  }
}

/**
 * Register earthquake socket event handlers
 * @param {Server} io - Socket.IO server instance
 * @param {Socket} socket - Socket.IO socket instance
 */
function registerEarthquakeHandlers(io, socket) {

  /**
   * Trigger earthquake sequence (host only)
   * Payload: { gameSessionId, triggerTime }
   */
  socket.on('triggerEarthquake', (data) => {
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

    // Verify earthquake hasn't already been triggered
    if (game.earthquakeTriggered) {
      logger.warn('EARTHQUAKE', `Earthquake already triggered for game ${gameCode}`);
      return;
    }

    // Mark earthquake as triggered in game state
    updateGame(gameCode, { earthquakeTriggered: true });

    logger.info('EARTHQUAKE', `Host triggered earthquake for game ${gameCode} (triggerTime: ${triggerTime}s remaining)`);

    // Execute earthquake sequence
    executeEarthquakeSequence(io, gameCode, game);
  });
}

/**
 * Execute the full earthquake sequence
 * @param {Server} io - Socket.IO server instance
 * @param {string} gameCode - Game code
 * @param {object} game - Game object
 */
function executeEarthquakeSequence(io, gameCode, game) {
  const room = getGameRoom(gameCode);
  const timers = [];

  logger.info('EARTHQUAKE', `Starting earthquake sequence for game ${gameCode}`);

  // Phase 1: WARNING (immediate broadcast)
  broadcastToRoom(io, room, 'earthquakeWarning', {
    gameSessionId: game.gameSessionId,
    timestamp: Date.now(),
  });

  logger.debug('EARTHQUAKE', `Game ${gameCode}: WARNING phase`);

  // Phase 2: SHAKE (after 2 seconds)
  const shakeTimer = setTimeout(() => {
    broadcastToRoom(io, room, 'earthquakeShake', {
      gameSessionId: game.gameSessionId,
    });

    logger.debug('EARTHQUAKE', `Game ${gameCode}: SHAKE phase`);
  }, EARTHQUAKE_CONFIG.warningDurationMs);

  timers.push(shakeTimer);

  // Phase 3: FIRE ROUND START (after 3 seconds = 2s warning + 1s shake)
  const fireStartTimer = setTimeout(() => {
    // Generate new grid based on game settings
    const difficulty = game.difficulty || 'medium';
    const difficultyConfig = DIFFICULTIES[difficulty] || DIFFICULTIES.medium;
    const language = game.language || 'en';

    // Generate new grid with embedded words
    const newGrid = generateRandomTable(
      difficultyConfig.rows,
      difficultyConfig.cols,
      language,
      [] // Empty array - let it generate random words to embed
    );

    // Update game state with new grid
    updateGame(gameCode, { letterGrid: newGrid });

    // Broadcast fire round start with new grid
    broadcastToRoom(io, room, 'fireRoundStart', {
      gameSessionId: game.gameSessionId,
      grid: newGrid,
      duration: EARTHQUAKE_CONFIG.fireRoundDurationSeconds,
    });

    logger.info('EARTHQUAKE', `Game ${gameCode}: FIRE ROUND started (15s, 2x multiplier)`);
  }, EARTHQUAKE_CONFIG.warningDurationMs + EARTHQUAKE_CONFIG.shakeDurationMs);

  timers.push(fireStartTimer);

  // Phase 4: FIRE ROUND END (after 18 seconds = 3s + 15s fire round)
  const fireEndTimer = setTimeout(() => {
    broadcastToRoom(io, room, 'fireRoundEnd', {
      gameSessionId: game.gameSessionId,
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
 * @param {string} gameCode - Game code
 */
function clearGameEarthquakeState(gameCode) {
  clearEarthquakeTimers(gameCode);
  logger.debug('EARTHQUAKE', `Cleared earthquake state for game ${gameCode}`);
}

module.exports = {
  registerEarthquakeHandlers,
  clearGameEarthquakeState,
  EARTHQUAKE_CONFIG,
};
