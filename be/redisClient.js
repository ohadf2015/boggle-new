// redisClient.js
const Redis = require('ioredis');

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true, // Don't connect immediately
};

let redisClient = null;
let isRedisAvailable = false;

// Initialize Redis client
async function initRedis() {
  try {
    redisClient = new Redis(redisConfig);

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

// Save game state to Redis (async, non-blocking)
async function saveGameState(gameCode, gameData) {
  if (!isRedisAvailable || !redisClient) {
    return; // Skip if Redis is not available
  }

  try {
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
    };

    await redisClient.setex(key, 3600, JSON.stringify(sanitizedData)); // TTL 1 hour
  } catch (error) {
    console.error('[REDIS] Error saving game state:', error.message);
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

// Get all active game codes
async function getAllGameCodes() {
  if (!isRedisAvailable || !redisClient) {
    return [];
  }

  try {
    const keys = await redisClient.keys('game:*');
    return keys.map(key => key.replace('game:', ''));
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
