/**
 * Ranking Style Utilities
 * Single source of truth for all rank-based styling in the application
 *
 * Consolidates duplicated getRankIcon, getRankStyle, getRankBgColor, etc.
 * from multiple components into reusable utility functions.
 */

import React from 'react';

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
  if (index === 2) return 'bg-neo-orange text-neo-black border-neo-black';
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
  if (index === 2) return 'bg-neo-orange border-neo-black';
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
  if (index === 2) return 'bg-neo-orange border-neo-black';
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
 * Used in HostWaitingResultsView and PlayerWaitingResultsView
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
    return 'bg-gradient-to-r from-neo-orange via-orange-300 to-neo-orange text-neo-black font-bold border border-neo-orange';
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
