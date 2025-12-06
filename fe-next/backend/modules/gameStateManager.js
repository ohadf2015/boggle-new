/**
 * Game State Manager
 * Centralized game state management for Socket.IO
 *
 * REFACTORED: Core functionality has been extracted into focused modules:
 * - userManager.js - User CRUD, socket mappings, auth connections
 * - scoreManager.js - Player scores, words, leaderboard
 * - presenceManager.js - Presence status, heartbeat, connection health
 * - peerValidationManager.js - AI word tracking, peer validation votes
 *
 * This file now acts as a facade, re-exporting all functionality for backwards compatibility.
 *
 * REDIS PERSISTENCE: Game state is persisted to Redis for:
 * - Recovery after server restarts
 * - Cross-instance state sharing in scaled deployments
 */

// Import focused modules
const userManager = require('./userManager');
const scoreManager = require('./scoreManager');
const presenceManager = require('./presenceManager');
const peerValidationManager = require('./peerValidationManager');

// Redis client for persistence (lazy import to avoid circular dependencies)
let redisClient = null;
function getRedisClient() {
  if (!redisClient) {
    try {
      redisClient = require('../redisClient');
    } catch (e) {
      // Redis not available, persistence disabled
      redisClient = { saveGameState: () => {}, getGameState: () => null, deleteGameState: () => {} };
    }
  }
  return redisClient;
}

const logger = require('../utils/logger');

// Debounce timers for persistence
const persistTimers = {};
const PERSIST_DEBOUNCE_MS = 1000; // Debounce persistence calls by 1 second

// Game storage - maps gameCode to game object
const games = {};

// ==========================================
// Redis Persistence Functions
// ==========================================

/**
 * Persist game state to Redis (debounced)
 * @param {string} gameCode - Game code to persist
 */
function persistGameState(gameCode) {
  // Clear any existing timer for this game
  if (persistTimers[gameCode]) {
    clearTimeout(persistTimers[gameCode]);
  }

  // Set a new timer to persist after debounce period
  persistTimers[gameCode] = setTimeout(async () => {
    const game = games[gameCode];
    if (!game) {
      delete persistTimers[gameCode];
      return;
    }

    try {
      await getRedisClient().saveGameState(gameCode, game);
      logger.debug('PERSIST', `Game ${gameCode} persisted to Redis`);
    } catch (error) {
      logger.error('PERSIST', `Failed to persist game ${gameCode}`, error);
    }

    delete persistTimers[gameCode];
  }, PERSIST_DEBOUNCE_MS);
}

/**
 * Immediately persist game state (no debounce)
 * Used for critical state changes like game end
 * @param {string} gameCode - Game code to persist
 */
async function persistGameStateNow(gameCode) {
  // Clear any pending timer
  if (persistTimers[gameCode]) {
    clearTimeout(persistTimers[gameCode]);
    delete persistTimers[gameCode];
  }

  const game = games[gameCode];
  if (!game) return;

  try {
    await getRedisClient().saveGameState(gameCode, game);
    logger.debug('PERSIST', `Game ${gameCode} immediately persisted to Redis`);
  } catch (error) {
    logger.error('PERSIST', `Failed to persist game ${gameCode}`, error);
  }
}

/**
 * Restore game state from Redis
 * @param {string} gameCode - Game code to restore
 * @returns {object|null} - Restored game state or null
 */
async function restoreGameFromRedis(gameCode) {
  try {
    const redisState = await getRedisClient().getGameState(gameCode);
    if (!redisState) {
      return null;
    }

    logger.info('PERSIST', `Restoring game ${gameCode} from Redis`);

    // Create a minimal game object from Redis state
    // Note: We can't restore socket connections, so restored games
    // need players to reconnect
    games[gameCode] = {
      gameCode,
      hostSocketId: null, // Socket connections need to be re-established
      hostUsername: null,
      roomName: redisState.roomName,
      language: redisState.language || 'en',
      users: {}, // Users must reconnect
      playerScores: redisState.playerScores || {},
      playerWords: redisState.playerWords || {},
      playerAchievements: redisState.playerAchievements || {},
      playerCombos: {},
      gameState: redisState.gameState || 'waiting',
      letterGrid: redisState.letterGrid,
      timerSeconds: redisState.timerSeconds || 180,
      tournamentId: redisState.tournamentId,
      reconnectionTimeout: null,
      isRanked: false,
      allowLateJoin: true,
      aiApprovedWords: [],
      peerValidationWord: null,
      peerValidationVotes: {},
      createdAt: Date.now(),
      lastActivity: Date.now(),
      restoredFromRedis: true
    };

    return games[gameCode];
  } catch (error) {
    logger.error('PERSIST', `Failed to restore game ${gameCode} from Redis`, error);
    return null;
  }
}

