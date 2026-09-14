import { createAdminClient } from '@/utils/supabase/admin';
import { getPolarClient } from '@/lib/polar';
import { sendEmail } from '@/lib/email/send';
import { teacherPaymentFailed } from '@/lib/email/templates/teacherPaymentFailed';
import { logSubscriptionEvent } from '@/lib/subscriptions';
import type { TeacherLocale } from '@/lib/education/types';
import logger from '@/utils/logger';

/**
 * Dunning for Teacher Pro: one email when Polar flags a renewal past due.
 *
 * Fires from the subscription.past_due webhook. Without it a declined card on
 * our only paying teacher churns in silence — the subscription row flips to
 * past_due and nobody tells the human who owns the card.
 *
 * Idempotency: Polar retries the payment (and can re-emit the event), so the
 * send is deduped on `subscription_events` — one teacher_payment_failed_email
 * per subscription per 72h window. The marker row is written only after a
 * confirmed send, so a Resend outage retries on the next event instead of
 * burning the one warning the teacher gets.
 */
const DEDUPE_WINDOW_MS = 72 * 60 * 60 * 1000;
const SITE = 'https://www.lexiclash.live';

const VALID_LOCALES: TeacherLocale[] = ['en', 'he', 'sv', 'ja', 'es', 'ru'];

export async function maybeSendPaymentFailedEmail({
  payload,
  userId,
}: {
  // Polar subscription payload — only a handful of fields are read.
  payload: any;
  userId?: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const data = payload?.data ?? {};
  const subscriptionId = String(data.id ?? '');
  const email: string | undefined = data.customer?.email ?? undefined;
  if (!email) {
    logger.warn('[Dunning] subscription.past_due without customer.email; cannot notify', { subscriptionId });
    return { sent: false, reason: 'no-email' };
  }

  const admin = createAdminClient();
  if (!admin) {
    logger.error('[Dunning] no service-role client; skipping');
    return { sent: false, reason: 'no-supabase-admin' };
  }

  // Dedupe: one email per subscription per 72h, however often Polar re-fires.
  if (subscriptionId) {
    const since = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString();
    const { data: recent } = await admin
      .from('subscription_events')
      .select('id')
      .eq('event_type', 'teacher_payment_failed_email')
      .eq('subscription_id', subscriptionId)
      .gte('created_at', since)
      .limit(1);
    if (recent && recent.length > 0) {
      return { sent: false, reason: 'deduped' };
    }
  }

  // Name + locale come from the teacher's access request; a paying teacher has
  // one by definition (approval is the only way in). Fall back to a generic
  // greeting in English rather than dropping the email.
  let fullName = email.split('@')[0];
  let locale: TeacherLocale = 'en';
  const { data: accessRow } = await admin
    .from('teacher_access_requests')
    .select('full_name, locale')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (accessRow?.full_name) fullName = accessRow.full_name;
  if (accessRow?.locale && VALID_LOCALES.includes(accessRow.locale)) {
    locale = accessRow.locale as TeacherLocale;
  }

  // One-click card update beats a maze: send them straight at the Polar
  // customer portal. If the portal session fails, the dashboard still carries
  // Manage Subscription — never a dead link in a dunning email.
  let portalUrl = `${SITE}/${locale}/teacher`;
  if (userId) {
    try {
      const client = getPolarClient();
      const url = await client.createCustomerPortalUrl(userId);
      if (url) portalUrl = url;
    } catch (err) {
      logger.warn('[Dunning] portal session failed, falling back to dashboard link:', err);
    }
  }

  const tpl = teacherPaymentFailed({
    full_name: fullName,
    locale,
    portalUrl,
    renewalDate: (data.current_period_end as string | null) ?? null,
  });
  const result = await sendEmail({ to: email, subject: tpl.subject, html: tpl.html });
  if (!result.ok) {
    logger.error(`[Dunning] send failed for ${email}: ${result.error}`);
    return { sent: false, reason: 'send-failed' };
  }

  await logSubscriptionEvent({
    userId,
    eventType: 'teacher_payment_failed_email',
    subscriptionId,
    payload: { email, locale },
  });
  logger.log(`[Dunning] payment-failed email sent to ${email} (subscription ${subscriptionId})`);
  return { sent: true };
}
