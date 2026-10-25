/**
 * I/O for the stage nudges (class made but code never shared, students in but no live
 * game, one live game day but no second). Every read throws on error; each send is
 * claimed in the ledger first and released if the send fails.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import logger from '@/utils/logger';
import { loadLifecycleAudience, reachFor, sendLifecycleEmail } from '@/lib/email/lifecycleUnsubscribe';
import { teacherLifecycleNudge } from '@/lib/email/templates/teacherLifecycleNudge';
import { fetchInChunks, type Result } from './pro/fetchAll';
import { claimSend, loadLedger, releaseSend } from './lifecycleLedger';
import { planLifecycleNudges, stageLedgerKind, type StageTeacher } from './lifecycleNudges';
import type { ActivationNudgeRow } from './activationNudge';
import type { TeacherLocale } from './types';

const LOCALES: readonly TeacherLocale[] = ['en', 'he', 'sv', 'ja', 'es', 'ru'];
const ONCE = 'once';

function must<T>(table: string, r: Result<T>): T[] {
  if (r.error) throw new Error(`${table} select failed: ${r.error.message}`);
  return r.data;
}

function stageTeachers(rows: readonly ActivationNudgeRow[]): StageTeacher[] {
  return rows
    .filter((r): r is ActivationNudgeRow & { user_id: string } => Boolean(r.user_id && r.email))
    .map((r) => ({
      userId: r.user_id,
      email: r.email.trim(),
      fullName: r.full_name || 'Teacher',
      locale: LOCALES.includes(r.locale as TeacherLocale) ? (r.locale as TeacherLocale) : 'en',
    }));
}

export async function runLifecycleStageNudges(
  sb: SupabaseClient,
  args: { rows: readonly ActivationNudgeRow[]; dry: boolean; nowMs: number },
) {
  const teachers = stageTeachers(args.rows);
  const userIds = [...new Set(teachers.map((t) => t.userId))];
  if (userIds.length === 0) return { due: 0, sent: 0, failed: 0, skipped: { testAccount: 0, cooldown: 0 } };

  const classrooms = must('classrooms', await fetchInChunks<{ id: string; teacher_id: string; created_at: string }>(
    sb, 'classrooms', 'id, teacher_id, created_at', 'teacher_id', userIds,
  ));
  const teacherOf = new Map(classrooms.map((c) => [c.id, c.teacher_id]));
  const [members, rounds, tests, ledger] = await Promise.all([
    fetchInChunks<{ classroom_id: string; student_id: string }>(
      sb, 'classroom_memberships', 'id, classroom_id, student_id', 'classroom_id', classrooms.map((c) => c.id),
    ),
    fetchInChunks<{ teacher_id: string; completed_at: string }>(
      sb, 'classroom_rounds', 'id, teacher_id, completed_at', 'teacher_id', userIds,
      [{ op: 'gte', column: 'player_count', value: 2 }, { op: 'notNull', column: 'completed_at' }],
    ),
    fetchInChunks<{ id: string }>(sb, 'profiles', 'id', 'id', userIds, [{ op: 'eq', column: 'is_test_account', value: true }]),
    loadLedger(sb, userIds),
  ]);

  const studentCounts = new Map<string, number>();
  for (const m of must('classroom_memberships', members)) {
    if (m.student_id === teacherOf.get(m.classroom_id)) continue;
    studentCounts.set(m.classroom_id, (studentCounts.get(m.classroom_id) ?? 0) + 1);
  }

  const plan = planLifecycleNudges(teachers, {
    classrooms: classrooms.map((c) => ({ id: c.id, teacherId: c.teacher_id, createdAt: c.created_at })),
    studentCounts,
    realRounds: must('classroom_rounds', rounds).map((r) => ({ teacherId: r.teacher_id, completedAt: r.completed_at })),
    ledger,
    testUserIds: new Set(must('profiles', tests).map((p) => p.id)),
  }, args.nowMs);

  const audience = await loadLifecycleAudience(sb, plan.due.map((d) => d.userId), { mint: !args.dry });
  const due = plan.due.flatMap((d) => {
    const reach = reachFor(audience, [d.userId]);
    return 'token' in reach ? [{ ...d, token: reach.token }] : [];
  });

  if (args.dry) {
    return { dry: true, due: due.length, skipped: plan.skipped, plan: due.map((d) => ({ email: d.email, stage: d.stage })) };
  }

  let sent = 0;
  let failed = 0;
  for (const d of due) {
    const key = { userId: d.userId, kind: stageLedgerKind(d.stage), periodKey: ONCE };
    if (!(await claimSend(sb, key))) continue;
    const tpl = teacherLifecycleNudge({ fullName: d.fullName, locale: d.locale, stage: d.stage });
    const result = await sendLifecycleEmail({
      to: d.email, subject: tpl.subject, html: tpl.html, replyTo: tpl.replyTo, locale: d.locale, token: d.token,
    });
    if (!result.ok) {
      failed++;
      await releaseSend(sb, key);
      logger.error(`[Lifecycle Nudge] send failed for ${d.email} (${d.stage}): ${result.error}`);
      continue;
    }
    sent++;
  }
  logger.log(`[Lifecycle Nudge] ${sent} sent, ${failed} failed of ${due.length} due; skipped ${JSON.stringify(plan.skipped)}`);
  return { due: due.length, sent, failed, skipped: plan.skipped };
}
