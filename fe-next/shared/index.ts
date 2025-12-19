/**
 * Shared Module Index
 * Central export for all shared code between frontend and backend
 */

// Type definitions (primary source for runtime types)
export * from './types';

// Socket event constants
export * from './constants/socketEvents';

// Game configuration constants - explicitly export to avoid conflicts with types
export {
  // Difficulty settings
  DIFFICULTIES,
  DEFAULT_DIFFICULTY,
  type DifficultyConfig,
  type DifficultySettings,

  // Timer settings
  DIFFICULTY_TIMERS,
  DEFAULT_TIMER,
  MIN_TIMER,
  MAX_TIMER,
  getRecommendedTimer,

  // Word length settings
  MIN_WORD_LENGTH_OPTIONS,
  DEFAULT_MIN_WORD_LENGTH,
  MIN_WORD_LENGTH,
  MAX_WORD_LENGTH,

  // Room settings
  MAX_PLAYERS_PER_ROOM,
  MAX_ROOM_NAME_LENGTH,
  ROOM_CODE_LENGTH,

  // Avatar constants
  AVATAR_COLORS,
  AVATAR_EMOJIS,
  generateRandomAvatar,

  // Scoring
  WORD_SCORES,
  calculateWordScore,
  POINT_COLORS,
  getPointColor,

  // Connection constants
  HEARTBEAT_INTERVAL_MS,
  PRESENCE_TIMEOUT_MS,
  RECONNECTION_TIMEOUT_MS,
  STALE_GAME_TIMEOUT_MS,
} from './constants/gameConstants';

// Validation schemas - explicitly export to avoid conflicts with types
export {
  // Base schemas
  LanguageSchema,
  AvatarSchema,
  GameCodeSchema,
  UsernameSchema,
  WordSchema,
  GridPositionSchema,
  DifficultySchema,
  BotDifficultySchema,
  PresenceStatusSchema,

  // Event schemas
  CreateGameSchema,
  JoinGameSchema,
  LeaveRoomSchema,
  StartGameSchema,
  StartGameAckSchema,
  SubmitWordSchema,
  SubmitWordVoteSchema,
  SubmitPeerValidationVoteSchema,
  ChatMessageSchema,
  AddBotSchema,
  RemoveBotSchema,
  HeartbeatSchema,
  PresenceUpdateSchema,
  WindowFocusChangeSchema,
  KickPlayerSchema,
  TransferHostSchema,
  CreateTournamentSchema,
  GetWordsForBoardSchema,
  ResetGameSchema,
  CloseRoomSchema,
  ReconnectSchema,
  UpdateGameSettingsSchema,
  BroadcastShufflingGridSchema,

  // Schema map and utilities
  ClientEventSchemas,
  validatePayload,
  validateSocketEvent,
  safeValidateSocketEvent,
  getEventSchema,

  // Data types (from schema inference) - renamed to avoid conflicts
  type CreateGameData,
  type JoinGameData,
  type LeaveRoomData,
  type StartGameData,
  type SubmitWordData,
  type ChatMessageData,
  type AddBotData,
  type RemoveBotData,
  type HeartbeatData,
  type PresenceUpdateData,
  type KickPlayerData,
  type TransferHostData,
  type CreateTournamentData,
  type ReconnectData,
  type ClientEventName,
} from './schemas/socketSchemas';

// Re-export schema-inferred types with "Schema" suffix to avoid conflicts
export type {
  BotDifficulty as BotDifficultyType,
  Difficulty as DifficultySchemaType,
} from './schemas/socketSchemas';
