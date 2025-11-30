// redisClient.js - Enhanced Redis Client with Connection Pooling, Circuit Breaker, and Optimizations
const Redis = require('ioredis');
const logger = require('./utils/logger');

// ==========================================
// Configuration Constants
// ==========================================

const REDIS_PREFIX = process.env.REDIS_PREFIX || 'lexiclash';
const REDIS_VERSION = 'v1';

// TTL Configuration (seconds)
const TTL_CONFIG = {
  GAME_STATE: parseInt(process.env.REDIS_GAME_TTL) || 3600,           // 1 hour
  TOURNAMENT: parseInt(process.env.REDIS_TOURNAMENT_TTL) || 10800,    // 3 hours
  LEADERBOARD_TOP: parseInt(process.env.REDIS_LEADERBOARD_TTL) || 900, // 15 minutes (was 5 - 66% reduction in DB queries)
  LEADERBOARD_USER: 120,                                               // 2 minutes (was 1 minute)
};

// Performance Configuration
const MAX_RETRY_ATTEMPTS = 3;
const PIPELINE_BATCH_SIZE = 500;
const SCAN_COUNT = 100;
const MAX_SCAN_ITERATIONS = 1000;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const MEMORY_WARNING_THRESHOLD = 80; // percentage

// ==========================================
// Key Naming Helpers (Consistent Namespace)
// ==========================================

const KEYS = {
  game: (gameCode) => `${REDIS_PREFIX}:${REDIS_VERSION}:game:${gameCode}`,
  tournament: (id) => `${REDIS_PREFIX}:${REDIS_VERSION}:tournament:${id}`,
  wordApproval: (lang, word) => `${REDIS_PREFIX}:${REDIS_VERSION}:word:${lang}:${word}`,
  leaderboardTop: () => `${REDIS_PREFIX}:${REDIS_VERSION}:lb:top100`,
  leaderboardUser: (userId) => `${REDIS_PREFIX}:${REDIS_VERSION}:lb:user:${userId}`,
};

// Key patterns for SCAN operations
const KEY_PATTERNS = {
  games: `${REDIS_PREFIX}:${REDIS_VERSION}:game:*`,
  tournaments: `${REDIS_PREFIX}:${REDIS_VERSION}:tournament:*`,
  wordApprovals: (lang) => `${REDIS_PREFIX}:${REDIS_VERSION}:word:${lang}:*`,
  leaderboardUsers: `${REDIS_PREFIX}:${REDIS_VERSION}:lb:user:*`,
};

// ==========================================
// Circuit Breaker Implementation
// ==========================================

class CircuitBreaker {
  constructor(threshold = 5, timeout = 30000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
  }

  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN - Redis operations suspended');
      }
      this.state = 'HALF_OPEN';
      logger.info('REDIS', 'Circuit breaker entering HALF_OPEN state');
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    if (this.state === 'HALF_OPEN') {
      logger.info('REDIS', 'Circuit breaker recovered - entering CLOSED state');
    }
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      logger.error('REDIS', `Circuit breaker OPENED after ${this.failureCount} failures. Will retry at ${new Date(this.nextAttempt).toISOString()}`);
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      nextAttempt: this.state === 'OPEN' ? this.nextAttempt : null,
    };
  }
}

// ==========================================
// Redis Connection Configuration
// ==========================================

const baseRedisConfig = {
  // Connection pool settings
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,

  // Reconnection strategy with exponential backoff
  retryStrategy(times) {
    if (times > 10) {
      logger.error('REDIS', 'Max reconnection attempts reached');
      return null; // Stop retrying
    }
    const delay = Math.min(times * 50, 2000);
    logger.debug('REDIS', `Reconnecting in ${delay}ms (attempt ${times})`);
    return delay;
  },

  // Connection health
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000, // Prevent hanging commands

  // Performance
  lazyConnect: true,
  autoResubscribe: true,
  autoResendUnfulfilledCommands: true,
};

// ==========================================
// State Management
// ==========================================

let redisClient = null;
let isRedisAvailable = false;
let lastHealthCheck = Date.now();
let healthCheckInterval = null;
let memoryCheckInterval = null;

