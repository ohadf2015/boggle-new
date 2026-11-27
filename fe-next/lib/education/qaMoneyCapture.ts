import { isTestAccountEmail } from '@/lib/education/telemetry';
import { createAdminClient } from '@/utils/supabase/admin';

/** Money-path names a QA account must not write into prod PostHog. */
export const QA_MONEY_EVENTS = new Set([
  'teacher_pro_upgraded',
  'checkout_complete',
  'edu_pro_checkout_succeeded',
  'teacher_trial_converted',
  'trial_started',
  'teacher_trial_started',
  'edu_pro_trial_succeeded',
  'trial_activated',
  'trial_start',
  'paid',
  'trial_canceled',
  'trial_expired',
  'teacher_funnel_step',
]);

export function shouldSkipQaMoneyCapture(
  eventName: string,
  opts: { email?: string | null; isTestAccount?: boolean },
): boolean {
  if (!QA_MONEY_EVENTS.has(eventName)) return false;
  return opts.isTestAccount === true || isTestAccountEmail(opts.email);
}

type QaPayload = { data?: { customer?: { email?: unknown }; metadata?: { email?: unknown; is_test_account?: unknown } } };

/** True for @lexiclash.test or a profile flagged is_test_account. Fail open. */
export async function teacherIsQa(userId: string | undefined, payload: QaPayload): Promise<boolean> {
  const raw = payload?.data?.customer?.email ?? payload?.data?.metadata?.email;
  if (isTestAccountEmail(typeof raw === 'string' ? raw : null)) return true;
  if (payload?.data?.metadata?.is_test_account === true) return true;
  if (!userId) return false;
  try {
    const admin = createAdminClient();
    if (!admin) return false;
    const { data } = await admin.from('profiles').select('is_test_account').eq('id', userId).maybeSingle();
    return (data as { is_test_account?: boolean } | null)?.is_test_account === true;
  } catch {
    return false;
  }
}
