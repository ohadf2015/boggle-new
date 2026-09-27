/**
 * Holds a referral code between the click and the account.
 *
 * The share link is `<origin>?ref=CODE`, and `POST /api/growth/referral` has
 * always been able to claim one — but nothing in the app ever read the parameter
 * or called the endpoint. Prod, before this shipped: 375 codes issued, 0 rows in
 * `referrals`, 0 profiles with `referred_by`, 0 rewards granted, ever.
 *
 * Capture and claim have to be separate beats because a referral link is almost
 * always opened by someone who does not have an account yet: read the code on
 * arrival, hold it across signup, claim it once there is a user to attach it to.
 */

export const PENDING_REFERRAL_KEY = 'pending_referral_code';

/**
 * Codes are generated as short alphanumerics. Validating here means a junk or
 * hand-edited `?ref=` never reaches the API and never occupies the storage slot
 * that a real code would use.
 */
const CODE_PATTERN = /^[A-Z0-9]{4,16}$/;

function normalise(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  return CODE_PATTERN.test(code) ? code : null;
}

/** Pull a usable referral code out of a `location.search` string. */
export function readReferralCodeFromSearch(search: string): string | null {
  if (!search) return null;
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return normalise(params.get('ref'));
}

export function readPendingReferral(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return normalise(localStorage.getItem(PENDING_REFERRAL_KEY));
}

export function storePendingReferral(code: string): void {
  if (typeof localStorage === 'undefined') return;
  const valid = normalise(code);
  if (!valid) return;
  localStorage.setItem(PENDING_REFERRAL_KEY, valid);
}

export function clearPendingReferral(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(PENDING_REFERRAL_KEY);
}
