import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { resolveProEntitlement } from '@/lib/education/proGrant';
import { getPolarClient, getProProductId } from '@/lib/polar';
import { createAdminClient } from '@/utils/supabase/admin';
import logger from '@/utils/logger';
import { buildProCheckoutStartedEvent, captureProFunnelServerEvent } from '@/lib/education/proFunnelServer';

/**
 * A second free trial, or a trial on top of Pro, is a paid checkout instead.
 * Lookup failure does not flip a first trial into a charge — it allows the trial.
 */
async function polarTrialBlocked(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;
  try {
    const { data: sub } = await admin
      .from('subscriptions')
      .select('tier,status,source,current_period_end')
      .eq('user_id', userId)
      .maybeSingle();
    if (sub && resolveProEntitlement(sub, Date.now()).hasPro) return true;
    const { data: events, error } = await admin
      .from('subscription_events')
      .select('id')
      .eq('user_id', userId)
      .contains('payload', { trial: true })
      .limit(1);
    if (error) return false;
    return Array.isArray(events) && events.length > 0;
  } catch (err) {
    logger.warn('Polar trial eligibility lookup failed:', err);
    return false;
  }
}

/**
 * `{ trial: true }` starts the 14-day Teacher Pro trial. Empty body, malformed
 * JSON, and any other value stay on the paid checkout — older clients post
 * with no body at all.
 */
async function wantsTrial(request: NextRequest): Promise<boolean> {
  const raw = await request.text();
  if (!raw.trim()) return false;
  try {
    const parsed = JSON.parse(raw) as { trial?: unknown };
    return parsed?.trial === true;
  } catch {
    return false;
  }
}

/**
 * POST /api/subscription/checkout
 * Create a Polar checkout URL for the Pro subscription.
 * Body `{ trial: true }` opts into the 14-day free trial. No body = pay $9/mo.
 *
 * Response:
 * - 200: { url: string } — redirect to this URL
 * - 401: Unauthorized
 * - 503: Checkout disabled because Polar is not configured
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Checkout gate: keep the till shut while Polar wiring is missing.
    // This is a runtime check, so it auto-opens the moment env vars are set
    // and stays shut with a clear message if they are not.
    const polarAccessToken = process.env.POLAR_ACCESS_TOKEN;
    const polarProductId = process.env.POLAR_PRO_PRODUCT_ID;
    if (!polarAccessToken || !polarProductId) {
      return NextResponse.json(
        { error: 'Checkout is not available yet — Polar billing is not configured' },
        { status: 503 }
      );
    }

    const user = await getAuthedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestedTrial = await wantsTrial(request);
    const trial = requestedTrial && !(await polarTrialBlocked(user.id));
    const client = getPolarClient();
    const checkoutUrl = await client.createCheckout({
      userId: user.id,
      productId: getProProductId(),
      email: user.email ?? undefined,
      allowTrial: trial,
    });

    // Analytics only, after the checkout exists; never able to change the answer.
    try {
      captureProFunnelServerEvent(buildProCheckoutStartedEvent(user.id));
    } catch {
      /* the teacher's checkout url matters more than the funnel */
    }

    return NextResponse.json({ url: checkoutUrl });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in POST /api/subscription/checkout:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout' },
      { status: 500 }
    );
  }
}
