/**
 * Start downloading a mode's board while the wheel strike plays.
 *
 * Each board is a next/dynamic chunk fetched when the round mounts, and Blast
 * and Wheel start their 60-second clock on mount — on a slow phone the first
 * seconds of the round went to a download. The strike hold is a real wait
 * (round fetch + a minimum beat), so the chunk can load inside it. Same import
 * paths as QuickModeAdapter / BlastQuickRound, so the bundler shares one chunk.
 * Best effort: a failed preload only means next/dynamic fetches it on mount.
 */
import type { QuickMode } from '../types';

const LOADERS: Record<QuickMode, () => Promise<unknown>> = {
  classic: () => import('./QuickClassicBoard'),
  blast: () => import('@/components/blast/legacy/BlastGame'),
  'word-hunt': () => import('@/components/daily/DailyWordHuntSurvival'),
  'wheel-rush': () => import('@/components/daily/WordWheelGame'),
};

export function preloadQuickMode(mode: QuickMode): void {
  try {
    void LOADERS[mode]?.().catch(() => undefined);
  } catch {
    /* preload is a hint, never a failure */
  }
}
