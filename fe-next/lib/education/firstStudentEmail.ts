import type { SupabaseClient } from '@supabase/supabase-js';
import logger from '@/utils/logger';
import { withTimeout } from '@/lib/server/routeTimeout';
import { loadLifecycleAudience, reachFor, sendLifecycleEmail } from '@/lib/email/lifecycleUnsubscribe';
import { teacherFirstStudent } from '@/lib/email/templates/teacherFirstStudent';
import { asTeacherLocale } from './day2ValueEmail';
import { claimSend, releaseSend } from './lifecycleLedger';

type Db = Pick<SupabaseClient, 'from'>;

export const FIRST_STUDENT_KIND = 'first_student';
const BUDGET_MS = 8_000;
const ROSTER_SCAN = 50;

export type FirstStudentOutcome =
  | 'sent' | 'rehearsal' | 'teacher' | 'test-account' | 'live-game' | 'not-first'
  | 'no-contact' | 'unsubscribed' | 'unreachable' | 'already-sent' | 'send-failed' | 'error';

interface Args {
  classroomId: string;
  studentId: string;
  isRehearsal: boolean;
  liveGameCode: string | null;
}

interface Contact { email: string | null; full_name: string | null; locale: string | null }

async function attempt(db: Db, a: Args): Promise<FirstStudentOutcome> {
  if (a.isRehearsal) return 'rehearsal';
  if (a.liveGameCode) return 'live-game';

  const room = await db.from('classrooms').select('id, teacher_id, name').eq('id', a.classroomId).maybeSingle();
  if (room.error) throw new Error(`classrooms read failed: ${room.error.message}`);
  const classroom = room.data as { teacher_id: string | null; name: string } | null;
  if (!classroom?.teacher_id) return 'error';
  const teacherId = classroom.teacher_id;
  if (a.studentId === teacherId) return 'teacher';

  const roster = await db
    .from('classroom_memberships')
    .select('student_id, is_rehearsal')
    .eq('classroom_id', a.classroomId)
    .limit(ROSTER_SCAN);
  if (roster.error) throw new Error(`classroom_memberships read failed: ${roster.error.message}`);
  const real = ((roster.data ?? []) as Array<{ student_id: string; is_rehearsal: boolean | null }>)
    .filter((m) => !m.is_rehearsal && m.student_id !== teacherId);
  if (real.length !== 1 || real[0].student_id !== a.studentId) return 'not-first';

  const teacher = await db.from('profiles').select('id, is_test_account').eq('id', teacherId).maybeSingle();
  if (teacher.error) throw new Error(`profiles read failed: ${teacher.error.message}`);
  if ((teacher.data as { is_test_account?: boolean } | null)?.is_test_account) return 'test-account';

  const access = await db
    .from('teacher_access_requests')
    .select('email, full_name, locale')
    .eq('user_id', teacherId)
    .eq('status', 'approved')
    .limit(1);
  if (access.error) throw new Error(`teacher_access_requests read failed: ${access.error.message}`);
  const contact = ((access.data ?? []) as Contact[]).find((c) => c.email);
  if (!contact?.email) return 'no-contact';

  const audience = await loadLifecycleAudience(db as SupabaseClient, [teacherId], { mint: true });
  const reach = reachFor(audience, [teacherId]);
  if ('skip' in reach) return reach.skip;

  const key = { userId: teacherId, kind: FIRST_STUDENT_KIND, periodKey: a.classroomId };
  if (!(await claimSend(db, key))) return 'already-sent';

  const locale = asTeacherLocale(contact.locale);
  const tpl = teacherFirstStudent({ fullName: contact.full_name, locale, className: classroom.name, classroomId: a.classroomId });
  let outcome: { ok: boolean; error?: unknown };
  try {
    outcome = await sendLifecycleEmail({ to: contact.email, subject: tpl.subject, html: tpl.html, replyTo: tpl.replyTo, locale, token: reach.token });
  } catch (err) {
    outcome = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  if (!outcome.ok) {
    logger.error(`[first-student-email] send failed for class ${a.classroomId}: ${String(outcome.error ?? 'unknown')}`);
    await releaseSend(db, key);
    return 'send-failed';
  }
  return 'sent';
}

/** Never throws and gives up after a fixed budget: a join must not wait on, or fail from, this email. */
export async function notifyFirstStudent(db: Db, a: Args): Promise<FirstStudentOutcome> {
  try {
    return await withTimeout(attempt(db, a), BUDGET_MS);
  } catch (err) {
    logger.error(`[first-student-email] skipped for class ${a.classroomId}: ${err instanceof Error ? err.message : String(err)}`);
    return 'error';
  }
}
