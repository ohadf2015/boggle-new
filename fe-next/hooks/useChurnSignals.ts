/**
 * useChurnSignals Hook
 *
 * Internal hook for tracking session-level engagement signals.
 * Accumulates signals in localStorage and reports them to
 * /api/growth/churn-signals every 5 minutes or on session end.
 * NOT a user-facing hook.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { postWithAuth } from '@/utils/authFetch';
import logger from '@/utils/logger';

const STORAGE_KEY = 'lexiclash_churn_signals';
const REPORT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const ENDPOINT = '/api/growth/churn-signals';

interface StoredSignals {
  sessionStartedAt: number;
  gamesPlayed: number;
  socialInteractions: number;
  notificationDismissals: number;
  lastReportedAt: number;
}

export interface UseChurnSignalsReturn {
  reportSignals: () => Promise<void>;
  currentSessionLength: number;
  trackGamePlayed: () => void;
  trackSocialInteraction: () => void;
  trackNotificationDismissal: () => void;
}

function getStoredSignals(): StoredSignals {
  if (typeof window === 'undefined') {
    return {
      sessionStartedAt: Date.now(),
      gamesPlayed: 0,
      socialInteractions: 0,
      notificationDismissals: 0,
      lastReportedAt: 0,
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StoredSignals;
  } catch {
    // Ignore parse errors
  }

  const fresh: StoredSignals = {
    sessionStartedAt: Date.now(),
    gamesPlayed: 0,
    socialInteractions: 0,
    notificationDismissals: 0,
    lastReportedAt: 0,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

function saveSignals(signals: StoredSignals): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(signals));
}

function buildPayload(userId: string, signals: StoredSignals) {
  return {
    userId,
    avgSessionLengthSeconds: Math.floor((Date.now() - signals.sessionStartedAt) / 1000),
    gamesPerSession: signals.gamesPlayed,
    socialInteractions: signals.socialInteractions,
    notificationDismissals: signals.notificationDismissals,
  };
}

export function useChurnSignals(): UseChurnSignalsReturn {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [sessionLength, setSessionLength] = useState(0);
  const signalsRef = useRef<StoredSignals>(getStoredSignals());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reportIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Guards against overlapping in-flight reports. A failed/slow request must
  // never queue up a backlog of concurrent POSTs.
  const inFlightRef = useRef(false);

  // Stable across renders (depends only on userId). Previously this depended on
  // the react-query mutation object, whose identity changed on every render —
  // and because the 1Hz session-length tick re-renders the component, the
  // report interval below was torn down and recreated every second (so it
  // never actually fired, and the constant timer churn degraded the app).
  const reportSignals = useCallback(async () => {
    if (!userId) return;
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    const signals = signalsRef.current;
    try {
      const response = await postWithAuth(ENDPOINT, buildPayload(userId, signals));
      if (!response.ok) {
        // Best-effort telemetry beacon — a failed report never affects the user.
        // 5xx (proxy 502 when the single Railway instance restarts / hangs),
        // 429 throttling, and 401 token-expiry are transient/expected conditions
        // for a fire-and-forget beacon: log at debug only (the sole Sentry-excluded
        // level — see utils/logger.ts). A 400/403 is a real contract/authz
        // regression worth surfacing, so warn → Sentry. The genuine 502 root
        // (a missing in-process SUPABASE_JWT_SECRET making remote auth hang) is
        // alarmed server-side in getBearerUser, so silencing here is not blinding.
        // Sentry JAVASCRIPT-NEXTJS-1KQ.
        if (response.status >= 500 || response.status === 429 || response.status === 401) {
          logger.debug(`useChurnSignals: transient report failure, status ${response.status}`);
        } else {
          logger.warn(`useChurnSignals: report rejected, status ${response.status}`);
        }
        return;
      }
      signalsRef.current = { ...signalsRef.current, lastReportedAt: Date.now() };
      saveSignals(signalsRef.current);
    } catch (err) {
      // Network/unexpected failure (fetch rejected, offline). Still best-effort
      // and never user-facing — keep it out of Sentry. Pass the Error so the
      // logger records a real stack instead of serialising to "{}".
      logger.debug('useChurnSignals: report request failed', err);
    } finally {
      inFlightRef.current = false;
    }
  }, [userId]);

  const trackGamePlayed = useCallback(() => {
    signalsRef.current.gamesPlayed += 1;
    saveSignals(signalsRef.current);
  }, []);

  const trackSocialInteraction = useCallback(() => {
    signalsRef.current.socialInteractions += 1;
    saveSignals(signalsRef.current);
  }, []);

  const trackNotificationDismissal = useCallback(() => {
    signalsRef.current.notificationDismissals += 1;
    saveSignals(signalsRef.current);
  }, []);

  // Track session length
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Reset session start on mount
    signalsRef.current.sessionStartedAt = Date.now();
    saveSignals(signalsRef.current);

    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - signalsRef.current.sessionStartedAt) / 1000);
      setSessionLength(elapsed);
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Report every 5 minutes. reportSignals is stable, so this interval is set up
  // once per session (not rebuilt on every render).
  useEffect(() => {
    if (!userId) return;

    reportIntervalRef.current = setInterval(() => {
      reportSignals();
    }, REPORT_INTERVAL_MS);

    return () => {
      if (reportIntervalRef.current) clearInterval(reportIntervalRef.current);
    };
  }, [userId, reportSignals]);

  // Report on session end (beforeunload). sendBeacon is best-effort and cannot
  // carry an Authorization header, so it is purely supplementary to the
  // authenticated periodic report above.
  useEffect(() => {
    if (!userId || typeof window === 'undefined') return;

    const handleUnload = () => {
      const payload = JSON.stringify(buildPayload(userId, signalsRef.current));
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: 'application/json' }));
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [userId]);

  return {
    reportSignals,
    currentSessionLength: sessionLength,
    trackGamePlayed,
    trackSocialInteraction,
    trackNotificationDismissal,
  };
}
