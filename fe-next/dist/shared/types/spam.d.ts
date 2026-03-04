/**
 * Spam Detection Type Definitions
 * Types for anti-abuse/spam detection system
 */
export type PenaltyTier = 'none' | 'warning' | 'penalty' | 'cooldown';
export type InvalidReason = 'not_on_board' | 'too_short' | 'profanity' | 'rejected';
export interface SpamWarningPayload {
    invalidCount: number;
    message: string;
    tier: 'warning';
}
export interface SpamPenaltyPayload {
    invalidCount: number;
    pointsDeducted: number;
    totalPenaltyPoints: number;
    newScore: number;
    tier: 'penalty';
}
export interface SpamCooldownPayload {
    invalidCount: number;
    duration: number;
    tier: 'cooldown';
}
export interface SpamCooldownEndPayload {
    message: string;
}
export interface SpamStatus {
    tier: PenaltyTier;
    invalidCount: number;
    cooldownRemaining: number;
    totalPenaltyPoints: number;
}
export interface WordBlockedByCooldownPayload {
    word: string;
    remainingMs: number;
}
