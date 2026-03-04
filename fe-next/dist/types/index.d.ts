/**
 * Central Type Export File
 * Re-exports all type definitions for easy importing
 *
 * CONSOLIDATED: Core game and socket types now come from shared/types/
 * Frontend-specific types (user, api) remain in this directory
 */
export * from '../shared/types/game';
export * from '../shared/types/socket';
export type { Session, AuthUser, GuestUser, UserProfile, UserStats, Achievement, Leaderboard, } from './user';
export type { ApiResponse, ApiError, PaginatedResponse, CreateGameResponse, JoinGameResponse, GetProfileResponse, GetLeaderboardResponse, GetActiveRoomsResponse, ValidateWordResponse, } from './api';
export type { JoinViewProps, JoinMode, ResultsPageProps, PlayerResult, WordToVote, XpGainedData, LevelUpData, GridPosition, } from './components';
export type { GameUser as User } from '../shared/types/game';
