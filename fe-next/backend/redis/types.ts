// types.ts - Redis type definitions
import type { Redis as RedisClient } from 'ioredis';

export type { RedisClient };

export interface GameStateData {
  roomName: string;
  /** Full user objects (v2) or username strings (v1 legacy) */
  users: string[] | Record<string, unknown>;
  usersV2?: Record<string, unknown>;
  spectators?: Record<string, unknown>;
  playerScores: Record<string, number>;
  playerEventBonuses?: Record<string, number>;
  playerWords: Record<string, string[]>;
  playerAchievements: Record<string, string[]>;
  playerWordDetails: Record<string, unknown[]>;
  playerCombos?: Record<string, number>;
  firstWordFound: Record<string, boolean>;
  gameState: string;
  startTime: string;
  endTime: string;
  letterGrid: string[][];
  timerSeconds: number;
  remainingTime: number | null;
  language: string;
  tournamentId: string | null;
  gameMode: string | null;
  blastModeState: Record<string, unknown> | null;
  wordHuntState: Record<string, unknown> | null;
  isRanked?: boolean;
  isPrivate?: boolean;
  allowLateJoin?: boolean;
  chatHistory?: unknown[];
  aiApprovedWords?: unknown[];
  peerValidationVotes?: Record<string, string>;
  cachedResultsPayload?: Record<string, unknown> | null;
  letterPositions?: Array<[string, [number, number][]]>;
  selectedVocabulary?: string[];
  lessonVocabulary?: string[];
  kickedPlayers?: string[];
  createdAt?: number;
  lastActivity?: number;
  gameDuration?: number;
  minWordLength?: number;
  difficulty?: string;
  gameStartedAt?: number;
  hostUsername?: string | null;
  hostPlayerId?: string;
}

export interface TournamentStateData {
  id: string;
  hostPlayerId: string;
  hostUsername: string;
  name: string;
  totalRounds: number;
  currentRound: number;
  status: string;
  settings: Record<string, unknown>;
  players: unknown[];
  rounds: unknown[];
  finalStandings: unknown[];
  createdAt: string;
}

export interface WordApprovalData {
  approvalCount: number;
  gameIds: string[];
  firstApproved: string;
  lastApproved: string;
}

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  nextAttempt: number | null;
}

export interface RedisHealth {
  available: boolean;
  lastCheck: number;
  stale: boolean;
  circuitBreaker: CircuitBreakerState;
}

export interface RedisMetrics {
  available: boolean;
  error?: string;
  keyCount?: number;
  usedMemory?: number;
  usedMemoryHuman?: string;
  connectedClients?: number;
  totalCommands?: number;
  hitRate?: string;
  circuitBreaker?: CircuitBreakerState;
  health?: RedisHealth;
}

export interface LockResult<T> {
  success: boolean;
  result: T | null;
  error: Error | null;
}

export interface GameDataInput {
  roomName?: string;
  users?: Record<string, unknown>;
  spectators?: Record<string, unknown>;
  playerScores?: Record<string, number>;
  playerEventBonuses?: Record<string, number>;
  playerWords?: Record<string, string[]>;
  playerAchievements?: Record<string, string[]>;
  playerWordDetails?: Record<string, unknown[]>;
  playerCombos?: Record<string, number>;
  firstWordFound?: Record<string, boolean>;
  gameState?: string;
  startTime?: string;
  endTime?: string;
  letterGrid?: string[][];
  timerSeconds?: number;
  remainingTime?: number;
  language?: string;
  tournamentId?: string;
  gameMode?: string;
  blastModeState?: Record<string, unknown> | null;
  wordHuntState?: Record<string, unknown> | null;
  isRanked?: boolean;
  isPrivate?: boolean;
  allowLateJoin?: boolean;
  chatHistory?: unknown[];
  aiApprovedWords?: unknown[];
  peerValidationVotes?: Record<string, string>;
  cachedResultsPayload?: Record<string, unknown> | null;
  letterPositions?: Map<string, [number, number][]>;
  selectedVocabulary?: Set<string>;
  lessonVocabulary?: Set<string>;
  kickedPlayers?: Set<string>;
  createdAt?: number;
  lastActivity?: number;
  gameDuration?: number;
  minWordLength?: number;
  difficulty?: string;
  gameStartedAt?: number;
  hostUsername?: string | null;
  hostPlayerId?: string;
}

export interface TournamentDataInput {
  id?: string;
  hostPlayerId?: string;
  hostUsername?: string;
  name?: string;
  totalRounds?: number;
  currentRound?: number;
  status?: string;
  settings?: Record<string, unknown>;
  players?: unknown[];
  rounds?: unknown[];
  finalStandings?: unknown[];
  createdAt?: string;
}
