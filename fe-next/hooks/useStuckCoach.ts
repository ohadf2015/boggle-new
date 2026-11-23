import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { nextStuckStage, shouldEscalate, type StuckStage } from '../lib/ftue/mpStuckCoach';
import { isModeCoached, rememberMode, type StuckCoachMode } from '../lib/ftue/stuckCoachMemory';
import { trackMpStuckCoachShown, trackMpStuckCoachOutcome } from '../utils/posthogEngagement';
import { isCoachOnScreen } from '@/lib/tutorial/modeCoachStore';
import { useCoachExampleWord } from './useCoachExampleWord';
import type { LetterGrid } from '@/shared/types/game';

/** How long a hint stays up before auto-hiding (counts as "ignored"). */
export const AUTO_HIDE_MS = 10000;
const TICK_MS = 1000;

type Outcome = 'helped' | 'dismissed' | 'ignored';
type Phase = 'watching' | 'first' | 'escalate' | 'second' | 'done';

export interface UseStuckCoachArgs {
  mode: StuckCoachMode;
  /** The player can act right now (board live, not paused, no tutorial running). */
  active: boolean;
  /** A new round / wave / grid starts a new episode. */
  sessionKey?: string | number;
  /** Valid words this round, from the mode's own count. */
  wordsFound: number;
  /** Lifetime games, only where the count is trustworthy (classic MP). */
  totalGamesPlayed?: number;
  /** Mouse session — suppresses the touch-only tap hint. */
  isDesktop?: boolean;
  idleThresholdMs?: number;
  /** Letter grid for the "Try: WORD" escalation; omit where the board isn't a grid. */
  grid?: LetterGrid | null;
  language?: string;
  onShown?: (stage: StuckStage) => void;
  onDismissed?: () => void;
  /** Ungated `dead_time_detected` telemetry: fires for everyone, once per session. */
  deadTime?: { enabled: boolean; thresholdMs: number; onDeadTime: () => void };
}

export interface StuckCoach {
  mode: StuckCoachMode;
  stage: StuckStage;
  visible: boolean;
  exampleWord: string | null;
  markActivity: () => void;
  markTap: () => void;
  markDragStart: () => void;
  markSubmit: () => void;
  dismiss: () => void;
}

/**
 * The one stuck-player detector for every word mode: at most a nudge and one
 * escalation per mode, ever, and never for someone who has scored there.
 */