const circuitBreaker = new CircuitBreaker();

// Lua script SHA for atomic word approval
let wordApprovalScriptSha = null;

// Lua script for atomic word approval increment
const WORD_APPROVAL_SCRIPT = `
local key = KEYS[1]
local gameId = ARGV[1]
local now = ARGV[2]

local data = redis.call('GET', key)
local approvalData

if data then
  approvalData = cjson.decode(data)
  -- Check if gameId already exists
  for i, id in ipairs(approvalData.gameIds) do
    if id == gameId then
      return data -- No change needed, return existing data
    end
  end
  table.insert(approvalData.gameIds, gameId)
  approvalData.approvalCount = #approvalData.gameIds
  approvalData.lastApproved = now
else
  approvalData = {
    approvalCount = 1,
    gameIds = {gameId},
    firstApproved = now,
    lastApproved = now
  }
end

local encoded = cjson.encode(approvalData)
redis.call('SET', key, encoded)
return encoded
`;

// ==========================================
// TTL Jitter (Prevent Thundering Herd)
// ==========================================

function getTTLWithJitter(baseTTL, jitterPercent = 10) {
  const jitter = Math.floor(baseTTL * (jitterPercent / 100));
  return baseTTL + Math.floor(Math.random() * jitter * 2) - jitter;
}

// ==========================================
// Redis Initialization
// ==========================================

async function initRedis() {
  try {
    // Create Redis client based on environment
    if (process.env.REDIS_URL) {
      logger.info('REDIS', 'Connecting using REDIS_URL');
      redisClient = new Redis(process.env.REDIS_URL, baseRedisConfig);
    } else {
      const host = process.env.REDIS_HOST || process.env.REDISHOST || '127.0.0.1';
      const port = process.env.REDIS_PORT || process.env.REDISPORT || 6379;
      const password = process.env.REDIS_PASSWORD || undefined;

      logger.info('REDIS', `Connecting to ${host}:${port}`);
      redisClient = new Redis({
        ...baseRedisConfig,
        host,
        port,
        password,
      });
    }

    // Event handlers
    redisClient.on('connect', () => {
      logger.info('REDIS', 'Connected to Redis server');
      isRedisAvailable = true;
    });

    redisClient.on('ready', () => {
      logger.info('REDIS', 'Redis client ready');
      isRedisAvailable = true;
      loadLuaScripts(); // Load Lua scripts when ready
    });

    redisClient.on('error', (err) => {
      logger.warn('REDIS', `Redis error: ${err.message}`);
      isRedisAvailable = false;
    });

    redisClient.on('close', () => {
      logger.debug('REDIS', 'Redis connection closed');
      isRedisAvailable = false;
    });

    redisClient.on('reconnecting', (delay) => {
      logger.debug('REDIS', `Reconnecting in ${delay}ms`);
    });

    // Connect
    await redisClient.connect();

    // Test connection
    await redisClient.ping();
    isRedisAvailable = true;
    logger.info('REDIS', 'Redis connection test successful');

    // Start health monitoring
    startHealthMonitoring();

    return true;
  } catch (error) {
    logger.warn('REDIS', `Could not connect to Redis: ${error.message}`);
    logger.warn('REDIS', 'Application will continue with in-memory storage');
    isRedisAvailable = false;
    redisClient = null;
    return false;
  }
}

// Load Lua scripts for atomic operations
async function loadLuaScripts() {
  if (!isRedisAvailable || !redisClient) return;

  try {
    wordApprovalScriptSha = await redisClient.script('LOAD', WORD_APPROVAL_SCRIPT);
    logger.debug('REDIS', 'Loaded Lua scripts successfully');
  } catch (error) {
    logger.error('REDIS', `Failed to load Lua scripts: ${error.message}`);
    // Fallback to non-atomic operations will be used
  }
}

// ==========================================
// Health Monitoring
// ==========================================

