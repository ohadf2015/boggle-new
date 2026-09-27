/**
 * useLeaderboardSync - Sync guest scores to leaderboard and fetch global rank
 *
 * For unauthenticated users, syncs their scores to the global leaderboard
 * and retrieves their rank position.
 */

import { useEffect, useRef, useState } from 'react';
import { getGuestSessionId, getGuestName } from '@/utils/guestManager';
import logger from '@/utils/logger';
import type { SinglePlayerResultsData } from '../../SinglePlayerView';

interface UseLeaderboardSyncParams {
  isAuthenticated: boolean;
  results: SinglePlayerResultsData;
  hasUpdatedStats: boolean;
}

interface LeaderboardSyncResult {
  globalRank: number | null;
  hasSyncedLeaderboard: boolean;
}

/**
 * Hook to sync guest scores to leaderboard and fetch global rank
 * Only runs for unauthenticated users, after stats have been updated
 */
export function useLeaderboardSync({
  isAuthenticated,
  results,
  hasUpdatedStats,
}: UseLeaderboardSyncParams): LeaderboardSyncResult {
  const [globalRank, setGlobalRank] = useState<number | null>(null);
  const hasSyncedLeaderboardRef = useRef(false);
  const hasFetchedGlobalRankRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  // Sync guest scores to leaderboard
  useEffect(() => {
    if (isAuthenticated || hasSyncedLeaderboardRef.current) return;
    if (!hasUpdatedStats) return; // Wait for stats update first

    async function syncToLeaderboard(): Promise<void> {
      try {
        const guestFingerprint = getGuestSessionId();
        if (!guestFingerprint) {
          logger.warn('[useLeaderboardSync] No guest fingerprint available');
          return;
        }

        const guestName = getGuestName() || 'Guest';
        const validWords = results.playerWordData?.filter(w => w.isValid) || [];
        const longestWord = validWords.reduce<string | undefined>(
          (longest, w) => (w.word.length > (longest?.length || 0) ? w.word : longest),
          undefined
        );

        const response = await fetch('/api/single-player/sync-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guestFingerprint,
            score: results.playerScore,
            wordCount: validWords.length,
            longestWord,
            username: guestName,
            avatarEmoji: '🎮',
            avatarColor: '#6366f1',
          }),
        });

        if (!response.ok) {
          throw new Error(`Leaderboard sync failed: ${response.status}`);
        }

        const result = await response.json();
        logger.log('[useLeaderboardSync] Leaderboard synced:', result);
      } catch (error) {
        // Transient infra (5xx/Load failed) is non-actionable — keep out of Sentry.
        const msg = error instanceof Error ? error.message : String(error);
        const isTransient =
          /\b5\d\d\b/.test(msg) || /Load failed|Failed to fetch|NetworkError/i.test(msg);
        if (isTransient) {
          logger.log('[useLeaderboardSync] Leaderboard sync transient error:', msg);
        } else {
          logger.warn('[useLeaderboardSync] Failed to sync leaderboard:', error);
        }
      }
    }

    void syncToLeaderboard();
    hasSyncedLeaderboardRef.current = true;
  }, [isAuthenticated, results, hasUpdatedStats]);

  // Fetch global rank after leaderboard sync
  useEffect(() => {
    if (isAuthenticated || hasFetchedGlobalRankRef.current) return;
    if (!hasSyncedLeaderboardRef.current) return;

    async function fetchGlobalRank(): Promise<void> {
      try {
        const guestFingerprint = getGuestSessionId();
        if (!guestFingerprint) return;

        const response = await fetch(`/api/single-player/stats/${encodeURIComponent(guestFingerprint)}`);

        if (!response.ok) {
          logger.warn('[useLeaderboardSync] Failed to fetch global rank:', response.status);
          return;
        }

        const data = await response.json();
        if (data.rank && mountedRef.current) {
          setGlobalRank(data.rank);
          logger.log('[useLeaderboardSync] Global rank fetched:', data.rank);
        }
      } catch (error) {
        logger.error('[useLeaderboardSync] Failed to fetch global rank:', error);
      }
    }

    void fetchGlobalRank();
    hasFetchedGlobalRankRef.current = true;
  }, [isAuthenticated]);

  return {
    globalRank,
    hasSyncedLeaderboard: hasSyncedLeaderboardRef.current,
  };
}
