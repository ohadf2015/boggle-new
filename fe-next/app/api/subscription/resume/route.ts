import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { checkTeacherSubscription } from '@/lib/subscriptions';
import { getPolarClient } from '@/lib/polar';
import { createAdminClient } from '@/utils/supabase/admin';
import logger from '@/utils/logger';

/**
 * POST /api/subscription/resume
 *
 * Undo a cancel while the plan is still running: Polar keeps the same subscription and
 * charges on the original date. A new checkout here would start a second subscription.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sub = await checkTeacherSubscription(user.id);
  if (!sub.has_pro || sub.source !== 'polar' || !sub.cancel_at_period_end) {
    return NextResponse.json({ error: 'nothing_to_resume' }, { status: 409 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  const { data } = await admin
    .from('subscriptions')
    .select('lemon_squeezy_subscription_id')
    .eq('user_id', user.id)
    .single();
  const subscriptionId = data?.lemon_squeezy_subscription_id;
  if (!subscriptionId) return NextResponse.json({ error: 'nothing_to_resume' }, { status: 409 });

  try {
    await getPolarClient().resumeSubscription(subscriptionId);
  } catch (err) {
    logger.error('[Resume] Polar refused to resume the subscription:', err);
    return NextResponse.json({ error: 'provider_error' }, { status: 502 });
  }

  const { error } = await admin.from('subscriptions').update({ cancel_at_period_end: false }).eq('user_id', user.id);
  if (error) logger.warn('[Resume] row update failed; the uncanceled webhook will set it:', error);
  return NextResponse.json({ ok: true });
}
