/**
 * Ranking Style Utilities
 * Single source of truth for all rank-based styling in the application
 *
 * Consolidates duplicated getRankIcon, getRankStyle, getRankBgColor, etc.
 * from multiple components into reusable utility functions.
 */

import { Crown, Medal, type LucideIcon } from 'lucide-react';

// Re-export confetti colors for convenience
export { RANK_COLORS as RANK_CONFETTI_COLORS } from './confettiUtils';

// ============================================================
// RANK CONFIGURATION - Complete styling for each rank
// ============================================================

export interface RankConfig {
  bg: string;
  border: string;
  text: string;
  rankText: string;
  icon: LucideIcon;
  iconColor: string;
}

/**
 * Complete rank configuration for top 3 places
 * Used by Top3Leaderboard, ConsolidatedPlayerCard, etc.
 */
export const RANK_CONFIG: Record<1 | 2 | 3, RankConfig> = {
  1: {
    bg: 'bg-neo-yellow',
    border: 'border-neo-yellow',
    text: 'text-neo-black',
    rankText: 'text-neo-yellow dark:text-neo-yellow',
    icon: Crown,
    iconColor: 'text-neo-yellow',
  },
  2: {
    bg: 'bg-slate-300',
    border: 'border-slate-300',
    text: 'text-slate-800',
    rankText: 'text-slate-500 dark:text-slate-300',
    icon: Medal,
    iconColor: 'text-slate-400',
  },
  3: {
    bg: 'bg-amber-500',
    border: 'border-amber-500',
    text: 'text-neo-black',
    rankText: 'text-amber-500 dark:text-amber-500',
    icon: Medal,
    iconColor: 'text-amber-500',
  },
};

/**
 * Simplified rank colors for player cards
 * Used by ConsolidatedPlayerCard, ResultsPlayerCard
 */
export const RANK_COLORS_SIMPLE: Record<number, { bg: string; text: string }> = {
  1: { bg: 'bg-neo-yellow', text: 'text-neo-black' },
  2: { bg: 'bg-slate-300', text: 'text-slate-800' },
  3: { bg: 'bg-amber-500', text: 'text-neo-black' },
};

/**
 * Get rank config for a given rank (1-based)
 * Returns undefined for ranks > 3
 */
export function getRankConfig(rank: number): RankConfig | undefined {
  if (rank >= 1 && rank <= 3) {
    return RANK_CONFIG[rank as 1 | 2 | 3];
  }
  return undefined;
}

/**
 * Get simple rank colors for a given rank (1-based)
 * Returns default colors for ranks > 3
 */
export function getRankColors(rank: number): { bg: string; text: string } {
  return RANK_COLORS_SIMPLE[rank] || { bg: 'bg-neo-cream', text: 'text-neo-black' };
}

// ============================================================
// RANK ICONS
// ============================================================

/**
 * Get rank icon as a string (emoji or number)
 * @param index - 0-based index (0 = 1st place)
 * @returns Emoji for top 3, otherwise "#N" string
 */
export function getRankIconString(index: number): string {
  if (index === 0) return '🥇';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return `#${index + 1}`;
}

/**
 * Get rank display text for leaderboards
 * Same as getRankIconString but with explicit rank param (1-based)
 * @param rank - 1-based rank (1 = 1st place)
 * @returns Emoji for top 3, otherwise "#N" string
 */
