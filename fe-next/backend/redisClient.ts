// _redisClient.ts - Enhanced Redis Client with Connection Pooling, Circuit Breaker, and Optimizations
import Redis, { type Redis as RedisClient } from 'ioredis';

const logger = require('./utils/logger');

// ==========================================
// Configuration Constants
// ==========================================

const REDIS_PREFIX = process.env.REDIS_PREFIX || 'lexiclash';
const REDIS_VERSION = 'v1';

// TTL Configuration (seconds)
const TTL_CONFIG = {
  GAME_STATE: parseInt(process.env.REDIS_GAME_TTL || '3600'),           // 1 hour
  TOURNAMENT: parseInt(process.env.REDIS_TOURNAMENT_TTL || '10800'),    // 3 hours
  LEADERBOARD_TOP: parseInt(process.env.REDIS_LEADERBOARD_TTL || '900'), // 15 minutes (was 5 - 66% reduction in DB queries)
  LEADERBOARD_USER: 120,                                               // 2 minutes (was 1 minute)
  DAILY_PUZZLE: parseInt(process.env.REDIS_DAILY_PUZZLE_TTL || '86400'),
  DAILY_LEADERBOARD: parseInt(process.env.REDIS_DAILY_LEADERBOARD_TTL || '60'),
};

// Performance Configuration
const MAX_RETRY_ATTEMPTS = 3;
const PIPELINE_BATCH_SIZE = 500;
const SCAN_COUNT = 100;
const MAX_SCAN_ITERATIONS = 1000;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const MEMORY_WARNING_THRESHOLD = 80; // percentage

// ==========================================
// Type Definitions
// ==========================================

interface GameStateData {
  roomName: string;
  users: string[];
  playerScores: Record<string, number>;
  playerWords: Record<string, string[]>;
  playerAchievements: Record<string, string[]>;
  playerWordDetails: Record<string, unknown[]>;
  firstWordFound: Record<string, boolean>;
  gameState: string;
  startTime: string;
  endTime: string;
  letterGrid: string[][];
  timerSeconds: number;
  language: string;
  tournamentId: string | null;
}

interface TournamentStateData {
  id: string;
  hostPlayerId: string;
  hostUsername: string;
  name: string;
  totalRounds: number;
  currentRound: number;
  status: string;
  settings: Record<string, unknown>;
  players: unknown[];
  rounds: unknown[];
  finalStandings: unknown[];
  createdAt: string;
}

interface WordApprovalData {
  approvalCount: number;
  gameIds: string[];
  firstApproved: string;
  lastApproved: string;
}

interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  nextAttempt: number | null;
}

interface RedisHealth {
  available: boolean;
  lastCheck: number;
  stale: boolean;
  circuitBreaker: CircuitBreakerState;
}

interface RedisMetrics {
  available: boolean;
  error?: string;
  keyCount?: number;
  usedMemory?: number;
  usedMemoryHuman?: string;
  connectedClients?: number;
  totalCommands?: number;
  hitRate?: string;
  circuitBreaker?: CircuitBreakerState;
  health?: RedisHealth;
}

interface LockResult<T> {
  success: boolean;
  result: T | null;
  error: Error | null;
}

interface GameDataInput {
  roomName?: string;
  users?: Record<string, unknown>;
  playerScores?: Record<string, number>;
  playerWords?: Record<string, string[]>;
  playerAchievements?: Record<string, string[]>;
  playerWordDetails?: Record<string, unknown[]>;
  firstWordFound?: Record<string, boolean>;
  gameState?: string;
  startTime?: string;
  endTime?: string;
  letterGrid?: string[][];
  timerSeconds?: number;
  language?: string;
  tournamentId?: string;
}

interface TournamentDataInput {
  id?: string;
  hostPlayerId?: string;
  hostUsername?: string;
  name?: string;
  totalRounds?: number;
  currentRound?: number;
  status?: string;
  settings?: Record<string, unknown>;
  players?: unknown[];
  rounds?: unknown[];
  finalStandings?: unknown[];
  createdAt?: string;
}

// ==========================================
// Key Naming Helpers (Consistent Namespace)
// ==========================================

