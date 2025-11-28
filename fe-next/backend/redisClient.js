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
    tournamentId: gameData.tournamentId, // Include tournament ID if present
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

// Save tournament state to Redis with retry logic
async function saveTournamentState(tournamentId, tournamentData) {
  if (!isRedisAvailable || !redisClient) {
    return; // Skip if Redis is not available
  }

  const key = `tournament:${tournamentId}`;

  // Convert tournament data to JSON, excluding any non-serializable data
  const sanitizedData = {
    id: tournamentData.id,
    hostPlayerId: tournamentData.hostPlayerId,
    hostUsername: tournamentData.hostUsername,
    name: tournamentData.name,
    totalRounds: tournamentData.totalRounds,
    currentRound: tournamentData.currentRound,
    status: tournamentData.status,
    settings: tournamentData.settings,
    players: tournamentData.players,
    rounds: tournamentData.rounds,
    finalStandings: tournamentData.finalStandings,
    createdAt: tournamentData.createdAt,
  };

  // Retry logic for critical save operations
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      // Use longer TTL for tournaments (3 hours)
      await redisClient.setex(key, GAME_STATE_TTL * 3, JSON.stringify(sanitizedData));
      return; // Success
    } catch (error) {
      console.error(`[REDIS] Error saving tournament state (attempt ${attempt}/${MAX_RETRY_ATTEMPTS}):`, error.message);
      if (attempt === MAX_RETRY_ATTEMPTS) {
        console.error('[REDIS] Failed to save tournament state after all retry attempts');
        isRedisAvailable = false; // Mark Redis as unavailable
      } else {
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, attempt * 100));
      }
    }
  }
}

// Get tournament state from Redis
async function getTournamentState(tournamentId) {
  if (!isRedisAvailable || !redisClient) {
    return null;
  }

  try {
    const key = `tournament:${tournamentId}`;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('[REDIS] Error getting tournament state:', error.message);
    return null;
  }
}

// Delete tournament state from Redis
async function deleteTournamentState(tournamentId) {
  if (!isRedisAvailable || !redisClient) {
    return;
  }

  try {
    const key = `tournament:${tournamentId}`;
    await redisClient.del(key);
  } catch (error) {
    console.error('[REDIS] Error deleting tournament state:', error.message);
  }
}

