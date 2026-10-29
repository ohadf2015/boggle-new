/**
 * Revenue props + lifecycle events for the Polar webhook (Teacher Pro).
 *
 * Before this, `paid` / `teacher_trial_started` / `trial_expired` carried only a
 * subscription id: PostHog could not say how much, in what currency, or which
 * product, renewals (`order.paid`) and paid cancellations left no event at all,
 * and Polar's own checkout status (open → confirmed → succeeded / failed /
 * expired) never reached analytics — so 8 checkout starts in October could not be
 * told apart from "abandoned on Polar" vs "payment failed".
 *
 * Pure: no I/O. Reads Polar payload fields defensively (cents + ISO currency).
 * Emitted through captureProFunnelServerEvent so `$host` is stamped.
 * Never includes customer email/name — ids, amounts and statuses only.
 */
import type { EduServerEvent } from '@/backend/utils/educationTelemetry';

const BASE = { product: 'teacher_pro', provider: 'polar' } as const;

type PolarData = any;

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}
function str(v: unknown): string | null {
  return typeof v === 'string' && v ? v : null;
}

export interface PolarRevenueProps {
  polar_product_id?: string;
  amount_cents?: number;
  currency?: string;
  interval?: string;
}

/**
 * amount/currency/product/interval from a subscription, order or checkout payload.
 * Orders: total_amount (incl. tax) → net_amount → amount. Subscriptions/checkouts:
 * amount → total_amount. Keys are omitted (not faked) when Polar did not send them.
 */
export function polarRevenueProps(data: PolarData): PolarRevenueProps {
  const d = data ?? {};
  const amount =
    num(d.total_amount) ?? num(d.net_amount) ?? num(d.amount) ?? num(d.subtotal_amount);
  const currency = str(d.currency);
  const productId = str(d.product_id) ?? str(d.product?.id);
  const interval = str(d.recurring_interval) ?? str(d.product?.recurring_interval);
  return {
    ...(productId ? { polar_product_id: productId } : {}),
    ...(amount !== null ? { amount_cents: amount } : {}),
    ...(currency ? { currency: currency.toUpperCase() } : {}),
    ...(interval ? { interval } : {}),
  };
}

/** Same event, revenue props merged under the existing ones (never overrides). */
export function withRevenue(event: EduServerEvent, data: PolarData): EduServerEvent {
  return { ...event, properties: { ...polarRevenueProps(data), ...event.properties } };
}

/**
 * `polar_order_paid` — real money in, first payment AND renewals. `revenue` is in
 * major units (USD 9.00 → 9) so PostHog revenue analytics can sum it; $0 trial
 * orders carry revenue 0.
 */
export function buildPolarOrderPaidEvent(userId: string, data: PolarData): EduServerEvent {
  const rev = polarRevenueProps(data);
  return {
    distinctId: userId,
    event: 'polar_order_paid',
    properties: {
      ...BASE,
      ...rev,
      order_id: String(data?.id ?? ''),
      subscription_id: str(data?.subscription_id) ?? '',
      billing_reason: str(data?.billing_reason) ?? 'unknown',
      ...(rev.amount_cents !== undefined ? { revenue: rev.amount_cents / 100 } : {}),
    },
  };
}

/** `polar_subscription_canceled` / `polar_subscription_revoked` — any cancel, trial or paid. */
export function buildPolarSubscriptionEndedEvent(
  kind: 'canceled' | 'revoked',
  userId: string,
  data: PolarData,
  wasTrial: boolean,
): EduServerEvent {
  return {
    distinctId: userId,
    event: `polar_subscription_${kind}`,
    properties: {
      ...BASE,
      ...polarRevenueProps(data),
      subscription_id: String(data?.id ?? ''),
      status: str(data?.status) ?? 'unknown',
      was_trial: wasTrial,
      cancel_at_period_end: Boolean(data?.cancel_at_period_end),
      ...(str(data?.customer_cancellation_reason) ? { cancel_reason: data.customer_cancellation_reason } : {}),
    },
  };
}

/**
 * `polar_checkout_status` — every checkout.created / checkout.updated: where a
 * started checkout ended up on Polar's side (open, confirmed, succeeded, failed,
 * expired). Keyed to the teacher when the checkout carries the user id.
 */
export function buildPolarCheckoutStatusEvent(
  userId: string | undefined,
  eventType: string,
  data: PolarData,
): EduServerEvent {
  return {
    distinctId: userId ?? `polar_checkout:${String(data?.id ?? 'unknown')}`,
    event: 'polar_checkout_status',
    properties: {
      ...BASE,
      ...polarRevenueProps(data),
      checkout_id: String(data?.id ?? ''),
      status: str(data?.status) ?? 'unknown',
      webhook_event: eventType,
      has_user: Boolean(userId),
    },
  };
}