/**
 * Get all game codes from Redis (for recovery after restart)
 * @returns {Promise<string[]>} - Array of game codes
 */
async function getAllGameCodesFromRedis() {
  try {
    const redis = getRedisClient();
    if (redis.getAllGameKeys) {
      return await redis.getAllGameKeys();
    }
    return [];
  } catch (error) {
    logger.error('PERSIST', 'Failed to get game codes from Redis', error);
    return [];
  }
}

// ==========================================
// Game CRUD Operations
// ==========================================

/**
 * Create a new game
 * @param {string} gameCode - Unique game code
 * @param {object} gameData - Initial game data
 */
function createGame(gameCode, gameData) {
  games[gameCode] = {
    gameCode,
    hostSocketId: gameData.hostSocketId,
    hostUsername: gameData.hostUsername,
    hostPlayerId: gameData.hostPlayerId,
    roomName: gameData.roomName || gameCode,
    language: gameData.language || 'en',
    users: {}, // username -> { socketId, avatar, isHost, authUserId, guestTokenHash }
    playerScores: {},
    playerWords: {},
    playerAchievements: {},
    playerCombos: {}, // Track combo level per player for STREAK_MASTER achievement
    gameState: 'waiting', // waiting, in-progress, finished
    letterGrid: null,
    timerSeconds: 180,
    tournamentId: null,
    reconnectionTimeout: null, // Store timeout ID for host reconnection grace period
    isRanked: gameData.isRanked || false, // Ranked mode flag
    allowLateJoin: gameData.allowLateJoin !== false, // Allow late joins (default true, false for ranked)
    // AI-approved words tracking for peer validation
    aiApprovedWords: [], // Array of { word, submitter, score, confidence }
    peerValidationWord: null, // The randomly selected AI-approved word for peer validation
    peerValidationVotes: {}, // username -> 'valid' | 'invalid'
    createdAt: Date.now(),
    lastActivity: Date.now()
  };

  // Persist to Redis (debounced)
  persistGameState(gameCode);

  return games[gameCode];
}

/**
 * Get a game by code
 * @param {string} gameCode - Game code
 * @returns {object|null} - Game object or null
 */
function getGame(gameCode) {
  return games[gameCode] || null;
}

/**
 * Update a game
 * @param {string} gameCode - Game code
 * @param {object} updates - Updates to apply
 * @param {boolean} immediate - Whether to persist immediately (default: false)
 */
function updateGame(gameCode, updates, immediate = false) {
  if (games[gameCode]) {
    Object.assign(games[gameCode], updates, { lastActivity: Date.now() });

    // Persist to Redis
    if (immediate) {
      persistGameStateNow(gameCode);
    } else {
      persistGameState(gameCode);
    }
  }
}

/**
 * Delete a game
 * @param {string} gameCode - Game code
 */
function deleteGame(gameCode) {
  if (games[gameCode]) {
    const game = games[gameCode];

    // Clean up any active timeouts to prevent memory leaks
    if (game.reconnectionTimeout) {
      clearTimeout(game.reconnectionTimeout);
      game.reconnectionTimeout = null;
    }
    if (game.validationTimeout) {
      clearTimeout(game.validationTimeout);
      game.validationTimeout = null;
    }

    // Cancel any pending persistence
    if (persistTimers[gameCode]) {
      clearTimeout(persistTimers[gameCode]);
      delete persistTimers[gameCode];
    }

    // Clean up user mappings using userManager
    userManager.cleanupUserMappings(game, gameCode);

    // Clean up leaderboard throttle state using scoreManager
    scoreManager.clearLeaderboardThrottle(gameCode);

    // Delete from Redis (async, don't wait)
    getRedisClient().deleteGameState?.(gameCode);

    delete games[gameCode];
  }
}

