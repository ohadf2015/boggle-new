/**
 * Quiet feedback for Cosy / Calm Mode.
 *
 * When celebrations are suppressed (`calm` tier), the confetti chokepoint does
 * NOT fire particles — instead it dispatches a single `QUIET_FEEDBACK_EVENT` on
 * `window`. A single mounted `QuietCelebrationLayer` listens and renders a
 * dignified, restful acknowledgement (a soft checkmark that scales in and
 * fades) so the moment still feels earned without any party noise.
 *
 * This module is the pure spine: the event name and the throttle decision.
 * Loud call sites (fireworks, layered celebration) fire many bursts in a tight
 * loop; calm mode must collapse them into ONE quiet beat — hence the throttle.
 */

/** Custom event the chokepoint dispatches and the layer listens for. */
export const QUIET_FEEDBACK_EVENT = 'lexiclash:quiet-celebrate';

/**
 * Minimum gap between two quiet beats. A burst loop (e.g. 30 confetti calls
 * over 2s) collapses to a single calm acknowledgement instead of flickering.
 */
export const QUIET_FEEDBACK_MIN_INTERVAL_MS = 600;

/** Optional payload a caller can attach to tune the quiet beat. */
export interface QuietFeedbackDetail {
  /** Relative loudness of the original celebration — lets the layer pick a tone. */
  magnitude?: 'small' | 'medium' | 'large';
}

/**
 * Decide whether a quiet beat should render now, given when the last one fired.
 * Pure — the caller passes `Date.now()` (or a test clock) as `now`.
 */
export function shouldShowQuietFeedback(
  lastShownAt: number | null,
  now: number,
  minIntervalMs: number = QUIET_FEEDBACK_MIN_INTERVAL_MS,
): boolean {
  if (lastShownAt === null) return true;
  return now - lastShownAt >= minIntervalMs;
}

/** Dispatch the quiet-celebrate event (no-op outside the browser). */
export function emitQuietFeedback(detail: QuietFeedbackDetail = {}): void {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  try {
    window.dispatchEvent(new CustomEvent<QuietFeedbackDetail>(QUIET_FEEDBACK_EVENT, { detail }));
  } catch {
    // CustomEvent unavailable (very old / stubbed env) — quiet feedback is
    // purely decorative, so silently skip rather than break the win flow.
  }
}