const KEYS = {
  game: (gameCode: string): string => `${REDIS_PREFIX}:${REDIS_VERSION}:game:${gameCode}`,
  tournament: (id: string): string => `${REDIS_PREFIX}:${REDIS_VERSION}:tournament:${id}`,
  wordApproval: (lang: string, word: string): string => `${REDIS_PREFIX}:${REDIS_VERSION}:word:${lang}:${word}`,
  leaderboardTop: (): string => `${REDIS_PREFIX}:${REDIS_VERSION}:lb:top100`,
  leaderboardUser: (userId: string): string => `${REDIS_PREFIX}:${REDIS_VERSION}:lb:user:${userId}`,
  dailyPuzzle: (date: string, language: string): string => `${REDIS_PREFIX}:${REDIS_VERSION}:daily:puzzle:${language}:${date}`,
  dailyLeaderboard: (date: string, language: string, limit: number): string => `${REDIS_PREFIX}:${REDIS_VERSION}:daily:lb:${language}:${date}:${limit}`,
};

// Key patterns for SCAN operations
const KEY_PATTERNS = {
  games: `${REDIS_PREFIX}:${REDIS_VERSION}:game:*`,
  tournaments: `${REDIS_PREFIX}:${REDIS_VERSION}:tournament:*`,
  wordApprovals: (lang: string): string => `${REDIS_PREFIX}:${REDIS_VERSION}:word:${lang}:*`,
  leaderboardUsers: `${REDIS_PREFIX}:${REDIS_VERSION}:lb:user:*`,
};

// ==========================================
// Circuit Breaker Implementation
// ==========================================

class CircuitBreaker {
  private failureCount: number;
  private threshold: number;
  private timeout: number;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  private nextAttempt: number;

