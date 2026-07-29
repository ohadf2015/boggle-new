/**
 * ayeT-Studios offerwall server-to-server (S2S) postback — signature core.
 *
 * Server-only. This is the SECURITY BOUNDARY for the web offerwall: the postback
 * arrives with no user session, so the HMAC over the query string is the only proof
 * it really came from ayeT. Coins are credited solely off a verified postback — never
 * from the client iframe (which would be trivially farmable).
 *
 * Contract (docs.ayetstudios.com — Callbacks → Offerwall Callbacks, and
 * Callback Verification → HMAC Security Hash):
 *   - ayeT GETs the publisher callback URL with macros expanded.
 *   - Optional (we REQUIRE it) HMAC-SHA256 in header `X-Ayetstudios-Security-Hash`.
 *   - The signed string is ALL received query params, keys sorted alphabetically,
 *     values PHP-`urlencode`d (space → '+', and '!*\'()~' percent-encoded — which
 *     JS `encodeURIComponent` leaves bare), joined `k=v&...`.
 *   - Secret = the publisher API key.
 *   - `transaction_id` is the idempotency key; reversals carry `is_chargeback=1`,
 *     a negative `payout_usd`, and/or an `r-`-prefixed `transaction_id`.
 *
 * The signature MUST be verified over the FULL received param set (ayeT signs params
 * we don't credit on, e.g. `click_id`/`user_id`); only afterwards do we extract the
 * subset we act on via {@link parseAyetPostback}.
 */
import { createHmac, timingSafeEqual } from 'crypto';

export const AYET_SIGNATURE_HEADER = 'x-ayetstudios-security-hash';

/**
 * Emulate PHP `urlencode` (application/x-www-form-urlencoded) on a value.
 * `encodeURIComponent` differs in two ways that break HMAC parity:
 *   - space → '%20' (PHP: '+')
 *   - '!', '*', '\'', '(', ')', '~' left bare (PHP: percent-encoded)
 */
function phpUrlencode(value: string): string {
  return encodeURIComponent(value)
    .replace(/%20/g, '+')
    .replace(/[!*'()~]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

/** Build the exact string ayeT signs: sorted keys, PHP-urlencoded values. */
export function canonicalQueryString(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map((k) => `${k}=${phpUrlencode(params[k])}`)
    .join('&');
}

/** HMAC-SHA256 hex digest of the canonical query string, keyed by the publisher API key. */
export function computeAyetSignature(params: Record<string, string>, secret: string): string {
  return createHmac('sha256', secret).update(canonicalQueryString(params)).digest('hex');
}

/**
 * Constant-time verify the postback signature. Returns false (never throws) on a
 * missing/empty header, a malformed hex digest, or a mismatch. Case-insensitive on
 * the hex digest since ayeT's casing is unspecified.
 */
export function verifyAyetSignature(
  params: Record<string, string>,
  headerHash: string,
  secret: string,
): boolean {
  if (!headerHash || !secret) return false;
  const expected = computeAyetSignature(params, secret);
  const received = headerHash.trim().toLowerCase();
  if (received.length !== expected.length) return false; // timingSafeEqual throws on length mismatch
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
  } catch {
    return false; // non-hex header
  }
}

export interface AyetPostback {
  transactionId: string;
  /** ayeT `external_identifier` — for our offerwall this is the Supabase user id. */
  userId: string;
  /** Virtual currency to grant (negative is also treated as a reversal). */
  currencyAmount: number;
  payoutUsd: number;
  isChargeback: boolean;
  offerId?: string;
  offerName?: string;
}

/**
 * Validate + extract the subset we credit on. Returns `{ error }` on anything that
 * can't be safely acted on. Derives `isChargeback` from any of: `is_chargeback=1`,
 * a negative `payout_usd`, a negative `amount`, or an `r-`-prefixed transaction_id.
 */
export function parseAyetPostback(
  params: Record<string, string>,
): AyetPostback | { error: string } {
  const transactionId = (params.transaction_id ?? '').trim();
  const userId = (params.external_identifier ?? '').trim();
  if (!transactionId) return { error: 'missing transaction_id' };
  if (!userId) return { error: 'missing external_identifier' };

  const currencyAmount = Number(params.amount);
  if (!Number.isFinite(currencyAmount)) return { error: 'invalid amount' };

  const payoutRaw = params.payout_usd;
  const payoutUsd = payoutRaw === undefined || payoutRaw === '' ? 0 : Number(payoutRaw);
  if (!Number.isFinite(payoutUsd)) return { error: 'invalid payout_usd' };

  const isChargeback =
    params.is_chargeback === '1' ||
    payoutUsd < 0 ||
    currencyAmount < 0 ||
    transactionId.startsWith('r-');

  return {
    transactionId,
    userId,
    currencyAmount,
    payoutUsd,
    isChargeback,
    offerId: params.offer_id || undefined,
    offerName: params.offer_name || undefined,
  };
}
