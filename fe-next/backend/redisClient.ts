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

// Import for CommonJS exports
import {
  acquireGameLock,
  cacheDailyLeaderboard,
  cacheDailyPuzzle,
  cacheLeaderboardTop100,
  cacheUserRank,
  closeRedis,
  createPubSubClients,
  deleteGameState,
  deleteTournamentState,
  extendGameLock,
  getAllGameCodes,
  getAllTournamentIds,
  getApprovedWords,
  getCachedDailyLeaderboard,
  getCachedDailyPuzzle,
  getCachedLeaderboardTop100,
  getCachedUserRank,
  getGameLockHolder,
  getGameState,
  getRedisClient,
  getRedisHealth,
  getRedisMetrics,
  getTournamentState,
  getWordApprovalStatus,
  healthCheck,
  incrementWordApproval,
  initRedis,
  invalidateLeaderboardCaches,
  invalidateUserLeaderboardCaches,
  isRedisAvailable,
  KEYS,
  releaseGameLock,
  saveGameState,
  saveTournamentState,
  TTL_CONFIG,
  withGameLock,
} from './redis';

// CommonJS exports for backward compatibility
module.exports = {
  // Configuration
  TTL_CONFIG,
  KEYS,

  // Connection management
  initRedis,
  closeRedis,
  isRedisAvailable,
  getRedisClient,
  createPubSubClients,
  healthCheck,
  getRedisHealth,
  getRedisMetrics,

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
  invalidateUserLeaderboardCaches,

  // Daily puzzle caching
  getCachedDailyPuzzle,
  cacheDailyPuzzle,
  getCachedDailyLeaderboard,
  cacheDailyLeaderboard,

  // Distributed locking
  acquireGameLock,
  releaseGameLock,
  extendGameLock,
  withGameLock,
  getGameLockHolder,
};
