import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import { getPolarClient, getProProductId } from '@/lib/polar';
import { sendEmail } from '@/lib/email/send';
import { SCHOOL_LEAD_NOTIFY_TO } from '@/lib/education/schoolLeadNotify';
import {
  TEACHER_PRO_CHURN_REDIS_KEY,
  detectChurnTransitions,
  parseStoredSnapshots,
  snapshotFromPolar,
  type PolarSubscriptionLike,
  type TeacherProSubSnapshot,
} from '@/lib/education/teacherProChurnWatch';
import { escapeTelegramMarkdownV2, sendTelegramMessage } from '@/lib/telegram';
import { withCronLock } from '@/backend/redis/locking';
import { getRedisClient, isRedisAvailable } from '@/backend/redis/connection';
import { captureApiError } from '@/utils/sentry';
import logger from '@/utils/logger';

/**
 * GET/POST /api/cron/teacher-pro-churn-watch
 *
 * Daily Polar poll of Teacher Pro subscriptions. On a transition to
 * past_due/canceled/unpaid (or cancel_at_period_end, or the row vanishing)
 * Telegram Ohad; email is the fallback if Telegram is down.
 *
 * Idempotency is the Redis snapshot at TEACHER_PRO_CHURN_REDIS_KEY — same
 * fingerprint two days in a row sends nothing. `?dry=1` never notifies and
 * never writes the snapshot.
 *
 * Security: CRON_SECRET via x-cron-secret or Authorization: Bearer.
 */
async function loadLastSnapshots(): Promise<TeacherProSubSnapshot[] | null> {
  if (!isRedisAvailable() || !getRedisClient()) return null;
  try {
    const raw = await getRedisClient()!.get(TEACHER_PRO_CHURN_REDIS_KEY);
    return parseStoredSnapshots(raw);
  } catch (err) {
    logger.warn('[TeacherPro Churn] redis get failed; treating as first run', err);
    return null;
  }
}

async function saveSnapshots(curr: TeacherProSubSnapshot[]): Promise<void> {
  if (!isRedisAvailable() || !getRedisClient()) return;
  try {
    await getRedisClient()!.set(TEACHER_PRO_CHURN_REDIS_KEY, JSON.stringify(curr));
  } catch (err) {
    logger.warn('[TeacherPro Churn] redis set failed; next run may re-notify', err);
  }
}

async function listTeacherProSubs(): Promise<TeacherProSubSnapshot[]> {
  const client = getPolarClient();
  const productId = getProProductId();
  const [live, inactive] = await Promise.all([
    client.listSubscriptions({ productId, active: true, limit: 100 }),
    client.listSubscriptions({ productId, active: false, limit: 100 }),
  ]);
  const byId = new Map<string, TeacherProSubSnapshot>();
  for (const row of [...(live.items ?? []), ...(inactive.items ?? [])]) {
    const snap = snapshotFromPolar(row as PolarSubscriptionLike);
    if (snap) byId.set(snap.id, snap);
  }
  return [...byId.values()];
}

function formatTelegram(reasons: string[], curr: TeacherProSubSnapshot[]): string {
  const e = escapeTelegramMarkdownV2;
  const lines = [
    '*LexiClash Teacher Pro churn watch*',
    '',
    ...reasons.map((r) => `\\- ${e(r)}`),
  ];
  if (curr.length > 0) {
    lines.push('');
    for (const sub of curr) {
      lines.push(e(`${sub.id} ${sub.status} cancel_at_period_end=${sub.cancelAtPeriodEnd}`));
    }
  }
  lines.push('');
  lines.push(e('Polar: https://polar.sh/dashboard'));
  return lines.join('\n');
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dry = request.nextUrl.searchParams.get('dry') === '1';

  try {
    const locked = await withCronLock('teacher-pro-churn-watch', 60_000, async () => {
      const curr = await listTeacherProSubs();
      const prev = await loadLastSnapshots();
      const transition = detectChurnTransitions(prev, curr);

      logger.log(
        `[TeacherPro Churn] subs=${curr.length} notify=${transition.shouldNotify}` +
          `${dry ? ' (dry run)' : ''}`,
      );

      if (dry) {
        return {
          dry: true,
          count: curr.length,
          shouldNotify: transition.shouldNotify,
          reasons: transition.reasons,
          statuses: curr.map((s) => ({ id: s.id, status: s.status, cancelAtPeriodEnd: s.cancelAtPeriodEnd })),
        };
      }

      let telegram = false;
      let emailed = false;
      if (transition.shouldNotify) {
        telegram = await sendTelegramMessage(formatTelegram(transition.reasons, curr));
        if (!telegram) {
          const result = await sendEmail({
            to: SCHOOL_LEAD_NOTIFY_TO,
            subject: `LexiClash Teacher Pro churn: ${transition.reasons[0] ?? 'status change'}`,
            html: `<p>Teacher Pro Polar watch fired.</p><ul>${transition.reasons
              .map((r) => `<li>${r}</li>`)
              .join('')}</ul>`,
          });
          emailed = result.ok;
          if (!result.ok) {
            logger.error(`[TeacherPro Churn] telegram+email failed: ${result.error}`);
          }
        }
      }

      await saveSnapshots(curr);
      return {
        count: curr.length,
        shouldNotify: transition.shouldNotify,
        notified: transition.shouldNotify && (telegram || emailed),
        telegram,
        emailed,
        reasons: transition.reasons,
      };
    });

    if (locked.status === 'skipped') {
      return NextResponse.json({ success: true, skipped: true, reason: 'already-running' });
    }
    return NextResponse.json({ success: true, ...locked.result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[TeacherPro Churn] Error:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/cron/teacher-pro-churn-watch',
      { method: 'POST', statusCode: 500 },
    );
    return NextResponse.json({ error: 'Failed to watch Teacher Pro churn' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
