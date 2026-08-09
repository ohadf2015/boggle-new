import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { checkTeacherSubscription } from '@/lib/subscriptions';
import { getPolarClient } from '@/lib/polar';
import logger from '@/utils/logger';

/**
 * GET /api/subscription/status
 * Get the current subscription status and portal URL for the authenticated teacher
 *
 * Response:
 * - 200: { has_pro: boolean, portal_url: string | null, current_period_end: string | null }
 * - 401: Unauthorized
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get subscription status
    const subscription = await checkTeacherSubscription(user.id);

    // If Pro, create a Polar customer portal session (external_customer_id = user id, set at checkout)
    let portalUrl: string | null = null;
    if (subscription.has_pro) {
      try {
        const client = getPolarClient();
        portalUrl = await client.createCustomerPortalUrl(user.id);
      } catch (err) {
        logger.warn('Failed to fetch portal URL:', err);
        // Continue even if portal URL fetch fails
      }
    }

    return NextResponse.json({
      has_pro: subscription.has_pro,
      tier: subscription.tier,
      status: subscription.status,
      portal_url: portalUrl,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in GET /api/subscription/status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription status' },
      { status: 500 }
    );
  }
}
