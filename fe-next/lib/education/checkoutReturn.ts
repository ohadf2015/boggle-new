/**
 * Teacher Pro checkout return — pure decisions.
 *
 * The client records that the teacher landed (`?checkout=success`). It never
 * grants access. Polar's webhook is the only grant; this module only says
 * whether the UI should wait, celebrate, or admit the grant has not landed.
 */

import { defaultLocale, locales, type Locale } from '@/i18n/config';

export const RETURN_INTENT_KEY = 'lexi_edu_checkout_return_intent';
/** A gate redirect must not forget a return the teacher just made. */
export const RETURN_INTENT_TTL_MS = 30 * 60 * 1000;
export const GRANT_POLL_INTERVAL_MS = 2_000;
export const GRANT_POLL_MAX_TRIES = 8;

export type CheckoutReturnPhase = 'idle' | 'activating' | 'success' | 'failure';

type GetStorage = Pick<Storage, 'getItem'>;
type SetStorage = Pick<Storage, 'setItem'>;
type ClearStorage = Pick<Storage, 'removeItem'>;

export function isCheckoutSuccessSearch(search: string): boolean {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  if (!raw) return false;
  return new URLSearchParams(raw).get('checkout') === 'success';
}

/** Polar checkout ids are UUIDs; anything else is not attribution. */
const CHECKOUT_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A raw checkout id (body field, query value) — the UUID or null. */
export function normalizeCheckoutId(raw: unknown): string | null {
  return typeof raw === 'string' && CHECKOUT_ID_RE.test(raw) ? raw : null;
}

/**
 * The Polar success_url carries `checkout_id={CHECKOUT_ID}`, substituted on
 * redirect. Returns the id when present and well-formed, else null — a stale
 * `?checkout=success` bookmark has none, which is exactly the case the return
 * beacon must be able to tell apart from a real completed checkout.
 */
export function checkoutIdFromSearch(search: string): string | null {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  if (!raw) return null;
  return normalizeCheckoutId(new URLSearchParams(raw).get('checkout_id'));
}

const MAX_RETURN_PATH = 512;
const CHECKOUT_MARKERS = new Set(['checkout', 'checkout_id']);

function shippedLocale(raw: string): Locale | null {
  return (locales as readonly string[]).includes(raw) ? (raw as Locale) : null;
}

/**
 * The page a teacher started checkout from, as a same-origin `/{locale}/teacher…`
 * path, or null. The value comes from the client, so this is the open-redirect guard.
 */
export function safeTeacherReturnPath(raw: unknown, locale: string): string | null {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.length > MAX_RETURN_PATH) return null;
  if (/[\\\u0000-\u001f\u007f]/.test(raw) || raw.startsWith('//') || /%(2f|5c|2e)/i.test(raw)) return null;
  const [beforeHash] = raw.split('#');
  const q = beforeHash.indexOf('?');
  const path = q === -1 ? beforeHash : beforeHash.slice(0, q);
  const query = q === -1 ? '' : beforeHash.slice(q + 1);
  const segments = path.split('/').slice(1);
  if (segments.some((s) => s === '..' || s === '.')) return null;
  if (shippedLocale(segments[0] ?? '')) segments.shift();
  if (segments[0] !== 'teacher') return null;
  const kept = query
    .split('&')
    .filter((pair) => pair && !CHECKOUT_MARKERS.has(pair.split('=')[0]));
  const target = shippedLocale(locale) ?? defaultLocale;
  return `/${target}/${segments.join('/')}${kept.length ? `?${kept.join('&')}` : ''}`;
}

/** Path and query of a same-origin referer; the caller still validates it. */
export function returnPathFromReferer(referer: string | null | undefined, appUrl: string | undefined): string | null {
  if (!referer || !appUrl) return null;
  try {
    const from = new URL(referer);
    return from.origin === new URL(appUrl).origin ? `${from.pathname}${from.search}` : null;
  } catch {
    return null;
  }
}

/**
 * Polar's success_url. A checkout started on a class report returns to that report;
 * anything else lands on the teacher home. `{CHECKOUT_ID}` stays literal (no URL
 * encoding) because Polar substitutes it on redirect.
 */
export function buildCheckoutSuccessUrl(args: { appUrl: string | undefined; locale: string; returnPath?: unknown }): string {
  const locale = shippedLocale(args.locale) ?? defaultLocale;
  const path = safeTeacherReturnPath(args.returnPath, locale) ?? `/${locale}/teacher`;
  const sep = path.includes('?') ? '&' : '?';
  return `${args.appUrl ?? ''}${path}${sep}checkout=success&checkout_id={CHECKOUT_ID}`;
}

export function rememberReturnIntent(storage: SetStorage, now: number = Date.now()): void {
  try {
    storage.setItem(RETURN_INTENT_KEY, String(now));
  } catch {
    /* private mode — the URL query is still the primary signal */
  }
}

export function readReturnIntent(storage: GetStorage, now: number = Date.now()): boolean {
  try {
    const raw = storage.getItem(RETURN_INTENT_KEY);
    const ts = raw ? Number(raw) : NaN;
    return Number.isFinite(ts) && now >= ts && now - ts < RETURN_INTENT_TTL_MS;
  } catch {
    return false;
  }
}

export function clearReturnIntent(storage: ClearStorage): void {
  try {
    storage.removeItem(RETURN_INTENT_KEY);
  } catch {
    /* already gone */
  }
}

/**
 * `success` means the server grant is already visible. This function does not
 * grant, and a later poll that finds `hasPro` replaces failure — the webhook
 * won, so we must not keep telling the teacher it failed.
 */
export function checkoutReturnPhase(args: {
  active: boolean;
  hasPro: boolean;
  loading: boolean;
  attempts: number;
  maxAttempts?: number;
}): CheckoutReturnPhase {
  if (!args.active) return 'idle';
  if (args.hasPro) return 'success';
  const max = args.maxAttempts ?? GRANT_POLL_MAX_TRIES;
  if (!args.loading && args.attempts >= max) return 'failure';
  return 'activating';
}
