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
  /** Base dictionary score PLUS the additive combo bonus. */
  points: number;
  totalScore: number;
  wordCount: number;
  /** Chain length after this word. Server-owned; the client only displays it. */
  comboStreak?: number;
  /** Additive bonus this word earned (0 when the chain just started). */
  comboBonus?: number;
}

export interface WordRejectedData {
  word: string;
  reason: string;
  /** 0 — a miss snaps the chain. */
  comboStreak?: number;
}

export interface OpponentProgressData {
  opponentId: string;
  totalScore: number;
  wordCount: number;
  /** The rival's live chain, so the swing bar can flag a hot opponent. */
  comboStreak?: number;
}

/**
 * The server's answer to `duel:create-challenge` and `duel:rematch` — the new
 * duel's id. A rematch is a NEW duel row, so this is the only way the client
 * learns where to go next.
 */
export interface DuelCreatedData {
  duelId: string;
  /**
   * True when the server created this duel because BOTH students tapped
   * REMATCH. It is the signal that says "follow this even if your own wait
   * lapsed" — a rematch neither side can decline unilaterally.
   */
  isRematch?: boolean;
}

/** The other student tapped REMATCH first; my button becomes ACCEPT. */
export interface RematchOfferedData {
  fromUserId: string;
  fromName?: string;
  lessonId?: string;
  duelId?: string | null;
}

/** My offer is live and the other podium has been told. */
export interface RematchPendingData {
  opponentId: string;
  expiresInMs?: number;
}

/** They had already left: the rematch is a challenge in their lobby instead. */
export interface RematchInvitedData {
  duelId: string;
  opponentId: string;
}

/** An offer was withdrawn (cancelled, or it expired). */
export interface RematchWithdrawnData {
  fromUserId: string;
}

/** A mascot sticker thrown by the other side of an async duel. */
export interface TauntReceivedData {
  duelId: string;
  fromId: string;
  fromName: string;
  stickerId: string;
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
  /** Throw a mascot sticker into a duel room (async duels). */
  sendTaunt: (duelId: string, stickerId: string) => void;
  forfeitDuel: (duelId: string) => void;
  syncState: (duelId: string) => void;
  // Event listeners (caller provides callbacks)
  onChallengeReceived: (cb: (data: ChallengeReceivedData) => void) => () => void;
  onLobbyUpdate: (cb: (data: LobbyUpdateData) => void) => () => void;
  onDuelAccepted: (cb: (data: DuelAcceptedData) => void) => () => void;
  onDuelDeclined: (cb: (data: { duelId: string }) => void) => () => void;
  onDuelCompleted: (cb: (data: DuelCompletedData) => void) => () => void;
  onDuelCreated: (cb: (data: DuelCreatedData) => void) => () => void;
  // Rematch handshake
  onRematchOffered: (cb: (data: RematchOfferedData) => void) => () => void;
  onRematchPending: (cb: (data: RematchPendingData) => void) => () => void;
  onRematchInvited: (cb: (data: RematchInvitedData) => void) => () => void;
  onRematchWithdrawn: (cb: (data: RematchWithdrawnData) => void) => () => void;
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
  onTauntReceived: (cb: (data: TauntReceivedData) => void) => () => void;
}
