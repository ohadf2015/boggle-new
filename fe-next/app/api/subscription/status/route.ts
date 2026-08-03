import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { checkTeacherSubscription } from '@/lib/subscriptions';
import { getLemonSqueezyClient, LEMONSQUEEZY_API_BASE } from '@/lib/lemonsqueezy';
import { getPolarClient } from '@/lib/polar';
import { isPolarEnabled } from '@/lib/payments/config';
import { createClient } from '@/utils/supabase/server';
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

    // If Pro, fetch the "Manage subscription" portal URL from the active provider.
    let portalUrl: string | null = null;
    if (subscription.has_pro) {
      try {
        const supabase = await createClient();

        if (isPolarEnabled()) {
          // Polar: mint a short-lived customer portal session.
          const { data: subRecord } = await supabase
            .from('subscriptions')
            .select('polar_customer_id')
            .eq('user_id', user.id)
            .single();

          if (subRecord?.polar_customer_id) {
            const client = getPolarClient();
            portalUrl = await client.createCustomerPortalSession(subRecord.polar_customer_id);
          }
        } else {
          // Dormant Lemon Squeezy path.
          const { data: subRecord } = await supabase
            .from('subscriptions')
            .select('lemon_squeezy_subscription_id')
            .eq('user_id', user.id)
            .single();

          if (subRecord?.lemon_squeezy_subscription_id) {
            const client = getLemonSqueezyClient();
            const response = await client.getSubscription(subRecord.lemon_squeezy_subscription_id);

            portalUrl = response?.data?.attributes?.urls?.customer_portal || null;
          }
        }
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
