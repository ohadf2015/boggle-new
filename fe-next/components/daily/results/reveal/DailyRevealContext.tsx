'use client';

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { REVEAL, useRevealSequence, type RevealSequence } from './revealSequence';

export interface DailyReveal extends RevealSequence {
  /** True while a first-finish reveal is playing or has played in this view. */
  active: boolean;
  inProvider: boolean;
  /** One-shot side effects (confetti): first caller wins. Some screens mount the hero twice (mobile + desktop). */
  claimCelebration: () => boolean;
}

const SETTLED: DailyReveal = {
  stage: REVEAL.done,
  done: true,
  skipped: false,
  skip: () => {},
  active: false,
  inProvider: false,
  claimCelebration: () => true,
};

const DailyRevealContext = createContext<DailyReveal>(SETTLED);

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Shares one reveal timeline between a results screen's hero, details and next-quest CTA. */
export function DailyRevealProvider({ celebrate, children }: { celebrate: boolean; children: React.ReactNode }) {
  const [reduced] = useState(prefersReducedMotion);
  const active = celebrate && !reduced;
  const seq = useRevealSequence(active);
  const claimed = useRef(false);
  const claimCelebration = useCallback(() => {
    if (claimed.current) return false;
    claimed.current = true;
    return true;
  }, []);
  const { stage, done, skipped, skip } = seq;
  const value = useMemo<DailyReveal>(
    () => ({ stage, done, skipped, skip, active, inProvider: true, claimCelebration }),
    [stage, done, skipped, skip, active, claimCelebration],
  );
  return <DailyRevealContext.Provider value={value}>{children}</DailyRevealContext.Provider>;
}

export function useDailyReveal(): DailyReveal {
  return useContext(DailyRevealContext);
}

/** True when this consumer mounted after the shared reveal had already finished (e.g. a tab switch remount): render settled. */
export function useMountedAfterReveal(): boolean {
  const reveal = useContext(DailyRevealContext);
  const [late] = useState(() => reveal.inProvider && reveal.done);
  return late;
}