/**
 * Check if a game exists
 * @param {string} gameCode - Game code
 * @returns {boolean}
 */
function gameExists(gameCode) {
  return !!games[gameCode];
}

// ==========================================
// User Management (delegated to userManager)
// ==========================================

function addUserToGame(gameCode, username, socketId, options = {}) {
  const game = games[gameCode];
  return userManager.addUserToGame(game, gameCode, username, socketId, options);
}

function removeUserFromGame(gameCode, username) {
  const game = games[gameCode];
  userManager.removeUserFromGame(game, gameCode, username);
}

function removeUserBySocketId(socketId) {
  return userManager.removeUserBySocketId(games, socketId, removeUserFromGame);
}

function getGameBySocketId(socketId) {
  return userManager.getGameBySocketId(socketId);
}

function getUsernameBySocketId(socketId) {
  return userManager.getUsernameBySocketId(socketId);
}

function getSocketIdByUsername(gameCode, username) {
  return userManager.getSocketIdByUsername(gameCode, username);
}

function getUserBySocketId(socketId) {
  return userManager.getUserBySocketId(games, socketId);
}

function updateUserSocketId(gameCode, username, newSocketId, authContext = null) {
  const game = games[gameCode];
  return userManager.updateUserSocketId(game, gameCode, username, newSocketId, authContext);
}

function getGameUsers(gameCode) {
  const game = games[gameCode];
  return userManager.getGameUsers(game);
}

function isHost(socketId) {
  return userManager.isHost(games, socketId);
}

function updateHostSocketId(gameCode, newSocketId) {
  const game = games[gameCode];
  userManager.updateHostSocketId(game, newSocketId);
}

function getAuthUserConnection(authUserId) {
  return userManager.getAuthUserConnection(authUserId);
}

function setAuthUserConnection(authUserId, connectionInfo) {
  userManager.setAuthUserConnection(authUserId, connectionInfo);
}

function removeAuthUserConnection(authUserId) {
  userManager.removeAuthUserConnection(authUserId);
}

function clearSocketMappings(socketId) {
  return userManager.clearSocketMappings(socketId);
}

// ==========================================
// Score Management (delegated to scoreManager)
// ==========================================

function addPlayerWord(gameCode, username, word, options = {}) {
  const game = games[gameCode];
  scoreManager.addPlayerWord(game, username, word, options);
}

function playerHasWord(gameCode, username, word) {
  const game = games[gameCode];
  return scoreManager.playerHasWord(game, username, word);
}

function updatePlayerScore(gameCode, username, score, isDelta = false) {
  const game = games[gameCode];
  scoreManager.updatePlayerScore(game, username, score, isDelta);
}

function getLeaderboard(gameCode) {
  const game = games[gameCode];
  return scoreManager.getLeaderboard(game);
}

function getLeaderboardThrottled(gameCode, broadcastFn, throttleMs = 500) {
  const game = games[gameCode];
  scoreManager.getLeaderboardThrottled(game, gameCode, broadcastFn, throttleMs);
}

// ==========================================
// Presence Management (delegated to presenceManager)
// ==========================================

function updateUserPresence(gameCode, username, presenceData) {
  const game = games[gameCode];
  return presenceManager.updateUserPresence(game, username, presenceData);
}

function updateUserHeartbeat(gameCode, username) {
  const game = games[gameCode];
  return presenceManager.updateUserHeartbeat(game, username);
}

function checkUserConnectionHealth(gameCode, username) {
  const game = games[gameCode];
  return presenceManager.checkUserConnectionHealth(game, username);
}

function markUserActivity(gameCode, username) {
  const game = games[gameCode];
  presenceManager.markUserActivity(game, username);
}

