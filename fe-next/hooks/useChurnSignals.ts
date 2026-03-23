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

const STORAGE_KEY = 'lexiclash_churn_signals';
const REPORT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

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

export function useChurnSignals(): UseChurnSignalsReturn {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [sessionLength, setSessionLength] = useState(0);
  const signalsRef = useRef<StoredSignals>(getStoredSignals());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reportIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reportSignals = useCallback(async () => {
    if (!userId) return;

    const signals = signalsRef.current;
    const sessionLengthSeconds = Math.floor((Date.now() - signals.sessionStartedAt) / 1000);

    try {
      await fetch('/api/growth/churn-signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          avgSessionLengthSeconds: sessionLengthSeconds,
          gamesPerSession: signals.gamesPlayed,
          socialInteractions: signals.socialInteractions,
          notificationDismissals: signals.notificationDismissals,
        }),
      });

      signalsRef.current = {
        ...signals,
        lastReportedAt: Date.now(),
      };
      saveSignals(signalsRef.current);
    } catch {
      // Best-effort reporting
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

  // Report every 5 minutes
  useEffect(() => {
    if (!userId) return;

    reportIntervalRef.current = setInterval(() => {
      reportSignals();
    }, REPORT_INTERVAL_MS);

    return () => {
      if (reportIntervalRef.current) clearInterval(reportIntervalRef.current);
    };
  }, [userId, reportSignals]);

  // Report on session end (beforeunload)
  useEffect(() => {
    if (!userId || typeof window === 'undefined') return;

    const handleUnload = () => {
      const signals = signalsRef.current;
      const sessionLengthSeconds = Math.floor((Date.now() - signals.sessionStartedAt) / 1000);

      // Use sendBeacon for reliable delivery on unload
      const payload = JSON.stringify({
        userId,
        avgSessionLengthSeconds: sessionLengthSeconds,
        gamesPerSession: signals.gamesPlayed,
        socialInteractions: signals.socialInteractions,
        notificationDismissals: signals.notificationDismissals,
      });

      navigator.sendBeacon('/api/growth/churn-signals', payload);
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
