/**
 * Unlock Teacher Pro when a teacher lands back from Polar, without waiting
 * for the webhook. Polar already confirmed the checkout; the return beacon
 * can apply the same grant the webhook would have written.
 *
 * Never trusts the browser: Polar is re-fetched server-side, the checkout
 * must belong to the signed-in teacher, and it must be the Teacher Pro
 * product. A late webhook then hits grantProFromCheckout, which is a no-op
 * patch on an already-pro row.
 */

import { grantProFromCheckout, type SubscriptionStatus } from '@/lib/subscriptions';

export const CHECKOUT_SUCCESS_STATUSES = new Set(['succeeded', 'confirmed', 'complete', 'completed']);

export type PolarCheckoutSnapshot = Record<string, unknown>;

export type CheckoutGrantSkipReason = 'not_success' | 'not_owner' | 'foreign_product' | 'missing_product';

export type CheckoutGrantPlan =
  | { ok: false; reason: CheckoutGrantSkipReason }
  | {
      ok: true;
      status: SubscriptionStatus;
      providerSubscriptionId: string | null;
      providerOrderId: string | null;
      providerProductId: string | null;
      currentPeriodEnd: string | null;
    };

export type CheckoutGrantResult = 'granted' | 'skipped' | 'failed';

function str(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

function idFrom(value: unknown): string | null {
  if (typeof value === 'string' && value) return value;
  if (value && typeof value === 'object' && 'id' in value) return str((value as { id: unknown }).id);
  return null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export function checkoutStatus(checkout: PolarCheckoutSnapshot): string | null {
  return str(checkout.status);
}

export function checkoutIsSuccess(checkout: PolarCheckoutSnapshot): boolean {
  const status = checkoutStatus(checkout);
  return !!status && CHECKOUT_SUCCESS_STATUSES.has(status);
}

export function checkoutOwnerId(checkout: PolarCheckoutSnapshot): string | null {
  const meta = asRecord(checkout.metadata);
  const customer = asRecord(checkout.customer);
  return (
    str(checkout.external_customer_id) ||
    str(meta.user_id) ||
    str(meta.teacher_id) ||
    str(customer.external_id)
  );
}

export function checkoutProductId(checkout: PolarCheckoutSnapshot): string | null {
  const direct = str(checkout.product_id) || idFrom(checkout.product);
  if (direct) return direct;
  const products = checkout.products;
  if (Array.isArray(products) && products.length > 0) return idFrom(products[0]);
  return null;
}

function trialMarker(checkout: PolarCheckoutSnapshot): { trial: boolean; trialEnd: string | null } {
  const meta = asRecord(checkout.metadata);
  const subscription = asRecord(checkout.subscription);
  const metaTrial = meta.trial === true || meta.trial === 'true';
  const trialEnd = str(checkout.trial_end) || str(subscription.trial_end);
  const trialing = str(subscription.status) === 'trialing' || metaTrial || trialEnd !== null;
  return { trial: trialing, trialEnd };
}

/**
 * Decide whether this Polar checkout may unlock Teacher Pro for this teacher.
 * Pure: no I/O, so the ownership and product checks can be unit-tested.
 */
export function planGrantFromPolarCheckout(
  checkout: PolarCheckoutSnapshot,
  args: { authedUserId: string; proProductId?: string | null },
): CheckoutGrantPlan {
  if (!checkoutIsSuccess(checkout)) return { ok: false, reason: 'not_success' };
  const owner = checkoutOwnerId(checkout);
  if (!owner || owner !== args.authedUserId) return { ok: false, reason: 'not_owner' };
  if (!args.proProductId) return { ok: false, reason: 'missing_product' };
  const productId = checkoutProductId(checkout);
  if (!productId || productId !== args.proProductId) return { ok: false, reason: 'foreign_product' };

  const marker = trialMarker(checkout);
  const subscription = asRecord(checkout.subscription);
  const periodEnd = marker.trial
    ? marker.trialEnd
    : str(checkout.current_period_end) || str(subscription.current_period_end);
  return {
    ok: true,
    status: marker.trial ? 'trialing' : 'active',
    providerSubscriptionId: str(checkout.subscription_id) || idFrom(checkout.subscription),
    providerOrderId: str(checkout.order_id) || idFrom(checkout.order),
    providerProductId: productId,
    currentPeriodEnd: periodEnd,
  };
}

export async function grantProOnCheckoutReturn(args: {
  checkout: PolarCheckoutSnapshot;
  authedUserId: string;
  proProductId?: string | null;
  grant?: typeof grantProFromCheckout;
}): Promise<CheckoutGrantResult> {
  const plan = planGrantFromPolarCheckout(args.checkout, {
    authedUserId: args.authedUserId,
    proProductId: args.proProductId,
  });
  if (!plan.ok) return 'skipped';
  try {
    const grant = args.grant ?? grantProFromCheckout;
    await grant({
      userId: args.authedUserId,
      status: plan.status,
      providerSubscriptionId: plan.providerSubscriptionId,
      providerOrderId: plan.providerOrderId,
      providerProductId: plan.providerProductId,
      currentPeriodEnd: plan.currentPeriodEnd,
    });
    return 'granted';
  } catch {
    return 'failed';
  }
}