function startHealthMonitoring() {
  // Health check every 30 seconds
  healthCheckInterval = setInterval(async () => {
    await healthCheck();
  }, HEALTH_CHECK_INTERVAL);
  healthCheckInterval.unref();

  // Memory check every minute
  memoryCheckInterval = setInterval(async () => {
    await checkRedisMemory();
  }, 60000);
  memoryCheckInterval.unref();
}

async function healthCheck() {
  if (!redisClient) return false;

  try {
    const start = Date.now();
    await redisClient.ping();
    const latency = Date.now() - start;

    if (latency > 100) {
      logger.warn('REDIS', `High latency: ${latency}ms`);
    }

    lastHealthCheck = Date.now();
    isRedisAvailable = true;
    return true;
  } catch (error) {
    logger.error('REDIS', `Health check failed: ${error.message}`);
    isRedisAvailable = false;
    return false;
  }
}

async function checkRedisMemory() {
  if (!isRedisAvailable || !redisClient) return;

  try {
    const info = await redisClient.info('memory');
    const usedMemoryMatch = info.match(/used_memory:(\d+)/);
    const maxMemoryMatch = info.match(/maxmemory:(\d+)/);

    if (usedMemoryMatch && maxMemoryMatch) {
      const usedMemory = parseInt(usedMemoryMatch[1]);
      const maxMemory = parseInt(maxMemoryMatch[1]);

      if (maxMemory > 0) {
        const usagePercent = (usedMemory / maxMemory) * 100;
        if (usagePercent > MEMORY_WARNING_THRESHOLD) {
          logger.warn('REDIS', `Memory usage high: ${usagePercent.toFixed(2)}% (${formatBytes(usedMemory)} / ${formatBytes(maxMemory)})`);
        }
      }
    }
  } catch (error) {
    // Silently ignore memory check errors
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function getRedisHealth() {
  const timeSinceLastCheck = Date.now() - lastHealthCheck;
  return {
    available: isRedisAvailable,
    lastCheck: lastHealthCheck,
    stale: timeSinceLastCheck > HEALTH_CHECK_INTERVAL * 2,
    circuitBreaker: circuitBreaker.getState(),
  };
}

// ==========================================
// Game State Operations (Using Redis Hashes)
// ==========================================

async function saveGameState(gameCode, gameData) {
  if (!isRedisAvailable || !redisClient) {
    return;
  }

  const key = KEYS.game(gameCode);

  // Sanitize data - exclude WebSocket objects
  const sanitizedData = {
    roomName: gameData.roomName || '',
    users: JSON.stringify(Object.keys(gameData.users || {})),
    playerScores: JSON.stringify(gameData.playerScores || {}),
    playerWords: JSON.stringify(gameData.playerWords || {}),
    playerAchievements: JSON.stringify(gameData.playerAchievements || {}),
    playerWordDetails: JSON.stringify(gameData.playerWordDetails || {}),
    firstWordFound: JSON.stringify(gameData.firstWordFound || {}),
    gameState: gameData.gameState || 'waiting',
    startTime: gameData.startTime || '',
    endTime: gameData.endTime || '',
    letterGrid: JSON.stringify(gameData.letterGrid || []),
    timerSeconds: String(gameData.timerSeconds || 60),
    language: gameData.language || 'en',
    tournamentId: gameData.tournamentId || '',
  };

  // Retry logic with circuit breaker
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      await circuitBreaker.execute(async () => {
        const pipeline = redisClient.pipeline();

        // Use HSET for each field
        for (const [field, value] of Object.entries(sanitizedData)) {
          pipeline.hset(key, field, value);
        }

        // Set TTL with jitter
        pipeline.expire(key, getTTLWithJitter(TTL_CONFIG.GAME_STATE));

        await pipeline.exec();
      });
      return; // Success
    } catch (error) {
      logger.error('REDIS', `Error saving game state (attempt ${attempt}/${MAX_RETRY_ATTEMPTS}): ${error.message}`);
      if (attempt === MAX_RETRY_ATTEMPTS) {
        logger.error('REDIS', 'Failed to save game state after all retry attempts');
      } else {
        await new Promise(resolve => setTimeout(resolve, attempt * 100));
      }
    }
  }
}

