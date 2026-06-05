import type { BlastResultsData } from '../types';

/**
 * Subset of the /api/blast/result response the UI cares about for result-screen enrichment.
 */
export interface SavedBlastResultPatch {
  /** Weekly leaderboard percentile (1-100), or null if unranked / Redis down. */
  percentile?: number;
  /** Previous best score for this difficulty, so the UI can show a PB delta. */
  previousBest?: number;
  /** True when this run set a new personal-best score. */
  isNewBestScore?: boolean;
}

/**
 * Save a blast game result to the backend and resolve with an enrichment patch.
 * Never rejects — unauthenticated users (401) and network errors resolve to null
 * so the game loop is never blocked by a save failure.
 */
/** Read the cached session user id WITHOUT a network round-trip (getSession is
 * local; getUser would hit the network and fail offline). */
async function getCachedUserId(): Promise<string | null> {
  try {
    const { createClient } = await import('@/utils/supabase/client');
    const { data } = await createClient().auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function saveBlastResult(
  results: BlastResultsData,
  difficulty: string,
  language: string,
): Promise<SavedBlastResultPatch | null> {
  // Offline: queue the result so it isn't lost — it syncs (and credits XP /
  // leaderboard) on reconnect via /api/scores/sync → dispatchBlast. Needs an
  // authenticated user to credit; guests fall through (nothing to sync to).
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    try {
      const userId = await getCachedUserId();
      if (userId) {
        const [{ getOfflineStore }, { enqueueScore }] = await Promise.all([
          import('@/lib/offline'),
          import('@/lib/offline/scoreQueue'),
        ]);
        const store = await getOfflineStore();
        await enqueueScore(store, 'blast', {
          score: results.finalScore,
          tilesCleared: results.tilesCleared,
          totalTiles: results.totalTiles,
          clearPercentage: results.clearPercentage,
          wordsFound: results.wordsFound,
          bestWord: results.bestWord,
          maxCombo: results.maxCombo,
          stars: results.stars,
          difficulty,
          language,
        });
        // Queued — return an (empty) patch so the UI proceeds, not null which
        // reads as "save failed".
        return {};
      }
    } catch {
      // Fall through to the online attempt (which will likely fail → null).
    }
  }

  try {
    const res = await fetch('/api/blast/result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        score: results.finalScore,
        tilesCleared: results.tilesCleared,
        totalTiles: results.totalTiles,
        clearPercentage: results.clearPercentage,
        wordsFound: results.wordsFound,
        bestWord: results.bestWord,
        maxCombo: results.maxCombo,
        stars: results.stars,
        difficulty,
        language,
      }),
    });
    if (!res.ok) return null;

    const body = (await res.json()) as {
      percentile?: number | null;
      previousBest?: number | null;
      isNewBestScore?: boolean;
    };

    return {
      percentile: body.percentile ?? undefined,
      previousBest: body.previousBest ?? undefined,
      isNewBestScore: body.isNewBestScore,
    };
  } catch {
    return null;
  }
}
