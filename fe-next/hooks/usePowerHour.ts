/**
 * usePowerHour Hook
 *
 * Manages Power Hour daily boost state in localStorage.
 * First game of the day activates a 1-hour window with 2x XP
 * and 2x mystery reward probability.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export const POWER_HOUR_STORAGE_KEY = 'lexiclash_power_hour';
const POWER_HOUR_DURATION_MS = 60 * 60 * 1000; // 60 minutes

interface PowerHourData {
  expiresAt: number;
  activatedDate: string; // YYYY-MM-DD
}

interface PowerHourState {
  active: boolean;
  remainingMinutes: number;
  remainingSeconds: number;
  expired: boolean;
  activate: () => void;
}

function getToday(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function loadStored(): PowerHourData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(POWER_HOUR_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PowerHourData;
  } catch {
    return null;
  }
}

function calcRemaining(expiresAt: number): { minutes: number; seconds: number; active: boolean } {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return { minutes: 0, seconds: 0, active: false };
  const totalSeconds = Math.floor(diff / 1000);
  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60,
    active: true,
  };
}

export function usePowerHour(): PowerHourState {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [state, setState] = useState(() => {
    const stored = loadStored();
    if (!stored || stored.activatedDate !== getToday()) {
      return { active: false, remainingMinutes: 0, remainingSeconds: 0, expired: false };
    }
    const { minutes, seconds, active } = calcRemaining(stored.expiresAt);
    return { active, remainingMinutes: minutes, remainingSeconds: seconds, expired: !active };
  });

  const startCountdown = useCallback((expiresAt: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const { minutes, seconds, active } = calcRemaining(expiresAt);
      setState({
        active,
        remainingMinutes: minutes,
        remainingSeconds: seconds,
        expired: !active,
      });
      if (!active && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, 1000);
  }, []);

  // Start countdown on mount if active
  useEffect(() => {
    const stored = loadStored();
    if (stored && stored.activatedDate === getToday()) {
      const { active } = calcRemaining(stored.expiresAt);
      if (active) {
        startCountdown(stored.expiresAt);
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [startCountdown]);

  const activate = useCallback(() => {
    const stored = loadStored();
    const today = getToday();

    // Already activated today — don't re-activate
    if (stored && stored.activatedDate === today) return;

    const expiresAt = Date.now() + POWER_HOUR_DURATION_MS;
    const data: PowerHourData = { expiresAt, activatedDate: today };

    try {
      localStorage.setItem(POWER_HOUR_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // localStorage unavailable
    }

    setState({ active: true, remainingMinutes: 60, remainingSeconds: 0, expired: false });
    startCountdown(expiresAt);
  }, [startCountdown]);

  return { ...state, activate };
}