async function getGameState(gameCode) {
  if (!isRedisAvailable || !redisClient) {
    return null;
  }

  try {
    const key = KEYS.game(gameCode);
    const data = await circuitBreaker.execute(() => redisClient.hgetall(key));

    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    // Parse JSON fields
    return {
      roomName: data.roomName,
      users: JSON.parse(data.users || '[]'),
      playerScores: JSON.parse(data.playerScores || '{}'),
      playerWords: JSON.parse(data.playerWords || '{}'),
      playerAchievements: JSON.parse(data.playerAchievements || '{}'),
      playerWordDetails: JSON.parse(data.playerWordDetails || '{}'),
      firstWordFound: JSON.parse(data.firstWordFound || '{}'),
      gameState: data.gameState,
      startTime: data.startTime,
      endTime: data.endTime,
      letterGrid: JSON.parse(data.letterGrid || '[]'),
      timerSeconds: parseInt(data.timerSeconds) || 60,
      language: data.language,
      tournamentId: data.tournamentId || null,
    };
  } catch (error) {
    logger.error('REDIS', `Error getting game state: ${error.message}`);
    return null;
  }
}

async function deleteGameState(gameCode) {
  if (!isRedisAvailable || !redisClient) {
    return;
  }

  try {
    const key = KEYS.game(gameCode);
    await circuitBreaker.execute(() => redisClient.del(key));
  } catch (error) {
    logger.error('REDIS', `Error deleting game state: ${error.message}`);
  }
}

async function getAllGameCodes() {
  if (!isRedisAvailable || !redisClient) {
    return [];
  }

  try {
    const gameCodes = [];
    let cursor = '0';
    let iterations = 0;

    do {
      if (iterations++ > MAX_SCAN_ITERATIONS) {
        logger.warn('REDIS', 'SCAN exceeded max iterations, returning partial results');
        break;
      }

      try {
        const result = await circuitBreaker.execute(() =>
          redisClient.scan(cursor, 'MATCH', KEY_PATTERNS.games, 'COUNT', SCAN_COUNT)
        );
        cursor = result[0];
        const keys = result[1];

        keys.forEach(key => {
          // Extract game code from key pattern
          const parts = key.split(':');
          if (parts.length >= 4) {
            gameCodes.push(parts[parts.length - 1]);
          }
        });
      } catch (scanError) {
        logger.error('REDIS', `SCAN iteration failed at cursor ${cursor}: ${scanError.message}`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } while (cursor !== '0');

    return gameCodes;
  } catch (error) {
    logger.error('REDIS', `Error getting game codes: ${error.message}`);
    return [];
  }
}

// ==========================================
// Tournament State Operations
// ==========================================

async function saveTournamentState(tournamentId, tournamentData) {
  if (!isRedisAvailable || !redisClient) {
    return;
  }

  const key = KEYS.tournament(tournamentId);

  const sanitizedData = {
    id: tournamentData.id || '',
    hostPlayerId: tournamentData.hostPlayerId || '',
    hostUsername: tournamentData.hostUsername || '',
    name: tournamentData.name || '',
    totalRounds: String(tournamentData.totalRounds || 0),
    currentRound: String(tournamentData.currentRound || 0),
    status: tournamentData.status || '',
    settings: JSON.stringify(tournamentData.settings || {}),
    players: JSON.stringify(tournamentData.players || []),
    rounds: JSON.stringify(tournamentData.rounds || []),
    finalStandings: JSON.stringify(tournamentData.finalStandings || []),
    createdAt: tournamentData.createdAt || '',
  };

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      await circuitBreaker.execute(async () => {
        const pipeline = redisClient.pipeline();

        for (const [field, value] of Object.entries(sanitizedData)) {
          pipeline.hset(key, field, value);
        }

        pipeline.expire(key, getTTLWithJitter(TTL_CONFIG.TOURNAMENT));

        await pipeline.exec();
      });
      return;
    } catch (error) {
      logger.error('REDIS', `Error saving tournament state (attempt ${attempt}/${MAX_RETRY_ATTEMPTS}): ${error.message}`);
      if (attempt < MAX_RETRY_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, attempt * 100));
      }
    }
  }
}

