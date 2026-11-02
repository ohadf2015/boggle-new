import { useCallback, useEffect, useState } from 'react';

/** Results reveal beats, in order. Layout never waits on these: they only start decoration. */
export const REVEAL = { start: 0, score: 1, stats: 2, stamp: 3, details: 4, done: 5 } as const;
export type RevealStage = (typeof REVEAL)[keyof typeof REVEAL];

/** When each beat starts, ms after mount. */
export const REVEAL_TIMELINE_MS: Record<RevealStage, number> = {
  0: 0,
  1: 250,
  2: 1000,
  3: 1400,
  4: 1750,
  5: 2300,
};

export interface RevealSequence {
  stage: RevealStage;
  done: boolean;
  /** True when the player tapped through: consumers should jump, not tween. */
  skipped: boolean;
  skip: () => void;
}

export function useRevealSequence(active: boolean): RevealSequence {
  const [stage, setStage] = useState<RevealStage>(active ? REVEAL.start : REVEAL.done);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    if (!active) {
      setStage(REVEAL.done);
      return;
    }
    const timers = ([REVEAL.score, REVEAL.stats, REVEAL.stamp, REVEAL.details, REVEAL.done] as RevealStage[]).map((s) =>
      setTimeout(() => setStage((cur) => (cur < s ? s : cur)), REVEAL_TIMELINE_MS[s]),
    );
    return () => timers.forEach(clearTimeout);
  }, [active]);

  const skip = useCallback(() => {
    setStage((cur) => {
      if (cur !== REVEAL.done) setSkipped(true);
      return REVEAL.done;
    });
  }, []);

  const settled = active ? stage : REVEAL.done;
  return { stage: settled, done: settled === REVEAL.done, skipped, skip };
}