// Get all active tournament IDs using SCAN
async function getAllTournamentIds() {
  if (!isRedisAvailable || !redisClient) {
    return [];
  }

  try {
    const tournamentIds = [];
    let cursor = '0';

    // Use SCAN instead of KEYS to avoid blocking Redis
    do {
      const result = await redisClient.scan(cursor, 'MATCH', 'tournament:*', 'COUNT', 100);
      cursor = result[0];
      const keys = result[1];

      // Extract tournament IDs from keys
      keys.forEach(key => {
        tournamentIds.push(key.replace('tournament:', ''));
      });
    } while (cursor !== '0');

    return tournamentIds;
  } catch (error) {
    console.error('[REDIS] Error getting tournament IDs:', error.message);
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

// ==========================================
// Word Approval Tracking (no TTL - persistent)
// ==========================================

// Get approval status for a word
async function getWordApprovalStatus(word, language) {
  if (!isRedisAvailable || !redisClient) {
    return null;
  }

  try {
    const key = `approved_word:${language}:${word}`;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('[REDIS] Error getting word approval status:', error.message);
    return null;
  }
}

// Increment approval count for a word (returns new approval data)
async function incrementWordApproval(word, language, gameId) {
  if (!isRedisAvailable || !redisClient) {
    return null;
  }

  try {
    const key = `approved_word:${language}:${word}`;
    const existing = await redisClient.get(key);
    const now = new Date().toISOString();

    let approvalData;
    if (existing) {
      approvalData = JSON.parse(existing);
      // Only count if this game hasn't already approved this word
      if (!approvalData.gameIds.includes(gameId)) {
        approvalData.gameIds.push(gameId);
        approvalData.approvalCount = approvalData.gameIds.length;
        approvalData.lastApproved = now;
      }
    } else {
      approvalData = {
        approvalCount: 1,
        gameIds: [gameId],
        firstApproved: now,
        lastApproved: now
      };
    }

    // Save without TTL (persistent)
    await redisClient.set(key, JSON.stringify(approvalData));
    return approvalData;
  } catch (error) {
    console.error('[REDIS] Error incrementing word approval:', error.message);
    return null;
  }
}

// Get all approved words for a language with minimum approvals
async function getApprovedWords(language, minApprovals = 2) {
  if (!isRedisAvailable || !redisClient) {
    return [];
  }

  try {
    const approvedWords = [];
    let cursor = '0';

    // Use SCAN to find all approved word keys for this language
    do {
      const result = await redisClient.scan(cursor, 'MATCH', `approved_word:${language}:*`, 'COUNT', 500);
      cursor = result[0];
      const keys = result[1];

      if (keys.length > 0) {
        const pipeline = redisClient.pipeline();
        for (const key of keys) {
          pipeline.get(key);
        }
        const res = await pipeline.exec();
        for (let i = 0; i < keys.length; i++) {
          const [err, data] = res[i] || [];
          if (!err && data) {
            const approvalData = JSON.parse(data);
            if (approvalData.approvalCount >= minApprovals) {
              const word = keys[i].replace(`approved_word:${language}:`, '');
              approvedWords.push(word);
            }
          }
        }
      }
    } while (cursor !== '0');

    return approvedWords;
  } catch (error) {
    console.error('[REDIS] Error getting approved words:', error.message);
    return [];
  }
}

// ==========================================
// Leaderboard Caching
// ==========================================

const LEADERBOARD_TTL = 300; // 5 minutes cache

// Get cached leaderboard top 100
async function getCachedLeaderboardTop100() {
  if (!isRedisAvailable || !redisClient) {
    return null;
  }

  try {
    const data = await redisClient.get('lb:top100');
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('[REDIS] Error getting cached leaderboard:', error.message);
    return null;
  }
}

// Cache leaderboard top 100
async function cacheLeaderboardTop100(leaderboard) {
  if (!isRedisAvailable || !redisClient) {
    return;
  }

  try {
    await redisClient.setex('lb:top100', LEADERBOARD_TTL, JSON.stringify(leaderboard));
  } catch (error) {
    console.error('[REDIS] Error caching leaderboard:', error.message);
  }
}

// Get cached user rank
async function getCachedUserRank(userId) {
  if (!isRedisAvailable || !redisClient) {
    return null;
  }

  try {
    const data = await redisClient.get(`lb:user:${userId}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('[REDIS] Error getting cached user rank:', error.message);
    return null;
  }
}

// Cache user rank
async function cacheUserRank(userId, rankData) {
  if (!isRedisAvailable || !redisClient) {
    return;
  }

  try {
    await redisClient.setex(`lb:user:${userId}`, 60, JSON.stringify(rankData)); // 1 minute cache
  } catch (error) {
    console.error('[REDIS] Error caching user rank:', error.message);
  }
}

// Invalidate leaderboard caches
async function invalidateLeaderboardCaches() {
  if (!isRedisAvailable || !redisClient) {
    return;
  }

  try {
    // Delete top 100 cache
    await redisClient.del('lb:top100');

    // Delete all user rank caches using SCAN
    let cursor = '0';
    do {
      const result = await redisClient.scan(cursor, 'MATCH', 'lb:user:*', 'COUNT', 100);
      cursor = result[0];
      const keys = result[1];
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } while (cursor !== '0');

    console.log('[REDIS] Leaderboard caches invalidated');
  } catch (error) {
    console.error('[REDIS] Error invalidating leaderboard caches:', error.message);
  }
}

module.exports = {
  initRedis,
  saveGameState,
  getGameState,
  deleteGameState,
  getAllGameCodes,
  saveTournamentState,
  getTournamentState,
  deleteTournamentState,
  getAllTournamentIds,
  closeRedis,
  isRedisAvailable: () => isRedisAvailable,
  // Word approval tracking
  getWordApprovalStatus,
  incrementWordApproval,
  getApprovedWords,
  // Leaderboard caching
  getCachedLeaderboardTop100,
  cacheLeaderboardTop100,
  getCachedUserRank,
  cacheUserRank,
  invalidateLeaderboardCaches,
};
