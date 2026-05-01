import { NextRequest, NextResponse } from 'next/server';
import logger from '@/utils/logger';
import { getDailyChallengePushRecipients, markDailyPushSentBatch } from '@/lib/pushReminders';
import { notifyDailyChallengeReminder } from '@/backend/modules/pushNotificationTriggers';
import { pickDailyReminderCopy } from '@/lib/dailyReminderCopy';
import { getLocalHour, getTodayDate } from '@/lib/email';
import { captureApiError } from '@/utils/sentry';

/**
 * POST /api/cron/daily-challenge-reminders
 *
 * Hourly cron: sends push reminder to users who (1) have an active device
 * token, (2) haven't completed today's daily challenge, (3) haven't been
 * reminded today, and (4) are currently in their 17:00-19:00 local window.
 *
 * Security: CRON_SECRET via x-cron-secret header or Authorization: Bearer.
 *
 * NOTE: recipients carry a pre-fetched `locale` and the post-send mark is
 * batched into one UPDATE — see Sentry 136 (Supabase queue depth). Do NOT
 * reintroduce per-recipient getUserLocale or markDailyPushSent calls here.
 */
export async function POST(request: NextRequest) {
  const cronSecret =
    request.headers.get('x-cron-secret') || request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;

  if (
    expectedSecret &&
    cronSecret !== expectedSecret &&
    cronSecret !== `Bearer ${expectedSecret}`
  ) {
    logger.debug('[Push Cron] Unauthorized request attempted');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const recipients = await getDailyChallengePushRecipients();
    logger.log(`[Push Cron] ${recipients.length} daily-challenge reminder recipients`);

    if (recipients.length === 0) {
      return NextResponse.json({ success: true, sent: 0, failed: 0 });
    }

    const date = getTodayDate();
    const localHour = getLocalHour('UTC');
    const hoursLeft = Math.max(1, 24 - localHour);

    const results = await Promise.allSettled(
      recipients.map(async ({ userId, locale }) => {
        const copy = pickDailyReminderCopy({ userId, date, hoursLeft, locale });
        await notifyDailyChallengeReminder(userId, {
          title: copy.title,
          body: copy.body,
          deepLink: copy.deepLink,
          variant: copy.variant,
          locale,
        });
      })
    );

    let sent = 0;
    let failed = 0;
    const sentIds: string[] = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        sent++;
        sentIds.push(recipients[i].userId);
      } else {
        failed++;
      }
    });

    // Single batched UPDATE instead of N parallel UPDATEs.
    await markDailyPushSentBatch(sentIds);

    logger.log(`[Push Cron] Completed: ${sent} sent, ${failed} failed`);
    return NextResponse.json({ success: true, sent, failed });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[Push Cron] Error:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/cron/daily-challenge-reminders',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json({ error: 'Failed to send push reminders' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
