/**
 * Redis-First Game State Manager
 *
 * This module provides a Redis-first approach to game state management,
 * designed for horizontal scaling scenarios where multiple server instances
 * need consistent state access.
 *
 * Architecture:
 * - Redis is the primary source of truth
 * - Local memory serves as a write-through cache for performance
 * - All reads check Redis first, with local cache as fallback on Redis failure
 * - All writes go to both Redis and local cache
 * - Uses distributed locking for state mutations
 *
 * Usage:
 *   // Enable Redis-first mode via environment variable
 *   GAME_STATE_MODE=redis-first
 *
 *   // Or use directly for specific operations
 *   const { getGameRedisFirst, updateGameRedisFirst } = require('./redisFirstGameState');
 *
 * When to use:
 * - Multi-instance deployments (Kubernetes, Docker Swarm, etc.)
 * - High availability requirements
 * - Need for cross-instance state consistency
 *
 * Trade-offs:
 * - Higher latency per operation (Redis round-trip)
 * - Redis becomes a single point of failure (mitigated by circuit breaker)
 * - More network traffic
 */

const logger = require('../utils/logger');

// Lazy import to avoid circular dependencies
let redisClient = null;
let gameStateManager = null;

function getRedisClient() {
  if (!redisClient) {
    redisClient = require('../redisClient');
  }
  return redisClient;
}

function getGameStateManager() {
  if (!gameStateManager) {
    gameStateManager = require('./gameStateManager');
  }
  return gameStateManager;
}

// ==========================================
// Configuration
// ==========================================

const REDIS_FIRST_ENABLED = process.env.GAME_STATE_MODE === 'redis-first';
const READ_CACHE_TTL_MS = parseInt(process.env.REDIS_FIRST_CACHE_TTL || '1000'); // 1 second local cache
const LOCK_TTL_MS = parseInt(process.env.REDIS_FIRST_LOCK_TTL || '5000'); // 5 second lock

// Local read cache to reduce Redis reads for hot data
// Maps gameCode -> { data, timestamp }
const readCache = new Map();

// ==========================================
// Core Functions
// ==========================================

/**
 * Check if Redis-first mode is enabled
 * @returns {boolean}
 */
function isRedisFirstEnabled() {
  return REDIS_FIRST_ENABLED && getRedisClient().isRedisAvailable();
}

/**
 * Get game state - Redis-first with local cache fallback
 * @param {string} gameCode - Game code
 * @returns {Promise<object|null>} - Game state or null
 */
async function getGameRedisFirst(gameCode) {
  // If Redis-first is not enabled, use local gameStateManager
  if (!isRedisFirstEnabled()) {
    return getGameStateManager().getGame(gameCode);
  }

  // Check local read cache first (within TTL)
  const cached = readCache.get(gameCode);
  if (cached && Date.now() - cached.timestamp < READ_CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    // Try Redis first
    const redisState = await getRedisClient().getGameState(gameCode);

    if (redisState) {
      // Update local cache
      readCache.set(gameCode, { data: redisState, timestamp: Date.now() });

      // Also update local gameStateManager for fallback consistency
      syncToLocalState(gameCode, redisState);

      return redisState;
    }

    // Redis doesn't have it, check local
    const localState = getGameStateManager().getGame(gameCode);

    if (localState) {
      // Local has it but Redis doesn't - sync to Redis
      logger.warn('REDIS_FIRST', `Game ${gameCode} found in local but not Redis, syncing`);
      await getRedisClient().saveGameState(gameCode, localState);
      readCache.set(gameCode, { data: localState, timestamp: Date.now() });
      return localState;
    }

    return null;
  } catch (error) {
    logger.error('REDIS_FIRST', `Redis read failed for game ${gameCode}: ${error.message}`);

    // Fallback to local state
    const localState = getGameStateManager().getGame(gameCode);
    if (localState) {
      readCache.set(gameCode, { data: localState, timestamp: Date.now() });
    }
    return localState;
  }
}

