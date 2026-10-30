import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { createAdminClient } from '@/utils/supabase/admin';
import { logSubscriptionEvent } from '@/lib/subscriptions';
import { withTimeout } from '@/lib/server/routeTimeout';
import { checkoutClientKind, testEmailReason } from '@/lib/education/checkoutTrafficTags';
import { normalizeCheckoutId } from '@/lib/education/checkoutReturn';
import { getPolarClient } from '@/lib/polar';
import {
  buildCheckoutReturnLandedEvent,
  buildEduProCheckoutReturnLandedEvent,
  captureProFunnelServerEvent,
} from '@/lib/education/proFunnelServer';
import logger from '@/utils/logger';

const RETURN_RECORD_TIMEOUT_MS = 1500;
const TEST_FLAG_LOOKUP_TIMEOUT_MS = 800;
const LOCALE_RE = /^[a-z]{2}(-[A-Za-z]{2})?$/;

/** The beacon accepts a $current_url only from our own surfaces. */
function currentUrlFromBody(raw: unknown): string | undefined {
  if (typeof raw !== 'string' || raw.length > 300) return undefined;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return undefined;
    const host = u.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === 'lexiclash.live' || host.endsWith('.lexiclash.live')) {
      return raw;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Polar's own status for the checkout the teacher just returned from — the
 * reconciliation the bare beacon never had: 'succeeded' with no webhook grant
 * means the webhook is broken; 'expired'/'open' means a stale success-URL
 * revisit. Null when the id is missing/malformed or Polar can't be asked —
 * the beacon must record and move on either way.
 */
async function polarCheckoutStatus(checkoutId: string | null): Promise<{ status: string; checkoutId: string | null }> {
  if (!checkoutId) return { status: 'no_checkout_id', checkoutId: null };
  try {
    const status = await getPolarClient().getCheckoutStatus(checkoutId);
    return { status: status ?? 'unknown', checkoutId };
  } catch {
    return { status: 'unknown', checkoutId };
  }
}

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
    let body: { locale?: unknown; path?: unknown; checkout_id?: unknown; url?: unknown } = {};
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

    // Attribution: which Polar checkout this return came from, and what Polar
    // itself says happened to it. Resolved before the auth branch so an
    // anonymous return (expired cookie after the redirect) is just as
    // attributable as a signed-in one.
    const attribution = await polarCheckoutStatus(normalizeCheckoutId(body.checkout_id));
    const currentUrl = currentUrlFromBody(body.url);
    const attributionTags: Record<string, unknown> = {
      status: attribution.status,
      ...(attribution.checkoutId ? { checkout_id: attribution.checkoutId } : {}),
      ...(currentUrl ? { $current_url: currentUrl } : {}),
    };

    const user = await getAuthedUser(request);
    if (!user) {
      const anonTags: Record<string, unknown> = {
        client_kind: clientKind,
        ...attributionTags,
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
    // `status`/`checkout_id`/`current_url` attribute the return without it.
    const payload: Record<string, unknown> = {
      product: 'teacher_pro',
      provider: 'polar',
      client_kind: clientKind,
      is_test_account: isTestAccount,
      test_reason: testReason,
      status: attribution.status,
      ...(attribution.checkoutId ? { checkout_id: attribution.checkoutId } : {}),
      ...(currentUrl ? { current_url: currentUrl } : {}),
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
      ...attributionTags,
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
