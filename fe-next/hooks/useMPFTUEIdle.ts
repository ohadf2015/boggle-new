'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_KEY = 'mp_ftue_drag_v1';
const DEFAULT_IDLE_MS = 20_000;
const DEFAULT_AUTO_HIDE_MS = 12_000;

interface Options {
  enabled: boolean;
  wordsFound: number;
  idleMs?: number;
  autoHideMs?: number;
  storageKey?: string;
  onShown?: () => void;
}

interface Result {
  visible: boolean;
  markActivity: () => void;
  dismiss: () => void;
}

const readDismissed = (key: string): boolean => {
  if (typeof window === 'undefined') return false;
  try { return window.localStorage.getItem(key) === 'dismissed'; } catch { return false; }
};

const writeDismissed = (key: string) => {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(key, 'dismissed'); } catch { /* quota / private mode */ }
};

export function useMPFTUEIdle(opts: Options): Result {
  const {
    enabled,
    wordsFound,
    idleMs = DEFAULT_IDLE_MS,
    autoHideMs = DEFAULT_AUTO_HIDE_MS,
    storageKey = DEFAULT_KEY,
    onShown,
  } = opts;

  const [visible, setVisible] = useState(false);
  const dismissedRef = useRef<boolean>(readDismissed(storageKey));
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownOnceRef = useRef<boolean>(false);
  const onShownRef = useRef(onShown);
  onShownRef.current = onShown;

  const clearTimers = useCallback(() => {
    if (idleTimerRef.current) { clearTimeout(idleTimerRef.current); idleTimerRef.current = null; }
    if (autoHideTimerRef.current) { clearTimeout(autoHideTimerRef.current); autoHideTimerRef.current = null; }
  }, []);

  const dismiss = useCallback(() => {
    dismissedRef.current = true;
    writeDismissed(storageKey);
    clearTimers();
    setVisible(false);
  }, [clearTimers, storageKey]);

  const armIdleTimer = useCallback(() => {
    if (!enabled || dismissedRef.current || shownOnceRef.current) return;
    clearTimers();
    idleTimerRef.current = setTimeout(() => {
      shownOnceRef.current = true;
      setVisible(true);
      onShownRef.current?.();
      autoHideTimerRef.current = setTimeout(() => setVisible(false), autoHideMs);
    }, idleMs);
  }, [enabled, idleMs, autoHideMs, clearTimers]);

  const markActivity = useCallback(() => {
    if (visible) setVisible(false);
    armIdleTimer();
  }, [visible, armIdleTimer]);

  // Words-found short-circuit: persist + stop forever
  useEffect(() => {
    if (wordsFound > 0) {
      dismiss();
    }
  }, [wordsFound, dismiss]);

  // Arm on mount / when enabled flips
  useEffect(() => {
    armIdleTimer();
    return clearTimers;
  }, [armIdleTimer, clearTimers]);

  return { visible, markActivity, dismiss };
}