  constructor(threshold: number = 5, timeout: number = 30000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED';
    this.nextAttempt = Date.now();
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
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

  onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      logger.info('REDIS', 'Circuit breaker recovered - entering CLOSED state');
    }
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure(): void {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      logger.error('REDIS', `Circuit breaker OPENED after ${this.failureCount} failures. Will retry at ${new Date(this.nextAttempt).toISOString()}`);
    }
  }

  getState(): CircuitBreakerState {
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
  retryStrategy(times: number): number | null {
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

let _redisClient: RedisClient | null = null;
let _isRedisAvailable = false;
let lastHealthCheck = Date.now();
let healthCheckInterval: NodeJS.Timeout | null = null;
let memoryCheckInterval: NodeJS.Timeout | null = null;

const circuitBreaker = new CircuitBreaker();

// Lua script SHA for atomic word approval
let wordApprovalScriptSha: string | null = null;

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

function getTTLWithJitter(baseTTL: number, jitterPercent: number = 10): number {
  const jitter = Math.floor(baseTTL * (jitterPercent / 100));
  return baseTTL + Math.floor(Math.random() * jitter * 2) - jitter;
}

// ==========================================
// Redis Initialization
// ==========================================

async function initRedis(): Promise<boolean> {
  try {
    // Create Redis client based on environment
    if (process.env.REDIS_URL) {
      logger.info('REDIS', 'Connecting using REDIS_URL');
      _redisClient = new Redis(process.env.REDIS_URL, baseRedisConfig);
    } else {
      const host = process.env.REDIS_HOST || process.env.REDISHOST || '127.0.0.1';
      const port = parseInt(process.env.REDIS_PORT || process.env.REDISPORT || '6379');
      const password = process.env.REDIS_PASSWORD || undefined;

      logger.info('REDIS', `Connecting to ${host}:${port}`);
      _redisClient = new Redis({
        ...baseRedisConfig,
        host,
        port,
        password,
      });
    }

    // Event handlers
    _redisClient.on('connect', () => {
      logger.info('REDIS', 'Connected to Redis server');
      _isRedisAvailable = true;
    });

    _redisClient.on('ready', () => {
      logger.info('REDIS', 'Redis client ready');
      _isRedisAvailable = true;
      loadLuaScripts(); // Load Lua scripts when ready
    });

    _redisClient.on('error', (err: Error) => {
      logger.warn('REDIS', `Redis error: ${err.message}`);
      _isRedisAvailable = false;
    });

    _redisClient.on('close', () => {
      logger.debug('REDIS', 'Redis connection closed');
      _isRedisAvailable = false;
    });

    _redisClient.on('reconnecting', (delay: number) => {
      logger.debug('REDIS', `Reconnecting in ${delay}ms`);
    });

    // Connect
    await _redisClient.connect();

    // Test connection
    await _redisClient.ping();
    _isRedisAvailable = true;
    logger.info('REDIS', 'Redis connection test successful');

    // Start health monitoring
    startHealthMonitoring();

    return true;
  } catch (error: unknown) {
    const err = error as Error;
    logger.warn('REDIS', `Could not connect to Redis: ${err.message}`);
    logger.warn('REDIS', 'Application will continue with in-memory storage');
    _isRedisAvailable = false;
    _redisClient = null;
    return false;
  }
}

// Load Lua scripts for atomic operations
async function loadLuaScripts(): Promise<void> {
  if (!_isRedisAvailable || !_redisClient) return;

  try {
    wordApprovalScriptSha = await _redisClient.script('LOAD', WORD_APPROVAL_SCRIPT) as string;
    logger.debug('REDIS', 'Loaded Lua scripts successfully');
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Failed to load Lua scripts: ${err.message}`);
    // Fallback to non-atomic operations will be used
  }
}

// ==========================================
// Health Monitoring
// ==========================================

function startHealthMonitoring(): void {
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

async function healthCheck(): Promise<boolean> {
  if (!_redisClient) return false;

  try {
    const start = Date.now();
    await _redisClient.ping();
    const latency = Date.now() - start;

    if (latency > 100) {
      logger.warn('REDIS', `High latency: ${latency}ms`);
    }

    lastHealthCheck = Date.now();
    _isRedisAvailable = true;
    return true;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Health check failed: ${err.message}`);
    _isRedisAvailable = false;
    return false;
  }
}

async function checkRedisMemory(): Promise<void> {
  if (!_isRedisAvailable || !_redisClient) return;

  try {
    const info = await _redisClient.info('memory');
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function getRedisHealth(): RedisHealth {
  const timeSinceLastCheck = Date.now() - lastHealthCheck;
  return {
    available: _isRedisAvailable,
    lastCheck: lastHealthCheck,
    stale: timeSinceLastCheck > HEALTH_CHECK_INTERVAL * 2,
    circuitBreaker: circuitBreaker.getState(),
  };
}

// ==========================================
// Game State Operations (Using Redis Hashes)
// ==========================================

async function saveGameState(gameCode: string, gameData: GameDataInput): Promise<void> {
  if (!_isRedisAvailable || !_redisClient) {
    return;
  }

  const key = KEYS.game(gameCode);

  // Sanitize data - exclude WebSocket objects
  const sanitizedData: Record<string, string> = {
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
        const pipeline = _redisClient!.pipeline();

        // Use HSET for each field
        for (const [field, value] of Object.entries(sanitizedData)) {
          pipeline.hset(key, field, value);
        }

        // Set TTL with jitter
        pipeline.expire(key, getTTLWithJitter(TTL_CONFIG.GAME_STATE));

        await pipeline.exec();
      });
      return; // Success
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('REDIS', `Error saving game state (attempt ${attempt}/${MAX_RETRY_ATTEMPTS}): ${err.message}`);
      if (attempt === MAX_RETRY_ATTEMPTS) {
        logger.error('REDIS', 'Failed to save game state after all retry attempts');
      } else {
        await new Promise(resolve => setTimeout(resolve, attempt * 100));
      }
    }
  }
}

async function getGameState(gameCode: string): Promise<GameStateData | null> {
  if (!_isRedisAvailable || !_redisClient) {
    return null;
  }

  try {
    const key = KEYS.game(gameCode);
    const data = await circuitBreaker.execute(() => _redisClient!.hgetall(key));

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
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error getting game state: ${err.message}`);
    return null;
  }
}

async function deleteGameState(gameCode: string): Promise<void> {
  if (!_isRedisAvailable || !_redisClient) {
    return;
  }

  try {
    const key = KEYS.game(gameCode);
    await circuitBreaker.execute(() => _redisClient!.del(key));
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error deleting game state: ${err.message}`);
  }
}

