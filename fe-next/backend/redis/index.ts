// index.ts - Barrel exports for Redis module

// Types
export type {
  CircuitBreakerState,
  GameDataInput,
  GameStateData,
  LockResult,
  RedisClient,
  RedisHealth,
  RedisMetrics,
  TournamentDataInput,
  TournamentStateData,
  WordApprovalData,
} from './types';

// Configuration
export { formatBytes, getTTLWithJitter, TTL_CONFIG } from './config';

// Key helpers
export { KEY_PATTERNS, KEYS } from './keys';

// Circuit Breaker
export { CircuitBreaker, circuitBreaker } from './circuitBreaker';

// Connection management
export {
  closeRedis,
  createPubSubClients,
  getRedisClient,
  getRedisHealth,
  getRedisMetrics,
  healthCheck,
  initRedis,
  isRedisAvailable,
} from './connection';

// Game state operations
export {
  deleteGameState,
  getAllGameCodes,
  getGameState,
  saveGameState,
} from './gameState';

// Tournament operations
export {
  deleteTournamentState,
  getAllTournamentIds,
  getTournamentState,
  saveTournamentState,
} from './tournament';

// Word approval tracking
export {
  getApprovedWords,
  getWordApprovalStatus,
  incrementWordApproval,
} from './wordApproval';

// Leaderboard caching
export {
  cacheLeaderboardTop100,
  cacheUserRank,
  getCachedLeaderboardTop100,
  getCachedUserRank,
  invalidateLeaderboardCaches,
  invalidateUserLeaderboardCaches,
} from './leaderboard';

// Daily puzzle caching
export {
  cacheDailyLeaderboard,
  cacheDailyPuzzle,
  getCachedDailyLeaderboard,
  getCachedDailyPuzzle,
  invalidateDailyPuzzleCache,
} from './dailyPuzzle';

// Distributed locking
export {
  acquireGameLock,
  extendGameLock,
  getGameLockHolder,
  releaseGameLock,
  withGameLock,
} from './locking';

// User profile caching
export {
  cacheUserProfile,
  cacheUserProfiles,
  getCachedUserProfile,
  getCachedUserProfiles,
  invalidateUserProfile,
  invalidateUserProfiles,
} from './userProfile';
export type { CachedUserProfile } from './userProfile';

// Friendship status caching
export {
  cacheFriendshipStatus,
  getCachedFriendshipStatus,
  invalidateFriendshipStatus,
} from './friendship';

// Distributed rate limiting
export {
  blockIpRedis,
  checkRateLimitRedis,
  clearRateLimitRedis,
  getRateLimitStatsRedis,
  isIpBlockedRedis,
  RATE_LIMIT_KEYS,
  unblockIpRedis,
} from './rateLimit';
