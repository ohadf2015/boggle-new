import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { getPolarClient, getProProductId } from '@/lib/polar';
import logger from '@/utils/logger';

/**
 * POST /api/subscription/checkout
 * Create a Polar checkout URL for the Pro subscription
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

    const client = getPolarClient();
    const checkoutUrl = await client.createCheckout({
      userId: user.id,
      productId: getProProductId(),
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
