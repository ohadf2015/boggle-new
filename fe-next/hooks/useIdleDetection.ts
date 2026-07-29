import { useCallback, useEffect, useRef } from 'react';

export interface UseIdleDetectionOptions {
  enabled: boolean;
  thresholdMs: number;
  onIdle: () => void;
  sessionKey: string | number;
}

export interface UseIdleDetectionResult {
  reportActivity: () => void;
}

export function useIdleDetection({
  enabled,
  thresholdMs,
  onIdle,
  sessionKey,
}: UseIdleDetectionOptions): UseIdleDetectionResult {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);
  const onIdleRef = useRef(onIdle);

  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const schedule = useCallback(() => {
    clear();
    if (!enabled || firedRef.current) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (firedRef.current) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      firedRef.current = true;
      onIdleRef.current();
    }, thresholdMs);
  }, [enabled, thresholdMs, clear]);

  useEffect(() => {
    firedRef.current = false;
    schedule();
    return clear;
  }, [sessionKey, schedule, clear]);

  const reportActivity = useCallback(() => {
    if (firedRef.current) return;
    schedule();
  }, [schedule]);

  return { reportActivity };
}
