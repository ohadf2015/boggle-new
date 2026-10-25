/**
 * Teacher Pro grants — complimentary Pro handed to a specific teacher by an admin
 * (for example, the year we owe a teacher whose class period we broke).
 *
 * Pure, testable logic only. The DB and email live in `proGrantServer.ts`, the
 * entitlement read in `lib/subscriptions.ts` — both call in here so the policy
 * (how long, when it ends, what counts as "still Pro") exists in exactly one place.
 *
 * A grant is written into the SAME `subscriptions` row a paid subscription uses,
 * marked `source = 'admin_grant'`. That keeps every existing `has_pro` reader
 * (class caps, ProGate, status card) working untouched. The one difference is the
 * end: nothing renews a grant, so `current_period_end` is a hard deadline for a
 * grant and merely informational for a provider subscription.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** How long a grant lasts when the admin does not say otherwise. */
export const PRO_GRANT_DEFAULT_DAYS = 365;

/** Sanity ceiling — ten years is a typo, not a plan. */
export const PRO_GRANT_MAX_DAYS = 3650;

export type SubscriptionSource = 'polar' | 'lemon_squeezy' | 'admin_grant';

/** ISO deadline `days` after `fromMs`. */
export function proGrantExpiry(fromMs: number, days: number = PRO_GRANT_DEFAULT_DAYS): string {
  if (!Number.isFinite(days) || days <= 0 || days > PRO_GRANT_MAX_DAYS) {
    throw new Error(`invalid grant length: ${days} days`);
  }
  return new Date(fromMs + days * DAY_MS).toISOString();
}

/**
 * Lowercase + trim, or null when it is not an address. Stored normalised so the
 * sign-in bridge can match a plain lowercase probe (same rule as the allowlist).
 */
export function normalizeGrantEmail(raw: string): string | null {
  const email = (raw || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export interface ProGrantRow {
  id: string;
  email: string;
  user_id: string | null;
  expires_at: string;
  applied_at: string | null;
  revoked_at: string | null;
}

export type ProGrantStatus = 'pending_signup' | 'active' | 'expired' | 'revoked';

export function proGrantStatus(g: ProGrantRow, nowMs: number): ProGrantStatus {
  if (g.revoked_at) return 'revoked';
  if (Date.parse(g.expires_at) <= nowMs) return 'expired';
  if (!g.user_id || !g.applied_at) return 'pending_signup';
  return 'active';
}

export interface SubscriptionRowLike {
  tier: string;
  status: string;
  /** Absent on rows written before the column existed — those are provider rows. */
  source?: string | null;
  current_period_end: string | null;
}

/**
 * A provider-owned Pro row. A grant must never overwrite one.
 * `trialing` counts: a Polar free trial is still the provider's row.
 */
export function isPaidProviderSubscription(row: SubscriptionRowLike | null | undefined): boolean {
  if (!row) return false;
  const source = row.source || 'polar';
  const live = row.status === 'active' || row.status === 'trialing';
  return row.tier === 'pro' && live && source !== 'admin_grant';
}

export interface ProEntitlement {
  hasPro: boolean;
  /** Pro on an active provider subscription: not a trial, a dunning grace or a gift. */
  paid: boolean;
  source: SubscriptionSource;
  /** True only for a grant whose deadline has passed. */
  expired: boolean;
  /** The grant deadline (ISO) when the row is a grant, else the provider's period end. */
  periodEnd: string | null;
}

/** Slack after a trial end before a missing lapse webhook stops counting. */
export const TRIAL_END_GRACE_MS = DAY_MS;

/**
 * Grace past `current_period_end` for a past_due row (our choice, not Polar's number). Polar does
 * not say whether that date has already rolled forward on a failed renewal, so the real bound is
 * the provider's own unpaid/revoke event; this cap only stops a lost webhook keeping Pro forever.
 */
export const PAST_DUE_GRACE_MS = 7 * DAY_MS;

function withinGrace(periodEnd: string | null, graceMs: number, nowMs: number, whenMissing: boolean): boolean {
  const endMs = periodEnd ? Date.parse(periodEnd) : NaN;
  if (!Number.isFinite(endMs)) return whenMissing;
  return nowMs < endMs + graceMs;
}

/**
 * The single answer to "is this teacher Pro right now?".
 *
 * Provider rows (tier pro): `active` is Pro regardless of `current_period_end`,
 * so a late renewal webhook never logs a paying teacher out. `trialing` is Pro
 * until the trial end plus a day. `past_due` is Pro for PAST_DUE_GRACE_MS past
 * the failed renewal. Canceled and paused are not Pro.
 *
 * Grant rows: `status === 'active'` AND `now < current_period_end`. A grant
 * with no deadline is treated as over, never as forever. Grants are not trials.
 */
export function resolveProEntitlement(row: SubscriptionRowLike | null | undefined, nowMs: number): ProEntitlement {
  if (!row) return { hasPro: false, paid: false, source: 'polar', expired: false, periodEnd: null };
  const source = ((row.source as SubscriptionSource) || 'polar');
  const activePro = row.tier === 'pro' && row.status === 'active';
  if (source !== 'admin_grant') {
    const end = row.current_period_end;
    let providerPro = false;
    if (row.tier === 'pro') {
      if (row.status === 'active') providerPro = true;
      else if (row.status === 'trialing') providerPro = withinGrace(end, TRIAL_END_GRACE_MS, nowMs, true);
      else if (row.status === 'past_due') providerPro = withinGrace(end, PAST_DUE_GRACE_MS, nowMs, false);
    }
    return { hasPro: providerPro, paid: activePro, source, expired: false, periodEnd: end };
  }
  const endMs = row.current_period_end ? Date.parse(row.current_period_end) : NaN;
  const stillValid = Number.isFinite(endMs) && endMs > nowMs;
  return {
    hasPro: activePro && stillValid,
    paid: false,
    source,
    expired: activePro && !stillValid,
    periodEnd: row.current_period_end,
  };
}

/** Users Pro right now, from `subscriptions` rows selected with `source`. */
export function proUserIdsFrom(
  rows: ReadonlyArray<SubscriptionRowLike & { user_id: string }>,
  nowMs: number,
): Set<string> {
  return new Set(rows.filter((r) => resolveProEntitlement(r, nowMs).hasPro).map((r) => r.user_id));
}
