import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import logger from '@/utils/logger';
import { getSupabaseAdmin } from '@/lib/email';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadLifecycleAudience, reachFor, sendLifecycleEmail } from '@/lib/email/lifecycleUnsubscribe';
import { teacherPolarTrialExpiry, type WinbackStats } from '@/lib/email/templates/teacherPolarTrialExpiry';
import {
  POLAR_TRIAL_EXPIRY_BUCKETS,
  POLAR_TRIAL_WINBACK_BUCKETS,
  pickPolarTrialExpiryJourney,
  type PolarTrialExpiryBucket,
} from '@/lib/education/polarTrialExpiryJourney';
import { fetchTeacherActivityRows, summarizeTeacherWeek } from '@/lib/education/teacherWeekStats';
import type { TeacherLocale } from '@/lib/education/types';
import {
  buildPolarTrialExpirySentEvent,
  captureProFunnelServerEvent,
} from '@/lib/education/proFunnelServer';
import { captureApiError } from '@/utils/sentry';
import { withCronLock } from '@/backend/redis/locking';

/**
 * POST /api/cron/teacher-polar-trial-expiry
 *
 * Daily: Polar Teacher Pro t-0 (ends today), t+3, and t+14 / t+30 win-back
 * emails, linking at /teacher/upgrade. Unsubscribed teachers are skipped. Distinct from teacher-polar-trial-day10 (4–1 days left)
 * and teacher-trial-reminders (access-trial clock).
 *
 * Idempotency: subscription_events.event_type = 'polar_trial_expiry_sent'
 * with payload.bucket. `?dry=1` plans and sends nothing.
 */

const EXPIRY_EVENT = 'polar_trial_expiry_sent';

interface SubRow {
  user_id: string;
  tier: string;
  status: string;
  source: string | null;
  current_period_end: string | null;
}

interface AccessRow {
  user_id: string;
  email: string;
  full_name: string;
  locale: string | null;
}

interface EventRow {
  user_id: string | null;
  event_type: string;
  payload: { bucket?: string; trial?: boolean } | null;
}

const LOCALES: TeacherLocale[] = ['en', 'he', 'sv', 'ja', 'es', 'ru'];

function asLocale(raw: string | null | undefined): TeacherLocale {
  return LOCALES.includes(raw as TeacherLocale) ? (raw as TeacherLocale) : 'en';
}

function trialUsedFromEvents(events: EventRow[]): boolean {
  return events.some((e) => {
    if (e.event_type === 'polar_trial_day10_sent' || e.event_type === EXPIRY_EVENT) return true;
    if (e.payload?.trial === true) return true;
    return e.event_type.includes('trial');
  });
}

const KNOWN_BUCKETS = new Set<string>(POLAR_TRIAL_EXPIRY_BUCKETS);

function bucketsAlreadySent(events: EventRow[]): string[] {
  const out: string[] = [];
  for (const e of events) {
    if (e.event_type !== EXPIRY_EVENT) continue;
    const bucket = e.payload?.bucket;
    if (bucket && KNOWN_BUCKETS.has(bucket)) out.push(bucket);
  }
  return out;
}

