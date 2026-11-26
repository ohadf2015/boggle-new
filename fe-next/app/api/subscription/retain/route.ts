import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { checkTeacherSubscription } from '@/lib/subscriptions';
import { getPolarClient, getProProductId, PolarApiError } from '@/lib/polar';
import { createAdminClient } from '@/utils/supabase/admin';
import { isNativeAppUserAgent } from '@/lib/native/nativeHandoff';
import { buildCancelOfferAppliedEvent, captureProFunnelServerEvent } from '@/lib/education/proFunnelServer';
import {
  findRetainDiscount,
  isDuplicateDiscountError,
  parsePolarSubscription,
  pinnedRetainDiscountId,
  planPause,
  retainDiscountCreateBody,
  subscriptionOwnedBy,
  type RetainOffer,
} from '@/lib/education/cancelRetention';
import logger from '@/utils/logger';

/**
 * POST /api/subscription/retain
 *
 * Keep a Teacher Pro teacher who opened Manage or cancel. `offer` is `pause`
 * (1 month) or `discount` (50% for 3 months). Does not cancel, and does not
 * start a second checkout. The Polar portal remains the only cancel door.
 */
export async function POST(request: NextRequest) {
  if (isNativeAppUserAgent(request.headers.get('user-agent'))) {
    return NextResponse.json({ error: 'not_in_app' }, { status: 403 });
  }
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let offer: RetainOffer | null = null;
  try {
    const body = (await request.json()) as { offer?: unknown };
    if (body?.offer === 'pause' || body?.offer === 'discount') offer = body.offer;
  } catch {
    offer = null;
  }
  if (!offer) return NextResponse.json({ error: 'bad_offer' }, { status: 400 });

  const sub = await checkTeacherSubscription(user.id);
  if (sub.source === 'admin_grant' || (!sub.has_pro && sub.status !== 'past_due')) {
    return NextResponse.json({ error: 'nothing_to_retain' }, { status: 409 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  const { data } = await admin
    .from('subscriptions')
    .select('lemon_squeezy_subscription_id')
    .eq('user_id', user.id)
    .single();
  const subscriptionId = data?.lemon_squeezy_subscription_id;
  if (!subscriptionId) return NextResponse.json({ error: 'nothing_to_retain' }, { status: 409 });

  const polar = getPolarClient();
  let snapshot;
  try {
    snapshot = parsePolarSubscription(await polar.getSubscription(subscriptionId));
  } catch (err) {
    logger.error('[Retain] could not read the Polar subscription:', err);
    return NextResponse.json({ error: 'provider_error' }, { status: 502 });
  }
  if (!snapshot || !subscriptionOwnedBy(snapshot, user.id)) {
    return NextResponse.json({ error: 'nothing_to_retain' }, { status: 409 });
  }

  try {
    if (offer === 'pause') {
      const plan = planPause(snapshot, Date.now());
      if (!plan.ok) {
        return NextResponse.json({ error: 'offer_unavailable', reason: plan.reason }, { status: 409 });
      }
      if (!plan.already) await polar.updateSubscription(subscriptionId, plan.body);
      if (!plan.already && plan.mechanism === 'trial_extend') {
        const { error } = await admin
          .from('subscriptions')
          .update({ current_period_end: plan.trialEnd })
          .eq('user_id', user.id);
        if (error) logger.warn('[Retain] trial end row update failed; the webhook will set it:', error);
      }
      captureApplied(user.id, { offer, mechanism: plan.mechanism, status: snapshot.status, already: plan.already });
      return NextResponse.json({ ok: true, offer, mechanism: plan.mechanism, already: plan.already });
    }

    const discountId = await resolveDiscountId(polar);
    const already = snapshot.discountId === discountId;
    if (!already) await polar.updateSubscription(subscriptionId, { discount_id: discountId });
    captureApplied(user.id, { offer, mechanism: 'discount', status: snapshot.status, already });
    return NextResponse.json({ ok: true, offer, mechanism: 'discount', already });
  } catch (err) {
    logger.error('[Retain] Polar refused the keep offer:', err);
    return NextResponse.json({ error: 'provider_error' }, { status: 502 });
  }
}

function captureApplied(
  userId: string,
  props: { offer: RetainOffer; mechanism: string; status: string; already: boolean },
): void {
  try {
    captureProFunnelServerEvent(buildCancelOfferAppliedEvent(userId, props));
  } catch {
    /* analytics never blocks the keep */
  }
}

async function resolveDiscountId(polar: ReturnType<typeof getPolarClient>): Promise<string> {
  const pinned = pinnedRetainDiscountId(process.env.POLAR_RETAIN_DISCOUNT_ID);
  if (pinned) return pinned;
  let productId: string | null = null;
  try {
    productId = getProProductId();
  } catch {
    productId = null;
  }
  try {
    const listed = await polar.listDiscounts();
    const found = findRetainDiscount(Array.isArray(listed.items) ? listed.items : []);
    if (found) return found;
  } catch (err) {
    logger.warn('[Retain] could not list discounts, will create:', err);
  }
  try {
    const created = await polar.createDiscount(retainDiscountCreateBody(productId));
    if (typeof created.id === 'string' && created.id) return created.id;
  } catch (err) {
    if (!isDuplicateDiscountError(err) && !(err instanceof PolarApiError && err.status === 422)) throw err;
    const listed = await polar.listDiscounts();
    const found = findRetainDiscount(Array.isArray(listed.items) ? listed.items : []);
    if (found) return found;
  }
  throw new Error('retain discount unavailable');
}
