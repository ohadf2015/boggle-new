import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { getLemonSqueezyClient } from '@/lib/lemonsqueezy';
import logger from '@/utils/logger';

/**
 * POST /api/subscription/checkout
 * Create a Lemon Squeezy checkout URL for Pro subscription
 *
 * Response:
 * - 200: { url: string } — redirect to this URL
 * - 401: Unauthorized
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Checkout gate: the Lemon Squeezy store is still in test mode / pending KYC activation, so a
    // real user must not be able to reach a checkout that can't take their money. Enabled only when
    // NEXT_PUBLIC_CHECKOUT_ENABLED is exactly 'true' (set it once the store is Live + live keys are in).
    if (process.env.NEXT_PUBLIC_CHECKOUT_ENABLED !== 'true') {
      return NextResponse.json({ error: 'Checkout is not available yet' }, { status: 503 });
    }

    const user = await getAuthedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
