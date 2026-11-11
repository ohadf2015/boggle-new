import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import logger from '@/utils/logger';
import { getSupabaseAdmin } from '@/lib/email';
import { loadLifecycleAudience, reachFor, sendLifecycleEmail } from '@/lib/email/lifecycleUnsubscribe';
import { teacherLessonReminder } from '@/lib/email/templates/teacherLessonReminder';
import { asTeacherLocale } from '@/lib/education/day2ValueEmail';
import { reminderWindow } from '@/lib/education/lessonPlan';
import { claimSend, releaseSend, writeHeartbeat } from '@/lib/education/lifecycleLedger';
import { fetchInChunks } from '@/lib/education/pro/fetchAll';
import { captureApiError } from '@/utils/sentry';
import { withCronLock } from '@/backend/redis/locking';

export const maxDuration = 120;

const JOB = 'teacher-lesson-reminder';
const KIND = 'lesson_reminder';
const PLAN_LIMIT = 200;
const SEND_BUDGET_MS = 90_000;

interface PlanRow {
  id: string;
  teacher_id: string;
  classroom_id: string;
  lesson_at: string;
  timezone: string | null;
  locale: string | null;
}

interface ClassroomRow {
  id: string;
  teacher_id: string | null;
  name: string;
  join_code: string;
  language: string | null;
}

interface AccessRow {
  user_id: string | null;
  email: string | null;
  full_name: string | null;
  locale: string | null;
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const locked = await withCronLock(JOB, 120_000, async () => {
      const supabase = getSupabaseAdmin();
      if (!supabase) throw new Error('no service-role client');
      const started = Date.now();
      const now = new Date();
      const { from, to } = reminderWindow(now);

      const { data, error } = await supabase
        .from('teacher_lesson_plans')
        .select('id, teacher_id, classroom_id, lesson_at, timezone, locale')
        .is('reminded_at', null)
        .gte('lesson_at', from.toISOString())
        .lte('lesson_at', to.toISOString())
        .order('lesson_at', { ascending: true })
        .limit(PLAN_LIMIT);
      if (error) throw new Error(`teacher_lesson_plans select failed: ${error.message}`);
      const plans = (data ?? []) as PlanRow[];
      if (plans.length === 0) {
        await writeHeartbeat(supabase, JOB, { due: 0, sent: 0 }, now);
        return { due: 0, sent: 0, skipped: 0, failed: 0 };
      }

      const teacherIds = [...new Set(plans.map((p) => p.teacher_id))];
      const [rooms, access, profiles] = await Promise.all([
        fetchInChunks<ClassroomRow>(supabase, 'classrooms', 'id, teacher_id, name, join_code, language', 'id', [...new Set(plans.map((p) => p.classroom_id))]),
        fetchInChunks<AccessRow>(
          supabase, 'teacher_access_requests', 'id, user_id, email, full_name, locale', 'user_id', teacherIds,
          [{ op: 'eq', column: 'status', value: 'approved' }],
        ),
        fetchInChunks<{ id: string; is_test_account: boolean | null }>(supabase, 'profiles', 'id, is_test_account', 'id', teacherIds),
      ]);
      if (rooms.error) throw new Error(`classrooms select failed: ${rooms.error.message}`);
      if (access.error) throw new Error(`teacher_access_requests select failed: ${access.error.message}`);
      if (profiles.error) throw new Error(`profiles select failed: ${profiles.error.message}`);

      const roomById = new Map(rooms.data.map((r) => [r.id, r]));
      const contactById = new Map<string, AccessRow>();
      for (const row of access.data) if (row.user_id && row.email && !contactById.has(row.user_id)) contactById.set(row.user_id, row);
      const testIds = new Set(profiles.data.filter((p) => p.is_test_account).map((p) => p.id));

      const skips: Record<string, number> = { test: 0, noClass: 0, noEmail: 0, unsubscribed: 0, unreachable: 0, alreadySent: 0 };
      const eligible = plans.filter((plan) => {
        const room = roomById.get(plan.classroom_id);
        if (testIds.has(plan.teacher_id)) skips.test++;
        else if (!room || room.teacher_id !== plan.teacher_id) skips.noClass++;
        else if (!contactById.has(plan.teacher_id)) skips.noEmail++;
        else return true;
        return false;
      });

      const audience = await loadLifecycleAudience(supabase, eligible.map((p) => p.teacher_id), { mint: true });
      const markReminded = async (plan: PlanRow) => {
        const { error: markError } = await supabase
          .from('teacher_lesson_plans')
          .update({ reminded_at: now.toISOString() })
          .eq('id', plan.id)
          .eq('lesson_at', plan.lesson_at);
        if (markError) logger.error(`[Lesson Reminder] could not mark ${plan.id} reminded: ${markError.message}`);
      };

      let sent = 0;
      let failed = 0;
      let deferred = 0;
      for (const plan of eligible) {
        const reach = reachFor(audience, [plan.teacher_id]);
        if ('skip' in reach) {
          skips[reach.skip]++;
          continue;
        }
        if (Date.now() - started > SEND_BUDGET_MS) {
          deferred++;
          continue;
        }
        const key = { userId: plan.teacher_id, kind: KIND, periodKey: `${plan.classroom_id}:${new Date(plan.lesson_at).toISOString()}` };
        // A claim already held means a past run sent it but never stamped reminded_at.
        if (!await claimSend(supabase, key)) {
          skips.alreadySent++;
          await markReminded(plan);
          continue;
        }
        const room = roomById.get(plan.classroom_id)!;
        const contact = contactById.get(plan.teacher_id)!;
        const locale = asTeacherLocale(plan.locale, contact.locale);
        let outcome: { ok: boolean; error?: unknown };
        try {
          const tpl = teacherLessonReminder({
            fullName: contact.full_name,
            locale,
            className: room.name,
            joinCode: room.join_code,
            classroomId: room.id,
            boardLanguage: room.language,
            lessonAt: plan.lesson_at,
            timezone: plan.timezone,
          });
          outcome = await sendLifecycleEmail({
            to: contact.email!,
            subject: tpl.subject,
            html: tpl.html,
            replyTo: tpl.replyTo,
            locale,
            token: reach.token,
          });
        } catch (sendError) {
          outcome = { ok: false, error: sendError instanceof Error ? sendError.message : String(sendError) };
        }
        if (!outcome.ok) {
          failed++;
          logger.error(`[Lesson Reminder] send failed for ${plan.teacher_id}: ${String(outcome.error)}`);
          await releaseSend(supabase, key);
          continue;
        }
        sent++;
        await markReminded(plan);
      }

      const skipped = Object.values(skips).reduce((a, b) => a + b, 0);
      const summary = { due: plans.length, sent, skipped, failed, deferred, skips };
      await writeHeartbeat(supabase, JOB, summary, now);
      logger.log(`[Lesson Reminder] ${JSON.stringify(summary)}`);
      return summary;
    });

    if (locked.status === 'skipped') {
      return NextResponse.json({ success: true, skipped: true, reason: 'already-running' });
    }
    return NextResponse.json({ success: true, ...locked.result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('[Lesson Reminder] Error:', message);
    captureApiError(error instanceof Error ? error : new Error(message), '/api/cron/teacher-lesson-reminder', {
      method: 'POST',
      statusCode: 500,
    });
    return NextResponse.json({ error: 'Failed to send lesson reminders' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
