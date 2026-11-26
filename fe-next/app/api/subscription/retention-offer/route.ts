import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { checkTeacherSubscription } from '@/lib/subscriptions';
import { getPolarClient } from '@/lib/polar';
import { createAdminClient } from '@/utils/supabase/admin';
import { isNativeAppUserAgent } from '@/lib/native/nativeHandoff';
import { buildTeacherProRetentionOfferEvent, captureProFunnelServerEvent } from '@/lib/education/proFunnelServer';
import logger from '@/utils/logger';

/**
 * POST /api/subscription/retention-offer  { offer: 'pause' | 'discount' }
 *
 * The one-click actions behind the pre-cancel interstitial a Teacher Pro
 * teacher sees on the manage/cancel path. Both are applied to the EXISTING
 * Polar subscription — never a new checkout.
 *
 * - `pause` on a TRIAL is a live Polar call: trial_end moves out one month, so
 *   nothing is charged until then (same helper the first-game trial restart uses).
 * - `pause` on an ACTIVE plan and every `discount` have no live call in the
 *   current billing client yet (Polar needs a pause primitive / a configured
 *   discount object applied via PATCH — see PR). Those are RECORDED only:
 *   the acceptance is durably captured server-side so the provider wiring has
 *   an audit trail, and the dialog says the offer "is being set up".
 *
 * Read-only on plans/prices: no checkout, no product or price change.
 */
export type RetentionOfferKind = 'pause' | 'discount';

/** `iso` + `months` in the UTC calendar, clamping day-of-month overflow (Jan 31 + 1mo → Feb 28). */
export function addMonthsUtc(iso: string, months: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return new Date(Date.now() + months * 30 * 86_400_000).toISOString();
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  if (d.getUTCDate() < day) d.setUTCDate(0);
  return d.toISOString();
}

function emitOffer(userId: string, args: { offer: RetentionOfferKind; status: string; applied: 'pause' | 'recorded' }): void {
  try {
    captureProFunnelServerEvent(buildTeacherProRetentionOfferEvent(userId, args));
  } catch {
    /* analytics never blocks the offer */
  }
}

export async function POST(request: NextRequest) {
  if (isNativeAppUserAgent(request.headers.get('user-agent'))) {
    return NextResponse.json({ error: 'not_in_app' }, { status: 403 });
  }
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let offer: unknown;
  try {
    offer = (await request.json())?.offer;
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  if (offer !== 'pause' && offer !== 'discount') {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const sub = await checkTeacherSubscription(user.id);
  const live = sub.status === 'trialing' || sub.status === 'active';
  if (!sub.has_pro || sub.source !== 'polar' || !live) {
    return NextResponse.json({ error: 'no_live_pro_subscription' }, { status: 409 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  const { data } = await admin
    .from('subscriptions')
    .select('lemon_squeezy_subscription_id, status, current_period_end')
    .eq('user_id', user.id)
    .single();
  const subscriptionId = data?.lemon_squeezy_subscription_id;
  if (!subscriptionId) return NextResponse.json({ error: 'no_live_pro_subscription' }, { status: 409 });
  const status = (data?.status as string | undefined) ?? sub.status;

  if (offer === 'pause' && status === 'trialing') {
    const base =
      typeof data?.current_period_end === 'string' && data.current_period_end
        ? data.current_period_end
        : new Date().toISOString();
    const trialEnd = addMonthsUtc(base, 1);
    try {
      await getPolarClient().setTrialEnd(subscriptionId, trialEnd);
    } catch (err) {
      logger.error('[RetentionOffer] Polar refused to move the trial end:', err);
      return NextResponse.json({ error: 'provider_error' }, { status: 502 });
    }
    emitOffer(user.id, { offer, status, applied: 'pause' });
    return NextResponse.json({ ok: true, applied: 'pause', trial_end: trialEnd });
  }

  emitOffer(user.id, { offer, status, applied: 'recorded' });
  logger.log(`[RetentionOffer] ${offer} offer for ${user.id} (status ${status}) recorded — no live provider call wired yet`);
  return NextResponse.json({ ok: true, applied: 'recorded' });
}
