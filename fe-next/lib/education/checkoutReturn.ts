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
  if (segments[0] !== 'teacher' || segments[1] === 'upgrade') return null;
  const kept = query
    .split('&')
    .filter((pair) => pair && !CHECKOUT_MARKERS.has(pair.split('=')[0]));
  const target = shippedLocale(locale) ?? defaultLocale;
  return `/${target}/${segments.join('/')}${kept.length ? `?${kept.join('&')}` : ''}`;
}

/** Path and query of a same-origin referer; the caller still validates it. */
export function returnPathFromReferer(
  referer: string | null | undefined,
  appUrl: string | undefined,
  requestHost?: string | null,
): string | null {
  if (!referer) return null;
  try {
    const from = new URL(referer);
    const sameApp = appUrl ? from.origin === new URL(appUrl).origin : false;
    const sameHost = !!requestHost && from.host === requestHost;
    return sameApp || sameHost ? `${from.pathname}${from.search}` : null;
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

export const CHECKOUT_ORIGIN_KEY = 'lexi_edu_checkout_origin';
export const CHECKOUT_ORIGIN_TTL_MS = 30 * 60 * 1000;

/**
 * The page a teacher started checkout from, kept in the tab. Polar's success_url can
 * only point at /teacher until the checkout route forwards the start page, and the
 * tab survives the Polar round trip, so the landing can still send the teacher back.
 */
export function rememberCheckoutOrigin(storage: SetStorage, path: string, now: number = Date.now()): void {
  try {
    storage.setItem(CHECKOUT_ORIGIN_KEY, JSON.stringify({ path, at: now }));
  } catch {
    /* private mode: the teacher lands on /teacher, as before */
  }
}

/** The safe start page to return to, or null when there is none or it is this page. Consumes it. */
export function takeCheckoutOrigin(
  storage: GetStorage & ClearStorage,
  { locale, currentPath, now = Date.now() }: { locale: string; currentPath: string; now?: number },
): string | null {
  let raw: string | null = null;
  try {
    raw = storage.getItem(CHECKOUT_ORIGIN_KEY);
    storage.removeItem(CHECKOUT_ORIGIN_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  let stored: { path?: unknown; at?: unknown };
  try {
    stored = JSON.parse(raw) as { path?: unknown; at?: unknown };
  } catch {
    return null;
  }
  const at = typeof stored.at === 'number' ? stored.at : NaN;
  if (!Number.isFinite(at) || now < at || now - at > CHECKOUT_ORIGIN_TTL_MS) return null;
  const path = safeTeacherReturnPath(stored.path, locale);
  if (!path || path === safeTeacherReturnPath(currentPath, locale)) return null;
  return path;
}

/** A teacher who left checkout and moved on to another page must not be sent back later. */
export function forgetCheckoutOriginAwayFrom(storage: GetStorage & ClearStorage, pathname: string): void {
  try {
    const raw = storage.getItem(CHECKOUT_ORIGIN_KEY);
    if (!raw) return;
    const path = (JSON.parse(raw) as { path?: unknown }).path;
    if (typeof path !== 'string' || path.split('?')[0] !== pathname) storage.removeItem(CHECKOUT_ORIGIN_KEY);
  } catch {
    try {
      storage.removeItem(CHECKOUT_ORIGIN_KEY);
    } catch {
      /* nothing to forget */
    }
  }
}

export const CHECKOUT_REDIRECT_KEY = 'lexi_edu_checkout_redirect';

/** The landing is about to move to `path`; the page being left must not celebrate first. */
export function markCheckoutRedirect(storage: SetStorage, path: string): void {
  try {
    storage.setItem(CHECKOUT_REDIRECT_KEY, path);
  } catch {
    /* worst case: one extra celebration */
  }
}

export function isCheckoutRedirectPending(storage: GetStorage, currentPathname: string): boolean {
  try {
    const target = storage.getItem(CHECKOUT_REDIRECT_KEY);
    return !!target && target.split('?')[0] !== currentPathname;
  } catch {
    return false;
  }
}

export function clearCheckoutRedirect(storage: ClearStorage): void {
  try {
    storage.removeItem(CHECKOUT_REDIRECT_KEY);
  } catch {
    /* already gone */
  }
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
