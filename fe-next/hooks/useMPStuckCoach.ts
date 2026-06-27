import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  nextStuckStage,
  type StuckStage,
} from '../lib/ftue/mpStuckCoach';
import {
  trackMpStuckCoachShown,
  trackMpStuckCoachOutcome,
} from '../utils/posthogEngagement';
import {
  shouldShowGuidance,
  markGuidanceShown,
} from '../utils/contextualGuidanceStorage';

/** How long a hint stays up before auto-hiding (counts as "ignored"). */
export const AUTO_HIDE_MS = 10000;
/** How often we re-evaluate the stuck signals. */
const TICK_MS = 1000;

export interface UseMPStuckCoachArgs {
  /** The player can actually interact right now (playing, not spectating, not
   *  mid start-animation). Gating on this — not raw gameActive — prevents the
   *  coach popping at someone who physically cannot act yet. */
  active: boolean;
  /** Only the classic word-finding mode uses this coach. */
  isClassic: boolean;
  /** Lifetime games played — veterans are never tutorialised. */
  totalGamesPlayed: number;
  /** Mouse/desktop session — suppresses the touch-only tap hint. */
  isDesktop: boolean;
}

export interface MPStuckCoach {
  /** The stage currently being shown ('none' when hidden). */
  stage: StuckStage;
  visible: boolean;
  markTap: () => void;
  markDragStart: () => void;
  markSubmit: () => void;
  markAccepted: () => void;
  dismiss: (reason?: 'manual') => void;
}

/**
 * Single arbiter for classic-MP FTUE. Watches a handful of interaction counters,
 * decides AT MOST ONE help stage via the pure `nextStuckStage`, shows it once per
 * game, and reports the outcome (helped / dismissed / ignored) to PostHog.
 *
 * One coordinator — not three racing hooks — is what keeps this from being annoying.
 */
export function useMPStuckCoach(args: UseMPStuckCoachArgs): MPStuckCoach {
  const { active, isClassic, totalGamesPlayed, isDesktop } = args;

  const [stage, setStage] = useState<StuckStage>('none');
  const visible = stage !== 'none';

  // Mutable interaction counters + timing (refs so callbacks never re-render).
  const tapsRef = useRef(0);
  const dragsRef = useRef(0);
  const submitsRef = useRef(0);
  const acceptedRef = useRef(0);
  const startMsRef = useRef(0);
  const lastActivityRef = useRef(0);

  // One-shot per game: once decided we never re-arm.
  const decidedRef = useRef(false);
  const shownStageRef = useRef<StuckStage>('none');
  const shownAtMsRef = useRef(0);
  const autoHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoHide = useCallback(() => {
    if (autoHideRef.current) {
      clearTimeout(autoHideRef.current);
      autoHideRef.current = null;
    }
  }, []);

  // Reset everything whenever a fresh classic game begins.
  useEffect(() => {
    if (!active || !isClassic) return;
    tapsRef.current = 0;
    dragsRef.current = 0;
    submitsRef.current = 0;
    acceptedRef.current = 0;
    decidedRef.current = false;
    shownStageRef.current = 'none';
    shownAtMsRef.current = 0;
    startMsRef.current = Date.now();
    lastActivityRef.current = Date.now();
    setStage('none');
    clearAutoHide();
  }, [active, isClassic, clearAutoHide]);

  const hide = useCallback(() => {
    clearAutoHide();
    setStage('none');
  }, [clearAutoHide]);

  // Resolve the active hint with an outcome, exactly once.
  const resolve = useCallback(
    (outcome: 'helped' | 'dismissed' | 'ignored', msToValid?: number) => {
      if (shownStageRef.current === 'none') return;
      const resolvedStage = shownStageRef.current;
      shownStageRef.current = 'none';
      trackMpStuckCoachOutcome({ stage: resolvedStage, outcome, msToValid });
      hide();
    },
    [hide]
  );

  const show = useCallback(
    (next: StuckStage) => {
      decidedRef.current = true;
      shownStageRef.current = next;
      shownAtMsRef.current = Date.now();
      setStage(next);
      trackMpStuckCoachShown({ stage: next, gamesPlayed: totalGamesPlayed, isDesktop });
      markGuidanceShown('stuckCoachShown');
      clearAutoHide();
      autoHideRef.current = setTimeout(() => resolve('ignored'), AUTO_HIDE_MS);
    },
    [totalGamesPlayed, isDesktop, clearAutoHide, resolve]
  );

  // 1s ticker: re-evaluate stuck signals until we've decided (one-shot per game).
  useEffect(() => {
    if (!active || !isClassic) return;
    const id = setInterval(() => {
      if (decidedRef.current) return;
      const now = Date.now();
      const next = nextStuckStage({
        elapsedMs: now - startMsRef.current,
        idleMs: now - lastActivityRef.current,
        taps: tapsRef.current,
        dragsStarted: dragsRef.current,
        submits: submitsRef.current,
        accepted: acceptedRef.current,
        totalGamesPlayed,
        isDesktop,
        // Suppress across sessions once shown anywhere.
        alreadyShown: !shouldShowGuidance('stuckCoachShown'),
      });
      if (next !== 'none') show(next);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [active, isClassic, totalGamesPlayed, isDesktop, show]);

  useEffect(() => clearAutoHide, [clearAutoHide]);

  const markTap = useCallback(() => {
    lastActivityRef.current = Date.now();
    tapsRef.current += 1;
  }, []);
  const markDragStart = useCallback(() => {
    lastActivityRef.current = Date.now();
    dragsRef.current += 1;
  }, []);
  const markSubmit = useCallback(() => {
    lastActivityRef.current = Date.now();
    submitsRef.current += 1;
  }, []);
  const markAccepted = useCallback(() => {
    lastActivityRef.current = Date.now();
    acceptedRef.current += 1;
    // If a hint is up, the player just succeeded — that's the "helped" signal.
    if (shownStageRef.current !== 'none') {
      resolve('helped', Date.now() - shownAtMsRef.current);
    }
  }, [resolve]);

  const dismiss = useCallback(
    (_reason?: 'manual') => resolve('dismissed'),
    [resolve]
  );

  // Stable ref: feeds InGameScreen callback deps → grid onWordChange. A fresh
  // literal each render would break GridComponent's memo on every timer tick.
  return useMemo(
    () => ({ stage, visible, markTap, markDragStart, markSubmit, markAccepted, dismiss }),
    [stage, visible, markTap, markDragStart, markSubmit, markAccepted, dismiss]
  );
}
