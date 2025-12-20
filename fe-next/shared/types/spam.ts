/**
 * Spam Detection Type Definitions
 * Types for anti-abuse/spam detection system
 */

// Penalty tier levels
export type PenaltyTier = 'none' | 'warning' | 'penalty' | 'cooldown';

// Reasons why a word was marked invalid
export type InvalidReason = 'not_on_board' | 'too_short' | 'profanity' | 'rejected';

// Spam warning payload (Server → Client)
export interface SpamWarningPayload {
  invalidCount: number;
  message: string;
  tier: 'warning';
}

// Spam penalty payload (Server → Client)
export interface SpamPenaltyPayload {
  invalidCount: number;
  pointsDeducted: number;
  totalPenaltyPoints: number;
  newScore: number;
  tier: 'penalty';
}

// Spam cooldown payload (Server → Client)
export interface SpamCooldownPayload {
  invalidCount: number;
  duration: number; // milliseconds
  tier: 'cooldown';
}

// Spam cooldown ended payload (Server → Client)
export interface SpamCooldownEndPayload {
  message: string;
}

// Spam status for a player
export interface SpamStatus {
  tier: PenaltyTier;
  invalidCount: number;
  cooldownRemaining: number;
  totalPenaltyPoints: number;
}

// Word rejected due to cooldown payload (Server → Client)
export interface WordBlockedByCooldownPayload {
  word: string;
  remainingMs: number;
}
