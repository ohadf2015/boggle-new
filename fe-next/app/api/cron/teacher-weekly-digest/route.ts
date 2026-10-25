import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import logger from '@/utils/logger';
import { getSupabaseAdmin } from '@/lib/email';
import { loadLifecycleAudience, reachFor, sendLifecycleEmail } from '@/lib/email/lifecycleUnsubscribe';
import { teacherWeeklyProgressDigest } from '@/lib/email/templates/teacherWeeklyProgressDigest';
import { assembleWeeklyDigests, isoWeekKey } from '@/lib/education/weeklyTeacherDigest';
import { loadWeeklyDigestInputs } from '@/lib/education/weeklyDigestData';
import { claimSend, DIGEST_JOB, loadLedger, releaseSend, writeHeartbeat } from '@/lib/education/lifecycleLedger';
import { captureApiError } from '@/utils/sentry';
import { withCronLock } from '@/backend/redis/locking';

const DIGEST_KIND = 'weekly_digest';
// Sends are sequential; the ledger claim, not the lock, is what stops a double send.
const LOCK_TTL_MS = 15 * 60_000;

/**
 * POST /api/cron/teacher-weekly-digest
 *
 * Monday morning: one 7-day completion/accuracy email per teacher who has a
 * classroom, with a Polar CTA at /{locale}/teacher/upgrade for free teachers.
 * Test accounts are skipped; each teacher-week is claimed in `teacher_lifecycle_sends`
 * before sending, so a retry or manual trigger never emails a teacher twice.
 *
 * Security: CRON_SECRET via x-cron-secret or Authorization: Bearer.
 * `?dry=1` returns who would be emailed and sends nothing.
 */

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dry = request.nextUrl.searchParams.get('dry') === '1';
  const now = Date.now();
  const week = isoWeekKey(now);

  try {
    const locked = await withCronLock(DIGEST_JOB, LOCK_TTL_MS, async () => {
      const supabase = getSupabaseAdmin();
      if (!supabase) throw new Error('no service-role client');

      const inputs = await loadWeeklyDigestInputs(supabase, now);
      const { teachers } = inputs;
      if (teachers.length === 0) {
        if (!dry) await writeHeartbeat(supabase, DIGEST_JOB, { week, sent: 0, due: 0 });
        return { sent: 0, failed: 0, due: 0, week, excludedTestAccounts: inputs.excludedTestAccounts };
      }

      const assembled = assembleWeeklyDigests({ ...inputs, now });
      const alreadySent = new Set(
        (await loadLedger(supabase, assembled.map((d) => d.teacherId)))
          .filter((r) => r.kind === DIGEST_KIND && r.period_key === week)
          .map((r) => r.user_id),
      );

      const emailKey = (email: string) => (email ?? '').trim().toLowerCase();
      const userIdsByEmail = new Map<string, string[]>();
      for (const t of teachers) {
        const list = userIdsByEmail.get(emailKey(t.email)) ?? [];
        list.push(t.userId);
        userIdsByEmail.set(emailKey(t.email), list);
      }
      const audience = await loadLifecycleAudience(
        supabase,
        assembled.flatMap((d) => userIdsByEmail.get(emailKey(d.email)) ?? [d.teacherId]),
        { mint: !dry },
      );
      let unsubscribed = 0;
      let unreachable = 0;
      const digests: Array<(typeof assembled)[number] & { token: string }> = [];
      for (const d of assembled) {
        if (alreadySent.has(d.teacherId)) continue;
        const reach = reachFor(audience, userIdsByEmail.get(emailKey(d.email)) ?? [d.teacherId]);
        if ('skip' in reach) {
          if (reach.skip === 'unsubscribed') unsubscribed++;
          else unreachable++;
          continue;
        }
        digests.push({ ...d, token: reach.token });
      }

      logger.log(
        `[Weekly Digest] ${digests.length} teachers due week ${week}${dry ? ' (dry run)' : ''}; ` +
          `skipped ${unsubscribed} unsubscribed, ${unreachable} with no unsubscribe link, ` +
          `${alreadySent.size} already sent, ${inputs.excludedTestAccounts} test accounts`,
      );

      if (dry) {
        return {
          dry: true,
          due: digests.length,
          week,
          unsubscribed,
          unreachable,
          plan: digests.map((d) => ({ email: d.email, locale: d.locale, classrooms: d.classrooms.length, hasPro: d.hasPro })),
        };
      }

      let sent = 0;
      let failed = 0;
      let raced = 0;
      for (const digest of digests) {
        const key = { userId: digest.teacherId, kind: DIGEST_KIND, periodKey: week };
        if (!(await claimSend(supabase, key))) {
          raced += 1;
          continue;
        }
        const tpl = teacherWeeklyProgressDigest(digest);
        // The digest body exists in en/he only; the footer must match the body's language.
        const result = await sendLifecycleEmail({
          to: digest.email,
          subject: tpl.subject,
          html: tpl.html,
          locale: digest.locale === 'he' ? 'he' : 'en',
          token: digest.token,
        });
        if (!result.ok) {
          failed += 1;
          await releaseSend(supabase, key);
          logger.error(`[Weekly Digest] send failed for ${digest.email}: ${result.error}`);
          continue;
        }
        sent += 1;
      }
      const summary = { sent, failed, raced, due: digests.length, week, unsubscribed, unreachable, alreadySent: alreadySent.size };
      await writeHeartbeat(supabase, DIGEST_JOB, summary);
      return summary;
    });

    if (locked.status === 'skipped') {
      return NextResponse.json({ success: true, skipped: true, reason: 'already-running', week });
    }
    return NextResponse.json({ success: true, ...locked.result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[Weekly Digest] Error:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/cron/teacher-weekly-digest',
      { method: 'POST', statusCode: 500 },
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
