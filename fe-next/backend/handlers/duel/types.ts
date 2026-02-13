/**
 * Type definitions for Duel Socket.IO events
 *
 * Namespace: /duel
 * Room naming convention:
 * - Game rooms: duel:${duelId}
 * - Lobby rooms: duel:lobby:${classroomId}
 *
 * Event naming convention: All events use duel: prefix
 */

/**
 * Client -> Server events
 * Events that clients can emit to the duel namespace
 */
export interface DuelClientEvents {
  // Duel lifecycle events
  'duel:create': (data: {
    opponentId: string;
    classroomId?: string;
    timeLimit: number;
    wordListId: string;
  }) => void;

  'duel:accept': (data: { duelId: string }) => void;
  'duel:decline': (data: { duelId: string }) => void;
  'duel:cancel': (data: { duelId: string }) => void;

  // Gameplay events (real-time duels)
  'duel:submit-word': (data: {
    duelId: string;
    word: string;
    position: number[];
  }) => void;

  'duel:submit-score': (data: {
    duelId: string;
    score: number;
    wordsFound: number;
  }) => void;

  // Lobby events (async duels)
  'duel:join-lobby': (data: { classroomId: string }) => void;
  'duel:leave-lobby': (data: { classroomId: string }) => void;

  // Room events
  'duel:join-room': (data: { duelId: string }) => void;
  'duel:leave-room': (data: { duelId: string }) => void;
}

/**
 * Server -> Client events
 * Events that the server can emit to clients in the duel namespace
 */
export interface DuelServerEvents {
  // Duel lifecycle events
  'duel:created': (data: {
    duelId: string;
    opponentId: string;
    createdAt: string;
    status: 'pending' | 'active' | 'completed';
  }) => void;

  'duel:accepted': (data: {
    duelId: string;
    startTime: string;
    grid: string[][];
  }) => void;

  'duel:declined': (data: {
    duelId: string;
    reason?: string;
  }) => void;

  'duel:cancelled': (data: {
    duelId: string;
    reason?: string;
  }) => void;

  'duel:completed': (data: {
    duelId: string;
    winner?: string;
    finalScores: {
      [playerId: string]: {
        score: number;
        wordsFound: number;
      };
    };
  }) => void;

  // Real-time progress events
  'duel:opponent-progress': (data: {
    duelId: string;
    opponentId: string;
    wordsFound: number;
    currentScore: number;
  }) => void;

  'duel:opponent-word': (data: {
    duelId: string;
    opponentId: string;
    word: string;
    points: number;
  }) => void;

  // Lobby events
  'duel:lobby-update': (data: {
    classroomId: string;
    activeUsers: string[];
    availableOpponents: {
      userId: string;
      username: string;
      rating?: number;
    }[];
  }) => void;

  'duel:challenge-received': (data: {
    duelId: string;
    challengerId: string;
    challengerName: string;
    timeLimit: number;
  }) => void;

  // Error event
  'duel:error': (data: {
    code: string;
    message: string;
    duelId?: string;
  }) => void;
}