async function getAllGameCodes(): Promise<string[]> {
  if (!_isRedisAvailable || !_redisClient) {
    return [];
  }

  try {
    const gameCodes: string[] = [];
    let cursor = '0';
    let iterations = 0;

    do {
      if (iterations++ > MAX_SCAN_ITERATIONS) {
        logger.warn('REDIS', 'SCAN exceeded max iterations, returning partial results');
        break;
      }

      try {
        const result = await circuitBreaker.execute(() =>
          _redisClient!.scan(cursor, 'MATCH', KEY_PATTERNS.games, 'COUNT', SCAN_COUNT)
        );
        cursor = result[0];
        const keys = result[1];

        keys.forEach((key: string) => {
          // Extract game code from key pattern
          const parts = key.split(':');
          if (parts.length >= 4) {
            gameCodes.push(parts[parts.length - 1]);
          }
        });
      } catch (scanError: unknown) {
        const err = scanError as Error;
        logger.error('REDIS', `SCAN iteration failed at cursor ${cursor}: ${err.message}`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } while (cursor !== '0');

    return gameCodes;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error getting game codes: ${err.message}`);
    return [];
  }
}

// ==========================================
// Tournament State Operations
// ==========================================

async function saveTournamentState(tournamentId: string, tournamentData: TournamentDataInput): Promise<void> {
  if (!_isRedisAvailable || !_redisClient) {
    return;
  }

  const key = KEYS.tournament(tournamentId);

  const sanitizedData: Record<string, string> = {
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
        const pipeline = _redisClient!.pipeline();

        for (const [field, value] of Object.entries(sanitizedData)) {
          pipeline.hset(key, field, value);
        }

        pipeline.expire(key, getTTLWithJitter(TTL_CONFIG.TOURNAMENT));

        await pipeline.exec();
      });
      return;
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('REDIS', `Error saving tournament state (attempt ${attempt}/${MAX_RETRY_ATTEMPTS}): ${err.message}`);
      if (attempt < MAX_RETRY_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, attempt * 100));
      }
    }
  }
}

async function getTournamentState(tournamentId: string): Promise<TournamentStateData | null> {
  if (!_isRedisAvailable || !_redisClient) {
    return null;
  }

  try {
    const key = KEYS.tournament(tournamentId);
    const data = await circuitBreaker.execute(() => _redisClient!.hgetall(key));

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
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error getting tournament state: ${err.message}`);
    return null;
  }
}

async function deleteTournamentState(tournamentId: string): Promise<void> {
  if (!_isRedisAvailable || !_redisClient) {
    return;
  }

  try {
    const key = KEYS.tournament(tournamentId);
    await circuitBreaker.execute(() => _redisClient!.del(key));
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error deleting tournament state: ${err.message}`);
  }
}

async function getAllTournamentIds(): Promise<string[]> {
  if (!_isRedisAvailable || !_redisClient) {
    return [];
  }

  try {
    const tournamentIds: string[] = [];
    let cursor = '0';
    let iterations = 0;

    do {
      if (iterations++ > MAX_SCAN_ITERATIONS) {
        logger.warn('REDIS', 'SCAN exceeded max iterations for tournaments');
        break;
      }

      const result = await circuitBreaker.execute(() =>
        _redisClient!.scan(cursor, 'MATCH', KEY_PATTERNS.tournaments, 'COUNT', SCAN_COUNT)
      );
      cursor = result[0];
      const keys = result[1];

      keys.forEach((key: string) => {
        const parts = key.split(':');
        if (parts.length >= 4) {
          tournamentIds.push(parts[parts.length - 1]);
        }
      });
    } while (cursor !== '0');

    return tournamentIds;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error getting tournament IDs: ${err.message}`);
    return [];
  }
}

// ==========================================
// Word Approval Tracking (Atomic with Lua Script)
// ==========================================

