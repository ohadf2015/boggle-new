// redisClient.js
const Redis = require('ioredis');

// Redis connection configuration
// Support both Railway's env vars (REDISHOST, REDISPORT) and standard naming (REDIS_HOST, REDIS_PORT)
const redisConfig = {
  host: process.env.REDIS_HOST || process.env.REDISHOST || '127.0.0.1',
  port: process.env.REDIS_PORT || process.env.REDISPORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true, // Don't connect immediately
  enableOfflineQueue: true, // Queue commands when disconnected
  connectTimeout: 10000, // 10 seconds connection timeout
  keepAlive: 30000, // Keep connection alive
};

// Configuration constants
const GAME_STATE_TTL = parseInt(process.env.REDIS_GAME_TTL) || 3600; // 1 hour default
const MAX_RETRY_ATTEMPTS = 3;

let redisClient = null;
let isRedisAvailable = false;

// Initialize Redis client
async function initRedis() {
  try {
    // If REDIS_URL is provided (e.g., from Railway), use it directly
    // Otherwise, use individual config params
    if (process.env.REDIS_URL) {
      console.log('[REDIS] Connecting using REDIS_URL');
      redisClient = new Redis(process.env.REDIS_URL, {
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
      });
    } else {
      console.log('[REDIS] Connecting using individual config params');
      redisClient = new Redis(redisConfig);
    }

    redisClient.on('connect', () => {
      console.log('[REDIS] Connected to Redis server');
      isRedisAvailable = true;
    });

    redisClient.on('ready', () => {
      console.log('[REDIS] Redis client ready');
      isRedisAvailable = true;
    });

    redisClient.on('error', (err) => {
      console.warn('[REDIS] Redis error:', err.message);
      console.warn('[REDIS] Running without Redis - using in-memory storage only');
      isRedisAvailable = false;
    });

    redisClient.on('close', () => {
      console.log('[REDIS] Redis connection closed');
      isRedisAvailable = false;
    });

    // Try to connect
    await redisClient.connect();

    // Test the connection
    await redisClient.ping();
    isRedisAvailable = true;
    console.log('[REDIS] Redis connection test successful');

    return true;
  } catch (error) {
    console.warn('[REDIS] Could not connect to Redis:', error.message);
    console.warn('[REDIS] Application will continue with in-memory storage');
    isRedisAvailable = false;
    redisClient = null;
    return false;
  }
}

// Save game state to Redis with retry logic
async function saveGameState(gameCode, gameData) {
  if (!isRedisAvailable || !redisClient) {
    return; // Skip if Redis is not available
  }

  const key = `game:${gameCode}`;

  // Convert game data to JSON, excluding WebSocket objects
  const sanitizedData = {
    roomName: gameData.roomName,
    users: Object.keys(gameData.users),
    playerScores: gameData.playerScores,
    playerWords: gameData.playerWords,
    playerAchievements: gameData.playerAchievements,
    playerWordDetails: gameData.playerWordDetails,
    firstWordFound: gameData.firstWordFound,
    gameState: gameData.gameState,
    startTime: gameData.startTime,
    endTime: gameData.endTime,
    letterGrid: gameData.letterGrid,
    timerSeconds: gameData.timerSeconds,
    language: gameData.language,
  };

  // Retry logic for critical save operations
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      await redisClient.setex(key, GAME_STATE_TTL, JSON.stringify(sanitizedData));
      return; // Success
    } catch (error) {
      console.error(`[REDIS] Error saving game state (attempt ${attempt}/${MAX_RETRY_ATTEMPTS}):`, error.message);
      if (attempt === MAX_RETRY_ATTEMPTS) {
        console.error('[REDIS] Failed to save game state after all retry attempts');
        isRedisAvailable = false; // Mark Redis as unavailable
      } else {
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, attempt * 100));
      }
    }
  }
}

// Get game state from Redis
async function getGameState(gameCode) {
  if (!isRedisAvailable || !redisClient) {
    return null;
  }

  try {
    const key = `game:${gameCode}`;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('[REDIS] Error getting game state:', error.message);
    return null;
  }
}

// Delete game state from Redis
async function deleteGameState(gameCode) {
  if (!isRedisAvailable || !redisClient) {
    return;
  }

  try {
    const key = `game:${gameCode}`;
    await redisClient.del(key);
  } catch (error) {
    console.error('[REDIS] Error deleting game state:', error.message);
  }
}

// Get all active game codes using SCAN instead of KEYS (non-blocking)
async function getAllGameCodes() {
  if (!isRedisAvailable || !redisClient) {
    return [];
  }

  try {
    const gameCodes = [];
    let cursor = '0';

    // Use SCAN instead of KEYS to avoid blocking Redis
    do {
      const result = await redisClient.scan(cursor, 'MATCH', 'game:*', 'COUNT', 100);
      cursor = result[0];
      const keys = result[1];

      // Extract game codes from keys
      keys.forEach(key => {
        gameCodes.push(key.replace('game:', ''));
      });
    } while (cursor !== '0');

    return gameCodes;
  } catch (error) {
    console.error('[REDIS] Error getting game codes:', error.message);
    return [];
  }
}

// Close Redis connection
async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    console.log('[REDIS] Redis connection closed');
  }
}

module.exports = {
  initRedis,
  saveGameState,
  getGameState,
  deleteGameState,
  getAllGameCodes,
  closeRedis,
  isRedisAvailable: () => isRedisAvailable,
};
