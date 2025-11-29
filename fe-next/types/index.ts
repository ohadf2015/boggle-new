/**
 * Central Type Export File
 * Re-exports all type definitions for easy importing
 */

// Game types
export type {
  Language,
  GameState,
  DifficultyLevel,
  Difficulty,
  DifficultySettings,
  LetterGrid,
  GridPosition,
  Avatar,
  User,
  WordSubmission,
  PlayerScore,
  Game,
  ActiveRoom,
  MinWordLengthOption,
} from './game';

// Socket types
export type {
  SocketAction,
  BaseSocketMessage,
  CreateGameMessage,
  JoinGameMessage,
  StartGameMessage,
  EndGameMessage,
  CloseRoomMessage,
  ResetGameMessage,
  SubmitWordMessage,
  SendAnswerMessage,
  ValidateWordsMessage,
  GetActiveRoomsMessage,
  ChatMessage,
  HeartbeatMessage,
  UpdatePresenceMessage,
  SocketMessage,
  UpdateUsersEvent,
  GameStartedEvent,
  WordSubmittedEvent,
  GameOverEvent,
  ScoresEvent,
  ActiveRoomsEvent,
  AchievementUnlockedEvent,
  ErrorEvent,
  PresenceUpdateEvent,
} from './socket';

// User types
export type {
  Session,
  AuthUser,
  GuestUser,
  UserProfile,
  UserStats,
  Achievement,
  Leaderboard,
  LeaderboardEntry,
} from './user';

// API types
export type {
  ApiResponse,
  ApiError,
  PaginatedResponse,
  CreateGameResponse,
  JoinGameResponse,
  GetProfileResponse,
  GetLeaderboardResponse,
  GetActiveRoomsResponse,
  ValidateWordResponse,
} from './api';
