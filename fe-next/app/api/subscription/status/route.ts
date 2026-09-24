import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { checkTeacherSubscription } from '@/lib/subscriptions';
import { polarTrialExpires } from '@/lib/education/polarTrial';
import { getPolarClient } from '@/lib/polar';
import { createAdminClient } from '@/utils/supabase/admin';
import logger from '@/utils/logger';

/**
 * True once any webhook for this teacher was marked as a Polar trial.
 * No trial column — the event payload is the record that blocks a second trial.
 * A lookup failure is "not used": the live `trialing` row still hides the CTA.
 */
async function hasPolarTrialEvent(userId: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    if (!admin) return false;
    const { data, error } = await admin
      .from('subscription_events')
      .select('id')
      .eq('user_id', userId)
      .contains('payload', { trial: true })
      .limit(1);
    if (error) return false;
    return Array.isArray(data) && data.length > 0;
  } catch (err) {
    logger.warn('Polar trial marker lookup failed:', err);
    return false;
  }
}

/**
 * GET /api/subscription/status
 * Get the current subscription status and portal URL for the authenticated teacher
 *
 * Response:
 * - 200: { has_pro, tier, status, source, grant_expired, portal_url, current_period_end,
 *          cancel_at_period_end, trial_expires, trial_used,
 *          grant: { id, expires_at, days, note, welcomed } | null }
 *   trial_expires is the ISO trial end while status is trialing, else null.
 *   trial_used is true once a Polar trial has started (no second free trial).
 * - 401: Unauthorized
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await checkTeacherSubscription(user.id);
    const isGrant = subscription.source === 'admin_grant';

    // Portal only for a provider subscription. A granted teacher has no Polar
    // customer, so the call could only fail and log a warning on every load.
    let portalUrl: string | null = null;
    if (subscription.has_pro && !isGrant) {
      try {
        const client = getPolarClient();
        portalUrl = await client.createCustomerPortalUrl(user.id);
      } catch (err) {
        logger.warn('Failed to fetch portal URL:', err);
        // Continue even if portal URL fetch fails
      }
    }

    // The grant record drives the one-time "you're on Pro" celebration and the
    // "gifted until" copy. Read with service-role: the teacher's own-row policy
    // exists, but this route may run on a bearer token where the request-scoped
    // client has no session.
    let grant: { id: string; expires_at: string; days: number; note: string | null; welcomed: boolean } | null = null;
    if (isGrant) {
      const admin = createAdminClient();
      if (admin) {
        const { data } = await admin
          .from('teacher_pro_grants')
          .select('id, expires_at, days, note, welcomed_at')
          .eq('user_id', user.id)
          .is('revoked_at', null)
          .order('expires_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const g = data as { id: string; expires_at: string; days: number; note: string | null; welcomed_at: string | null } | null;
        if (g) grant = { id: g.id, expires_at: g.expires_at, days: g.days, note: g.note, welcomed: !!g.welcomed_at };
      }
    }

    const trialExpires = polarTrialExpires(subscription);
    const onPolarTrial = trialExpires !== null || (
      subscription.status === 'trialing' &&
      subscription.tier === 'pro' &&
      subscription.source !== 'admin_grant'
    );
    const trialUsed = onPolarTrial || await hasPolarTrialEvent(user.id);

    return NextResponse.json({
      has_pro: subscription.has_pro,
      tier: subscription.tier,
      status: subscription.status,
      source: subscription.source,
      grant_expired: subscription.grant_expired,
      portal_url: portalUrl,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
      trial_expires: trialExpires,
      trial_used: trialUsed,
      grant,
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
