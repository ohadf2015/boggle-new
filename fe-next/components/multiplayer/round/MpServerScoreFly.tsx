'use client';

import { memo } from 'react';
import { MpScoreFloaters } from './MpScoreFloaters';
import { useFreshLastWord, useServerFloaters } from './useServerFloaters';

/**
 * Server-scored "+N" over a canvas that keeps its own chrome (blast). It owns
 * the mpFeedback subscription, so an accepted word re-renders only this
 * overlay — never the board beside it. Pair it with BlastGame's
 * `hideClientScoreFly` so the client-computed fly never shows in MP.
 */
function MpServerScoreFlyImpl() {
  const floaters = useServerFloaters(useFreshLastWord());
  if (floaters.length === 0) return null;
  return (
    <div data-testid="mp-server-score-fly" aria-hidden="true" className="pointer-events-none fixed inset-0 z-30">
      <MpScoreFloaters floaters={floaters} />
    </div>
  );
}

export const MpServerScoreFly = memo(MpServerScoreFlyImpl);
MpServerScoreFly.displayName = 'MpServerScoreFly';
