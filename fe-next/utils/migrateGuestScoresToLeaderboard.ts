/**
 * Migrate existing guest localStorage scores to leaderboard
 * This utility helps users like Sandra who have accumulated points
 * in localStorage but haven't synced to the leaderboard yet.
 */

import { getGuestStats, getGuestName, getGuestSessionId } from './guestManager';
import logger from './logger';

export interface MigrationResult {
  success: boolean;
  totalScore?: number;
  gamesPlayed?: number;
  error?: string;
}

/**
 * Migrate all existing guest scores from localStorage to leaderboard
 * This is a one-time migration for existing users
 */
export async function migrateGuestScoresToLeaderboard(): Promise<MigrationResult> {
  try {
    // Get guest fingerprint (session ID)
    const guestFingerprint = getGuestSessionId();
    if (!guestFingerprint) {
      return { success: false, error: 'No guest session found' };
    }

    // Get existing stats from localStorage
    const stats = getGuestStats();
    if (stats.games === 0) {
      return { success: false, error: 'No games played yet' };
    }

    // Get guest name
    const guestName = getGuestName() || 'Guest';

    logger.info('[Migration] Syncing existing scores to leaderboard', {
      guestFingerprint,
      totalScore: stats.score,
      gamesPlayed: stats.games,
    });

    // Sync to leaderboard via API
    const response = await fetch('/api/single-player/sync-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guestFingerprint,
        score: stats.score,
        wordCount: stats.words,
        longestWord: stats.longestWord,
        username: guestName,
        avatarEmoji: '🎮',
        avatarColor: '#6366f1',
      }),
    });

    if (!response.ok) {
      throw new Error(`Migration failed: ${response.status}`);
    }

    const result = await response.json();
    logger.info('[Migration] Successfully synced scores to leaderboard', result);

    return {
      success: true,
      totalScore: result.totalScore,
      gamesPlayed: result.gamesPlayed,
    };
  } catch (error) {
    const err = error as Error;
    logger.error('[Migration] Failed to sync scores:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Check if migration is needed for this guest user
 */
export function needsMigration(): boolean {
  const stats = getGuestStats();
  return stats.games > 0;
}
