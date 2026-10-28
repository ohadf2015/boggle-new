import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { createAdminClient } from '@/utils/supabase/admin';
import { logSubscriptionEvent } from '@/lib/subscriptions';
import { withTimeout } from '@/lib/server/routeTimeout';
import { checkoutClientKind, testEmailReason } from '@/lib/education/checkoutTrafficTags';
import {
  buildCheckoutReturnLandedEvent,
  buildEduProCheckoutReturnLandedEvent,
  captureProFunnelServerEvent,
} from '@/lib/education/proFunnelServer';
import logger from '@/utils/logger';

const RETURN_RECORD_TIMEOUT_MS = 1500;
const TEST_FLAG_LOOKUP_TIMEOUT_MS = 800;
const LOCALE_RE = /^[a-z]{2}(-[A-Za-z]{2})?$/;

async function profileIsTestAccount(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;
  try {
    const { data } = await withTimeout(
      Promise.resolve(
        admin.from('profiles').select('is_test_account').eq('id', userId).maybeSingle(),
      ),
      TEST_FLAG_LOOKUP_TIMEOUT_MS,
    );
    return (data as { is_test_account?: boolean | null } | null)?.is_test_account === true;
  } catch {
    return false;
  }
}

/**
 * POST /api/subscription/checkout-return
 *
 * Unconditional server-side record that a teacher landed back from Polar
 * with `?checkout=success`. Not gated behind webhook grant (`hasPro`), and not
 * gated behind browser PostHog cookie consent (~97% of visitors never reach
 * client PostHog).
 *
 * Records both:
 * 1. Durable `subscription_events` row (`event_type = 'checkout_return_landed'`)
 *    so the admin funnel readout and SQL queries can join `checkout_started` ->
 *    `checkout_url_reachable`/`checkout_url_error` -> `checkout_return_landed`.
 * 2. Server-side PostHog events (`checkout_return_landed` and
 *    `edu_pro_checkout_return_landed`) with `$host` stamped.
 */
export async function POST(request: NextRequest) {
  try {
    let body: { locale?: unknown; path?: unknown } = {};
    try {
      const raw = await request.text();
      if (raw.trim()) body = JSON.parse(raw);
    } catch {
      body = {};
    }

    const locale =
      typeof body.locale === 'string' && LOCALE_RE.test(body.locale) ? body.locale : undefined;
    const path =
      typeof body.path === 'string' && body.path.startsWith('/') && body.path.length <= 200
        ? body.path
        : undefined;
    const clientKind = checkoutClientKind(request.headers);

    const user = await getAuthedUser(request);
    if (!user) {
      const anonTags: Record<string, unknown> = {
        client_kind: clientKind,
        ...(locale ? { locale } : {}),
        ...(path ? { path } : {}),
      };
      captureProFunnelServerEvent(buildCheckoutReturnLandedEvent('anonymous', anonTags));
      captureProFunnelServerEvent(buildEduProCheckoutReturnLandedEvent('anonymous', anonTags));
      return new NextResponse(null, { status: 204 });
    }

    const profileTest = await profileIsTestAccount(user.id);
    const emailReason = testEmailReason(user.email ?? null);
    const testReason = profileTest ? 'profile_flag' : emailReason;
    const isTestAccount = testReason !== null;

    // Never include `trial: true` in subscription_events.payload — readers
    // treat any event with `{ trial: true }` as a consumed Polar trial.
    const payload: Record<string, unknown> = {
      product: 'teacher_pro',
      provider: 'polar',
      client_kind: clientKind,
      is_test_account: isTestAccount,
      test_reason: testReason,
      ...(locale ? { locale } : {}),
      ...(path ? { path } : {}),
    };

    try {
      await withTimeout(
        logSubscriptionEvent({
          userId: user.id,
          eventType: 'checkout_return_landed',
          payload,
        }),
        RETURN_RECORD_TIMEOUT_MS,
      );
    } catch (err) {
      logger.warn('Could not record checkout return landed:', err);
    }

    const tags: Record<string, unknown> = {
      client_kind: clientKind,
      is_test_account: isTestAccount,
      test_reason: testReason,
      ...(locale ? { locale } : {}),
      ...(path ? { path } : {}),
    };
    captureProFunnelServerEvent(buildCheckoutReturnLandedEvent(user.id, tags));
    captureProFunnelServerEvent(buildEduProCheckoutReturnLandedEvent(user.id, tags));
  } catch (err) {
    logger.warn('Exception in POST /api/subscription/checkout-return:', err);
  }
  return new NextResponse(null, { status: 204 });
}
