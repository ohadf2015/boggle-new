/**
 * Teacher Pro Polar checkout — the same POST the upgrade page uses.
 *
 * Empty body = $9/mo. `{ trial: true }` is the 14-day Polar trial. Trial
 * banners must not invent a second till. 503 means Polar env is unset; do
 * not code around it.
 */

import { trackEduProCheckoutFailed, type EduProCheckoutFailReason } from '@/lib/education/proFunnelTelemetry';
import { isNative } from '@/utils/platform';

export type TeacherProCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; status: number; nativeApp?: true };

/** The toast for a failed checkout start, shared by every caller. */
export function checkoutFailureKey(result: { ok: false; status: number; nativeApp?: true }): string {
  if (result.nativeApp) return 'teacher.subscription.notInApp';
  if (result.status === 401) return 'teacher.subscription.signInRequired';
  if (result.status === 503) return 'teacher.subscription.checkoutUnavailable';
  return 'teacher.subscription.checkoutError';
}

/** The Play-distributed wrapper must not sell a digital subscription through an external checkout. */
export function isCheckoutBlockedInApp(): boolean {
  return isNative();
}

function reportFailure(reason: EduProCheckoutFailReason, placement: string, trial: boolean): void {
  try {
    trackEduProCheckoutFailed({ reason, placement, trial });
  } catch {
    /* analytics must never block the till */
  }
}

export async function postTeacherProCheckout(
  fetchFn: typeof fetch = fetch,
  options: { trial?: boolean; locale?: string; placement?: string } = {},
): Promise<TeacherProCheckoutResult> {
  const trial = options.trial === true;
  const placement = options.placement ?? 'other';
  if (isCheckoutBlockedInApp()) {
    reportFailure('native_app', placement, trial);
    return { ok: false, status: 0, nativeApp: true };
  }
  const hasOptions = options.trial !== undefined || options.locale !== undefined;
  let response: Response;
  try {
    response = await fetchFn(
      '/api/subscription/checkout',
      hasOptions
        ? {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              trial,
              ...(options.locale ? { locale: options.locale } : {}),
            }),
          }
        : { method: 'POST' },
    );
  } catch (err) {
    reportFailure('network', placement, trial);
    throw err;
  }
  if (!response.ok) {
    reportFailure(response.status === 401 ? 'unauthorized' : `http_${response.status}`, placement, trial);
    return { ok: false, status: response.status };
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    reportFailure('no_url', placement, trial);
    return { ok: false, status: response.status };
  }
  const url =
    body && typeof body === 'object' && 'url' in body && typeof (body as { url: unknown }).url === 'string'
      ? (body as { url: string }).url
      : '';
  if (!url) {
    reportFailure('no_url', placement, trial);
    return { ok: false, status: response.status || 500 };
  }
  return { ok: true, url };
}

export function goToPolarCheckout(url: string): void {
  window.location.href = url;
}
