// Brain-drill analytics. Routes a completed drill through the shared trackGameEnd
// so it persists to analytics_events — the admin game log's source. Called from
// the single drill chokepoint (useSaveDrillResult) so every drill type is covered.

import { trackGameEnd } from '@/utils/growthTracking';

export interface BrainDrillEndResult {
  drillType: string;
  level: number;
  score: number;
  durationSeconds: number;
  wordsFound: number;
}

export function emitBrainDrillGameEnd(result: BrainDrillEndResult): void {
  trackGameEnd('brain-drill', result.score, result.wordsFound, true, result.durationSeconds, {
    isWinner: true,
    drillType: result.drillType,
    level: result.level,
  });
}
