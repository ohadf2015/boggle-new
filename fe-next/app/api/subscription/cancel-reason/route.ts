import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { checkTeacherSubscription, logSubscriptionEvent } from '@/lib/subscriptions';
import { isTrialCancelReason } from '@/lib/education/trialCancelReason';

/**
 * POST /api/subscription/cancel-reason
 * One tap from the canceled-trial banner. Stores the reason. Does not email.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let reason: unknown;
  try {
    reason = (await request.json())?.reason;
  } catch {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  if (!isTrialCancelReason(reason)) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const sub = await checkTeacherSubscription(user.id);
  if (sub.status !== 'trialing' || !sub.cancel_at_period_end) {
    return NextResponse.json({ error: 'not_canceled_trial' }, { status: 409 });
  }

  await logSubscriptionEvent({
    userId: user.id,
    eventType: 'teacher_trial_cancel_reason',
    payload: { cancel_reason: reason, customer_cancellation_reason: reason, source: 'in_app_chip' },
  });
  return NextResponse.json({ ok: true });
}