function getPresenceConfig() {
  return presenceManager.getPresenceConfig();
}

function markHostActive(gameCode) {
  const game = games[gameCode];
  return presenceManager.markHostActive(game);
}

function reactivateHost(gameCode) {
  const game = games[gameCode];
  return presenceManager.reactivateHost(game);
}

// ==========================================
// Peer Validation (delegated to peerValidationManager)
// ==========================================

function trackAiApprovedWord(gameCode, word, submitter, score, confidence) {
  const game = games[gameCode];
  peerValidationManager.trackAiApprovedWord(game, word, submitter, score, confidence);
}

function trackBotWord(gameCode, word, botUsername, score) {
  const game = games[gameCode];
  peerValidationManager.trackBotWord(game, word, botUsername, score);
}

function selectWordForPeerValidation(gameCode) {
  const game = games[gameCode];
  return peerValidationManager.selectWordForPeerValidation(game);
}

function recordPeerValidationVote(gameCode, username, isValid) {
  const game = games[gameCode];
  return peerValidationManager.recordPeerValidationVote(game, username, isValid);
}

function getPeerValidationWord(gameCode) {
  const game = games[gameCode];
  return peerValidationManager.getPeerValidationWord(game);
}

function removePeerRejectedWordScore(gameCode, word, submitter) {
  const game = games[gameCode];
  return peerValidationManager.removePeerRejectedWordScore(game, word, submitter);
}

// ==========================================
// Game State Operations
// ==========================================

/**
 * Reset game state for a new round
 * @param {string} gameCode - Game code
 */
function resetGameForNewRound(gameCode) {
  const game = games[gameCode];
  if (!game) return;

  // Reset scores using scoreManager
  scoreManager.resetScoresForNewRound(game);

  // Reset peer validation
  peerValidationManager.resetPeerValidation(game);

  game.gameState = 'waiting';
  game.letterGrid = null;
  game.lastActivity = Date.now();
}

// ==========================================
// Game Queries
// ==========================================

/**
 * Get all active games
 * @returns {array} - Array of game summaries
 */
function getAllGames() {
  return Object.values(games).map(game => ({
    gameCode: game.gameCode,
    roomName: game.roomName,
    hostUsername: game.hostUsername,
    playerCount: Object.keys(game.users).length,
    gameState: game.gameState,
    language: game.language
  }));
}

/**
 * Get active rooms for lobby display
 * Filters out rooms with no human players (bots don't count)
 * @returns {array} - Array of room info
 */
function getActiveRooms() {
  return Object.values(games)
    .filter(game => {
      // Only show rooms with active human players (bots don't count)
      const humanPlayers = Object.values(game.users).filter(user => !user.isBot);
      return humanPlayers.length > 0;
    })
    .map(game => {
      // Count only human players for display
      const humanPlayerCount = Object.values(game.users).filter(user => !user.isBot).length;
      return {
        gameCode: game.gameCode,
        roomName: game.roomName,
        playerCount: humanPlayerCount,
        gameState: game.gameState,
        language: game.language
      };
    });
}

/**
 * Get empty rooms (rooms with no active human players)
 * @returns {array} - Array of game codes for empty rooms
 */
function getEmptyRooms() {
  return Object.values(games)
    .filter(game => {
      const users = Object.values(game.users);
      // Room is empty if no users at all
      if (users.length === 0) return true;
      // Room is empty if no active human players (bots don't count as real players)
      const activeHumanUsers = users.filter(user => !user.disconnected && !user.isBot);
      return activeHumanUsers.length === 0;
    })
    .map(game => game.gameCode);
}

/**
 * Clean up empty rooms (rooms with no players)
 * @returns {number} - Number of rooms cleaned up
 */
function cleanupEmptyRooms() {
  const emptyRooms = getEmptyRooms();

  for (const gameCode of emptyRooms) {
    console.log(`[CLEANUP] Removing empty room: ${gameCode}`);
    deleteGame(gameCode);
  }

  return emptyRooms.length;
}

/**
 * Cleanup stale games (older than maxAge)
 * @param {number} maxAge - Maximum age in milliseconds (default 30 minutes)
 */