async function getTournamentState(tournamentId) {
  if (!isRedisAvailable || !redisClient) {
    return null;
  }

  try {
    const key = KEYS.tournament(tournamentId);
    const data = await circuitBreaker.execute(() => redisClient.hgetall(key));

    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    return {
      id: data.id,
      hostPlayerId: data.hostPlayerId,
      hostUsername: data.hostUsername,
      name: data.name,
      totalRounds: parseInt(data.totalRounds) || 0,
      currentRound: parseInt(data.currentRound) || 0,
      status: data.status,
      settings: JSON.parse(data.settings || '{}'),
      players: JSON.parse(data.players || '[]'),
      rounds: JSON.parse(data.rounds || '[]'),
      finalStandings: JSON.parse(data.finalStandings || '[]'),
      createdAt: data.createdAt,
    };
  } catch (error) {
    logger.error('REDIS', `Error getting tournament state: ${error.message}`);
    return null;
  }
}

async function deleteTournamentState(tournamentId) {
  if (!isRedisAvailable || !redisClient) {
    return;
  }

  try {
    const key = KEYS.tournament(tournamentId);
    await circuitBreaker.execute(() => redisClient.del(key));
  } catch (error) {
    logger.error('REDIS', `Error deleting tournament state: ${error.message}`);
  }
}

async function getAllTournamentIds() {
  if (!isRedisAvailable || !redisClient) {
    return [];
  }

  try {
    const tournamentIds = [];
    let cursor = '0';
    let iterations = 0;

    do {
      if (iterations++ > MAX_SCAN_ITERATIONS) {
        logger.warn('REDIS', 'SCAN exceeded max iterations for tournaments');
        break;
      }

      const result = await circuitBreaker.execute(() =>
        redisClient.scan(cursor, 'MATCH', KEY_PATTERNS.tournaments, 'COUNT', SCAN_COUNT)
      );
      cursor = result[0];
      const keys = result[1];

      keys.forEach(key => {
        const parts = key.split(':');
        if (parts.length >= 4) {
          tournamentIds.push(parts[parts.length - 1]);
        }
      });
    } while (cursor !== '0');

    return tournamentIds;
  } catch (error) {
    logger.error('REDIS', `Error getting tournament IDs: ${error.message}`);
    return [];
  }
}

// ==========================================
// Word Approval Tracking (Atomic with Lua Script)
// ==========================================

async function getWordApprovalStatus(word, language) {
  if (!isRedisAvailable || !redisClient) {
    return null;
  }

  try {
    const key = KEYS.wordApproval(language, word);
    const data = await circuitBreaker.execute(() => redisClient.get(key));
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error('REDIS', `Error getting word approval status: ${error.message}`);
    return null;
  }
}

async function incrementWordApproval(word, language, gameId) {
  if (!isRedisAvailable || !redisClient) {
    return null;
  }

  const key = KEYS.wordApproval(language, word);
  const now = new Date().toISOString();

  // Try Lua script first (atomic)
  if (wordApprovalScriptSha) {
    try {
      const result = await circuitBreaker.execute(() =>
        redisClient.evalsha(wordApprovalScriptSha, 1, key, gameId, now)
      );
      return JSON.parse(result);
    } catch (error) {
      // If script not found (NOSCRIPT), reload it
      if (error.message.includes('NOSCRIPT')) {
        await loadLuaScripts();
      }
      logger.warn('REDIS', `Lua script failed, falling back to WATCH/MULTI: ${error.message}`);
    }
  }

  // Fallback to WATCH/MULTI for atomic operation
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await redisClient.watch(key);

      const existing = await redisClient.get(key);
      let approvalData;

      if (existing) {
        approvalData = JSON.parse(existing);
        if (approvalData.gameIds.includes(gameId)) {
          await redisClient.unwatch();
          return approvalData; // No change needed
        }
        approvalData.gameIds.push(gameId);
        approvalData.approvalCount = approvalData.gameIds.length;
        approvalData.lastApproved = now;
      } else {
        approvalData = {
          approvalCount: 1,
          gameIds: [gameId],
          firstApproved: now,
          lastApproved: now,
        };
      }

      // Execute transaction
      const result = await redisClient
        .multi()
        .set(key, JSON.stringify(approvalData))
        .exec();

      if (result === null) {
        // Transaction failed, retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 10 * Math.pow(2, attempt)));
        continue;
      }

      return approvalData;
    } catch (error) {
      await redisClient.unwatch();
      logger.error('REDIS', `Error incrementing word approval: ${error.message}`);
      if (attempt === maxRetries - 1) {
        return null;
      }
    }
  }

  return null;
}

