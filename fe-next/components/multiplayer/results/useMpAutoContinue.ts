'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useExperiment } from '@/hooks/useExperiment';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { useAutoAdvance } from './useAutoAdvance';

/** The intermission ring's length (unchanged from the legacy screen). */
export const AUTO_ADVANCE_SECONDS = 10;

type Branch = 'intermission' | 'final' | null;
type Action = 'start' | 'newSeries' | 'ready';

export interface AutoContinuePlan {
  enabled: boolean;
  cancelScope: 'session' | 'screen';
  action: Action;
  labelKey: string;
}

/**
 * exp-mp-auto-continue-v1, as data. control = today's ring (between rounds,
 * a cancel lasts the session). auto-continue = the series final also counts
 * down (host: new series; joiner: ready) and a cancel lasts one screen.
 * Never in a classroom; never for a joiner who already pressed I'M IN.
 */
export function autoContinuePlan({ variant, branch, isClassroom, isHost, isReady }: {
  variant: string;
  branch: Branch;
  isClassroom: boolean;
  isHost: boolean;
  isReady: boolean;
}): AutoContinuePlan {
  const treatment = variant === 'auto-continue';
  const branchOn = branch === 'intermission' || (treatment && branch === 'final');
  const action: Action = !isHost ? 'ready' : branch === 'final' ? 'newSeries' : 'start';
  return {
    enabled: branchOn && !isClassroom && (isHost || !isReady),
    cancelScope: treatment ? 'screen' : 'session',
    action,
    labelKey: branch === 'final' ? 'mpUi.results.autoRematchIn' : 'mpUi.results.autoIn',
  };
}

interface Options {
  branch: Branch;
  isClassroom: boolean;
  isHost: boolean;
  isReady: boolean;
  /** The reveal has handed over to the footer. */
  armed: boolean;
  /** A sheet / modal / mid-ad member holds the ring. */
  paused: boolean;
  /** CrazyGames: never remember a cancel. */
  persistCancel: boolean;
  onStartNext: () => void;
  onNewSeries: () => void;
  onReady: () => void;
}

/**
 * The results screen's ONE auto-advance ring (useAutoAdvance) under
 * exp-mp-auto-continue-v1, plus its telemetry in both arms:
 * growth:replay_countdown_shown when it starts counting, and
 * growth:results_autoplay_cancelled when someone stops it.
 */
export function useMpAutoContinue({ branch, isClassroom, isHost, isReady, armed, paused, persistCancel, onStartNext, onNewSeries, onReady }: Options) {
  const { variant, trackExposure } = useExperiment('exp-mp-auto-continue-v1');
  const plan = autoContinuePlan({ variant, branch, isClassroom, isHost, isReady });
  const handlers = { start: onStartNext, newSeries: onNewSeries, ready: onReady };
  const auto = useAutoAdvance({
    seconds: AUTO_ADVANCE_SECONDS,
    armed,
    paused,
    enabled: plan.enabled,
    onFire: handlers[plan.action],
    persistCancel,
    cancelScope: plan.cancelScope,
  });

  const role = isHost ? 'host' : 'player';
  const counting = auto.active && armed && !paused;
  const shownRef = useRef(false);
  useEffect(() => {
    if (!counting || shownRef.current) return;
    shownRef.current = true;
    trackExposure();
    trackGrowthEvent('replay_countdown_shown', { surface: 'mp_results', branch, role, seconds: AUTO_ADVANCE_SECONDS, variant });
  }, [counting, branch, role, variant, trackExposure]);

  const { cancel: stop, active, secondsLeft } = auto;
  const cancel = useCallback(() => {
    if (active) {
      trackGrowthEvent('results_autoplay_cancelled', { surface: 'mp_results', branch, role, seconds_left: secondsLeft, variant });
    }
    stop();
  }, [active, branch, role, secondsLeft, variant, stop]);

  return {
    active: auto.active,
    secondsLeft: auto.secondsLeft,
    total: AUTO_ADVANCE_SECONDS,
    cancel,
    clearCancel: auto.clearCancel,
    labelKey: plan.labelKey,
  };
}
