/**
 * Pre-cancel retention for Teacher Pro.
 *
 * Polar only pauses an *active* subscription, and a pause never starts mid-period.
 * A trialing teacher (the cancel we actually lost) is not active, so "pause 1 month"
 * is a one-month trial_end extension: no charge, Pro stays on, the first invoice
 * moves back. A paying teacher gets pause_at_period_end plus resumes_at one month
 * after the current period end.
 *
 * The 50% offer is one shared percentage discount (repeating, 3 months, 5000 basis
 * points) applied with PATCH discount_id. Polar applies it on the next invoice.
 */

export const RETAIN_DISCOUNT_CODE = 'TEACHERPROKEEP50';
export const RETAIN_DISCOUNT_PURPOSE = 'teacher_pro_retain_50_3mo';
export const RETAIN_DISCOUNT_BASIS_POINTS = 5000;
export const RETAIN_DISCOUNT_MONTHS = 3;
export const RETAIN_PAUSE_METADATA_UNTIL = 'retain_pause_until';
export const RETAIN_PAUSE_METADATA_OFFER = 'retain_offer';
export const TEACHER_PRO_REFRESH_EVENT = 'teacher-pro-refresh';

const DISCOUNT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type RetainOffer = 'pause' | 'discount';

export interface PolarSubscriptionSnapshot {
  id: string;
  status: string;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  pauseAtPeriodEnd: boolean;
  discountId: string | null;
  metadata: Record<string, unknown>;
  externalCustomerId: string | null;
  metaUserId: string | null;
}

export type PausePlan =
  | { ok: true; already: true; mechanism: 'trial_extend' | 'pause_at_period_end' }
  | {
      ok: true;
      already: false;
      mechanism: 'trial_extend';
      trialEnd: string;
      body: { trial_end: string; metadata: Record<string, unknown> };
    }
  | {
      ok: true;
      already: false;
      mechanism: 'pause_at_period_end';
      resumesAt: string;
      body: { pause_at_period_end: true; resumes_at: string };
    }
  | { ok: false; reason: 'canceled' | 'not_pausable' };

/** One calendar month later, UTC. Jan 31 lands on the last day of February. */
export function addOneUtcMonth(ms: number): string {
  const d = new Date(ms);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + 1);
  if (d.getUTCDate() !== day) d.setUTCDate(0);
  return d.toISOString();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export function parsePolarSubscription(raw: unknown): PolarSubscriptionSnapshot | null {
  const row = asRecord(raw);
  if (!row || typeof row.id !== 'string' || !row.id) return null;
  const customer = asRecord(row.customer);
  const metadata = asRecord(row.metadata) ?? {};
  const metaUser =
    typeof metadata.user_id === 'string'
      ? metadata.user_id
      : typeof metadata.teacher_id === 'string'
        ? metadata.teacher_id
        : null;
  return {
    id: row.id,
    status: typeof row.status === 'string' ? row.status : '',
    trialEnd: typeof row.trial_end === 'string' ? row.trial_end : null,
    currentPeriodEnd: typeof row.current_period_end === 'string' ? row.current_period_end : null,
    cancelAtPeriodEnd: row.cancel_at_period_end === true,
    pauseAtPeriodEnd: row.pause_at_period_end === true,
    discountId: typeof row.discount_id === 'string' ? row.discount_id : null,
    metadata,
    externalCustomerId: customer && typeof customer.external_id === 'string' ? customer.external_id : null,
    metaUserId: metaUser,
  };
}

/** Refuse a positive mismatch. A row with no Polar owner still belongs to the teacher our DB keyed. */
export function subscriptionOwnedBy(sub: PolarSubscriptionSnapshot, userId: string): boolean {
  if (sub.externalCustomerId && sub.externalCustomerId !== userId) return false;
  if (sub.metaUserId && sub.metaUserId !== userId) return false;
  return true;
}

function futureIso(raw: unknown, nowMs: number): boolean {
  return typeof raw === 'string' && Number.isFinite(Date.parse(raw)) && Date.parse(raw) > nowMs;
}

export function planPause(sub: PolarSubscriptionSnapshot, nowMs: number): PausePlan {
  if (sub.cancelAtPeriodEnd || sub.status === 'canceled' || sub.status === 'trial_ended') {
    return { ok: false, reason: 'canceled' };
  }
  const trialEndMs = sub.trialEnd ? Date.parse(sub.trialEnd) : NaN;
  const trialing = sub.status === 'trialing' || (Number.isFinite(trialEndMs) && trialEndMs > nowMs);
  if (trialing) {
    if (sub.metadata[RETAIN_PAUSE_METADATA_OFFER] === 'pause' && futureIso(sub.metadata[RETAIN_PAUSE_METADATA_UNTIL], nowMs)) {
      return { ok: true, already: true, mechanism: 'trial_extend' };
    }
    const base = Number.isFinite(trialEndMs) && trialEndMs > nowMs ? trialEndMs : nowMs;
    const trialEnd = addOneUtcMonth(base);
    return {
      ok: true,
      already: false,
      mechanism: 'trial_extend',
      trialEnd,
      body: {
        trial_end: trialEnd,
        metadata: {
          ...sub.metadata,
          [RETAIN_PAUSE_METADATA_OFFER]: 'pause',
          [RETAIN_PAUSE_METADATA_UNTIL]: trialEnd,
        },
      },
    };
  }
  if (sub.status !== 'active') return { ok: false, reason: 'not_pausable' };
  if (sub.pauseAtPeriodEnd) return { ok: true, already: true, mechanism: 'pause_at_period_end' };
  const periodEnd = sub.currentPeriodEnd ? Date.parse(sub.currentPeriodEnd) : NaN;
  if (!Number.isFinite(periodEnd)) return { ok: false, reason: 'not_pausable' };
  const resumesAt = addOneUtcMonth(Math.max(periodEnd, nowMs));
  return {
    ok: true,
    already: false,
    mechanism: 'pause_at_period_end',
    resumesAt,
    body: { pause_at_period_end: true, resumes_at: resumesAt },
  };
}

export function retainDiscountCreateBody(productId: string | null): Record<string, unknown> {
  return {
    name: 'Teacher Pro keep offer — 50% for 3 months',
    type: 'percentage',
    duration: 'repeating',
    duration_in_months: RETAIN_DISCOUNT_MONTHS,
    basis_points: RETAIN_DISCOUNT_BASIS_POINTS,
    // No checkout code: this repo is public, and a code would be a 50% coupon anyone could paste.
    max_redemptions_per_customer: 1,
    metadata: { purpose: RETAIN_DISCOUNT_PURPOSE },
    ...(productId ? { products: [productId] } : {}),
  };
}

export function findRetainDiscount(items: Array<Record<string, unknown>>): string | null {
  for (const item of items) {
    const id = typeof item.id === 'string' ? item.id : '';
    if (!DISCOUNT_ID.test(id)) continue;
    const code = typeof item.code === 'string' ? item.code : '';
    const meta = asRecord(item.metadata);
    if (code === RETAIN_DISCOUNT_CODE || meta?.purpose === RETAIN_DISCOUNT_PURPOSE) return id;
  }
  return null;
}

export function pinnedRetainDiscountId(raw: string | null | undefined): string | null {
  const id = raw?.trim() ?? '';
  return DISCOUNT_ID.test(id) ? id : null;
}

export function isDuplicateDiscountError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? '');
  return /\b422\b/.test(message) && /code|already|exist/i.test(message);
}
