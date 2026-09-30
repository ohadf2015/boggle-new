'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { trackWt2Exit, type Wt2Screen } from '@/lib/wordTowerV2/exitTracking';

export interface UseV2ExitArgs {
  phase: string;
  floors: number;
  daily: boolean;
  finish: () => void;
  bankRun: () => Promise<void>;
  router: AppRouterInstance;
  language: string;
  getScreen: () => Wt2Screen;
  t: (key: string) => string;
  /** Daily: save the tower and score before leaving. */
  flushDaily?: () => void;
}

export interface LeaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  cancelText: string;
  confirmText: string;
  onConfirm: () => void;
  variant: 'danger';
  analyticsId: string;
  analyticsExtras: { daily: boolean };
}

export function useV2Exit({
  phase,
  floors,
  daily,
  finish,
  bankRun,
  router,
  language,
  getScreen,
  t,
  flushDaily,
}: UseV2ExitArgs) {
  const [leaveOpen, setLeaveOpen] = useState(false);
  const exitingRef = useRef(false);

  const titleKey = daily ? 'wordTowerV2.leaveDaily.title' : 'wordTowerV2.leaveFree.title';
  const descKey = daily ? 'wordTowerV2.leaveDaily.desc' : 'wordTowerV2.leaveFree.desc';

  const leaveDialog = useMemo<LeaveDialogProps>(() => ({
    open: leaveOpen,
    onOpenChange: (nextOpen) => {
      if (!nextOpen) setLeaveOpen(false);
    },
    title: t(titleKey),
    description: t(descKey),
    cancelText: t('wordTowerV2.leaveKeep'),
    confirmText: t('wordTowerV2.leaveGo'),
    onConfirm: () => {
      setLeaveOpen(false);
      finish();
    },
    variant: 'danger',
    analyticsId: 'wt2_leave',
    analyticsExtras: { daily },
  }), [leaveOpen, daily, t, titleKey, descKey, finish]);

  // A daily tower saves itself, so leaving it is safe and returns to the daily
  // hub (the next quest is one tap away); the free tower goes to the home screen.
  const destination = daily ? `/${language}/daily` : `/${language}`;

  const requestExit = useCallback(async () => {
    // Mid-run on the FREE tower: leaving is a cash-out, so ask first.
    if (!daily && phase !== 'over' && floors > 0) {
      setLeaveOpen(true);
      return Promise.resolve();
    }

    // Phase over: immediately exit with tracking
    if (!exitingRef.current) {
      exitingRef.current = true;
      const screen = getScreen();
      trackWt2Exit(screen);
      flushDaily?.();
      await Promise.race([bankRun(), new Promise((r) => window.setTimeout(r, 1500))]);
      router.push(destination);
    }
  }, [daily, phase, floors, bankRun, router, destination, getScreen, flushDaily]);

  const confirmLeave = useCallback(() => {
    setLeaveOpen(false);
    finish();
  }, [finish]);

  const cancelLeave = useCallback(() => {
    setLeaveOpen(false);
  }, []);

  const goHome = useCallback(() => {
    void requestExit();
  }, [requestExit]);

  return {
    leaveDialog,
    requestExit,
    confirmLeave,
    cancelLeave,
    goHome,
  };
}
