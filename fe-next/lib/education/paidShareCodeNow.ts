// Best-effort day-0 share-code email. The daily cron is the backstop; claiming
// the ledger here means the cron will not send a second copy.
import type { SupabaseClient } from '@supabase/supabase-js';
import logger from '@/utils/logger';
import { teacherLifecycleNudge } from '@/lib/email/templates/teacherLifecycleNudge';
import { loadLifecycleAudience, reachFor, sendLifecycleEmail } from '@/lib/email/lifecycleUnsubscribe';
import { claimSend, releaseSend } from './lifecycleLedger';
import { stageLedgerKind } from './lifecycleNudges';
import type { TeacherLocale } from './types';

const LOCALES: readonly TeacherLocale[] = ['en', 'he', 'sv', 'ja', 'es', 'ru'];

export async function sendPaidShareCodeNow(
  sb: SupabaseClient,
  args: { userId: string; email: string; fullName: string; locale: string },
): Promise<void> {
  const locale = LOCALES.includes(args.locale as TeacherLocale) ? (args.locale as TeacherLocale) : 'en';
  const audience = await loadLifecycleAudience(sb, [args.userId], { mint: true });
  const reach = reachFor(audience, [args.userId]);
  if (!('token' in reach)) return;
  const key = { userId: args.userId, kind: stageLedgerKind('share_code'), periodKey: 'once' };
  if (!(await claimSend(sb, key))) return;
  const tpl = teacherLifecycleNudge({ fullName: args.fullName || 'Teacher', locale, stage: 'share_code' });
  const result = await sendLifecycleEmail({
    to: args.email,
    subject: tpl.subject,
    html: tpl.html,
    replyTo: tpl.replyTo,
    locale,
    token: reach.token,
  });
  if (!result.ok) {
    await releaseSend(sb, key);
    logger.error(`[paid-day0] share-code send failed for ${args.userId}: ${result.error}`);
  }
}
