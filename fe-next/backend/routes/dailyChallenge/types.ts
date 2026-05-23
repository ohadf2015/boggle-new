/**
 * Daily Challenge Types
 * Shared type definitions for daily challenge routes
 */

import { Request } from 'express';

export const VALID_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'] as const;
export type ValidLanguage = typeof VALID_LANGUAGES[number];

// ==================== Request/Response Types ====================

export interface LeaderboardParams {
  date: string;
  language: string;
}

export interface LeaderboardQuery {
  limit?: string;
}

export interface LeaderboardEntry {
  rank_position: number;
  player_id?: string;
  guest_fingerprint?: string;
  display_name: string;
  avatar_emoji: string;
  avatar_color: string;
  score: number;
  word_count: number;
  longest_word?: string;
  time_seconds?: number;
}

export interface LeaderboardResponse {
  data: LeaderboardEntry[];
  totalParticipants: number;
  totalAttempts?: number;
  guestPlayerCount?: number;
  date: string;
  language: string;
  error?: string;
}

export interface SubmitRequest extends Request {
  body: {
    puzzleDate?: string;
    puzzleNumber?: number;
    language?: string;
    playerId?: string;
    guestFingerprint?: string;
    displayName?: string;
    avatarEmoji?: string;
    avatarColor?: string;
    avatarImage?: string;
    countryCode?: string;
    score?: number;
    wordCount?: number;
    wordsByLength?: Record<string, number>;
    timeSeconds?: number;
    longestWord?: string;
  };
}

export interface SubmitResponse {
  success: boolean;
  alreadySubmitted?: boolean;
  isRetry?: boolean;
  penaltyApplied?: number;
  finalScore?: number;
  data?: AttemptData;
  rank?: number | null;
  error?: string;
}

export interface AttemptData {
  id: string;
  puzzle_date: string;
  puzzle_number: number;
  language: string;
  score: number;
  word_count: number;
  words_by_length: Record<string, number>;
  time_seconds: number;
  longest_word: string | null;
  longest_word_length: number | null;
  completed_at: string;
  display_name: string;
  avatar_emoji: string;
  avatar_color: string;
  player_id?: string;
  guest_fingerprint?: string;
}

export interface AttemptInsertData {
  puzzle_date: string;
  puzzle_number: number;
  language: string;
  score: number;
  word_count: number;
  words_by_length: Record<string, number>;
  time_seconds: number;
  longest_word: string | null;
  longest_word_length: number | null;
  completed_at: string;
  display_name: string;
  avatar_emoji: string;
  avatar_color: string;
  avatar_image?: string;
  country_code?: string;
  player_id?: string;
  guest_fingerprint?: string;
}

export interface CachedPuzzle {
  grid: string[][];
  targetWord: string;
  puzzleDate: string;
  puzzleNumber: number;
  language: string;
}

export interface PuzzleStats {
  total_attempts: number;
  total_completions: number;
  average_score: number;
  average_words: number;
  top_score: number;
}

export interface StatsResponse {
  data: PuzzleStats;
  error?: string;
}

// ==================== Word Hunt Types ====================

export interface WordHuntSubmitRequest extends Request {
  body: {
    puzzleDate?: string;
    puzzleNumber?: number;
    language?: string;
    playerId?: string;
    guestFingerprint?: string;
    displayName?: string;
    avatarEmoji?: string;
    avatarColor?: string;
    countryCode?: string;
    /** True when replaying a past daily within the catch-up window (last 3 days). */
    isCatchup?: boolean;
    solved?: boolean;
    attemptsUsed?: number;
    targetWord?: string;
    attemptWords?: Array<{
      word: string;
      feedback: Array<{
        letter: string;
        feedback: 'green' | 'yellow' | 'gray';
        position: number;
      }>;
      timestamp: number;
    }>;
    // Survival mode fields
    wordsDiscovered?: Array<{
      word: string;
      timestamp: number;
      lifeGained: number;
      tokensGained: number;
    }>;
    lifeRemaining?: number;
    clueTokensEarned?: number;
    clueTokensSpent?: number;
    hintsUnlocked?: number;
    efficiencyScore?: number;
    /** Number of coin-paid retries the client has consumed for this puzzle. */
    extraTries?: number;
  };
}

export interface WordHuntStatsParams {
  date: string;
  language: string;
}

export interface WordHuntStatsResponse {
  totalPlayers: number;
  solvedCount: number;
  solveRate: number;
  attemptDistribution: Record<string, number>;
  avgAttemptsSolved: number | null;
  // Survival mode stats
  avgLifeRemaining?: number | null;
  avgEfficiencyScore?: number | null;
  maxEfficiencyScore?: number | null;
  avgWordsDiscovered?: number | null;
  yourStats?: {
    solved: boolean;
    attemptsUsed: number;
    percentile: number;
    rank?: number;
    efficiencyScore?: number;
    efficiencyPercentile?: number;
  };
}

export interface WordHuntAttemptInsert {
  puzzle_date: string;
  puzzle_number: number;
  language: string;
  player_id?: string | null;
  guest_fingerprint?: string | null;
  display_name: string;
  avatar_emoji: string;
  avatar_color: string;
  country_code?: string | null;
  solved: boolean;
  attempts_used: number;
  target_word: string;
  attempt_words: unknown;
  // Survival mode fields
  words_discovered?: unknown | null;
  life_remaining?: number | null;
  clue_tokens_earned?: number | null;
  clue_tokens_spent?: number | null;
  hints_unlocked?: number | null;
  efficiency_score?: number | null;
  completed_at: string;
}

export interface WordHuntLeaderboardEntry {
  rank_position: number;
  player_id?: string;
  guest_fingerprint?: string;
  display_name: string;
  avatar_emoji: string;
  avatar_color: string;
  attempts_used: number;
  solved: boolean;
  efficiency_score?: number | null;
  life_remaining?: number | null;
  completed_at: string;
}

export interface WordHuntLeaderboardResponse {
  data: WordHuntLeaderboardEntry[];
  totalParticipants: number;
  date: string;
  language: string;
  error?: string;
}
