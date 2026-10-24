import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { resolveProEntitlement } from '@/lib/education/proGrant';
import { getPolarClient, getProProductId, probeCheckoutUrl } from '@/lib/polar';
import { productionRefusesSandbox } from '@/lib/polarBillingRuntime';
import { createAdminClient } from '@/utils/supabase/admin';
import { locales, defaultLocale } from '@/i18n/config';
import logger from '@/utils/logger';
import { logSubscriptionEvent } from '@/lib/subscriptions';
import { withTimeout } from '@/lib/server/routeTimeout';
import { buildCheckoutTrafficTags } from '@/lib/education/checkoutTrafficTags';
import { CHECKOUT_STARTED_EVENT, checkoutStartedPayload } from '@/lib/education/abandonedCheckout';
import { buildProCheckoutStartedEvent, buildProTrialStartedEvent, buildCheckoutStartedEvent, buildProCheckoutFailedEvent, captureProFunnelServerEvent } from '@/lib/education/proFunnelServer';

const CHECKOUT_START_RECORD_TIMEOUT_MS = 1500;
const TEST_FLAG_LOOKUP_TIMEOUT_MS = 800;

/** profiles.is_test_account, or null when unknown. Never throws, never slow. */
async function profileIsTestAccount(userId: string): Promise<boolean | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  try {
    const { data } = await withTimeout(
      Promise.resolve(admin.from('profiles').select('is_test_account').eq('id', userId).maybeSingle()),
      TEST_FLAG_LOOKUP_TIMEOUT_MS,
    );
    const flag = (data as { is_test_account?: boolean | null } | null)?.is_test_account;
    return typeof flag === 'boolean' ? flag : null;
  } catch {
    return null;
  }
}

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
 * with no body at all. The same parse also carries the caller's `locale`.
 */
async function parseCheckoutBody(
  request: NextRequest,
): Promise<{ trial: boolean; locale: string }> {
  const raw = await request.text();
  if (!raw.trim()) return { trial: false, locale: '' };
  try {
    const parsed = JSON.parse(raw) as { trial?: unknown; locale?: unknown };
    return {
      trial: parsed?.trial === true,
      locale: typeof parsed?.locale === 'string' ? parsed.locale : '',
    };
  } catch {
    return { trial: false, locale: '' };
  }
}

/**
 * The post-checkout success page only exists under /[locale] — a locale-less
 * /teacher?checkout=success 404s. Priority: explicit body locale (validated
 * against the shipped locales) > boggle_language cookie > default 'en'.
 */
function resolveCheckoutLocale(bodyLocale: string, cookieHeader: string | null): string {
  if (bodyLocale && (locales as readonly string[]).includes(bodyLocale)) return bodyLocale;
  const cookieLocale = cookieHeader
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('boggle_language='))
    ?.split('=')[1];
  if (cookieLocale && (locales as readonly string[]).includes(cookieLocale)) return cookieLocale;
  return defaultLocale;
}