function cleanupStaleGames(maxAge = 30 * 60 * 1000) {
  const now = Date.now();
  const staleCodes = [];

  for (const [code, game] of Object.entries(games)) {
    if (now - game.lastActivity > maxAge) {
      staleCodes.push(code);
    }
  }

  for (const code of staleCodes) {
    console.log(`[CLEANUP] Removing stale game: ${code}`);
    deleteGame(code);
  }

  return staleCodes.length;
}

// ==========================================
// Tournament Management
// ==========================================

/**
 * Get tournament ID for a game
 * @param {string} gameCode - Game code
 * @returns {string|null} - Tournament ID or null
 */
function getTournamentIdFromGame(gameCode) {
  return games[gameCode]?.tournamentId || null;
}

/**
 * Set tournament ID for a game
 * @param {string} gameCode - Game code
 * @param {string|null} tournamentId - Tournament ID to set
 * @returns {boolean} - Whether the operation succeeded
 */
function setTournamentIdForGame(gameCode, tournamentId) {
  if (games[gameCode]) {
    games[gameCode].tournamentId = tournamentId;
    return true;
  }
  return false;
}

// ==========================================
// Encapsulation Helpers
// ==========================================

/**
 * Get count of active games (for metrics)
 * @returns {number} - Number of active games
 */
function getGameCount() {
  return Object.keys(games).length;
}

/**
 * Get all game codes (for iteration)
 * @returns {string[]} - Array of game codes
 */
function getAllGameCodes() {
  return Object.keys(games);
}

/**
 * Iterate over all games with a callback
 * Provides safe access without exposing internal state
 * @param {function} callback - Function to call with (gameCode, game) for each game
 */
function forEachGame(callback) {
  for (const [gameCode, game] of Object.entries(games)) {
    callback(gameCode, game);
  }
}

// ==========================================
// Module Exports
// ==========================================

module.exports = {
  // Game CRUD - NOTE: games object is NOT exported to maintain encapsulation
  // Use getGame(), getAllGames(), forEachGame() instead of direct access
  createGame,
  getGame,
  updateGame,
  deleteGame,
  gameExists,
  getGameCount,
  getAllGameCodes,
  forEachGame,

  // User management (from userManager)
  addUserToGame,
  removeUserFromGame,
  removeUserBySocketId,
  getGameBySocketId,
  getUsernameBySocketId,
  getSocketIdByUsername,
  getUserBySocketId,
  updateUserSocketId,
  getGameUsers,

  // Game queries
  getAllGames,
  getActiveRooms,
  getEmptyRooms,
  cleanupEmptyRooms,

  // Host management
  isHost,
  updateHostSocketId,

  // Game state
  resetGameForNewRound,

  // Player data (from scoreManager)
  addPlayerWord,
  playerHasWord,
  updatePlayerScore,
  getLeaderboard,
  getLeaderboardThrottled,

  // AI word peer validation (from peerValidationManager)
  trackAiApprovedWord,
  trackBotWord,
  selectWordForPeerValidation,
  recordPeerValidationVote,
  getPeerValidationWord,
  removePeerRejectedWordScore,

  // Cleanup
  cleanupStaleGames,

  // Presence tracking (from presenceManager)
  updateUserPresence,
  updateUserHeartbeat,
  markUserActivity,
  getPresenceConfig,
  checkUserConnectionHealth,
  markHostActive,
  reactivateHost,

  // Auth user tracking (from userManager)
  getAuthUserConnection,
  setAuthUserConnection,
  removeAuthUserConnection,
  clearSocketMappings,

  // Tournament management
  getTournamentIdFromGame,
  setTournamentIdForGame,

  // Redis persistence
  persistGameState,
  persistGameStateNow,
  restoreGameFromRedis,
  getAllGameCodesFromRedis,

  // TEST ONLY - Direct access to games object for test verification
  // DO NOT use in production code - use getGame(), forEachGame() instead
  get games() {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[gameStateManager] Direct access to games object is deprecated. Use getGame() or forEachGame() instead.');
    }
    return games;
  }
};
