import { isSupabaseConfigured } from '../modules/supabase';
import { notifyDailyChallengeReminder } from '../modules/pushNotificationTriggers';
import {
  getDailyChallengePushRecipients,
  markDailyPushSent,
} from '@/lib/pushReminders';
import { pickDailyReminderCopy } from '@/lib/dailyReminderCopy';
import { getLocalHour, getTodayDate } from '@/lib/email';
import logger from '../utils/logger';

/**
 * BullMQ cron entry. Delegates recipient selection to the shared HTTP-path
 * gate so "didn't play today" is the single source of truth.
 * Per-user dynamic copy via pickDailyReminderCopy — variant hashes from
 * (userId,date), so analytics can attribute opens to a template.
 */
export async function sendDailyChallengeReminders(): Promise<void> {
  if (!isSupabaseConfigured()) {
    logger.info('DAILY_REMINDER', 'Supabase not configured, skipping');
    return;
  }

  const recipients = await getDailyChallengePushRecipients();
  if (recipients.length === 0) {
    logger.info('DAILY_REMINDER', 'No eligible recipients');
    return;
  }

  const date = getTodayDate();

  const results = await Promise.allSettled(
    recipients.map(async (userId) => {
      const localHour = getLocalHour('UTC');
      const hoursLeft = Math.max(1, 24 - localHour);
      const copy = pickDailyReminderCopy({ userId, date, hoursLeft });
      await notifyDailyChallengeReminder(userId, {
        title: copy.title,
        body: copy.body,
        deepLink: copy.deepLink,
        variant: copy.variant,
      });
      await markDailyPushSent(userId);
    })
  );

  let sent = 0;
  let failed = 0;
  for (const r of results) {
    if (r.status === 'fulfilled') sent++;
    else {
      failed++;
      logger.error(
        'DAILY_REMINDER',
        `send failed: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`
      );
    }
  }

  logger.info('DAILY_REMINDER', `Sent ${sent}, failed ${failed}`);
}
