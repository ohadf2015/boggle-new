'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  loadProgress,
  recordBridge,
  recordPlayDay,
  rankFor,
  type BridgeProgress,
  type RankId,
  type RankStanding,
} from '@/lib/connections/progress';

const EMPTY: BridgeProgress = { bridges: 0, days: [] };

export interface BridgeProgressApi {
  progress: BridgeProgress;
  standing: RankStanding;
  /** Set for the one bridge that crossed a rank threshold; cleared by `dismissRankUp`. */
  rankUpId: RankId | null;
  onBridgeSolved: () => void;
  onDayPlayed: (dateISO: string) => void;
  dismissRankUp: () => void;
}

/** Device-local lifetime progress (see lib/connections/progress). Hydrates after mount. */
export function useBridgeProgress(): BridgeProgressApi {
  const [progress, setProgress] = useState<BridgeProgress>(EMPTY);
  const [rankUpId, setRankUpId] = useState<RankId | null>(null);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  const onBridgeSolved = useCallback(() => {
    const res = recordBridge();
    setProgress(res.progress);
    if (res.rankedUp) setRankUpId(res.standing.rank.id);
  }, []);
  const onDayPlayed = useCallback((dateISO: string) => setProgress(recordPlayDay(dateISO)), []);
  const dismissRankUp = useCallback(() => setRankUpId(null), []);

  return { progress, standing: rankFor(progress.bridges), rankUpId, onBridgeSolved, onDayPlayed, dismissRankUp };
}
