/**
 * Preloads critical results page chunks to avoid jank during score reveal.
 * Call when game timer reaches ≤10 seconds.
 *
 * Each import() is idempotent — calling it on an already-loaded module
 * returns the cached module instantly (no duplicate network requests).
 */

let preloaded = false;

export function preloadResultsChunks(): void {
  if (preloaded) return;
  preloaded = true;

  // Core results layout and content
  void import('@/components/results/ResultsMainContent');
  void import('@/components/results/ResultsModals');

  // High-visibility results components
  void import('@/components/results/ResultsWinnerBanner');
  void import('@/components/results/RewardsSummary');
}