/**
 * Update game state - Write to both Redis and local
 * @param {string} gameCode - Game code
 * @param {object} updates - Updates to apply
 * @param {object} options - Options
 * @param {string} options.lockId - Lock holder ID (e.g., socket.id)
 * @param {boolean} options.useLock - Whether to use distributed locking (default: true)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function updateGameRedisFirst(gameCode, updates, options = {}) {
  const { lockId = 'system', useLock = true } = options;

  // If Redis-first is not enabled, use local gameStateManager
  if (!isRedisFirstEnabled()) {
    getGameStateManager().updateGame(gameCode, updates);
    return { success: true };
  }

  const redis = getRedisClient();

  // Acquire distributed lock if needed
  let lockAcquired = false;
  if (useLock) {
    lockAcquired = await redis.acquireGameLock(gameCode, lockId, LOCK_TTL_MS);
    if (!lockAcquired) {
      logger.warn('REDIS_FIRST', `Failed to acquire lock for game ${gameCode}`);
      return { success: false, error: 'Failed to acquire lock' };
    }
  }

  try {
    // Get current state from Redis
    let currentState = await redis.getGameState(gameCode);

    if (!currentState) {
      // Try local
      currentState = getGameStateManager().getGame(gameCode);
    }

    if (!currentState) {
      return { success: false, error: 'Game not found' };
    }

    // Apply updates
    const updatedState = {
      ...currentState,
      ...updates,
      lastActivity: Date.now(),
    };

    // Write to Redis
    await redis.saveGameState(gameCode, updatedState);

    // Invalidate read cache
    readCache.delete(gameCode);

    // Update local state for consistency
    getGameStateManager().updateGame(gameCode, updates, false);

    return { success: true };
  } catch (error) {
    logger.error('REDIS_FIRST', `Update failed for game ${gameCode}: ${error.message}`);
    return { success: false, error: error.message };
  } finally {
    // Release lock
    if (lockAcquired) {
      await redis.releaseGameLock(gameCode, lockId);
    }
  }
}

/**
 * Create game - Write to both Redis and local
 * @param {string} gameCode - Game code
 * @param {object} gameData - Initial game data
 * @returns {Promise<object>} - Created game state
 */
async function createGameRedisFirst(gameCode, gameData) {
  // Create in local first (this sets up all the proper structure)
  const game = getGameStateManager().createGame(gameCode, gameData);

  // If Redis-first is enabled, also write to Redis
  if (isRedisFirstEnabled()) {
    try {
      await getRedisClient().saveGameState(gameCode, game);
    } catch (error) {
      logger.error('REDIS_FIRST', `Failed to sync new game ${gameCode} to Redis: ${error.message}`);
      // Continue anyway - local state is authoritative on create
    }
  }

  return game;
}

/**
 * Delete game - Remove from both Redis and local
 * @param {string} gameCode - Game code
 */
async function deleteGameRedisFirst(gameCode) {
  // Delete from local
  getGameStateManager().deleteGame(gameCode);

  // Invalidate read cache
  readCache.delete(gameCode);

  // Delete from Redis
  if (isRedisFirstEnabled()) {
    try {
      await getRedisClient().deleteGameState(gameCode);
    } catch (error) {
      logger.error('REDIS_FIRST', `Failed to delete game ${gameCode} from Redis: ${error.message}`);
    }
  }
}

/**
 * Get all games - Merge Redis and local state
 * @returns {Promise<string[]>} - Array of game codes
 */
async function getAllGameCodesRedisFirst() {
  const localCodes = getGameStateManager().getAllGameCodes();

  if (!isRedisFirstEnabled()) {
    return localCodes;
  }

  try {
    const redisCodes = await getRedisClient().getAllGameCodes();

    // Merge and deduplicate
    const allCodes = new Set([...localCodes, ...redisCodes]);
    return Array.from(allCodes);
  } catch (error) {
    logger.error('REDIS_FIRST', `Failed to get game codes from Redis: ${error.message}`);
    return localCodes;
  }
}

/**
 * Execute an operation with distributed locking
 * @param {string} gameCode - Game code
 * @param {string} lockId - Lock holder ID
 * @param {Function} operation - Async operation to execute
 * @returns {Promise<{success: boolean, result: any, error?: string}>}
 */
async function withGameLock(gameCode, lockId, operation) {
  if (!isRedisFirstEnabled()) {
    // No Redis, just execute
    try {
      const result = await operation();
      return { success: true, result };
    } catch (error) {
      return { success: false, result: null, error: error.message };
    }
  }

  return getRedisClient().withGameLock(gameCode, lockId, operation);
}

