/**
 * Paid Teacher Pro Polar checkout — the same POST the upgrade page uses.
 *
 * Trial banners must not invent a second till. Empty body = $9/mo (not a
 * second free trial). 503 means Polar env is unset; do not code around it.
 */

export type TeacherProCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; status: number };

export async function postTeacherProCheckout(
  fetchFn: typeof fetch = fetch,
): Promise<TeacherProCheckoutResult> {
  const response = await fetchFn('/api/subscription/checkout', { method: 'POST' });
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
