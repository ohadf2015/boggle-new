import { trackGameEnd, trackGameStart } from '@/utils/growthTracking';

export const WORD_TOWER_V2_MODE = 'word-tower-v2';

export type V2RunClock = { current: number | null };

export type V2RunEndStats = {
  floors: number;
  heightM: number;
};

/** First hoist of a run. Later hoists in the same run are no-ops. */
export function startV2Run(startedAt: V2RunClock): void {
  if (startedAt.current != null) return;
  startedAt.current = Date.now();
  trackGameStart(WORD_TOWER_V2_MODE, {});
}

/**
 * Collapse / end of run. Score is peak floors (this mode's unit of success).
 * `completed` is floors > 0 so a bounce stays abandoned and a climb credits
 * the retention streak via trackGameEnd.
 */
export function endV2Run(startedAt: V2RunClock, stats: V2RunEndStats): void {
  if (startedAt.current == null) return;
  const durationSec = Math.round((Date.now() - startedAt.current) / 1000);
  startedAt.current = null;
  const floors = Math.max(0, stats.floors);
  trackGameEnd(
    WORD_TOWER_V2_MODE,
    floors,
    floors,
    floors > 0,
    durationSec,
    { heightM: Math.round(stats.heightM), floors },
  );
}
