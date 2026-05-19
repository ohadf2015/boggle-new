import { NextRequest, NextResponse } from 'next/server';
import logger from '@/utils/logger';
import { getSmartDailyChallengePushRecipients, markDailyPushSentBatch } from '@/lib/pushReminders';
import { notifyDailyChallengeReminder } from '@/backend/modules/pushNotificationTriggers';
import { pickDailyReminderCopy } from '@/lib/dailyReminderCopy';
import { findDailyChallengeRivals } from '@/lib/dailyChallengeRivals';
import { pickRivalReminderCopy } from '@/lib/rivalReminderCopy';
import { getLocalHour, getTodayDate } from '@/lib/email';
import { captureApiError } from '@/utils/sentry';
import { withCronLock } from '@/backend/redis/locking';
import * as Sentry from '@sentry/nextjs';

/**
 * POST /api/cron/daily-challenge-reminders
 *
 * Hourly cron: smart per-user scheduler. Picks users whose typical play
 * time (circular-mean, 30d rolling, sample >= 3) plus 30 min falls in the
 * current local-time hour-window. Excludes never-played, played-today,
 * already-pushed-today, and opted-out users.
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
    const locked = await withCronLock('daily-challenge-reminders', 90_000, async () => {
      const recipients = await getSmartDailyChallengePushRecipients();
      logger.log(`[Push Cron] ${recipients.length} daily-challenge reminder recipients`);

      if (recipients.length === 0) {
        return { sent: 0, failed: 0 };
      }

      const date = getTodayDate();
      const localHour = getLocalHour('UTC');
      const hoursLeft = Math.max(1, 24 - localHour);

      // Batch-find leaderboard rivals who already cleared today's daily.
      // Map<userId, RivalCandidate|null>. One set of 3 queries for all
      // recipients — keeps cron O(1) DB cost regardless of cohort size.
      const rivalsByUser = await findDailyChallengeRivals(
        recipients.map((r) => r.userId)
      );

      let rivalSent = 0;
      const results = await Promise.allSettled(
        recipients.map(async ({ userId, locale, gender }) => {
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
            await notifyDailyChallengeReminder(userId, {
              title: copy.title,
              body: copy.body,
              deepLink: copy.deepLink,
              variant: copy.variant,
              locale,
              // Only forward rival avatar when HTTPS-safe; null lets the
              // trigger fall back to the encouraging mascot. Rival COPY
              // still fires either way — that's the whole point.
              ...(rival.avatarImage ? { imageUrl: rival.avatarImage } : {}),
              kind: 'rival',
            });
            return;
          }
          const copy = pickDailyReminderCopy({ userId, date, hoursLeft, locale, gender });
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

      const noRivalSent = sent - rivalSent;
      logger.log(
        `[Push Cron] Completed: ${sent} sent (${rivalSent} rival-themed, ${noRivalSent} no-rival), ${failed} failed`
      );

      // Sentry telemetry: confirms the no-rival branch (line 93) actually
      // fires in prod. Only emit when something was sent — hourly "0/0"
      // would dominate the Issues view.
      if (sent > 0) {
        Sentry.captureMessage('daily-challenge-reminders completed', {
          level: 'info',
          tags: {
            cron: 'daily-challenge-reminders',
            had_no_rival: noRivalSent > 0 ? 'yes' : 'no',
          },
          extra: { sent, failed, rivalSent, noRivalSent },
        });
      }

      return { sent, failed, rivalSent, noRivalSent };
    });

    if (locked.status === 'skipped') {
      logger.log('[Push Cron] daily-challenge-reminders: skipped (already running)');
      return NextResponse.json({ success: true, skipped: true, reason: 'already-running' });
    }
    return NextResponse.json({ success: true, ...locked.result });
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
