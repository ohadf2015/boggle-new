/**
 * Auth Analytics — identify + first-touch attribution
 *
 * Bridges AuthContext to PostHog in one place so the identify flow can be
 * unit-tested without mounting the full provider. Writes acquisition data
 * once via `$set_once` so re-logins don't overwrite first-touch source.
 */

import posthog from 'posthog-js';
import { getStoredUtmData } from '@/utils/utmCapture';
import { setPostHogUserPropsOnce } from '@/utils/posthogEngagement';
import logger from '@/utils/logger';

export interface IdentifyArgs {
  userId: string;
  displayName: string;
  isAdmin: boolean;
  isTeacher: boolean;
  locale: string;
  email?: string | null;
}

type PHFn = (...args: unknown[]) => unknown;

function safe<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('[authAnalytics] call failed', err);
    }
    return undefined;
  }
}

// posthog.* throws `Cannot read properties of undefined (reading '__loaded')`
// when init() has never run (e.g., NEXT_PUBLIC_POSTHOG_KEY missing in dev).
// Guard at the caller so the error never fires — safe() would catch it but
// the dev console gets polluted on every auth-state mount.
function isPostHogLoaded(): boolean {
  return (posthog as unknown as { __loaded?: boolean }).__loaded === true;
}

export function identifyUserForAnalytics(args: IdentifyArgs): void {
  if (!isPostHogLoaded()) return;
  const { userId, displayName, isAdmin, isTeacher, locale, email } = args;

  safe(() =>
    (posthog.identify as PHFn)(userId, {
      display_name: displayName,
      is_admin: isAdmin,
      is_teacher: isTeacher,
      ...(email ? { email } : {}),
    })
  );

  safe(() =>
    (posthog.capture as PHFn)('user_identified', {
      user_id: userId,
      display_name: displayName,
      is_guest: false,
      is_admin: isAdmin,
      is_teacher: isTeacher,
    })
  );

  const utm = getStoredUtmData();
  setPostHogUserPropsOnce({
    acquisition_utm_source: utm?.utm_source ?? null,
    acquisition_utm_medium: utm?.utm_medium ?? null,
    acquisition_utm_campaign: utm?.utm_campaign ?? null,
    acquisition_utm_term: utm?.utm_term ?? null,
    acquisition_utm_content: utm?.utm_content ?? null,
    acquisition_ref: utm?.ref ?? null,
    acquisition_referrer: utm?.referrer ?? null,
    first_locale: locale,
    acquisition_date: new Date().toISOString(),
  });
}

/**
 * Reset PostHog identification on logout (system-driven OR user-initiated).
 *
 * Does NOT emit `user_logged_out` — that event is reserved for explicit
 * sign-out and is captured directly in `lib/supabase.ts#signOut`. Coupling
 * the emit to state-transition fires it on session-refresh blips and
 * cross-tab oscillation (saw 6.5×/user spam in PostHog 30d).
 *
 * Caller passes `posthog.reset` so tests can inject a spy without re-
 * mocking the module.
 */
export function resetUserAnalytics(opts?: { reset?: () => void }): void {
  // Default-path uses posthog.reset which requires init. Injected resets
  // (used by tests + the syncAuthAnalyticsTransition path) always fire.
  if (!opts?.reset && !isPostHogLoaded()) return;
  const reset = opts?.reset ?? (posthog.reset as () => void);
  safe(() => reset());
}

/**
 * Explicit user-initiated sign-out emit. Call from the signOut path only.
 * Separated from `resetUserAnalytics` so transient state oscillation
 * (network blip, cross-tab broadcast, session refresh fail) does not
 * pollute the conversion funnel.
 */
export function captureUserLoggedOut(): void {
  if (!isPostHogLoaded()) return;
  safe(() => (posthog.capture as PHFn)('user_logged_out'));
}

/**
 * State-machine guard for auth-analytics side effects.
 *
 * Why: AuthContext used to fire `resetUserAnalytics()` on every render where
 * user/profile were falsy — including the initial guest mount on every page
 * load. PostHog showed `user_logged_out` 1:1 with `$pageview` on /he (252 vs
 * 250 over 14d). Only fire on real transitions:
 *   - `false → true`: capture `user_identified`
 *   - `true → false`: capture `user_logged_out`
 *   - no change: no-op
 *
 * Returns the next `wasAuthenticated` value so callers can persist it in a ref.
 */
export function syncAuthAnalyticsTransition(args: {
  wasAuthenticated: boolean;
  identify: IdentifyArgs | null;
  reset?: () => void;
}): boolean {
  const isAuthenticated = args.identify !== null;

  if (isAuthenticated && args.identify) {
    // Always re-identify when authed: profile fields may have changed.
    identifyUserForAnalytics(args.identify);
    return true;
  }

  // identify === null (guest)
  if (args.wasAuthenticated) {
    resetUserAnalytics({ reset: args.reset });
  }
  return false;
}