export function getRankDisplay(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

// ============================================================
// RANK STYLES - Neo-Brutalist Theme
// ============================================================

/**
 * Get rank style for leaderboard items
 * @param index - 0-based index (0 = 1st place)
 * @returns Tailwind classes for background, text, and border
 */
export function getRankStyle(index: number): string {
  if (index === 0) return 'bg-neo-yellow text-neo-black border-neo-black';
  if (index === 1) return 'bg-slate-300 text-neo-black border-neo-black';
  if (index === 2) return 'bg-amber-500 text-neo-black border-neo-black';
  return 'bg-neo-cream text-neo-black border-neo-black';
}

/**
 * Get rank box styling for player cards
 * @param index - 0-based index (0 = 1st place)
 * @returns Tailwind classes for the rank indicator box
 */
export function getRankBoxStyle(index: number): string {
  if (index === 0) return 'bg-neo-yellow border-neo-black';
  if (index === 1) return 'bg-slate-300 border-neo-black';
  if (index === 2) return 'bg-amber-500 border-neo-black';
  return 'bg-neo-cream border-neo-black';
}

/**
 * Get card style for results player cards
 * @param index - 0-based index (0 = 1st place)
 * @returns Tailwind classes for the card wrapper
 */
export function getCardStyle(index: number): string {
  if (index === 0) return 'bg-neo-yellow border-neo-black';
  if (index === 1) return 'bg-slate-200 border-neo-black';
  if (index === 2) return 'bg-amber-500 border-neo-black';
  return 'bg-neo-cream border-neo-black';
}

// ============================================================
// SINGLE PLAYER SPECIFIC STYLES (with gradients)
// ============================================================

/**
 * Get rank background color for single player results
 * Uses gradients and considers if the row belongs to the player
 * @param rank - 1-based rank (1 = 1st place)
 * @param isPlayer - Whether this is the current player's row
 * @returns Tailwind classes for background and border
 */
export function getRankBgColor(rank: number, isPlayer: boolean): string {
  if (isPlayer) {
    if (rank === 1) return 'bg-gradient-to-r from-neo-yellow to-yellow-300 border-neo-yellow';
    return 'bg-neo-cyan/20 dark:bg-neo-cyan/30 border-neo-cyan';
  }
  if (rank === 1) return 'bg-gradient-to-r from-neo-yellow/30 to-yellow-200/30 dark:from-neo-yellow/20 dark:to-yellow-200/20 border-neo-yellow/50';
  if (rank === 2) return 'bg-gradient-to-r from-gray-200 to-gray-100 dark:from-slate-600 dark:to-slate-700 border-gray-300 dark:border-slate-500';
  if (rank === 3) return 'bg-gradient-to-r from-amber-200/50 to-amber-100/50 dark:from-amber-800/30 dark:to-amber-700/30 border-amber-300 dark:border-amber-600';
  return 'border-neo-black/20 dark:border-slate-500 bg-white dark:bg-slate-700';
}

// ============================================================
// WAITING RESULTS VIEW STYLES
// ============================================================

/**
 * Get rank style for waiting results views
 * Used in leaderboard displays during results validation
 * @param index - 0-based index (0 = 1st place)
 * @returns Tailwind classes for the rank row
 */
export function getWaitingResultsRankStyle(index: number): string {
  if (index === 0) {
    return 'bg-gradient-to-r from-neo-yellow via-yellow-300 to-neo-yellow text-neo-black font-black border-2 border-neo-black shadow-hard-sm';
  }
  if (index === 1) {
    return 'bg-gradient-to-r from-slate-300 via-slate-200 to-slate-300 text-neo-black font-bold border border-slate-400';
  }
  if (index === 2) {
    return 'bg-gradient-to-r from-amber-500 via-orange-300 to-amber-500 text-neo-black font-bold border border-amber-500';
  }
  return 'bg-white/80 dark:bg-slate-700/80 text-neo-black dark:text-white border border-slate-200 dark:border-slate-600';
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Check if a rank is in the top 3
 * @param index - 0-based index
 * @returns true if top 3
 */
export function isTopThree(index: number): boolean {
  return index >= 0 && index < 3;
}

/**
 * Get rank from 0-based index
 * @param index - 0-based index (0 = 1st place)
 * @returns 1-based rank
 */
export function indexToRank(index: number): number {
  return index + 1;
}

/**
 * Get 0-based index from rank
 * @param rank - 1-based rank (1 = 1st place)
 * @returns 0-based index
 */
export function rankToIndex(rank: number): number {
  return rank - 1;
}
