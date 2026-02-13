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

import type { Socket } from 'socket.io';
import { z } from 'zod';

// ==========================================
// Socket Types
// ==========================================

/**
 * Socket with user data attached by middleware
 * Middleware attaches userId, displayName, and classroomIds during connection
 */
export interface DuelSocket extends Socket {
  data: {
    userId: string;
    displayName: string;
    classroomIds: string[];
  };
}

// ==========================================
// State Machine
// ==========================================

/**
 * Valid state transitions for duel lifecycle
 * Prevents invalid state changes (e.g., accepting a completed duel)
 */
export const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['active', 'cancelled', 'expired', 'declined'],
  active: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  expired: [],
  declined: [],
};

// ==========================================
// Validation Schemas
// ==========================================

/**
 * Create duel payload validation
 * Validates opponent, lesson, and classroom IDs are valid UUIDs
 */
export const createDuelSchema = z.object({
  opponentId: z.string().uuid('Invalid opponent ID'),
  lessonId: z.string().uuid('Invalid lesson ID'),
  classroomId: z.string().uuid('Invalid classroom ID'),
});

export type CreateDuelPayload = z.infer<typeof createDuelSchema>;

/**
 * Accept duel payload validation
 */
export const acceptDuelSchema = z.object({
  duelId: z.string().uuid('Invalid duel ID'),
});

export type AcceptDuelPayload = z.infer<typeof acceptDuelSchema>;

/**
 * Decline duel payload validation
 */
export const declineDuelSchema = z.object({
  duelId: z.string().uuid('Invalid duel ID'),
});

export type DeclineDuelPayload = z.infer<typeof declineDuelSchema>;

/**
 * Cancel duel payload validation
 */
export const cancelDuelSchema = z.object({
  duelId: z.string().uuid('Invalid duel ID'),
});

export type CancelDuelPayload = z.infer<typeof cancelDuelSchema>;

// ==========================================
// Event Interfaces
// ==========================================

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
