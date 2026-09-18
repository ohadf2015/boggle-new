/**
 * Types for live classroom game components
 */

import type { ClassroomGameMode } from '@/shared/types/vocabQuiz';

export interface ClassroomLeaderboardEntry {
  /** Unique identifier for the student */
  id: string;
  /** Display name */
  name: string;
  /** Current score */
  score: number;
  /** Number of words found/correct answers */
  wordCount: number;
  /** Avatar configuration */
  avatar?: any | null;
  /** Current rank in leaderboard (1 = first place) */
  rank: number;
}

export type LeaderboardVisibility = 'full' | 'top3' | 'top5' | 'personal_only' | 'hidden';

export interface InGameJuiceEventPayload {
  /** Which student answered correctly */
  studentId: string;
  studentName: string;
  /** Points awarded */
  points: number;
  /** Whether this was a streak/combo */
  isCombo?: boolean;
  /** Combo level if applicable */
  comboLevel?: number;
  /** Game mode for sound routing */
  gameMode: ClassroomGameMode;
}
