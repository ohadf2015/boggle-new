/**
 * Guest session management utilities
 * Handles guest token creation, stats tracking, and migration to authenticated accounts
 */

import logger from '@/utils/logger';

const GUEST_SESSION_KEY = 'boggle_guest_session_id';
const GUEST_STATS_KEY = 'boggle_guest_stats';
const GUEST_NAME_KEY = 'boggle_guest_name';

export interface GuestStats {
  games: number;
  wins: number;
  score: number;
  words: number;
  longestWord: string | null;
  achievementCounts: Record<string, number>;
  createdAt: number;
  // Guest player name for tracking
  guestName?: string | null;
}

export interface GameResult {
  score?: number;
  wordCount?: number;
  isWinner?: boolean;
  longestWord?: string;
  achievements?: string[];
}

export interface GuestStatsSummary {
  gamesPlayed: number;
  totalScore: number;
  wordsFound: number;
  longestWord: string | null;
  achievementCount: number;
}

/**
 * Generate a SHA-256 hash of a token (for server storage)
 */
export async function hashToken(token: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get or create a guest session ID
 */
export function getGuestSessionId(): string | null {
  if (typeof window === 'undefined') return null;

  let sessionId = localStorage.getItem(GUEST_SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(GUEST_SESSION_KEY, sessionId);
  }
  return sessionId;
}

/**
 * Check if a guest session exists
 */
export function hasGuestSession(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(GUEST_SESSION_KEY);
}

/**
 * Get default guest stats object
 */
function getDefaultGuestStats(): GuestStats {
  return {
    games: 0,
    wins: 0,
    score: 0,
    words: 0,
    longestWord: null,
    achievementCounts: {},
    createdAt: Date.now()
  };
}

/**
 * Get current guest stats from localStorage
 */
export function getGuestStats(): GuestStats {
  if (typeof window === 'undefined') return getDefaultGuestStats();

  try {
    const statsStr = localStorage.getItem(GUEST_STATS_KEY);
    if (!statsStr) {
      return getDefaultGuestStats();
    }
    return JSON.parse(statsStr) as GuestStats;
  } catch (error) {
    logger.error('Error reading guest stats:', error);
    return getDefaultGuestStats();
  }
}

/**
 * Save guest stats to localStorage
 */
export function saveGuestStats(stats: GuestStats): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(GUEST_STATS_KEY, JSON.stringify(stats));
  } catch (error) {
    logger.error('Error saving guest stats:', error);
  }
}

/**
 * Update guest stats after a game
 */
export function updateGuestStatsAfterGame(gameResult: GameResult): GuestStats {
  if (typeof window === 'undefined') return getDefaultGuestStats();

  const stats = getGuestStats();

  stats.games = (stats.games || 0) + 1;
  stats.score = (stats.score || 0) + (gameResult.score || 0);
  stats.words = (stats.words || 0) + (gameResult.wordCount || 0);

  // Track wins
  if (gameResult.isWinner) {
    stats.wins = (stats.wins || 0) + 1;
  }

  // Update longest word if this game had a longer one
  if (gameResult.longestWord) {
    if (!stats.longestWord || gameResult.longestWord.length > stats.longestWord.length) {
      stats.longestWord = gameResult.longestWord;
    }
  }

  // Update achievement counts
  if (gameResult.achievements && Array.isArray(gameResult.achievements)) {
    stats.achievementCounts = stats.achievementCounts || {};
    for (const achievement of gameResult.achievements) {
      stats.achievementCounts[achievement] = (stats.achievementCounts[achievement] || 0) + 1;
    }
  }

  saveGuestStats(stats);
  return stats;
}

/**
 * Clear all guest data (after account claim or sign in)
 */
export function clearGuestData(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(GUEST_SESSION_KEY);
  localStorage.removeItem(GUEST_STATS_KEY);
  localStorage.removeItem(GUEST_NAME_KEY);
}

/**
 * Get guest stats summary for display
 */
export function getGuestStatsSummary(): GuestStatsSummary {
  const stats = getGuestStats();

  return {
    gamesPlayed: stats.games || 0,
    totalScore: stats.score || 0,
    wordsFound: stats.words || 0,
    longestWord: stats.longestWord || null,
    achievementCount: Object.keys(stats.achievementCounts || {}).length
  };
}

/**
 * Check if guest has enough games to show upgrade prompt
 */
export function shouldShowUpgradePrompt(): boolean {
  const stats = getGuestStats();
  return (stats.games || 0) >= 1; // Show after first game
}

/**
 * Check if this is the guest's first win (to show celebratory signup prompt)
 */
export function isFirstWin(): boolean {
  const stats = getGuestStats();
  return (stats.wins || 0) === 1;
}

/**
 * Check if guest has any wins recorded
 */
export function hasWon(): boolean {
  const stats = getGuestStats();
  return (stats.wins || 0) > 0;
}

/**
 * Get guest wins count
 */
export function getGuestWinsCount(): number {
  const stats = getGuestStats();
  return stats.wins || 0;
}

/**
 * Get casual games count for ranked unlock progress
 * For guests, this comes from local storage
 */
export function getGuestCasualGamesCount(): number {
  const stats = getGuestStats();
  return stats.games || 0;
}

/**
 * Store guest player name for analytics tracking
 */
export function setGuestName(name: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(GUEST_NAME_KEY, name);
    // Also update in stats
    const stats = getGuestStats();
    stats.guestName = name;
    saveGuestStats(stats);
  } catch (error) {
    logger.error('Error saving guest name:', error);
  }
}

/**
 * Get stored guest player name
 */
export function getGuestName(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    // First check dedicated key
    const name = localStorage.getItem(GUEST_NAME_KEY);
    if (name) return name;
    // Fall back to stats
    const stats = getGuestStats();
    return stats.guestName || null;
  } catch {
    return null;
  }
}

