import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { checkTeacherSubscription } from '@/lib/subscriptions';
import { createAdminClient } from '@/utils/supabase/admin';
import { isNativeAppUserAgent } from '@/lib/native/nativeHandoff';
import { isQaEmail } from '@/backend/utils/educationRoundTelemetry';
import { isAnyTestAccount } from '@/lib/education/eduTestAccount';
import {
  buildTrialCancelReasonSelectedEvent,
  captureProFunnelServerEvent,
} from '@/lib/education/proFunnelServer';
import {
  recordTeacherTrialFunnelStep,
  TEACHER_TRIAL_CANCEL_REASON_SELECTED_EVENT,
} from '@/lib/education/teacherTrialFunnel';
import logger from '@/utils/logger';

/**
 * POST /api/subscription/cancel-reason  { reason: CancelReason }
 *
 * The one-tap reason chips a teacher taps after cancelling a Teacher Pro trial
 * (cancel_at_period_end=true — Pro stays on until the trial end, nothing is
 * charged). Stored on the subscriptions row the dashboard already reads, so the
 * chips disappear on the next status read once answered.
 *
 * Once per subscription: the write is `cancel_reason IS NULL`-guarded, so the
 * row itself is the dedupe key (a second tap is a no-op, not a duplicate) and
 * `trial_cancel_reason_selected` fires only when the write actually landed.
 * QA accounts (@lexiclash.test / profiles.is_test_account) still store their
 * answer but never emit the event, per the QA-pollution guards.
 */

export const CANCEL_REASONS = ['too_expensive', 'school_pays', 'just_testing', 'missing_feature'] as const;
export type CancelReason = (typeof CANCEL_REASONS)[number];

export function isCancelReason(value: unknown): value is CancelReason {
  return typeof value === 'string' && (CANCEL_REASONS as readonly string[]).includes(value);
}

export async function POST(request: NextRequest) {
  if (isNativeAppUserAgent(request.headers.get('user-agent'))) {
    return NextResponse.json({ error: 'not_in_app' }, { status: 403 });
  }
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let reason: unknown;
  try {
    reason = (await request.json())?.reason;
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  if (!isCancelReason(reason)) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  // Only a live Pro plan that has been cancelled can carry a cancel reason.
  const sub = await checkTeacherSubscription(user.id);
  if (!sub.has_pro || sub.source !== 'polar' || !sub.cancel_at_period_end) {
    return NextResponse.json({ error: 'no_cancelled_pro_subscription' }, { status: 409 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'unavailable' }, { status: 503 });

  const { data, error } = await admin
    .from('subscriptions')
    .update({ cancel_reason: reason, reason_source: 'chip' })
    .eq('user_id', user.id)
    .is('cancel_reason', null)
    .select('lemon_squeezy_subscription_id');
  if (error) {
    logger.error('[CancelReason] row update failed:', error);
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
  // Empty data = the row already had a reason: once per subscription, no event.
  if (!Array.isArray(data) || data.length === 0) {
    return NextResponse.json({ ok: true, recorded: false });
  }

  const subscriptionId = (data[0] as { lemon_squeezy_subscription_id?: string | null } | null)
    ?.lemon_squeezy_subscription_id;
  const isTestAccount = isQaEmail(user.email) || (await isAnyTestAccount(admin, [user.id]));
  if (!isTestAccount) {
    try {
      captureProFunnelServerEvent(
        buildTrialCancelReasonSelectedEvent(user.id, { reason, subscriptionId: subscriptionId ?? null }),
      );
    } catch {
      /* analytics never blocks the answer */
    }
    await recordTeacherTrialFunnelStep({
      userId: user.id,
      eventType: TEACHER_TRIAL_CANCEL_REASON_SELECTED_EVENT,
      subscriptionId: subscriptionId ?? null,
      payload: { reason, reason_source: 'chip' },
      // No dedupe: the IS NULL write above is the once-per-subscription key.
    });
  }
  return NextResponse.json({ ok: true, recorded: true });
}
