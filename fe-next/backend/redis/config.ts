// config.ts - Redis configuration constants

export const REDIS_PREFIX = process.env.REDIS_PREFIX || 'lexiclash';
export const REDIS_VERSION = 'v1';

// TTL Configuration (seconds)
// These values were tuned based on performance testing to balance freshness vs DB load
export const TTL_CONFIG = {
  GAME_STATE: parseInt(process.env.REDIS_GAME_TTL || '3600'),           // 1 hour
  TOURNAMENT: parseInt(process.env.REDIS_TOURNAMENT_TTL || '10800'),    // 3 hours
  LEADERBOARD_TOP: parseInt(process.env.REDIS_LEADERBOARD_TTL || '900'), // 15 minutes (was 5 - 66% reduction in DB queries)
  LEADERBOARD_USER: 120,                                                // 2 minutes (was 1 minute)
  DAILY_PUZZLE: parseInt(process.env.REDIS_DAILY_PUZZLE_TTL || '86400'),
  DAILY_LEADERBOARD: parseInt(process.env.REDIS_DAILY_LEADERBOARD_TTL || '60'),
  USER_PROFILE: 300,                                                    // 5 minutes - balances freshness with DB load
  FRIENDSHIP_STATUS: 120,                                               // 2 minutes - changes via accept/decline
};

// Performance Configuration
export const MAX_RETRY_ATTEMPTS = 3;
export const PIPELINE_BATCH_SIZE = 500;
export const SCAN_COUNT = 100;
export const MAX_SCAN_ITERATIONS = 1000;
export const HEALTH_CHECK_INTERVAL = 30000;      // 30 seconds - frequent enough to detect issues, not too aggressive
export const MEMORY_CHECK_INTERVAL = 60000;      // 1 minute - memory checks are more expensive
export const MEMORY_WARNING_THRESHOLD = 80;      // percentage - triggers warning log when Redis memory exceeds this

// Lock Configuration
export const LOCK_PREFIX = `${REDIS_PREFIX}:${REDIS_VERSION}:lock`;
export const DEFAULT_LOCK_TTL = 10000; // 10 seconds
export const LOCK_RETRY_DELAY = 50; // 50ms between retries
export const MAX_LOCK_RETRIES = 20; // Max 20 retries (1 second total)

// Word Approval Configuration
export const MAX_WORD_APPROVAL_GAME_IDS = 50; // Cap gameIds array to prevent unbounded growth

// Redis Connection Configuration
export const baseRedisConfig = {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  keepAlive: 30000,
  connectTimeout: 5000,
  commandTimeout: 3000,
  lazyConnect: true,
  autoResubscribe: true,
  autoResendUnfulfilledCommands: true,
};

/**
 * Add jitter to TTL to prevent thundering herd
 */
export function getTTLWithJitter(baseTTL: number, jitterPercent: number = 10): number {
  const jitter = Math.floor(baseTTL * (jitterPercent / 100));
  return baseTTL + Math.floor(Math.random() * jitter * 2) - jitter;
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}
