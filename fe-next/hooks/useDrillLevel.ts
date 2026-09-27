'use client';

/**
 * useDrillLevel
 *
 * Returns the player's current level for a given drill type, sourced
 * from their `drill_progress` row. Defaults to level 1 for first-play
 * (no progress row yet) and clamps stored values into the supported
 * `[MIN_DRILL_LEVEL, MAX_DRILL_LEVEL]` range so the drill component
 * always renders a valid `LEVEL_CONFIGS` entry.
 *
 * Pairs with the server-side promotion in `/api/drills/submit` so the
 * client never has to compute level math itself.
 */

import { useMemo } from 'react';
import { useBrainScore } from './useBrainScore';
import type { DrillType } from '@/shared/types/cognitive';
import { MAX_DRILL_LEVEL, MIN_DRILL_LEVEL } from '@/shared/utils/drillLeveling';

export function useDrillLevel(drillType: DrillType): number {
  const { drillProgress } = useBrainScore();

  return useMemo(() => {
    const row = drillProgress.find((p) => p.drillType === drillType);
    const stored = row?.level;
    if (typeof stored !== 'number' || !Number.isFinite(stored)) {
      return MIN_DRILL_LEVEL;
    }
    return Math.min(MAX_DRILL_LEVEL, Math.max(MIN_DRILL_LEVEL, Math.floor(stored)));
  }, [drillProgress, drillType]);
}