async function getApprovedWords(language, minApprovals = 2) {
  if (!isRedisAvailable || !redisClient) {
    return [];
  }

  try {
    const approvedWords = [];
    let cursor = '0';
    let iterations = 0;

    do {
      if (iterations++ > MAX_SCAN_ITERATIONS) {
        logger.warn('REDIS', 'SCAN exceeded max iterations for approved words');
        break;
      }

      const result = await circuitBreaker.execute(() =>
        redisClient.scan(cursor, 'MATCH', KEY_PATTERNS.wordApprovals(language), 'COUNT', PIPELINE_BATCH_SIZE)
      );
      cursor = result[0];
      const keys = result[1];

      if (keys.length > 0) {
        // Process in batches
        for (let i = 0; i < keys.length; i += PIPELINE_BATCH_SIZE) {
          const batch = keys.slice(i, i + PIPELINE_BATCH_SIZE);
          const pipeline = redisClient.pipeline();

          batch.forEach(key => pipeline.get(key));

          const results = await pipeline.exec();
          results.forEach(([err, data], idx) => {
            if (err) {
              logger.error('REDIS', `Pipeline error for key ${batch[idx]}: ${err.message}`);
              return;
            }
            if (data) {
              try {
                const approvalData = JSON.parse(data);
                if (approvalData.approvalCount >= minApprovals) {
                  // Extract word from key
                  const parts = batch[idx].split(':');
                  if (parts.length >= 5) {
                    approvedWords.push(parts[parts.length - 1]);
                  }
                }
              } catch (parseError) {
                // Ignore parse errors
              }
            }
          });
        }
      }
    } while (cursor !== '0');

    return approvedWords;
  } catch (error) {
    logger.error('REDIS', `Error getting approved words: ${error.message}`);
    return [];
  }
}

// ==========================================
// Leaderboard Caching
// ==========================================

async function getCachedLeaderboardTop100() {
  if (!isRedisAvailable || !redisClient) {
    return null;
  }

  try {
    const data = await circuitBreaker.execute(() => redisClient.get(KEYS.leaderboardTop()));
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error('REDIS', `Error getting cached leaderboard: ${error.message}`);
    return null;
  }
}

async function cacheLeaderboardTop100(leaderboard) {
  if (!isRedisAvailable || !redisClient) {
    return;
  }

  try {
    await circuitBreaker.execute(() =>
      redisClient.setex(
        KEYS.leaderboardTop(),
        getTTLWithJitter(TTL_CONFIG.LEADERBOARD_TOP),
        JSON.stringify(leaderboard)
      )
    );
  } catch (error) {
    logger.error('REDIS', `Error caching leaderboard: ${error.message}`);
  }
}

async function getCachedUserRank(userId) {
  if (!isRedisAvailable || !redisClient) {
    return null;
  }

  try {
    const data = await circuitBreaker.execute(() => redisClient.get(KEYS.leaderboardUser(userId)));
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error('REDIS', `Error getting cached user rank: ${error.message}`);
    return null;
  }
}

async function cacheUserRank(userId, rankData) {
  if (!isRedisAvailable || !redisClient) {
    return;
  }

  try {
    await circuitBreaker.execute(() =>
      redisClient.setex(
        KEYS.leaderboardUser(userId),
        getTTLWithJitter(TTL_CONFIG.LEADERBOARD_USER),
        JSON.stringify(rankData)
      )
    );
  } catch (error) {
    logger.error('REDIS', `Error caching user rank: ${error.message}`);
  }
}

