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

export function identifyUserForAnalytics(args: IdentifyArgs): void {
  const { userId, displayName, isAdmin, isTeacher, locale } = args;

  safe(() =>
    (posthog.identify as PHFn)(userId, {
      display_name: displayName,
      is_admin: isAdmin,
      is_teacher: isTeacher,
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
 * Reset on logout. Caller passes `posthog.reset` so tests can inject
 * a spy without re-mocking the module.
 */
export function resetUserAnalytics(opts?: { reset?: () => void }): void {
  const reset = opts?.reset ?? (posthog.reset as () => void);
  safe(() => reset());
  safe(() => (posthog.capture as PHFn)('user_logged_out'));
}
