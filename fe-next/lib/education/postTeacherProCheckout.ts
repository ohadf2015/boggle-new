/**
 * Teacher Pro Polar checkout — the same POST the upgrade page uses.
 *
 * Empty body = $9/mo. `{ trial: true }` is the 14-day Polar trial. Trial
 * banners must not invent a second till. 503 means Polar env is unset; do
 * not code around it.
 */

import { trackEduProCheckoutFailed, type EduProCheckoutFailReason } from '@/lib/education/proFunnelTelemetry';

export type TeacherProCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; status: number };

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