async function invalidateLeaderboardCaches() {
  if (!isRedisAvailable || !redisClient) {
    return;
  }

  try {
    // Delete top 100 cache
    await circuitBreaker.execute(() => redisClient.del(KEYS.leaderboardTop()));

    // Delete all user rank caches using SCAN
    let cursor = '0';
    let iterations = 0;

    do {
      if (iterations++ > MAX_SCAN_ITERATIONS) break;

      const result = await redisClient.scan(cursor, 'MATCH', KEY_PATTERNS.leaderboardUsers, 'COUNT', SCAN_COUNT);
      cursor = result[0];
      const keys = result[1];

      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } while (cursor !== '0');

    logger.debug('REDIS', 'Leaderboard caches invalidated');
  } catch (error) {
    logger.error('REDIS', `Error invalidating leaderboard caches: ${error.message}`);
  }
}

// ==========================================
// Redis Metrics for Monitoring
// ==========================================

async function getRedisMetrics() {
  if (!isRedisAvailable || !redisClient) {
    return {
      available: false,
      error: 'Redis not available',
    };
  }

  try {
    const info = await redisClient.info();
    const dbSize = await redisClient.dbsize();

    // Parse info string
    const usedMemoryMatch = info.match(/used_memory:(\d+)/);
    const connectedClientsMatch = info.match(/connected_clients:(\d+)/);
    const totalCommandsMatch = info.match(/total_commands_processed:(\d+)/);
    const hitRateMatch = info.match(/keyspace_hits:(\d+)/);
    const missRateMatch = info.match(/keyspace_misses:(\d+)/);

    const hits = parseInt(hitRateMatch?.[1] || 0);
    const misses = parseInt(missRateMatch?.[1] || 0);
    const hitRate = hits + misses > 0 ? (hits / (hits + misses) * 100).toFixed(2) : 0;

    return {
      available: true,
      keyCount: dbSize,
      usedMemory: parseInt(usedMemoryMatch?.[1] || 0),
      usedMemoryHuman: formatBytes(parseInt(usedMemoryMatch?.[1] || 0)),
      connectedClients: parseInt(connectedClientsMatch?.[1] || 0),
      totalCommands: parseInt(totalCommandsMatch?.[1] || 0),
      hitRate: `${hitRate}%`,
      circuitBreaker: circuitBreaker.getState(),
      health: getRedisHealth(),
    };
  } catch (error) {
    return {
      available: false,
      error: error.message,
    };
  }
}

// ==========================================
// Connection Management
// ==========================================

async function closeRedis() {
  // Clear intervals
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
  if (memoryCheckInterval) {
    clearInterval(memoryCheckInterval);
    memoryCheckInterval = null;
  }

  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('REDIS', 'Redis connection closed');
    } catch (error) {
      logger.error('REDIS', `Error closing connection: ${error.message}`);
    }
    redisClient = null;
    isRedisAvailable = false;
  }
}

// Create pub/sub clients for Socket.IO adapter (reuses base config)
function createPubSubClients() {
  if (!redisClient) {
    return null;
  }

  try {
    // Duplicate the main client for pub/sub
    const pubClient = redisClient.duplicate();
    const subClient = redisClient.duplicate();

    return { pubClient, subClient };
  } catch (error) {
    logger.error('REDIS', `Failed to create pub/sub clients: ${error.message}`);
    return null;
  }
}

// ==========================================
// Module Exports
// ==========================================

module.exports = {
  // Initialization
  initRedis,
  closeRedis,

  // Connection info
  isRedisAvailable: () => isRedisAvailable,
  getRedisClient: () => redisClient,
  createPubSubClients,

  // Game state operations
  saveGameState,
  getGameState,
  deleteGameState,
  getAllGameCodes,

  // Tournament operations
  saveTournamentState,
  getTournamentState,
  deleteTournamentState,
  getAllTournamentIds,

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

  // Health and monitoring
  healthCheck,
  getRedisHealth,
  getRedisMetrics,

  // Configuration exports (for external use)
  TTL_CONFIG,
  KEYS,
};
