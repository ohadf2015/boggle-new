/**
 * Guest session management utilities
 * Handles guest token creation, stats tracking, and migration to authenticated accounts
 */

import logger from '@/utils/logger';
import { getFromStorage, saveToStorage, removeFromStorage, getJsonFromStorage, saveJsonToStorage } from '@/utils/storageHelpers';

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
  // Additional stats for UI display
  totalComboBonus?: number;
  totalFireRoundBonus?: number;
  archetypeCounts?: Record<string, number>; // Track archetype frequency
  averageWordLength?: number;
  bestCombo?: number;
  // Personal bests for results page badges
  bestGameScore?: number;
  bestWordCount?: number;
  bestAccuracy?: number;
}

export interface GameResult {
  score?: number;
  wordCount?: number;
  isWinner?: boolean;
  longestWord?: string;
  achievements?: string[];
  // Additional stats for comprehensive tracking
  comboBonus?: number;
  fireRoundBonus?: number;
  archetype?: string;
  averageWordLength?: number;
  maxCombo?: number;
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

  let sessionId = getFromStorage(GUEST_SESSION_KEY);
  if (!sessionId) {
    sessionId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2) + Date.now().toString(36);
    saveToStorage(GUEST_SESSION_KEY, sessionId);
  }
  return sessionId;
}

/**
 * Check if a guest session exists
 */
export function hasGuestSession(): boolean {
  if (typeof window === 'undefined') return false;
  return !!getFromStorage(GUEST_SESSION_KEY);
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
 * Get current guest stats from storage
 */
export function getGuestStats(): GuestStats {
  return getJsonFromStorage<GuestStats>(GUEST_STATS_KEY, getDefaultGuestStats());
}

/**
 * Save guest stats to storage (both localStorage and sessionStorage).
 *
 * Dispatches `guestStatsChanged` so provider-level subscribers (signup prompt,
 * header chips) re-evaluate after a game updates stats. Without this, hooks
 * that read stats once on mount never see post-game wins.
 */
export function saveGuestStats(stats: GuestStats): void {
  saveJsonToStorage(GUEST_STATS_KEY, stats);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('guestStatsChanged'));
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

  // Track combo and fire round bonuses
  if (gameResult.comboBonus) {
    stats.totalComboBonus = (stats.totalComboBonus || 0) + gameResult.comboBonus;
  }
  if (gameResult.fireRoundBonus) {
    stats.totalFireRoundBonus = (stats.totalFireRoundBonus || 0) + gameResult.fireRoundBonus;
  }

  // Track archetype frequency
  if (gameResult.archetype) {
    stats.archetypeCounts = stats.archetypeCounts || {};
    stats.archetypeCounts[gameResult.archetype] = (stats.archetypeCounts[gameResult.archetype] || 0) + 1;
  }

  // Track best combo
  if (gameResult.maxCombo && gameResult.maxCombo > (stats.bestCombo || 0)) {
    stats.bestCombo = gameResult.maxCombo;
  }

  // Track personal bests for results page badges
  if (gameResult.score && gameResult.score > (stats.bestGameScore || 0)) {
    stats.bestGameScore = gameResult.score;
  }
  if (gameResult.wordCount && gameResult.wordCount > (stats.bestWordCount || 0)) {
    stats.bestWordCount = gameResult.wordCount;
  }

  // Update average word length (running average)
  if (gameResult.averageWordLength && gameResult.wordCount && gameResult.wordCount > 0) {
    const totalWordsNow = stats.words || gameResult.wordCount;
    const previousTotal = totalWordsNow - gameResult.wordCount;
    if (previousTotal > 0 && stats.averageWordLength) {
      // Weighted average
      stats.averageWordLength = (
        (stats.averageWordLength * previousTotal) +
        (gameResult.averageWordLength * gameResult.wordCount)
      ) / totalWordsNow;
    } else {
      stats.averageWordLength = gameResult.averageWordLength;
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

  removeFromStorage(GUEST_SESSION_KEY);
  removeFromStorage(GUEST_STATS_KEY);
  removeFromStorage(GUEST_NAME_KEY);
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
    saveToStorage(GUEST_NAME_KEY, name);
    // Also update in stats
    const stats = getGuestStats();
    stats.guestName = name;
    saveGuestStats(stats);
  } catch (error) {
    logger.error('Error saving guest name:', error);
  }
}

/**
 * Get a fingerprint for the guest user (uses session ID)
 * Used for identifying unique guests in challenges
 */
export function getGuestFingerprint(): string | null {
  return getGuestSessionId();
}

/**
 * Get stored guest player name
 */
export function getGuestName(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    // First check dedicated key
    const name = getFromStorage(GUEST_NAME_KEY);
    if (name) return name;
    // Fall back to stats
    const stats = getGuestStats();
    return stats.guestName || null;
  } catch {
    return null;
  }
}

