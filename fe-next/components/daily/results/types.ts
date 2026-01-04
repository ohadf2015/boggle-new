/**
 * Daily Word Hunt Results Types
 */

import type { Language } from '@/types';
import type { WordHuntResult } from '@/utils/dailyChallenge';

/**
 * Aggregate statistics for the daily Word Hunt puzzle
 */
export interface WordHuntStats {
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
    rank?: number; // Player's rank position (1 = best)
    efficiencyScore?: number;
    efficiencyPercentile?: number;
  };
}

/**
 * Props for the main DailyWordHuntResults component
 */
export interface DailyWordHuntResultsProps {
  result: WordHuntResult;
  puzzleNumber: number;
  puzzleDate: string;
  language: Language;
  countdown: string;
  isNewCompletion: boolean;
  onBack: () => void;
  onRetry: () => void;
  onGameLanguageChange?: (lang: Language) => void;
}

/**
 * Coin reward breakdown
 */
export interface CoinReward {
  awarded: number;
  breakdown: {
    base: number;
    efficiency: number;
    streak: number;
  };
}

/**
 * Bottom tab navigation types
 */
export type ResultTab = 'results' | 'stats' | 'ranks';

/**
 * Language option for "Try Another Language" section
 */
export interface LanguageOption {
  code: Language;
  flag: string;
  name: string;
}

/**
 * Share image result type
 */
export interface ShareImageResult {
  url: string;
  blob: Blob;
}
