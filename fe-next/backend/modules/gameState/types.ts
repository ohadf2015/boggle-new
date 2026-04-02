/**
 * Game State Types
 * Centralized type definitions for game state management
 */

import type { LetterGrid, Language, GameMode, BlastModeState as SharedBlastModeState, WordHuntModeState as SharedWordHuntModeState } from '@/shared/types/game';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

// Redis client interface
export interface RedisClient {
  saveGameState: (gameCode: string, state: GameState) => Promise<void>;
  getGameState: (gameCode: string) => Promise<GameState | null>;
  deleteGameState?: (gameCode: string) => Promise<void>;
  getAllGameKeys?: () => Promise<string[]>;
}

// Game user interface
export interface GameUser {
  socketId: string;
  username?: string; // Optional - typically the key in Record<string, GameUser>
  avatar: { avatarImage?: string; customAvatar?: CustomAvatarConfig; emoji?: string; color?: string } | null;
  isHost: boolean;
  authUserId: string | null;
  guestTokenHash: string | null;
  guestSessionId?: string | null;
  isBot?: boolean;
  botDifficulty?: string;
  disconnected?: boolean;
  disconnectedAt?: number;
  presence?: 'active' | 'idle' | 'afk';
  lastActivity?: number;
  lastHeartbeat?: number;
}

// Spectator interface
export interface Spectator {
  socketId: string;
  avatar: { avatarImage?: string; customAvatar?: CustomAvatarConfig; emoji?: string; color?: string } | null;
  authUserId: string | null;
  guestTokenHash: string | null;
  joinedAt: number;
}

// AI-approved word interface
export interface AiApprovedWord {
  word: string;
  submitter: string;
  score: number;
  confidence: number;
}

// Player achievement interface
export interface PlayerAchievement {
  id: string;
  achievedAt: number;
  [key: string]: unknown;
}

// Re-export shared types for backward compatibility
export type BlastModeState = SharedBlastModeState;
export type WordHuntState = SharedWordHuntModeState;

// Game state interface
export interface GameState {
  gameCode: string;
  hostSocketId: string | null;
  hostUsername: string | null;
  hostPlayerId?: string;
  roomName: string;
  language: Language;
  users: Record<string, GameUser>;
  spectators: Record<string, Spectator>;
  playerScores: Record<string, number>;
  playerWords: Record<string, string[]>;
  playerAchievements: Record<string, PlayerAchievement[]>;
  playerCombos: Record<string, number>;
  gameState: 'waiting' | 'in-progress' | 'validating' | 'finished';
  letterGrid: LetterGrid | null;
  letterPositions?: Map<string, [number, number][]>;
  timerSeconds: number;
  remainingTime?: number;
  gameDuration?: number;
  minWordLength?: number;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  gameStartedAt?: number;
  boardTheme?: { nameKey: string; emoji: string; isHoliday: boolean } | null;
  tournamentId: string | null;
  reconnectionTimeout: ReturnType<typeof setTimeout> | null;
  hostReconnectionTimeout?: ReturnType<typeof setTimeout> | null;
  validationTimeout?: ReturnType<typeof setTimeout> | null;
  isRanked: boolean;
  allowLateJoin: boolean;
  aiApprovedWords: AiApprovedWord[];
  peerValidationWord: AiApprovedWord | null;
  peerValidationVotes: Record<string, 'valid' | 'invalid'>;
  createdAt: number;
  lastActivity: number;
  restoredFromRedis?: boolean;
  gameSessionId: number;
  earthquakeTriggered?: boolean;
  fireRoundActive?: boolean;
  gameEndedAt?: number | null;
  playerWordDetails?: Record<string, unknown[]>;
  playersReadyForNextGame: Record<string, boolean>;
  selectedVocabulary?: Set<string>;
  lessonVocabulary?: Set<string>;
  activeWordPack?: {
    id: string;
    name: string;
    emoji: string | null;
    wordCount: number;
  } | null;
  chatHistory?: { username: string; message: string; timestamp: number; isHost?: boolean }[];
  totalBoardWords?: number;
  firstWordFound?: boolean;
  startTime?: number;
  gameMode?: GameMode;
  modeHistory?: GameMode[];
  blastModeState?: BlastModeState | null;
  wordHuntState?: WordHuntState | null;
  kickedPlayers?: Set<string>;
  /** O(1) duplicate-word lookup set, parallel to playerWords (not persisted to Redis) */
  playerWordsSet?: Record<string, Set<string>>;
  /** Cached validatedScores/validationComplete payload for reconnecting clients */
  cachedResultsPayload?: Record<string, unknown> | null;
}

// Game creation data interface
export interface GameCreationData {
  hostSocketId: string;
  hostUsername: string;
  hostPlayerId?: string;
  roomName?: string;
  language?: Language;
  isRanked?: boolean;
  allowLateJoin?: boolean;
}

// State transition result interface
export interface StateTransitionResult {
  success: boolean;
  previousState: string | null;
  newState: string | null;
  error?: string;
}
