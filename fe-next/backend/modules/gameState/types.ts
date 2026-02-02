/**
 * Game State Types
 * Centralized type definitions for game state management
 */

import type { LetterGrid, Language, GridPosition } from '@/shared/types/game';

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
  avatar: { avatarImage?: string; emoji?: string; color?: string } | null;
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
  avatar: { avatarImage?: string; emoji?: string; color?: string } | null;
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
  gameEndedAt?: number | null;
  playerWordDetails?: Record<string, unknown[]>;
  playersReadyForNextGame: Record<string, boolean>;
  selectedVocabulary?: Set<string>;
  lessonVocabulary?: Set<string>;
  chatHistory?: { username: string; message: string; timestamp: number; isHost?: boolean }[];
  totalBoardWords?: number;
  firstWordFound?: boolean;
  startTime?: number;
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
