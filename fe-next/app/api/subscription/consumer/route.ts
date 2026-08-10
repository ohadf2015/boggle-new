import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { checkConsumerSubscription } from '@/lib/subscriptions';
import logger from '@/utils/logger';

/**
 * GET /api/subscription/consumer
 * Get the current Consumer Pro subscription status for the authenticated user.
 *
 * Response:
 * - 200: { hasConsumerPro: boolean, tier: string, status: string, features: {...} }
 * - 401: Unauthorized
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await checkConsumerSubscription(user.id);

    return NextResponse.json({
      hasConsumerPro: subscription.has_consumer_pro,
      tier: subscription.tier,
      status: subscription.status,
      features: subscription.features,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in GET /api/subscription/consumer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch consumer subscription status' },
      { status: 500 }
    );
  }
}