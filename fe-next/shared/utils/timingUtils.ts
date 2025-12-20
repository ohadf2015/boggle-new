/**
 * Timing Utilities
 * Shared constants and functions for timing-related logic
 */

// ==================== Constants ====================

/** Minimum time to display waiting/calculation screen (ms) */
export const MINIMUM_WAITING_TIME_MS = 1500;

// ==================== Functions ====================

/**
 * Calculate remaining wait time to ensure minimum display time
 */
export function calculateRemainingWaitTime(
  waitingStartTime: number | null,
  minWaitingTime: number = MINIMUM_WAITING_TIME_MS
): number {
  const now = Date.now();
  const startTime = waitingStartTime || now;
  const timeElapsed = now - startTime;
  return Math.max(0, minWaitingTime - timeElapsed);
}

/**
 * Execute a function after ensuring minimum wait time
 */
export function executeAfterMinimumWait(
  waitingStartTime: number | null,
  callback: () => void,
  minWaitingTime: number = MINIMUM_WAITING_TIME_MS
): void {
  const remainingWaitTime = calculateRemainingWaitTime(waitingStartTime, minWaitingTime);

  if (remainingWaitTime > 0) {
    setTimeout(callback, remainingWaitTime);
  } else {
    callback();
  }
}
