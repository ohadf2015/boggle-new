import { isSupabaseConfigured } from '../modules/supabase';
import { notifyDailyChallengeReminder } from '../modules/pushNotificationTriggers';
import {
  getSmartDailyChallengePushRecipients,
  markDailyPushSentBatch,
} from '@/lib/pushReminders';
import { pickDailyReminderCopy } from '@/lib/dailyReminderCopy';
import { findDailyChallengeRivals } from '@/lib/dailyChallengeRivals';
import { pickRivalReminderCopy } from '@/lib/rivalReminderCopy';
import { getLocalHour, getTodayDate } from '@/lib/email';
import logger from '../utils/logger';

/**
 * BullMQ cron entry. Delegates recipient selection to the shared HTTP-path
 * gate so "didn't play today" is the single source of truth.
 *
 * Recipients carry a pre-fetched `locale` (no per-user getUserLocale N+1)
 * and the post-send mark is a single batched UPDATE — see Sentry 136
 * (Supabase queue depth). Mirror behavior with /api/cron/daily-challenge-reminders.
 */
export async function sendDailyChallengeReminders(): Promise<void> {
  if (!isSupabaseConfigured()) {
    logger.info('DAILY_REMINDER', 'Supabase not configured, skipping');
    return;
  }

  const recipients = await getSmartDailyChallengePushRecipients();
  if (recipients.length === 0) {
    logger.info('DAILY_REMINDER', 'No eligible recipients');
    return;
  }

  const date = getTodayDate();
  const localHour = getLocalHour('UTC');
  const hoursLeft = Math.max(1, 24 - localHour);

  // Rival theming is optional enrichment — degrade to all-general if the
  // lookup throws so a transient failure never suppresses the baseline
  // reminder (mirror of the HTTP cron route).
  let rivalsByUser: Awaited<ReturnType<typeof findDailyChallengeRivals>>;
  try {
    rivalsByUser = await findDailyChallengeRivals(
      recipients.map((r) => ({ userId: r.userId, locale: r.locale }))
    );
  } catch (rivalErr) {
    logger.error(
      'DAILY_REMINDER',
      `rival lookup failed, sending general reminders: ${
        rivalErr instanceof Error ? rivalErr.message : String(rivalErr)
      }`
    );
    rivalsByUser = new Map();
  }

  let rivalSent = 0;
  // Resolves true only when a device actually received the push; non-delivery
  // resolves false and is left unmarked so the next tick retries.
  const results = await Promise.allSettled(
    recipients.map(async ({ userId, locale, gender }): Promise<boolean> => {
      const rival = rivalsByUser.get(userId) ?? null;
      if (rival) {
        const copy = pickRivalReminderCopy({
          userId,
          date,
          hoursLeft,
          locale,
          rivalUsername: rival.username,
          direction: rival.direction,
          scoreGap: rival.scoreGap,
          mode: rival.mode,
          rivalScore: rival.rivalScore,
          rankDelta: rival.rankDelta,
          additionalCount: rival.additionalCount,
        });
        rivalSent++;
        return notifyDailyChallengeReminder(userId, {
          title: copy.title,
          body: copy.body,
          deepLink: copy.deepLink,
          variant: copy.variant,
          locale,
          // Mirror cron route: forward rival avatar only when HTTPS-safe;
          // null lets the trigger fall back to the encouraging mascot.
          ...(rival.avatarImage ? { imageUrl: rival.avatarImage } : {}),
          kind: 'rival',
        });
      }
      const copy = pickDailyReminderCopy({ userId, date, hoursLeft, locale, gender });
      return notifyDailyChallengeReminder(userId, {
        title: copy.title,
        body: copy.body,
        deepLink: copy.deepLink,
        variant: copy.variant,
        locale,
      });
    })
  );

  let delivered = 0;
  let failed = 0;
  const deliveredIds: string[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      if (r.value === true) {
        delivered++;
        deliveredIds.push(recipients[i].userId);
      }
    } else {
      failed++;
      logger.error(
        'DAILY_REMINDER',
        `send failed: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`
      );
    }
  });

  await markDailyPushSentBatch(deliveredIds);

  logger.info('DAILY_REMINDER', `Delivered ${delivered} (${rivalSent} rival-themed), failed ${failed}`);
}