async function getWordApprovalStatus(word: string, language: string): Promise<WordApprovalData | null> {
  if (!_isRedisAvailable || !_redisClient) {
    return null;
  }

  try {
    const key = KEYS.wordApproval(language, word);
    const data = await circuitBreaker.execute(() => _redisClient!.get(key));
    return data ? JSON.parse(data) : null;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error getting word approval status: ${err.message}`);
    return null;
  }
}

async function incrementWordApproval(word: string, language: string, gameId: string): Promise<WordApprovalData | null> {
  if (!_isRedisAvailable || !_redisClient) {
    return null;
  }

  const key = KEYS.wordApproval(language, word);
  const now = new Date().toISOString();

  // Try Lua script first (atomic)
  if (wordApprovalScriptSha) {
    try {
      const result = await circuitBreaker.execute(() =>
        _redisClient!.evalsha(wordApprovalScriptSha!, 1, key, gameId, now)
      );
      return JSON.parse(result as string);
    } catch (error: unknown) {
      const err = error as Error;
      // If script not found (NOSCRIPT), reload it
      if (err.message.includes('NOSCRIPT')) {
        await loadLuaScripts();
      }
      logger.warn('REDIS', `Lua script failed, falling back to WATCH/MULTI: ${err.message}`);
    }
  }

  // Fallback to WATCH/MULTI for atomic operation
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await _redisClient.watch(key);

      const existing = await _redisClient.get(key);
      let approvalData: WordApprovalData;

      if (existing) {
        approvalData = JSON.parse(existing);
        if (approvalData.gameIds.includes(gameId)) {
          await _redisClient.unwatch();
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
      const result = await _redisClient
        .multi()
        .set(key, JSON.stringify(approvalData))
        .exec();

      if (result === null) {
        // Transaction failed, retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 10 * Math.pow(2, attempt)));
        continue;
      }

      return approvalData;
    } catch (error: unknown) {
      const err = error as Error;
      await _redisClient.unwatch();
      logger.error('REDIS', `Error incrementing word approval: ${err.message}`);
      if (attempt === maxRetries - 1) {
        return null;
      }
    }
  }

  return null;
}

async function getApprovedWords(language: string, minApprovals: number = 2): Promise<string[]> {
  if (!_isRedisAvailable || !_redisClient) {
    return [];
  }

  try {
    const approvedWords: string[] = [];
    let cursor = '0';
    let iterations = 0;

    do {
      if (iterations++ > MAX_SCAN_ITERATIONS) {
        logger.warn('REDIS', 'SCAN exceeded max iterations for approved words');
        break;
      }

      const result = await circuitBreaker.execute(() =>
        _redisClient!.scan(cursor, 'MATCH', KEY_PATTERNS.wordApprovals(language), 'COUNT', PIPELINE_BATCH_SIZE)
      );
      cursor = result[0];
      const keys = result[1];

      if (keys.length > 0) {
        // Process in batches
        for (let i = 0; i < keys.length; i += PIPELINE_BATCH_SIZE) {
          const batch = keys.slice(i, i + PIPELINE_BATCH_SIZE);
          const pipeline = _redisClient!.pipeline();

          batch.forEach((key: string) => pipeline.get(key));

          const results = await pipeline.exec();
          if (results) {
            results.forEach((result, idx: number) => {
              const [err, data] = result as [Error | null, string | null];
              if (err) {
                logger.error('REDIS', `Pipeline error for key ${batch[idx]}: ${err.message}`);
                return;
              }
              if (data) {
                try {
                  const approvalData = JSON.parse(data) as WordApprovalData;
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
      }
    } while (cursor !== '0');

    return approvedWords;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error getting approved words: ${err.message}`);
    return [];
  }
}

// ==========================================
// Leaderboard Caching
// ==========================================

async function getCachedLeaderboardTop100(): Promise<unknown[] | null> {
  if (!_isRedisAvailable || !_redisClient) {
    return null;
  }

  try {
    const data = await circuitBreaker.execute(() => _redisClient!.get(KEYS.leaderboardTop()));
    return data ? JSON.parse(data) : null;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error getting cached leaderboard: ${err.message}`);
    return null;
  }
}

async function cacheLeaderboardTop100(leaderboard: unknown[]): Promise<void> {
  if (!_isRedisAvailable || !_redisClient) {
    return;
  }

  try {
    await circuitBreaker.execute(() =>
      _redisClient!.setex(
        KEYS.leaderboardTop(),
        getTTLWithJitter(TTL_CONFIG.LEADERBOARD_TOP),
        JSON.stringify(leaderboard)
      )
    );
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error caching leaderboard: ${err.message}`);
  }
}

async function getCachedUserRank(userId: string): Promise<unknown | null> {
  if (!_isRedisAvailable || !_redisClient) {
    return null;
  }

  try {
    const data = await circuitBreaker.execute(() => _redisClient!.get(KEYS.leaderboardUser(userId)));
    return data ? JSON.parse(data) : null;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error getting cached user rank: ${err.message}`);
    return null;
  }
}

async function cacheUserRank(userId: string, rankData: unknown): Promise<void> {
  if (!_isRedisAvailable || !_redisClient) {
    return;
  }

  try {
    await circuitBreaker.execute(() =>
      _redisClient!.setex(
        KEYS.leaderboardUser(userId),
        getTTLWithJitter(TTL_CONFIG.LEADERBOARD_USER),
        JSON.stringify(rankData)
      )
    );
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error caching user rank: ${err.message}`);
  }
}