export function useStuckCoach(args: UseStuckCoachArgs): StuckCoach {
  const { mode, active, sessionKey, wordsFound, totalGamesPlayed, isDesktop = false, idleThresholdMs, grid, language } = args;

  const [stage, setStage] = useState<StuckStage>('none');
  const visible = stage !== 'none';
  const exampleWord = useCoachExampleWord({ stage, grid: grid ?? null, language: language || 'en' });

  const tapsRef = useRef(0);
  const dragsRef = useRef(0);
  const submitsRef = useRef(0);
  const startMsRef = useRef(0);
  const lastActivityRef = useRef(0);
  const deadLastActivityRef = useRef(0);
  const deadFiredRef = useRef(false);
  const phaseRef = useRef<Phase>('done');
  const shownStageRef = useRef<StuckStage>('none');
  const shownAtMsRef = useRef(0);
  const hiddenAtMsRef = useRef(0);
  const autoHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wordsRef = useRef(wordsFound);
  wordsRef.current = wordsFound;
  const exampleRef = useRef(exampleWord);
  exampleRef.current = exampleWord;
  const callbacksRef = useRef({ onShown: args.onShown, onDismissed: args.onDismissed, deadTime: args.deadTime });
  callbacksRef.current = { onShown: args.onShown, onDismissed: args.onDismissed, deadTime: args.deadTime };

  const clearAutoHide = useCallback(() => {
    if (autoHideRef.current) {
      clearTimeout(autoHideRef.current);
      autoHideRef.current = null;
    }
  }, []);

  const resolve = useCallback(
    (outcome: Outcome, msToValid?: number) => {
      const resolved = shownStageRef.current;
      if (resolved === 'none') return;
      shownStageRef.current = 'none';
      trackMpStuckCoachOutcome({ stage: resolved, mode, outcome, msToValid });
      clearAutoHide();
      setStage('none');
      if (phaseRef.current === 'first' && outcome === 'ignored') {
        phaseRef.current = 'escalate';
        hiddenAtMsRef.current = Date.now();
      } else {
        phaseRef.current = 'done';
      }
    },
    [mode, clearAutoHide]
  );

  const show = useCallback(
    (next: StuckStage) => {
      phaseRef.current = phaseRef.current === 'watching' ? 'first' : 'second';
      shownStageRef.current = next;
      shownAtMsRef.current = Date.now();
      setStage(next);
      rememberMode(mode, 'shown');
      trackMpStuckCoachShown({ stage: next, mode, gamesPlayed: totalGamesPlayed, isDesktop });
      callbacksRef.current.onShown?.(next);
      clearAutoHide();
      autoHideRef.current = setTimeout(() => resolve('ignored'), AUTO_HIDE_MS);
    },
    [mode, totalGamesPlayed, isDesktop, clearAutoHide, resolve]
  );

  // A new episode per round; once-ever memory decides whether it can show at all.
  useEffect(() => {
    if (!active) {
      if (shownStageRef.current !== 'none') resolve('ignored');
      phaseRef.current = 'done';
      return;
    }
    tapsRef.current = 0;
    dragsRef.current = 0;
    submitsRef.current = 0;
    startMsRef.current = Date.now();
    lastActivityRef.current = Date.now();
    shownStageRef.current = 'none';
    clearAutoHide();
    setStage('none');
    phaseRef.current = isModeCoached(mode) || wordsRef.current > 0 ? 'done' : 'watching';
  }, [active, sessionKey, mode, clearAutoHide, resolve]);

  useEffect(() => {
    deadFiredRef.current = false;
    deadLastActivityRef.current = Date.now();
  }, [sessionKey]);

  useEffect(() => {
    if (wordsFound <= 0) return;
    rememberMode(mode, 'found');
    if (shownStageRef.current !== 'none') resolve('helped', Date.now() - shownAtMsRef.current);
    phaseRef.current = 'done';
  }, [wordsFound, mode, resolve]);

  const deadEnabled = !!args.deadTime?.enabled;
  useEffect(() => {
    if (deadEnabled) deadLastActivityRef.current = Date.now();
  }, [deadEnabled]);
  useEffect(() => {
    if (!active && !deadEnabled) return;
    const id = setInterval(() => {
      const now = Date.now();
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        lastActivityRef.current = now;
        deadLastActivityRef.current = now;
        return;
      }
      const dead = callbacksRef.current.deadTime;
      if (dead?.enabled && !deadFiredRef.current && now - deadLastActivityRef.current >= dead.thresholdMs) {
        deadFiredRef.current = true;
        dead.onDeadTime();
      }

      if (!active) return;
      const phase = phaseRef.current;
      if (phase !== 'watching' && phase !== 'escalate') return;
      if (isCoachOnScreen()) {
        lastActivityRef.current = now;
        return;
      }
      if (phase === 'escalate') {
        if (shouldEscalate({ firstOutcome: 'ignored', accepted: wordsRef.current, msSinceFirstHidden: now - hiddenAtMsRef.current, hasExample: !!exampleRef.current })) {
          show('example');
        }
        return;
      }
      const next = nextStuckStage({
        elapsedMs: now - startMsRef.current,
        idleMs: now - lastActivityRef.current,
        taps: tapsRef.current,
        dragsStarted: dragsRef.current,
        submits: submitsRef.current,
        accepted: wordsRef.current,
        totalGamesPlayed,
        isDesktop,
        alreadyShown: false,
        idleThresholdMs,
      });
      if (next !== 'none') show(next);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [active, deadEnabled, totalGamesPlayed, isDesktop, idleThresholdMs, show]);

  useEffect(() => clearAutoHide, [clearAutoHide]);

  const markActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    deadLastActivityRef.current = Date.now();
  }, []);
  const markTap = useCallback(() => {
    markActivity();
    tapsRef.current += 1;
  }, [markActivity]);
  const markDragStart = useCallback(() => {
    markActivity();
    dragsRef.current += 1;
  }, [markActivity]);
  const markSubmit = useCallback(() => {
    markActivity();
    submitsRef.current += 1;
  }, [markActivity]);
  const dismiss = useCallback(() => {
    if (shownStageRef.current === 'none') return;
    resolve('dismissed');
    callbacksRef.current.onDismissed?.();
  }, [resolve]);

  // Stable ref: feeds grid callback deps; a fresh literal per tick breaks the grid's memo.
  return useMemo(
    () => ({ mode, stage, visible, exampleWord, markActivity, markTap, markDragStart, markSubmit, dismiss }),
    [mode, stage, visible, exampleWord, markActivity, markTap, markDragStart, markSubmit, dismiss]
  );
}