// ==========================================
// Helper Functions
// ==========================================

/**
 * Sync Redis state to local gameStateManager
 * Used when reading from Redis to keep local state consistent
 * @param {string} gameCode - Game code
 * @param {object} redisState - State from Redis
 */
function syncToLocalState(gameCode, redisState) {
  const gsm = getGameStateManager();
  const localGame = gsm.getGame(gameCode);

  if (!localGame) {
    // Create a minimal game object locally
    // Note: This won't have socket connections, they need to reconnect
    gsm.createGame(gameCode, {
      roomName: redisState.roomName,
      language: redisState.language,
      hostSocketId: null,
      hostUsername: null,
    });
  }

  // Update local state with Redis data
  gsm.updateGame(gameCode, {
    playerScores: redisState.playerScores,
    playerWords: redisState.playerWords,
    playerAchievements: redisState.playerAchievements,
    gameState: redisState.gameState,
    letterGrid: redisState.letterGrid,
    timerSeconds: redisState.timerSeconds,
  }, false);
}

/**
 * Clear local read cache for a game
 * Call this after any mutation to ensure fresh reads
 * @param {string} gameCode - Game code
 */
function invalidateReadCache(gameCode) {
  readCache.delete(gameCode);
}

/**
 * Clear all local read caches
 */
function clearAllReadCaches() {
  readCache.clear();
}

/**
 * Get Redis-first stats for monitoring
 * @returns {object} - Stats object
 */
function getRedisFirstStats() {
  return {
    enabled: REDIS_FIRST_ENABLED,
    active: isRedisFirstEnabled(),
    cacheTTL: READ_CACHE_TTL_MS,
    lockTTL: LOCK_TTL_MS,
    cacheSize: readCache.size,
  };
}

// ==========================================
// Periodic Tasks
// ==========================================

/**
 * Sync local state to Redis
 * Run periodically to ensure consistency
 */
async function syncLocalToRedis() {
  if (!isRedisFirstEnabled()) return;

  const gsm = getGameStateManager();
  const localCodes = gsm.getAllGameCodes();

  for (const gameCode of localCodes) {
    const game = gsm.getGame(gameCode);
    if (game) {
      try {
        await getRedisClient().saveGameState(gameCode, game);
      } catch (error) {
        logger.error('REDIS_FIRST', `Failed to sync game ${gameCode} to Redis: ${error.message}`);
      }
    }
  }

  logger.info('REDIS_FIRST', `Synced ${localCodes.length} games to Redis`);
}

/**
 * Cleanup orphaned games in Redis that don't exist locally
 * Run periodically to prevent stale data accumulation
 */
async function cleanupOrphanedRedisGames() {
  if (!isRedisFirstEnabled()) return;

  try {
    const redisCodes = await getRedisClient().getAllGameCodes();
    const localCodes = new Set(getGameStateManager().getAllGameCodes());

    let cleaned = 0;
    for (const gameCode of redisCodes) {
      if (!localCodes.has(gameCode)) {
        // Check if game is actually stale (no activity in 30 minutes)
        const redisState = await getRedisClient().getGameState(gameCode);
        if (redisState) {
          const lastActivity = new Date(redisState.lastActivity || 0).getTime();
          if (Date.now() - lastActivity > 30 * 60 * 1000) {
            await getRedisClient().deleteGameState(gameCode);
            cleaned++;
          }
        }
      }
    }

    if (cleaned > 0) {
      logger.info('REDIS_FIRST', `Cleaned up ${cleaned} orphaned games from Redis`);
    }
  } catch (error) {
    logger.error('REDIS_FIRST', `Failed to cleanup orphaned games: ${error.message}`);
  }
}

// ==========================================
// Module Exports
// ==========================================

module.exports = {
  // Configuration
  isRedisFirstEnabled,
  getRedisFirstStats,

  // Core operations
  getGameRedisFirst,
  updateGameRedisFirst,
  createGameRedisFirst,
  deleteGameRedisFirst,
  getAllGameCodesRedisFirst,

  // Locking
  withGameLock,

  // Cache management
  invalidateReadCache,
  clearAllReadCaches,

  // Sync operations
  syncLocalToRedis,
  cleanupOrphanedRedisGames,
};
