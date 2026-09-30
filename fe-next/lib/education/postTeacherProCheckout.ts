/**
 * Teacher Pro Polar checkout — the same POST the upgrade page uses.
 *
 * Empty body = $9/mo. `{ trial: true }` is the 14-day Polar trial. Trial
 * banners must not invent a second till. 503 means Polar env is unset; do
 * not code around it.
 */

export type TeacherProCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; status: number };

export async function postTeacherProCheckout(
  fetchFn: typeof fetch = fetch,
  options: { trial?: boolean } = {},
): Promise<TeacherProCheckoutResult> {
  const trial = options.trial === true;
  const response = await fetchFn(
    '/api/subscription/checkout',
    trial
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trial: true }),
        }
      : { method: 'POST' },
  );
  if (!response.ok) return { ok: false, status: response.status };
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, status: response.status };
  }
  const url =
    body && typeof body === 'object' && 'url' in body && typeof (body as { url: unknown }).url === 'string'
      ? (body as { url: string }).url
      : '';
  if (!url) return { ok: false, status: response.status || 500 };
  return { ok: true, url };
}

export function goToPolarCheckout(url: string): void {
  window.location.href = url;
}
