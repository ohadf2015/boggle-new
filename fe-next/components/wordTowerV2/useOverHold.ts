'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Phase } from './useTowerRun';

const ENDLESS_HOLD_MS = 1300;
const DAILY_HOLD_MS = 900;

export interface OverHold {
  /** The collapse beat is over: results may take the screen. */
  showOver: boolean;
  /** The player closed the results to look at the fallen tower. */
  resultsDismissed: boolean;
  /** True until the results have been closed once this run. */
  celebrate: boolean;
  dismiss: () => void;
  reopen: () => void;
}

/**
 * The beat between the tower falling and the results. The daily keeps it under
 * a second and lets a tap cut straight to the results; endless keeps its beat.
 * Everything resets the moment the run leaves 'over'.
 */
export function useOverHold(phase: Phase, daily: boolean): OverHold {
  const [showOver, setShowOver] = useState(false);
  const [resultsDismissed, setResultsDismissed] = useState(false);
  const [celebrated, setCelebrated] = useState(false);

  useEffect(() => {
    if (phase !== 'over') {
      setShowOver(false);
      setResultsDismissed(false);
      setCelebrated(false);
      return;
    }
    const show = () => setShowOver(true);
    const id = window.setTimeout(show, daily ? DAILY_HOLD_MS : ENDLESS_HOLD_MS);
    if (daily) window.addEventListener('pointerdown', show, { once: true });
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('pointerdown', show);
    };
  }, [phase, daily]);

  const dismiss = useCallback(() => {
    setResultsDismissed(true);
    setCelebrated(true);
  }, []);
  const reopen = useCallback(() => setResultsDismissed(false), []);

  return { showOver, resultsDismissed, celebrate: !celebrated, dismiss, reopen };
}
