// redisClient.ts - Facade that re-exports from modular redis/ directory
// This file maintains backward compatibility for existing imports

// Re-export all named exports from the redis module
export {
  // Configuration
  KEYS,
  TTL_CONFIG,

  // Connection management
  closeRedis,
  createPubSubClients,
  getRedisClient,
  getRedisHealth,
  getRedisMetrics,
  healthCheck,
  initRedis,
  isRedisAvailable,

  // Game state operations
  deleteGameState,
  getAllGameCodes,
  getGameState,
  saveGameState,

  // Tournament operations
  deleteTournamentState,
  getAllTournamentIds,
  getTournamentState,
  saveTournamentState,

  // Word approval tracking
  getApprovedWords,
  getWordApprovalStatus,
  incrementWordApproval,

  // Leaderboard caching
  cacheLeaderboardTop100,
  cacheUserRank,
  getCachedLeaderboardTop100,
  getCachedUserRank,
  invalidateLeaderboardCaches,
  invalidateUserLeaderboardCaches,

  // Daily puzzle caching
  cacheDailyLeaderboard,
  cacheDailyPuzzle,
  getCachedDailyLeaderboard,
  getCachedDailyPuzzle,

  // Distributed locking
  acquireGameLock,
  extendGameLock,
  getGameLockHolder,
  releaseGameLock,
  withGameLock,
} from './redis';

// Re-export types
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
} from './redis';

