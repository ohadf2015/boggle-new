/**
 * Hold the once-per-device activation slot until PostHog will keep the capture.
 *
 * Game routes defer posthog.init until load + idle. A capture made before that
 * is queued and flushed into `opt_out_capturing_by_default`, so it is dropped —
 * but `lexiclash_first_game_played` was already set, and a later consented
 * game never retries. That is the completed-round cohort with no
 * `growth:first_game_played`.
 *
 * PostHogProvider calls `armActivationCapture()` at the end of the loaded()
 * consent dance (opt-in, or the explicit opt-out that starts cookieless
 * capture) and again when consent flips to granted.
 *
 * Unit tests that mock posthog without `isLoaded` cannot observe the drop, so
 * they stay armed. Production always has `isLoaded`.
 */
import posthog from '@/lib/analytics/lazyPosthog';

export const ACTIVATION_PENDING_KEY = 'lexiclash_activation_pending';

export type PendingActivation = {
  won: boolean;
  score: number;
  wordCount: number;
  mode: string;
};

let armed = false;
/** No PostHog key — nothing will ever load. Don't hold the referral/activation forever. */
let forceArm = false;

export function armActivationCapture(opts?: { force?: boolean }): void {
  armed = true;
  if (opts?.force) forceArm = true;
}

export function isActivationCaptureArmed(): boolean {
  const ph = posthog as { isLoaded?: () => boolean };
  if (typeof ph.isLoaded !== 'function') return true;
  // loaded() runs inside posthog.init, before the lazy proxy flips isLoaded.
  // Until then a capture is queued and flushed into the opted-out default.
  if (!ph.isLoaded()) return forceArm;
  return armed;
}

export function stashPendingActivation(args: PendingActivation): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(ACTIVATION_PENDING_KEY, JSON.stringify(args));
  } catch {
    /* private mode — activation stays best-effort */
  }
}

export function takePendingActivation(): PendingActivation | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(ACTIVATION_PENDING_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(ACTIVATION_PENDING_KEY);
    const parsed = JSON.parse(raw) as PendingActivation;
    if (!parsed || typeof parsed.mode !== 'string') return null;
    return {
      won: parsed.won === true,
      score: typeof parsed.score === 'number' ? parsed.score : 0,
      wordCount: typeof parsed.wordCount === 'number' ? parsed.wordCount : 0,
      mode: parsed.mode,
    };
  } catch {
    return null;
  }
}

export function clearPendingActivation(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(ACTIVATION_PENDING_KEY);
  } catch {
    /* ignore */
  }
}

/** @internal */
export function __resetActivationGateForTests(): void {
  armed = false;
  forceArm = false;
}