async function getCachedDailyPuzzle(date: string, language: string): Promise<unknown | null> {
  if (!_isRedisAvailable || !_redisClient) {
    return null;
  }

  try {
    const data = await circuitBreaker.execute(() => _redisClient!.get(KEYS.dailyPuzzle(date, language)));
    return data ? JSON.parse(data) : null;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error getting cached daily puzzle: ${err.message}`);
    return null;
  }
}

async function cacheDailyPuzzle(date: string, language: string, puzzle: unknown): Promise<void> {
  if (!_isRedisAvailable || !_redisClient) {
    return;
  }

  try {
    await circuitBreaker.execute(() =>
      _redisClient!.setex(
        KEYS.dailyPuzzle(date, language),
        getTTLWithJitter(TTL_CONFIG.DAILY_PUZZLE),
        JSON.stringify(puzzle)
      )
    );
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error caching daily puzzle: ${err.message}`);
  }
}

async function getCachedDailyLeaderboard(date: string, language: string, limit: number): Promise<unknown | null> {
  if (!_isRedisAvailable || !_redisClient) {
    return null;
  }

  try {
    const data = await circuitBreaker.execute(() => _redisClient!.get(KEYS.dailyLeaderboard(date, language, limit)));
    return data ? JSON.parse(data) : null;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error getting cached daily leaderboard: ${err.message}`);
    return null;
  }
}

async function cacheDailyLeaderboard(date: string, language: string, limit: number, leaderboard: unknown): Promise<void> {
  if (!_isRedisAvailable || !_redisClient) {
    return;
  }

  try {
    await circuitBreaker.execute(() =>
      _redisClient!.setex(
        KEYS.dailyLeaderboard(date, language, limit),
        getTTLWithJitter(TTL_CONFIG.DAILY_LEADERBOARD),
        JSON.stringify(leaderboard)
      )
    );
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error caching daily leaderboard: ${err.message}`);
  }
}

