/**
 * useRoundEndReveal — the clock behind the staged podium.
 *
 * One timer per step of `roundEndTimeline()`, cleared on unmount so a Rematch
 * cannot be interrupted by the previous round's reveal firing into the new one
 * (Pitfall Class 2: a mutable thing that survives a round boundary).
 *
 * Every path that is not a played-out reveal starts on the RESTING stage —
 * reduced motion, `enabled: false`, and the server render. That is what makes
 * "fully painted with no tween required" true rather than aspirational: the
 * reveal is an enhancement layered on a finished screen, never a gate in front
 * of one.
 */

'use client';

import { useEffect, useState } from 'react';
import {
  FINAL_STAGE,
  roundEndTimeline,
  type RoundEndStage,
} from '@/lib/education/roundEndStage';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    // A stubbed matchMedia in a test harness may throw; treat as "no preference".
    return false;
  }
}

export function useRoundEndReveal(enabled: boolean): RoundEndStage {
  // Lazy initial state, so the very first paint of a reduced-motion or
  // disabled reveal is already the resting one — no flash of a staged frame.
  const [stage, setStage] = useState<RoundEndStage>(() =>
    enabled && !prefersReducedMotion() ? roundEndTimeline()[0].stage : FINAL_STAGE
  );

  useEffect(() => {
    if (!enabled || prefersReducedMotion()) {
      setStage(FINAL_STAGE);
      return;
    }
    const timers = roundEndTimeline()
      .filter((step) => step.at > 0)
      .map((step) => setTimeout(() => setStage(step.stage), step.at));
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [enabled]);

  return stage;
}

export default useRoundEndReveal;
