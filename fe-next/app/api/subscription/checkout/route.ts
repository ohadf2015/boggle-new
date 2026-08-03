import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { getLemonSqueezyClient } from '@/lib/lemonsqueezy';
import { getPolarClient, type PolarProductKind } from '@/lib/polar';
import { isPolarEnabled } from '@/lib/payments/config';
import logger from '@/utils/logger';

/**
 * POST /api/subscription/checkout
 * Create a checkout URL for Pro (monthly subscription) or Lifetime (one-time).
 *
 * Body (optional JSON): { product?: 'pro' | 'lifetime' } — defaults to 'pro'.
 *
 * The active merchant-of-record is selected by PAYMENTS_PROVIDER
 * (see lib/payments/config.ts). Lemon Squeezy is dormant (store rejected
 * 2026-08-02) and only ever had the Pro tier.
 *
 * Response:
 * - 200: { url: string } — redirect to this URL
 * - 401: Unauthorized
 * - 503: Checkout gated off (NEXT_PUBLIC_CHECKOUT_ENABLED !== 'true')
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Checkout gate: payments must not be reachable until the provider account
    // is verified and live keys are in. Enabled only when
    // NEXT_PUBLIC_CHECKOUT_ENABLED is exactly 'true'.
    if (process.env.NEXT_PUBLIC_CHECKOUT_ENABLED !== 'true') {
      return NextResponse.json({ error: 'Checkout is not available yet' }, { status: 503 });
    }

    const user = await getAuthedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Optional product selection; the upsell modal posts no body and gets Pro.
    let product: PolarProductKind = 'pro';
    try {
      const body = await request.json();
      if (body?.product === 'lifetime') product = 'lifetime';
    } catch {
      // No JSON body — default to the Pro subscription.
    }

    if (isPolarEnabled()) {
      const client = getPolarClient();
      const url = await client.createCheckout({
        userId: user.id,
        product,
        email: user.email ?? undefined,
      });
      return NextResponse.json({ url });
    }

    // Dormant Lemon Squeezy path (PAYMENTS_PROVIDER=lemonsqueezy) — Pro only.
    const client = getLemonSqueezyClient();
    const checkoutUrl = await client.createCheckout({
      userId: user.id,
      tier: 'pro',
      email: user.email ?? undefined,
    });

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
