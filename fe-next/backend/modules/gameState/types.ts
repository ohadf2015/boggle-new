/**
 * Game State Types
 * Centralized type definitions for game state management
 */

import type { LetterGrid, Language, GameMode, BlastModeState as SharedBlastModeState, WordHuntModeState as SharedWordHuntModeState, WheelRushModeState as SharedWheelRushModeState, ShiritoriModeState as SharedShiritoriModeState, SealedBidModeState as SharedSealedBidModeState, CrosswordMpModeState as SharedCrosswordMpModeState } from '@/shared/types/game';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import type { VersusMatchState } from '@/lib/wordTower/versusMatch';

// Redis client interface
export interface RedisClient {
  saveGameState: (gameCode: string, state: GameState) => Promise<void>;
  getGameState: (gameCode: string) => Promise<GameState | null>;
  deleteGameState?: (gameCode: string) => Promise<void>;
  getAllGameKeys?: () => Promise<string[]>;
  getAllGameCodes?: () => Promise<string[]>;
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
  _staleLogged?: boolean;
  _afkWarned?: boolean;
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
export type WheelRushState = SharedWheelRushModeState;
export type ShiritoriState = SharedShiritoriModeState;
export type SealedBidState = SharedSealedBidModeState;
export type CrosswordMpState = SharedCrosswordMpModeState;

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
  playerEventBonuses?: Record<string, number>;
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
  isPrivate: boolean;
  /** Classroom-mode rooms skip auto-host-transfer. See audit T4 (2026-05-10). */
  isClassroom: boolean;
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
  wheelRushState?: WheelRushState | null;
  shiritoriState?: ShiritoriState | null;
  sealedBidState?: SealedBidState | null;
  crosswordMpState?: CrosswordMpState | null;
  wordTowerVersusState?: VersusMatchState | null;
  kickedPlayers?: Set<string>;
  /** O(1) duplicate-word lookup set, parallel to playerWords (not persisted to Redis) */
  playerWordsSet?: Record<string, Set<string>>;
  /** Cached validatedScores/validationComplete payload for reconnecting clients */
  cachedResultsPayload?: Record<string, unknown> | null;
  /** Golden letter positions for this round (row, col pairs) */
  goldenLetters?: Array<{ row: number; col: number }>;
  /** Special high-value words solvable on the board */
  specialWords?: Array<{ word: string; foundBy?: string }>;
  /** Whether host is in TV display mode (phones should delay results) */
  tvMode?: boolean;
  /** Scheduled round event type and trigger time */
  roundEventSchedule?: { eventType: string; triggerAtPercent: number } | null;
  /** Currently active round event */
  activeRoundEvent?: string | null;
  /** Transient "rush" bonus-tile positions currently live on the board (recurring, ~10s each) */
  rushTiles?: Array<{ row: number; col: number }>;
  /** Whether a rush-tile batch is currently active (scoring gate, independent of activeRoundEvent) */
  rushTilesActive?: boolean;
  /** Player boost claims: sessionId + signed token for firstWordBonus / scoreMultiplier */
  playerBoosts?: Record<string, { sessionId: string; token: string }>;
  /** Monotonic per-game event counter. Incremented on each scored word submission. Used for resume dedup and delta replay (Phase 3). */
  serverSeq?: number;
}

// Game creation data interface
export interface GameCreationData {
  hostSocketId: string;
  hostUsername: string;
  hostPlayerId?: string;
  roomName?: string;
  language?: Language;
  isRanked?: boolean;
  isPrivate?: boolean;
  isClassroom?: boolean;
  allowLateJoin?: boolean;
}

// State transition result interface
export interface StateTransitionResult {
  success: boolean;
  previousState: string | null;
  newState: string | null;
  error?: string;
}
