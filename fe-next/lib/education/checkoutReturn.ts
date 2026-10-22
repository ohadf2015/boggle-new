/**
 * Teacher Pro checkout return — pure decisions.
 *
 * The client records that the teacher landed (`?checkout=success`). It never
 * grants access. Polar's webhook is the only grant; this module only says
 * whether the UI should wait, celebrate, or admit the grant has not landed.
 */

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
