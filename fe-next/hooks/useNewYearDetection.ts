import { useState, useEffect, useCallback } from 'react';

export interface NewYearState {
  isNewYearsEve: boolean;
  isNewYearsDay: boolean;
  isCountdownTime: boolean; // 11:59 PM - midnight
  isCelebrationTime: boolean; // First 5 minutes of new year
  secondsUntilMidnight: number;
  currentYear: number;
  nextYear: number;
}

interface UseNewYearDetectionOptions {
  /** Time in minutes before midnight to show pre-countdown notification (default: 5) */
  preCountdownMinutes?: number;
  /** Duration in minutes after midnight to show celebration (default: 5) */
  celebrationDurationMinutes?: number;
  /** Enable/disable the feature entirely (default: true) */
  enabled?: boolean;
}

/**
 * Hook to detect New Year's Eve and manage countdown to midnight
 * Calculates based on player's local timezone for coordinated celebration
 *
 * @example
 * const { isCountdownTime, secondsUntilMidnight } = useNewYearDetection();
 * if (isCountdownTime && secondsUntilMidnight <= 10) {
 *   // Show countdown modal
 * }
 */
export function useNewYearDetection(options: UseNewYearDetectionOptions = {}): NewYearState {
  const {
    preCountdownMinutes = 5,
    celebrationDurationMinutes = 5,
    enabled = true,
  } = options;

  const [state, setState] = useState<NewYearState>(() =>
    calculateNewYearState(preCountdownMinutes, celebrationDurationMinutes)
  );

  const updateState = useCallback(() => {
    if (!enabled) {
      setState({
        isNewYearsEve: false,
        isNewYearsDay: false,
        isCountdownTime: false,
        isCelebrationTime: false,
        secondsUntilMidnight: 0,
        currentYear: new Date().getFullYear(),
        nextYear: new Date().getFullYear() + 1,
      });
      return;
    }

    setState(calculateNewYearState(preCountdownMinutes, celebrationDurationMinutes));
  }, [enabled, preCountdownMinutes, celebrationDurationMinutes]);

  useEffect(() => {
    if (!enabled) return;

    // Update every second during countdown time, every minute otherwise
    const interval = state.isCountdownTime || state.isCelebrationTime
      ? 1000 // Every second during critical time
      : 60000; // Every minute for general checks

    const timer = setInterval(updateState, interval);

    return () => clearInterval(timer);
  }, [enabled, state.isCountdownTime, state.isCelebrationTime, updateState]);

  return state;
}

/**
 * Calculate New Year state based on current local time
 */
function calculateNewYearState(
  preCountdownMinutes: number,
  celebrationDurationMinutes: number
): NewYearState {
  const now = new Date();
  const currentYear = now.getFullYear();
  const nextYear = currentYear + 1;

  // Check if it's December 31st (New Year's Eve)
  const month = now.getMonth(); // 0-indexed (11 = December)
  const day = now.getDate();
  const isNewYearsEve = month === 11 && day === 31;

  // Check if it's January 1st (New Year's Day)
  const isNewYearsDay = month === 0 && day === 1;

  // Calculate midnight of next day in local timezone
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);

  // Calculate seconds until midnight
  const secondsUntilMidnight = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));

  // Check if we're in the pre-countdown window (e.g., last 5 minutes of the year)
  const preCountdownSeconds = preCountdownMinutes * 60;
  const isCountdownTime = isNewYearsEve && secondsUntilMidnight <= preCountdownSeconds;

  // Check if we're in celebration time (first few minutes of new year)
  const celebrationDurationSeconds = celebrationDurationMinutes * 60;
  const isInCelebrationWindow = isNewYearsDay && now.getHours() === 0 && now.getMinutes() < celebrationDurationMinutes;

  // Calculate seconds since midnight for celebration
  const secondsSinceMidnight = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
  const isCelebrationTime = isInCelebrationWindow && secondsSinceMidnight <= celebrationDurationSeconds;

  return {
    isNewYearsEve,
    isNewYearsDay,
    isCountdownTime,
    isCelebrationTime,
    secondsUntilMidnight,
    currentYear,
    nextYear,
  };
}

/**
 * Format seconds into MM:SS or HH:MM:SS
 */
export function formatTimeRemaining(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}