async function invalidateLeaderboardCaches(): Promise<void> {
  if (!_isRedisAvailable || !_redisClient) {
    return;
  }

  try {
    // Delete top 100 cache
    await circuitBreaker.execute(() => _redisClient!.del(KEYS.leaderboardTop()));

    // Delete all user rank caches using SCAN
    let cursor = '0';
    let iterations = 0;

    do {
      if (iterations++ > MAX_SCAN_ITERATIONS) break;

      const result = await _redisClient.scan(cursor, 'MATCH', KEY_PATTERNS.leaderboardUsers, 'COUNT', SCAN_COUNT);
      cursor = result[0];
      const keys = result[1];

      if (keys.length > 0) {
        await _redisClient.del(...keys);
      }
    } while (cursor !== '0');

    logger.debug('REDIS', 'Leaderboard caches invalidated');
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error invalidating leaderboard caches: ${err.message}`);
  }
}

// ==========================================
// Redis Metrics for Monitoring
// ==========================================

async function getRedisMetrics(): Promise<RedisMetrics> {
  if (!_isRedisAvailable || !_redisClient) {
    return {
      available: false,
      error: 'Redis not available',
    };
  }

  try {
    const info = await _redisClient.info();
    const dbSize = await _redisClient.dbsize();

    // Parse info string
    const usedMemoryMatch = info.match(/used_memory:(\d+)/);
    const connectedClientsMatch = info.match(/connected_clients:(\d+)/);
    const totalCommandsMatch = info.match(/total_commands_processed:(\d+)/);
    const hitRateMatch = info.match(/keyspace_hits:(\d+)/);
    const missRateMatch = info.match(/keyspace_misses:(\d+)/);

    const hits = parseInt(hitRateMatch?.[1] || '0');
    const misses = parseInt(missRateMatch?.[1] || '0');
    const hitRate = hits + misses > 0 ? (hits / (hits + misses) * 100).toFixed(2) : '0';

    return {
      available: true,
      keyCount: dbSize,
      usedMemory: parseInt(usedMemoryMatch?.[1] || '0'),
      usedMemoryHuman: formatBytes(parseInt(usedMemoryMatch?.[1] || '0')),
      connectedClients: parseInt(connectedClientsMatch?.[1] || '0'),
      totalCommands: parseInt(totalCommandsMatch?.[1] || '0'),
      hitRate: `${hitRate}%`,
      circuitBreaker: circuitBreaker.getState(),
      health: getRedisHealth(),
    };
  } catch (error: unknown) {
    const err = error as Error;
    return {
      available: false,
      error: err.message,
    };
  }
}

// ==========================================
// Distributed Locking for Game State Mutations
// ==========================================

const LOCK_PREFIX = `${REDIS_PREFIX}:${REDIS_VERSION}:lock`;
const DEFAULT_LOCK_TTL = 10000; // 10 seconds
const LOCK_RETRY_DELAY = 50; // 50ms between retries
const MAX_LOCK_RETRIES = 20; // Max 20 retries (1 second total)

/**
 * Acquire a distributed lock for a game
 * Uses Redis SET NX PX pattern (Redlock single-instance)
 */
async function acquireGameLock(gameCode: string, lockId: string, ttlMs: number = DEFAULT_LOCK_TTL): Promise<boolean> {
  if (!_isRedisAvailable || !_redisClient) {
    // In single-instance mode without Redis, always succeed
    return true;
  }

  const lockKey = `${LOCK_PREFIX}:game:${gameCode}`;

  for (let attempt = 0; attempt < MAX_LOCK_RETRIES; attempt++) {
    try {
      // SET key value NX PX milliseconds
      // NX = only set if key doesn't exist
      // PX = set expiry in milliseconds
      const result = await circuitBreaker.execute(() =>
        _redisClient!.set(lockKey, lockId, 'PX', ttlMs, 'NX')
      );

      if (result === 'OK') {
        logger.debug('LOCK', `Acquired lock for game ${gameCode} (holder: ${lockId.substring(0, 8)})`);
        return true;
      }

      // Lock not acquired, wait and retry
      await new Promise(resolve => setTimeout(resolve, LOCK_RETRY_DELAY));
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('LOCK', `Error acquiring lock for game ${gameCode}: ${err.message}`);
      return false;
    }
  }

  logger.warn('LOCK', `Failed to acquire lock for game ${gameCode} after ${MAX_LOCK_RETRIES} attempts`);
  return false;
}

/**
 * Release a distributed lock for a game
 * Only releases if the lock is held by the specified lockId
 */
async function releaseGameLock(gameCode: string, lockId: string): Promise<boolean> {
  if (!_isRedisAvailable || !_redisClient) {
    return true;
  }

  const lockKey = `${LOCK_PREFIX}:game:${gameCode}`;

  // Lua script to atomically check and delete
  // Only delete if the value matches our lockId
  const releaseScript = `
    if redis.call('GET', KEYS[1]) == ARGV[1] then
      return redis.call('DEL', KEYS[1])
    else
      return 0
    end
  `;

  try {
    const result = await circuitBreaker.execute(() =>
      _redisClient!.eval(releaseScript, 1, lockKey, lockId)
    );

    if (result === 1) {
      logger.debug('LOCK', `Released lock for game ${gameCode} (holder: ${lockId.substring(0, 8)})`);
      return true;
    } else {
      logger.debug('LOCK', `Lock for game ${gameCode} not held by ${lockId.substring(0, 8)} (or already expired)`);
      return false;
    }
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('LOCK', `Error releasing lock for game ${gameCode}: ${err.message}`);
    return false;
  }
}

/**
 * Extend a lock's TTL
 * Useful for long-running operations
 */
async function extendGameLock(gameCode: string, lockId: string, ttlMs: number = DEFAULT_LOCK_TTL): Promise<boolean> {
  if (!_isRedisAvailable || !_redisClient) {
    return true;
  }

  const lockKey = `${LOCK_PREFIX}:game:${gameCode}`;

  // Lua script to atomically check and extend
  const extendScript = `
    if redis.call('GET', KEYS[1]) == ARGV[1] then
      return redis.call('PEXPIRE', KEYS[1], ARGV[2])
    else
      return 0
    end
  `;

  try {
    const result = await circuitBreaker.execute(() =>
      _redisClient!.eval(extendScript, 1, lockKey, lockId, ttlMs)
    );

    return result === 1;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('LOCK', `Error extending lock for game ${gameCode}: ${err.message}`);
    return false;
  }
}

/**
 * Execute a function with a distributed lock
 * Automatically acquires lock before execution and releases after
 */
async function withGameLock<T>(
  gameCode: string,
  lockId: string,
  fn: () => Promise<T>,
  ttlMs: number = DEFAULT_LOCK_TTL
): Promise<LockResult<T>> {
  const acquired = await acquireGameLock(gameCode, lockId, ttlMs);

  if (!acquired) {
    return {
      success: false,
      result: null,
      error: new Error(`Failed to acquire lock for game ${gameCode}`),
    };
  }

  try {
    const result = await fn();
    return { success: true, result, error: null };
  } catch (error) {
    return { success: false, result: null, error: error as Error };
  } finally {
    await releaseGameLock(gameCode, lockId);
  }
}

/**
 * Check if a lock exists for a game
 */
async function getGameLockHolder(gameCode: string): Promise<string | null> {
  if (!_isRedisAvailable || !_redisClient) {
    return null;
  }

  const lockKey = `${LOCK_PREFIX}:game:${gameCode}`;

  try {
    return await circuitBreaker.execute(() => _redisClient!.get(lockKey));
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('LOCK', `Error checking lock for game ${gameCode}: ${err.message}`);
    return null;
  }
}

// ==========================================
// Connection Management
// ==========================================

async function closeRedis(): Promise<void> {
  // Clear intervals
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
  if (memoryCheckInterval) {
    clearInterval(memoryCheckInterval);
    memoryCheckInterval = null;
  }

  if (_redisClient) {
    try {
      await _redisClient.quit();
      logger.info('REDIS', 'Redis connection closed');
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('REDIS', `Error closing connection: ${err.message}`);
    }
    _redisClient = null;
    _isRedisAvailable = false;
  }
}

// Create pub/sub clients for Socket.IO adapter (reuses base config)
function createPubSubClients(): { pubClient: RedisClient; subClient: RedisClient } | null {
  if (!_redisClient) {
    return null;
  }

  try {
    // Duplicate the main client for pub/sub
    const pubClient = _redisClient.duplicate();
    const subClient = _redisClient.duplicate();

    // Add error handlers to prevent "missing 'error' handler" warnings
    // These clients are used by Socket.IO adapter and need their own error handling
    pubClient.on('error', (err: Error) => {
      logger.warn('REDIS', `Pub client error: ${err.message}`);
    });

    subClient.on('error', (err: Error) => {
      logger.warn('REDIS', `Sub client error: ${err.message}`);
    });

    return { pubClient, subClient };
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Failed to create pub/sub clients: ${err.message}`);
    return null;
  }
}

