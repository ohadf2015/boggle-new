// types.ts - Redis type definitions
import type { Redis as RedisClient } from 'ioredis';

export type { RedisClient };

export interface GameStateData {
  roomName: string;
  users: string[];
  playerScores: Record<string, number>;
  playerWords: Record<string, string[]>;
  playerAchievements: Record<string, string[]>;
  playerWordDetails: Record<string, unknown[]>;
  firstWordFound: Record<string, boolean>;
  gameState: string;
  startTime: string;
  endTime: string;
  letterGrid: string[][];
  timerSeconds: number;
  language: string;
  tournamentId: string | null;
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
  playerScores?: Record<string, number>;
  playerWords?: Record<string, string[]>;
  playerAchievements?: Record<string, string[]>;
  playerWordDetails?: Record<string, unknown[]>;
  firstWordFound?: Record<string, boolean>;
  gameState?: string;
  startTime?: string;
  endTime?: string;
  letterGrid?: string[][];
  timerSeconds?: number;
  language?: string;
  tournamentId?: string;
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
