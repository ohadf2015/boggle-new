/**
 * Type definitions for useDuelSocket hook
 */

import type { Socket } from 'socket.io-client';

// ==========================================
// Event Data Types
// ==========================================

export interface ChallengeReceivedData {
  duelId: string;
  challengerName: string;
  lessonId: string;
  duelType: 'async' | 'realtime';
}

export interface LobbyUpdateData {
  availableOpponents: OpponentInfo[];
}

export interface OpponentInfo {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface DuelAcceptedData {
  duelId: string;
  boardState: string[][];
  startedAt: string;
  duelType: 'async' | 'realtime';
}

export interface DuelCompletedData {
  winnerId: string | null;
  challengerScore: number;
  opponentScore: number;
  xpAwarded: { winner: number; loser: number };
}

export interface ScoreSubmittedData {
  playerId: string;
  score: number;
  wordsValidated: number;
  wordsRejected: number;
}

// Real-time duel types
export interface DuelStartedData {
  duelId: string;
  boardState: string[][];
  startTime: string;
  timeLimit: number;
  players: string[];
}

export interface WordAcceptedData {
  word: string;
  points: number;
  totalScore: number;
  wordCount: number;
}

export interface WordRejectedData {
  word: string;
  reason: string;
}

export interface OpponentProgressData {
  opponentId: string;
  totalScore: number;
  wordCount: number;
}

export interface OpponentDisconnectedData {
  opponentId: string;
  gracePeriodSeconds: number;
}

export interface OpponentReconnectedData {
  opponentId: string;
}

export interface StateSyncedData {
  duelId: string;
  challengerScore: number;
  opponentScore: number;
  challengerWords: string[];
  opponentWords: string[];
  timeRemaining: number;
}

// ==========================================
// Hook Return Type
// ==========================================

export interface UseDuelSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  // Lobby
  joinLobby: (classroomId: string) => void;
  leaveLobby: (classroomId: string) => void;
  // Challenge
  createChallenge: (opponentId: string, lessonId: string, classroomId: string, duelType?: 'async' | 'realtime') => void;
  acceptChallenge: (duelId: string) => void;
  declineChallenge: (duelId: string) => void;
  cancelChallenge: (duelId: string) => void;
  // Gameplay
  submitScore: (duelId: string, wordsFound: string[]) => void;
  // Real-time actions
  submitWord: (duelId: string, word: string, positions?: number[]) => void;
  forfeitDuel: (duelId: string) => void;
  syncState: (duelId: string) => void;
  // Event listeners (caller provides callbacks)
  onChallengeReceived: (cb: (data: ChallengeReceivedData) => void) => () => void;
  onLobbyUpdate: (cb: (data: LobbyUpdateData) => void) => () => void;
  onDuelAccepted: (cb: (data: DuelAcceptedData) => void) => () => void;
  onDuelDeclined: (cb: (data: { duelId: string }) => void) => () => void;
  onDuelCompleted: (cb: (data: DuelCompletedData) => void) => () => void;
  onScoreSubmitted: (cb: (data: ScoreSubmittedData) => void) => () => void;
  onError: (cb: (data: { message: string }) => void) => () => void;
  // Real-time event listeners
  onDuelStarted: (cb: (data: DuelStartedData) => void) => () => void;
  onWordAccepted: (cb: (data: WordAcceptedData) => void) => () => void;
  onWordRejected: (cb: (data: WordRejectedData) => void) => () => void;
  onOpponentProgress: (cb: (data: OpponentProgressData) => void) => () => void;
  onOpponentDisconnected: (cb: (data: OpponentDisconnectedData) => void) => () => void;
  onOpponentReconnected: (cb: (data: OpponentReconnectedData) => void) => () => void;
  onStateSynced: (cb: (data: StateSyncedData) => void) => () => void;
}