/** Fails open to null: the template then makes no claim about classes. */
async function loadWinbackStats(db: SupabaseClient, teacherId: string, nowMs: number): Promise<WinbackStats | null> {
  try {
    const { data, error } = await db.from('classrooms').select('id').eq('teacher_id', teacherId);
    if (error) throw new Error(error.message);
    const classroomIds = ((data ?? []) as Array<{ id: string }>).map((c) => c.id);
    let gamesLast30d = 0;
    try {
      const rows = await fetchTeacherActivityRows(db, classroomIds, nowMs);
      gamesLast30d = summarizeTeacherWeek(rows, [], nowMs).gamesLast30d;
    } catch (err) {
      logger.warn(`[Polar Expiry] activity lookup failed for ${teacherId}: ${err instanceof Error ? err.message : err}`);
    }
    return { classrooms: classroomIds.length, gamesLast30d };
  } catch (err) {
    logger.warn(`[Polar Expiry] classroom lookup failed for ${teacherId}: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dry = request.nextUrl.searchParams.get('dry') === '1';

  try {
    const locked = await withCronLock('teacher-polar-trial-expiry', 120_000, async () => {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        logger.error('[Polar Expiry] no service-role client; skipping');
        return { sent: 0, failed: 0, due: 0, reason: 'no-supabase-admin' };
      }

      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('user_id, tier, status, source, current_period_end')
        .in('status', ['trialing', 'canceled', 'unpaid', 'incomplete_expired', 'paused']);
      if (subError) throw new Error(`subscriptions select failed: ${subError.message}`);

      const subs = (subData ?? []) as SubRow[];
      const userIds = subs.map((s) => s.user_id).filter(Boolean);
      if (userIds.length === 0) {
        return { sent: 0, failed: 0, due: 0 };
      }

      const { data: eventData, error: eventError } = await supabase
        .from('subscription_events')
        .select('user_id, event_type, payload')
        .in('user_id', userIds);
      if (eventError) throw new Error(`subscription_events select failed: ${eventError.message}`);

      const eventsByUser = new Map<string, EventRow[]>();
      for (const row of (eventData ?? []) as EventRow[]) {
        if (!row.user_id) continue;
        const list = eventsByUser.get(row.user_id) ?? [];
        list.push(row);
        eventsByUser.set(row.user_id, list);
      }

      const { data: accessData, error: accessError } = await supabase
        .from('teacher_access_requests')
        .select('user_id, email, full_name, locale')
        .eq('status', 'approved')
        .in('user_id', userIds);
      if (accessError) throw new Error(`teacher_access_requests select failed: ${accessError.message}`);

      const accessByUser = new Map<string, AccessRow>();
      for (const row of (accessData ?? []) as AccessRow[]) {
        if (!row.user_id || !row.email) continue;
        if (!accessByUser.has(row.user_id)) accessByUser.set(row.user_id, row);
      }

      const now = Date.now();
      const planned: Array<{ sub: SubRow; access: AccessRow; bucket: PolarTrialExpiryBucket }> = [];
      const seenEmail = new Set<string>();
      for (const sub of subs) {
        const access = accessByUser.get(sub.user_id);
        if (!access) continue;
        const emailKey = access.email.trim().toLowerCase();
        if (seenEmail.has(emailKey)) continue;
        const events = eventsByUser.get(sub.user_id) ?? [];
        const bucket = pickPolarTrialExpiryJourney({
          tier: sub.tier,
          status: sub.status,
          source: sub.source,
          currentPeriodEnd: sub.current_period_end,
          trialUsed: trialUsedFromEvents(events),
          alreadySent: bucketsAlreadySent(events),
          nowMs: now,
        });
        if (!bucket) continue;
        seenEmail.add(emailKey);
        planned.push({ sub, access, bucket });
      }

      const audience = await loadLifecycleAudience(supabase, planned.map((p) => p.sub.user_id), { mint: !dry });
      let unsubscribed = 0;
      let unreachable = 0;
      const due: Array<(typeof planned)[number] & { token: string }> = [];
      for (const p of planned) {
        const reach = reachFor(audience, [p.sub.user_id]);
        if ('skip' in reach) {
          if (reach.skip === 'unsubscribed') unsubscribed++;
          else unreachable++;
          continue;
        }
        due.push({ ...p, token: reach.token });
      }

      logger.log(
        `[Polar Expiry] ${due.length} teachers due a Polar trial expiry email${dry ? ' (dry run)' : ''}; ` +
          `skipped ${unsubscribed} unsubscribed, ${unreachable} with no unsubscribe link`,
      );

      if (dry) {
        return {
          dry: true,
          due: due.length,
          unsubscribed,
          unreachable,
          plan: due.map(({ access, sub, bucket }) => ({
            user_id: sub.user_id,
            email: access.email,
            locale: asLocale(access.locale),
            expires: sub.current_period_end,
            bucket,
          })),
        };
      }

      let sent = 0;
      let failed = 0;
      for (const { sub, access, bucket, token } of due) {
        const locale = asLocale(access.locale);
        const stats = POLAR_TRIAL_WINBACK_BUCKETS.has(bucket) ? await loadWinbackStats(supabase, sub.user_id, now) : null;
        const tpl = teacherPolarTrialExpiry({
          full_name: access.full_name || 'Teacher',
          locale,
          bucket,
          trialExpiresAt: sub.current_period_end!,
          stats,
        });
        const result = await sendLifecycleEmail({
          to: access.email,
          subject: tpl.subject,
          html: tpl.html,
          locale: locale === 'he' ? 'he' : 'en',
          token,
        });
        if (!result.ok) {
          failed++;
          logger.error(`[Polar Expiry] send failed for ${sub.user_id}: ${result.error}`);
          continue;
        }
        const { error: markError } = await supabase.from('subscription_events').insert({
          user_id: sub.user_id,
          event_type: EXPIRY_EVENT,
          subscription_id: null,
          payload: { bucket },
        });
        if (markError) {
          logger.error(`[Polar Expiry] sent to ${sub.user_id} but could not mark it: ${markError.message}`);
        }
        try {
          captureProFunnelServerEvent(buildPolarTrialExpirySentEvent(sub.user_id, bucket));
        } catch {
          /* analytics must never block the send ledger */
        }
        sent++;
      }

      logger.log(`[Polar Expiry] Completed: ${sent} sent, ${failed} failed of ${due.length} due`);
      return { due: due.length, sent, failed, unsubscribed, unreachable };
    });

    if (locked.status === 'skipped') {
      return NextResponse.json({ success: true, skipped: true, reason: 'already-running' });
    }
    return NextResponse.json({ success: true, ...locked.result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[Polar Expiry] Error:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/cron/teacher-polar-trial-expiry',
      { method: 'POST', statusCode: 500 },
    );
    return NextResponse.json({ error: 'Failed to send Polar trial expiry emails' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
