/**
 * Central Type Export File
 * Re-exports all type definitions for easy importing
 *
 * CONSOLIDATED: Core game and socket types now come from shared/types/
 * Frontend-specific types (user, api) remain in this directory
 */

// ==================== Shared Types (Game & Socket) ====================
// These are the canonical type definitions shared between frontend and backend
export * from '../shared/types/game';
export * from '../shared/types/socket';

// ==================== Frontend-Specific Types ====================

// User types (frontend auth context)
export type {
  Session,
  AuthUser,
  GuestUser,
  UserProfile,
  UserStats,
  Achievement,
  Leaderboard,
  // Note: LeaderboardEntry is now in shared/types/game.ts
} from './user';

// Component prop types
export type {
  JoinViewProps,
  JoinMode,
  ResultsPageProps,
  PlayerResult,
  WordToVote,
  XpGainedData,
  LevelUpData,
  GridPosition,
} from './components';

// Adventure mode types
export type {
  TileType,
  TileState,
  SpecialTile,
  ObjectiveType,
  LevelObjective,
  LevelConfig,
  LevelCompletion,
  PlayerProgression,
  AdventureGameState,
  WorldName,
} from './adventure';
export { WORLD_NAMES } from './adventure';

// ==================== Re-exports for backwards compatibility ====================
// These aliases ensure existing imports continue to work

// Re-export User type with an alias since shared/types uses GameUser
export type { GameUser as User } from '../shared/types/game';
