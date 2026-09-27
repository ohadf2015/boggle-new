/**
 * Pure, testable controller logic for the animated splash screen.
 * No React, no side effects — functions only.
 */

export interface ShouldHideSplashParams {
  ready: boolean;
  elapsedMs: number;
  minMs: number;
  maxMs: number;
}

/**
 * Determines whether the splash screen should be hidden.
 * Fail-safe: always returns true when elapsedMs >= maxMs (hard timeout).
 * Otherwise, returns true only when ready && elapsedMs >= minMs.
 */
export function shouldHideSplash({
  ready,
  elapsedMs,
  minMs,
  maxMs,
}: ShouldHideSplashParams): boolean {
  // Hard fail-safe: always hide after maxMs
  if (elapsedMs >= maxMs) {
    return true;
  }
  // Otherwise, hide only if ready and minimum time has elapsed
  return ready && elapsedMs >= minMs;
}

/**
 * Calculates a progress value in [0, 1) for the loading bar.
 * Uses an exponential asymptote to approach but never reach 1.0.
 * Strictly monotonic: always increases with elapsedMs.
 */
export function splashProgress(elapsedMs: number, maxMs: number): number {
  // Use exponential asymptote: 0.9 * (1 - e^(-k*t/maxMs))
  // This approaches ~0.9 as t→∞, is always strictly increasing,
  // and guarantees progress ∈ [0, 0.9) throughout.
  const k = 4; // Tuning parameter: controls how quickly we approach the asymptote
  const normalized = elapsedMs / maxMs;
  const progress = 0.9 * (1 - Math.exp(-k * normalized));
  return Math.max(0, Math.min(progress, 0.9999)); // Clamp to [0, 0.9999)
}

/**
 * Picks which loading text index to display based on elapsed time.
 * Rotates through indices (0 to count-1) every intervalMs.
 * Wraps around using modulo.
 */
export function pickLoadingTextIndex(
  elapsedMs: number,
  count: number,
  intervalMs: number = 1300
): number {
  if (count <= 0) return 0;
  const index = Math.floor(elapsedMs / intervalMs);
  return index % count;
}