// ==========================================
// Module Exports
// ==========================================

// Named exports for TypeScript compatibility
export {
  // Initialization
  initRedis,
  closeRedis,
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
  getCachedDailyPuzzle,
  cacheDailyPuzzle,
  getCachedDailyLeaderboard,
  cacheDailyLeaderboard,

  // Health and monitoring
  healthCheck,
  getRedisHealth,
  getRedisMetrics,

  // Distributed locking
  acquireGameLock,
  releaseGameLock,
  extendGameLock,
  withGameLock,
  getGameLockHolder,

  // Configuration exports (for external use)
  TTL_CONFIG,
  KEYS,
};

// Connection info exports as functions (aliased to avoid conflict with local variables)
export const isRedisAvailable = (): boolean => _isRedisAvailable;
export const getRedisClient = (): RedisClient | null => _redisClient;

// CommonJS exports for backward compatibility
module.exports = {
  // Initialization
  initRedis,
  closeRedis,

  // Connection info
  isRedisAvailable: (): boolean => _isRedisAvailable,
  getRedisClient: (): RedisClient | null => _redisClient,
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
  getCachedDailyPuzzle,
  cacheDailyPuzzle,
  getCachedDailyLeaderboard,
  cacheDailyLeaderboard,

  // Health and monitoring
  healthCheck,
  getRedisHealth,
  getRedisMetrics,

  // Distributed locking
  acquireGameLock,
  releaseGameLock,
  extendGameLock,
  withGameLock,
  getGameLockHolder,

  // Configuration exports (for external use)
  TTL_CONFIG,
  KEYS,
};