/**
 * POST /api/subscription/checkout
 * Create a Polar checkout URL for the Pro subscription.
 * Body `{ trial: true }` opts into the 14-day free trial. No body = pay $9/mo.
 *
 * Response:
 * - 200: { url: string } — redirect to this URL
 * - 401: Unauthorized
 * - 503: Checkout disabled because a named Polar env var is missing, or
 *   POLAR_ENVIRONMENT=sandbox on a production deploy (Vercel, Railway, or
 *   the live lexiclash.live host — VERCEL_ENV alone never fires here)
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  let user: Awaited<ReturnType<typeof getAuthedUser>> = null;
  try {
    // Checkout gate: keep the till shut while Polar wiring is missing.
    // This is a runtime check, so it auto-opens the moment env vars are set
    // and stays shut with a clear message if they are not.
    const missing: string[] = []
    if (!process.env.POLAR_ACCESS_TOKEN) missing.push('POLAR_ACCESS_TOKEN')
    if (!process.env.POLAR_PRO_PRODUCT_ID) missing.push('POLAR_PRO_PRODUCT_ID')
    if (missing.length > 0) {
      captureProFunnelServerEvent(buildProCheckoutFailedEvent('anonymous', 'polar_not_configured'));
      return NextResponse.json(
        {
          error: `Checkout is not available yet — Polar billing is not configured (missing ${missing.join(', ')})`,
          missing,
        },
        { status: 503 }
      );
    }
    // VERCEL_ENV is unset on Railway, which is where lexiclash.live actually runs.
    // A sandbox var there used to 201 a sandbox.polar.sh URL and collect nothing.
    if (productionRefusesSandbox({
      hosts: [request.headers.get('x-forwarded-host'), request.headers.get('host')],
    })) {
      captureProFunnelServerEvent(buildProCheckoutFailedEvent('anonymous', 'polar_environment_mismatch'));
      return NextResponse.json(
        {
          error: 'POLAR_ENVIRONMENT must not be sandbox on the live LexiClash deploy (refusing sandbox checkout)',
          missing: ['POLAR_ENVIRONMENT'],
        },
        { status: 503 }
      );
    }

    user = await getAuthedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await parseCheckoutBody(request);
    const trial = body.trial && !(await polarTrialBlocked(user.id));
    const locale = resolveCheckoutLocale(body.locale, request.headers.get('cookie'));
    const client = getPolarClient();
    const checkoutUrl = await client.createCheckout({
      userId: user.id,
      productId: getProProductId(),
      email: user.email ?? undefined,
      allowTrial: trial,
      locale,
    });

    // Refuse before recording checkout_started. A sandbox URL must not count
    // as a start — that is the stall this guard exists to stop.
    if (productionRefusesSandbox({
      hosts: [request.headers.get('x-forwarded-host'), request.headers.get('host')],
      checkoutUrl,
    })) {
      captureProFunnelServerEvent(buildProCheckoutFailedEvent(user.id, 'polar_environment_mismatch'));
      return NextResponse.json(
        {
          error: 'POLAR_ENVIRONMENT must not be sandbox on the live LexiClash deploy (refusing sandbox checkout)',
          missing: ['POLAR_ENVIRONMENT'],
        },
        { status: 503 }
      );
    }

    try {
      await withTimeout(
        logSubscriptionEvent({
          userId: user.id,
          eventType: CHECKOUT_STARTED_EVENT,
          payload: checkoutStartedPayload({ trial, locale }),
        }),
        CHECKOUT_START_RECORD_TIMEOUT_MS,
      );
    } catch (err) {
      logger.warn('Could not record checkout start:', err);
    }

    // Analytics only, after the checkout exists; never able to change the answer.
    // URL creation is `checkout_started` (plus the edu_* names). `checkout_complete`
    // fires from the Polar webhook on paid `subscription.active` — not here.
    try {
      // Tags let funnels drop QA/probe traffic: the week of 2026-10-20 every
      // "checkout" was a scripted signed-in probe. See checkoutTrafficTags.ts.
      const tags = buildCheckoutTrafficTags({
        trial,
        email: user.email ?? null,
        profileIsTest: await profileIsTestAccount(user.id),
        headers: request.headers,
      });
      if (trial) {
        captureProFunnelServerEvent(buildProTrialStartedEvent(user.id, { ...tags }));
        captureProFunnelServerEvent(buildCheckoutStartedEvent(user.id, { ...tags }));
      } else {
        captureProFunnelServerEvent(buildProCheckoutStartedEvent(user.id, { ...tags }));
        captureProFunnelServerEvent(buildCheckoutStartedEvent(user.id, { ...tags }));
      }

      // Diagnostic only — never blocks the redirect. A teacher who started
      // checkout but never returns leaves no trace otherwise: URL creation
      // succeeding doesn't mean the hosted checkout page the browser lands
      // on is actually up (sandbox/prod mismatch, Polar outage).
      const probe = await probeCheckoutUrl(checkoutUrl);
      if (probe && !probe.ok) {
        captureProFunnelServerEvent(buildProCheckoutFailedEvent(user.id, `checkout_page_${probe.status}`));
      }
    } catch {
      /* the teacher's checkout url matters more than the funnel */
    }

    return NextResponse.json({ url: checkoutUrl });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in POST /api/subscription/checkout:', error);
    if (error.includes('timed out')) {
      captureProFunnelServerEvent(buildProCheckoutFailedEvent(user?.id ?? 'anonymous', 'polar_checkout_timeout'));
      return NextResponse.json(
        { error: 'Polar checkout URL creation timed out' },
        { status: 503 }
      );
    }
    captureProFunnelServerEvent(buildProCheckoutFailedEvent(user?.id ?? 'anonymous', 'server_error'));
    return NextResponse.json(
      { error: 'Failed to create checkout' },
      { status: 500 }
    );
  }
}
