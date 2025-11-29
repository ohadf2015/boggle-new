/**
 * API Response Type Definitions
 */

import type { UserProfile, Leaderboard } from './user';
import type { Game, ActiveRoom } from './game';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Specific API Response Types
export interface CreateGameResponse {
  gameCode: string;
  game: Game;
}

export interface JoinGameResponse {
  game: Game;
  username: string;
}

export interface GetProfileResponse {
  profile: UserProfile;
}

export interface GetLeaderboardResponse {
  leaderboard: Leaderboard;
}

export interface GetActiveRoomsResponse {
  rooms: ActiveRoom[];
}

export interface ValidateWordResponse {
  isValid: boolean;
  word: string;
  exists: boolean;
  onBoard: boolean;
  points?: number;
}
