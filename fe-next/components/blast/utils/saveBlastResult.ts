import type { BlastResultsData } from '../types';

/**
 * Fire-and-forget save of blast game results to the backend.
 * Silently no-ops for unauthenticated users (API returns 401).
 */
export function saveBlastResult(
  results: BlastResultsData,
  difficulty: string,
  language: string,
): void {
  fetch('/api/blast/result', {
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
  }).catch(() => {
    // Silent — don't block UX for save failures
  });
}
